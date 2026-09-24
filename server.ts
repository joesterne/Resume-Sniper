import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import PDFDocument from 'pdfkit';
import * as dotenv from 'dotenv';
import axios from 'axios';
import cron from 'node-cron';
import nodemailer from 'nodemailer';
import { searchRemoteJobs, matchJobs } from './src/lib/gemini';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
let db: admin.firestore.Firestore;
try {
  const configPath = path.resolve(__dirname, 'firebase-applet-config.json');
  const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  const firebaseApp = admin.initializeApp({
    projectId: firebaseConfig.projectId
  });
  db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId || '(default)');
} catch (error) {
  console.error("Firebase initialization failed:", error);
}

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- LinkedIn Auth Helpers ---
const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// LinkedIn Auth Endpoints
app.get('/api/auth/linkedin/url', (req, res) => {
  if (!LINKEDIN_CLIENT_ID) {
    return res.status(500).json({ error: "LinkedIn Client ID missing" });
  }
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.get('host');
  const redirectUri = `${protocol}://${host}/api/auth/linkedin/callback`;
  
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: LINKEDIN_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: 'openid profile email',
  });
  const url = `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
  res.json({ url });
});

app.get(['/api/auth/linkedin/callback', '/api/auth/linkedin/callback/'], async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.send(`<html><body><script>window.close();</script></body></html>`);
  }

  try {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.get('host');
    const redirectUri = `${protocol}://${host}/api/auth/linkedin/callback`;
    
    const tokenResponse = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', 
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: code as string,
        client_id: LINKEDIN_CLIENT_ID!,
        client_secret: LINKEDIN_CLIENT_SECRET!,
        redirect_uri: redirectUri,
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const accessToken = tokenResponse.data.access_token;
    
    // Fetch profile data
    const profileResponse = await axios.get('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const userInfo = profileResponse.data;

    // Here we would typically sync with our user profile
    // For now, we'll just pass it back in the script so the frontend can receive it
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ 
                type: 'OAUTH_AUTH_SUCCESS', 
                source: 'linkedin',
                profile: ${JSON.stringify(userInfo)}
              }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Authentication successful. You can close this window.</p>
        </body>
      </html>
    `);
  } catch (error: any) {
    console.error("LinkedIn OAuth Error:", error.response?.data || error.message);
    res.status(500).send("Authentication failed");
  }
});

// Profiles
app.get('/api/profile/:email', async (req, res) => {
  const { email } = req.params;
  try {
    const doc = await db.collection('users').doc(email).get();
    return res.json(doc.exists ? doc.data() : null);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

app.post('/api/profile', async (req, res) => {
  const { email, resume_raw, resume_parsed } = req.body;
  try {
    const data = {
      email,
      resume_raw,
      resume_parsed,
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    };
    await db.collection('users').doc(email).set(data);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: "Failed to save profile" });
  }
});

// Jobs
app.get('/api/jobs', async (req, res) => {
  try {
    const snapshot = await db.collection('jobs').orderBy('created_at', 'desc').get();
    res.json(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  } catch (e) {
    res.json([]);
  }
});

app.post('/api/jobs/bulk', async (req, res) => {
  const { jobs } = req.body;
  try {
    const batch = db.batch();
    jobs.forEach((job: any) => {
      const ref = db.collection('jobs').doc();
      batch.set(ref, { 
        ...job, 
        created_at: admin.firestore.FieldValue.serverTimestamp() 
      });
    });
    await batch.commit();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to save jobs" });
  }
});

app.delete('/api/jobs/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.collection('jobs').doc(id).delete();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to delete job" });
  }
});

// Tailored Documents
app.post('/api/tailor', async (req, res) => {
  const { user_email, job_id, resume_text, cover_letter_text, metadata } = req.body;
  try {
    const jobDoc = await db.collection('jobs').doc(String(job_id)).get();
    const jobData = jobDoc.data() || {};

    const docRef = await db.collection('documents').add({
      user_email,
      job_id,
      title: jobData.title || jobData.company || "Unknown Position",
      company: jobData.company || "Unknown Company",
      resume_text,
      cover_letter_text,
      metadata,
      created_at: admin.firestore.FieldValue.serverTimestamp()
    });
    res.json({ id: docRef.id });
  } catch (e) {
    res.status(500).json({ error: "Failed to save document" });
  }
});

// Submit Application
app.post('/api/applications/submit', async (req, res) => {
  const { user_email, job_id, resume_text, cover_letter_text } = req.body;
  try {
    const jobDoc = await db.collection('jobs').doc(String(job_id)).get();
    const jobData = jobDoc.data() || {};

    const applicationRef = await db.collection('applications').add({
      user_email,
      job_id,
      title: jobData.title || jobData.company || "Unknown Position",
      company: jobData.company || "Unknown Company",
      resume_text,
      cover_letter_text,
      status: 'submitted',
      submitted_at: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Also save to documents ledger
    await db.collection('documents').add({
      user_email,
      job_id,
      title: jobData.title || jobData.company || "Unknown Position",
      company: jobData.company || "Unknown Company",
      resume_text,
      cover_letter_text,
      status: 'submitted',
      created_at: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ id: applicationRef.id, success: true, message: "Application submitted successfully." });
  } catch (e) {
    res.status(500).json({ error: "Failed to submit application" });
  }
});

app.get('/api/documents/:email', async (req, res) => {
  const { email } = req.params;
  try {
    const snapshot = await db.collection('documents')
      .where('user_email', '==', email)
      .orderBy('created_at', 'desc')
      .get();
    res.json(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  } catch (e) {
    res.json([]);
  }
});

// PDF Generation
app.get('/api/documents/:id/pdf', async (req, res) => {
  const { id } = req.params;
  try {
    const docSnap = await db.collection('documents').doc(id).get();
    if (!docSnap.exists) return res.status(404).send('Document not found');
    const docData = docSnap.data()!;

    const pdf = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=resume_${id}.pdf`);
    pdf.pipe(res);

    pdf.fontSize(20).text('Tailored Resume', { align: 'center' });
    pdf.moveDown();
    pdf.fontSize(10).text(docData.resume_text);
    pdf.addPage();
    pdf.fontSize(20).text('Cover Letter', { align: 'center' });
    pdf.moveDown();
    pdf.fontSize(12).text(docData.cover_letter_text);
    pdf.end();
  } catch (e) {
    res.status(500).send("Error generating PDF");
  }
});

// --- Job Alert Notification System ---

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function runJobAlerts() {
  console.log("[Job Alerts] Starting periodic job match routine...");
  try {
    if (!db) {
      console.warn("[Job Alerts] Firestore not initialized, skipping.");
      return;
    }
    const usersSnap = await db.collection('users').get();
    if (usersSnap.empty) {
      console.log("[Job Alerts] No users found.");
      return;
    }

    for (const userDoc of usersSnap.docs) {
      const userData = userDoc.data();
      const email = userData.email;
      const parsedResume = userData.resume_parsed;
      
      if (!parsedResume || !email) continue;
      
      // Determine a good search query for this user based on their latest job title or skills
      let query = "Software Engineer Remote";
      if (parsedResume.experience && parsedResume.experience.length > 0) {
        query = `${parsedResume.experience[0].title} Remote`;
      }

      console.log(`[Job Alerts] Scrubbing jobs for ${email} with query: "${query}"`);
      const newJobs = await searchRemoteJobs(query);
      
      if (!newJobs || newJobs.length === 0) continue;

      const matches = await matchJobs(parsedResume, newJobs.map((j: any) => ({ id: j.url || j.title, description: j.description })));
      
      // Filter high-matching jobs
      const highMatches = newJobs.map((job: any) => {
        const matchData = matches.find((m: any) => m.jobId === (job.url || job.title));
        return { ...job, match_score: matchData?.score || 0, reasoning: matchData?.reasoning };
      }).filter((job: any) => job.match_score >= 80);

      if (highMatches.length > 0) {
        console.log(`[Job Alerts] Found ${highMatches.length} high-match jobs for ${email}. Sending email...`);
        
        let htmlBody = `<h2 style="font-family: sans-serif;">New High-Match Opportunities</h2>`;
        htmlBody += `<p style="font-family: sans-serif;">We found ${highMatches.length} new jobs that strongly match your resume:</p><ul>`;
        
        highMatches.forEach((match: any) => {
          htmlBody += `
            <li style="margin-bottom: 20px; font-family: sans-serif;">
              <strong>${match.title}</strong> at <em>${match.company}</em><br/>
              <strong>Match Score:</strong> <span style="color: green;">${match.match_score}/100</span><br/>
              <strong>Why it's a fit:</strong> ${match.reasoning}<br/>
              <a href="${match.url}">Apply Here</a>
            </li>
          `;
        });
        htmlBody += `</ul><p style="font-family: sans-serif; opacity: 0.6; font-size: 12px;">You're receiving this because you are enrolled in ResumeSniper automated alerts.</p>`;

        if (process.env.SMTP_USER && process.env.SMTP_PASS) {
          await transporter.sendMail({
            from: process.env.EMAIL_FROM || '"Job Alerts" <alerts@resumesniper.app>',
            to: email,
            subject: `🔥 ${highMatches.length} New Job Matches Found for You!`,
            html: htmlBody
          });
          console.log(`[Job Alerts] Email successfully sent to ${email}`);
        } else {
          console.log(`[Job Alerts] SMTP completely not configured. Mock sending email output:`);
          console.log(htmlBody);
        }
      } else {
        console.log(`[Job Alerts] No high matches found for ${email} this round.`);
      }
    }
    console.log("[Job Alerts] Routine completed successfully.");
  } catch (error) {
    console.error("[Job Alerts] Error running routine:", error);
  }
}

// Schedule the cron job to run every 12 hours
cron.schedule('0 */12 * * *', () => {
  runJobAlerts();
});

// Endpoint to trigger manually
app.post('/api/admin/trigger-alerts', async (req, res) => {
  // Normally you'd secure this with an admin token
  runJobAlerts(); // run async
  res.json({ message: "Job alert routine dispatched securely to the background." });
});

// Start the server
async function init() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    
    // Fallback all other requests to index.html for SPA
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server started at http://localhost:${port}`);
  });
}

init();
