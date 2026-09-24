import React, { useState, useEffect } from 'react';
import { 
  Briefcase, 
  FileText, 
  History, 
  Download, 
  AlertCircle,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';

// Config & Services
import { parseResume, searchRemoteJobs, matchJobs, tailorApplication } from './lib/gemini';
import { USER_EMAIL } from './constants';

// Types
import { Job, UserProfile, DocumentVersion, TailoredResult } from './types';

// Components
import { NavItem } from './components/NavItem';
import { JobCard } from './components/JobCard';
import { TailoringModal } from './components/TailoringModal';
import { ProfileEditor } from './components/ProfileEditor';
import { ParsedResume } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'jobs' | 'resumes' | 'history'>('jobs');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [history, setHistory] = useState<DocumentVersion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState("");

  // Tracking tailoring
  const [tailoringJob, setTailoringJob] = useState<Job | null>(null);
  const [tailoredResult, setTailoredResult] = useState<TailoredResult | null>(null);

  // LinkedIn Auth Listener
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) return;

      if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data?.source === 'linkedin') {
        const { profile: linkedInProfile } = event.data;
        setIsLoading(true);
        setStatus("Importing data from LinkedIn...");
        try {
          // Use Gemini to convert basic LinkedIn profile to our structured format
          const prompt = `Convert this basic LinkedIn profile data into a professional resume summary. 
            LinkedIn Data: ${JSON.stringify(linkedInProfile)}
            Return exactly a structured JSON as defined for a resume.`;
            
          // For now, let's just use the name and email directly if possible or mock the AI call with basic info
          const profileData: ParsedResume = {
            name: linkedInProfile.name || linkedInProfile.given_name + " " + linkedInProfile.family_name,
            contact: {
              email: linkedInProfile.email || "",
              phone: "", // LinkedIn basic profile doesn't provide phone
              linkedin: linkedInProfile.profile || ""
            },
            skills: [],
            experience: [],
            education: []
          };
          
          await handleSaveProfile(profileData);
          setStatus("LinkedIn Profile Sync Successful.");
          confetti({ particleCount: 50, spread: 50 });
        } catch (e) {
          console.error(e);
          setStatus("Import failed.");
        } finally {
          setIsLoading(false);
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [profile]);

  const handleLinkedInConnect = async () => {
    try {
      const response = await fetch('/api/auth/linkedin/url');
      const { url } = await response.json();
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      window.open(url, 'linkedin_oauth', `width=${width},height=${height},left=${left},top=${top}`);
    } catch (e) {
      console.error(e);
      setStatus("Failed to start LinkedIn auth.");
    }
  };

  useEffect(() => {
    const init = async () => {
      await Promise.all([fetchProfile(), fetchJobs(), fetchHistory()]);
    };
    init();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch(`/api/profile/${USER_EMAIL}`);
      const data = await res.json();
      if (data) setProfile(data);
    } catch (e) {
      console.error("Profile fetch error", e);
    }
  };

  const fetchJobs = async () => {
    try {
      const res = await fetch('/api/jobs');
      const data = await res.json();
      setJobs(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Jobs fetch error", e);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch(`/api/documents/${USER_EMAIL}`);
      const data = await res.json();
      setHistory(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("History fetch error", e);
    }
  };

  const handleResumeUpload = async (text: string) => {
    setIsLoading(true);
    setStatus("Parsing resume with AI...");
    try {
      const parsed = await parseResume(text);
      if (!parsed) throw new Error("AI failed to parse content.");
      
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: USER_EMAIL, resume_raw: text, resume_parsed: parsed })
      });
      
      if (!res.ok) throw new Error("Server failed to save profile.");
      
      const profileData = await res.json();
      setProfile(profileData);
      setStatus("Identity stored successfully.");
    } catch (e: any) {
      console.error(e);
      setStatus(`System Error: ${e.message || "Unknown Failure"}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleScrubJobs = async () => {
    setIsLoading(true);
    setStatus("Scrubbing job boards...");
    try {
      const results = await searchRemoteJobs("Software Engineer Remote");
      await fetch('/api/jobs/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobs: results })
      });
      await fetchJobs();
      setStatus("Found new opportunities!");
    } catch (e) {
      console.error(e);
      setStatus("Error scrubbing jobs");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunMatching = async () => {
    if (!profile || jobs.length === 0) return;
    setIsLoading(true);
    setStatus("Analyzing fit...");
    try {
      const matches = await matchJobs(profile.resume_parsed, jobs.map(j => ({ id: j.id, description: j.description })));
      const updatedJobs = jobs.map(j => {
        const match = matches.find((m: any) => m.jobId === j.id);
        return match ? { 
          ...j, 
          score: match.score, 
          reasoning: match.reasoning,
          matchedSkills: match.matchedSkills,
          missingSkills: match.missingSkills
        } : j;
      });
      setJobs(updatedJobs.sort((a, b) => (b.score || 0) - (a.score || 0)));
      setStatus("Matching complete!");
    } catch (e) {
      console.error(e);
      setStatus("Matching failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTriggerAlerts = async () => {
    setIsLoading(true);
    setStatus("Triggering background scan...");
    try {
      await fetch('/api/admin/trigger-alerts', { method: 'POST' });
      setStatus("Alert scan dispatched.");
      // Just a little confetti to show the manual action was registered
      confetti({ particleCount: 30, spread: 30, origin: { y: 0.8 } });
      setTimeout(() => setStatus(""), 3000);
    } catch (e) {
      setStatus("Failed to trigger alert scan.");
    } finally {
      setIsLoading(false);
    }
  };

  const startTailoring = async (job: Job) => {
    setTailoringJob(job);
    setIsLoading(true);
    setStatus(`Tailoring for ${job.company}...`);
    try {
      const result = await tailorApplication(profile!.resume_raw, job.description);
      setTailoredResult(result);
      setStatus("AI generation complete.");
    } catch (e) {
      console.error(e);
      setStatus("Tailoring failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteJob = async (jobId: string | number) => {
    setIsLoading(true);
    setStatus("Removing job...");
    try {
      await fetch(`/api/jobs/${jobId}`, { method: 'DELETE' });
      setJobs(jobs.filter(j => j.id !== jobId));
      setStatus("Job removed successfully.");
      setTimeout(() => setStatus(""), 3000);
    } catch (e) {
      console.error("Failed to delete job", e);
      setStatus("Failed to delete job");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAndApply = async (docs: { resume: string, coverLetter: string }) => {
    if (!tailoringJob || !tailoredResult) return;
    setIsLoading(true);
    setStatus("Versioning documents...");
    try {
      await fetch('/api/tailor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_email: USER_EMAIL,
          job_id: tailoringJob.id,
          resume_text: docs.resume,
          cover_letter_text: docs.coverLetter,
          metadata: tailoredResult.metadata
        })
      });
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      setStatus("Application documents versioned.");
      fetchHistory();
      setTailoringJob(null);
      setTailoredResult(null);
    } catch (e) {
      console.error(e);
      setStatus("Save failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitApplication = async (docs: { resume: string, coverLetter: string }) => {
    if (!tailoringJob || !tailoredResult) return;
    setIsLoading(true);
    setStatus("Submitting application...");
    try {
      await fetch('/api/applications/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_email: USER_EMAIL,
          job_id: tailoringJob.id,
          resume_text: docs.resume,
          cover_letter_text: docs.coverLetter
        })
      });
      
      confetti({ particleCount: 150, zIndex: 9999, spread: 80, origin: { y: 0.6 } });
      setStatus("Application submitted successfully!");
      fetchHistory();
      setTailoringJob(null);
      setTailoredResult(null);
    } catch (e) {
      console.error(e);
      setStatus("Submission failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async (parsedData: ParsedResume) => {
    setIsLoading(true);
    setStatus("Syncing profile updates...");
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: USER_EMAIL, 
          resume_raw: profile?.resume_raw || "", 
          resume_parsed: parsedData 
        })
      });
      const profileData = await res.json();
      setProfile(profileData);
      setIsEditingProfile(false);
      setStatus("Profile updated.");
    } catch (e) {
      console.error(e);
      setStatus("Sync failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-bg text-ink font-sans selection:bg-ink selection:text-bg overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 border-r border-grid flex flex-col bg-bg">
        <div className="p-4 border-b border-grid">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-ink flex items-center justify-center text-bg font-bold italic text-sm">RS</div>
            <h1 className="text-sm font-bold tracking-tighter uppercase">ResumeSniper // v.1</h1>
          </div>
          <div className="mt-4">
            <div className="text-[10px] uppercase font-serif-italic mb-1 opacity-60">Primary Operator</div>
            <div className="text-sm font-bold truncate">{USER_EMAIL.split('@')[0]}</div>
          </div>
        </div>

        <nav className="flex-1">
          <div className="text-[10px] uppercase font-bold p-4 opacity-40 tracking-widest bg-accent/50 border-b border-grid">Main Console</div>
          <div className="py-2">
            <NavItem icon={<Briefcase size={14} />} label="01. Remote Jobs" active={activeTab === 'jobs'} onClick={() => setActiveTab('jobs')} />
            <NavItem icon={<FileText size={14} />} label="02. My Resumes" active={activeTab === 'resumes'} onClick={() => setActiveTab('resumes')} />
            <NavItem icon={<History size={14} />} label="03. History" active={activeTab === 'history'} onClick={() => setActiveTab('history')} />
          </div>
        </nav>

        <div className="p-4 border-t border-grid bg-accent/30">
          <div className="text-[10px] uppercase font-bold mb-1 italic">System Status</div>
          <div className="flex items-center space-x-2 text-[10px] uppercase tracking-wider font-semibold opacity-60">
            <div className={`w-1.5 h-1.5 rounded-full ${isLoading ? 'bg-orange-500 animate-pulse' : 'bg-green-500'}`} />
            <span>{isLoading ? 'Processing' : 'Active'}</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col bg-main overflow-hidden">
        <nav className="h-12 border-b border-grid flex items-center justify-between px-6 bg-bg z-10 shrink-0">
          <div className="flex items-center gap-6 text-[9px] uppercase tracking-widest font-bold opacity-60">
            <span>DB: <span className="text-blue-700 font-mono">FIREBASE_CLOUD</span></span>
            <span>SCRAPER: <span className="text-green-700">LINKEDIN_STABLE</span></span>
          </div>
          <div className="flex gap-2">
             {isLoading ? (
                <div className="flex items-center space-x-2 px-3 py-1 bg-ink text-bg text-[10px] uppercase font-bold">
                  <Loader2 size={10} className="animate-spin" />
                  <span>{status}</span>
                </div>
              ) : (
                <div className="px-3 py-1 bg-ink/5 border border-grid text-[10px] uppercase font-bold opacity-40">
                  <span>System Locked</span>
                </div>
              )}
          </div>
        </nav>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 h-24 border-b border-grid shrink-0 bg-white">
          {[
            { label: 'Active Jobs', value: jobs.length.toString().padStart(3, '0') },
            { 
              label: 'Match Score Avg', 
              value: jobs.filter(j => j.score).length > 0
                ? (jobs.reduce((acc, curr) => acc + (curr.score || 0), 0) / jobs.filter(j => j.score).length).toFixed(1) + '%'
                : '00.0%'
            },
            { label: 'Versions', value: history.length.toString().padStart(3, '0') },
            { label: 'Operator', value: USER_EMAIL.split('@')[0], highlight: true }
          ].map((stat, i) => (
            <div key={i} className={`flex flex-col justify-center px-6 border-r border-grid ${stat.highlight ? 'bg-bg/20 border-r-0' : ''}`}>
              <div className="font-serif-italic text-[11px] opacity-50 uppercase">{stat.label}</div>
              <div className={`${stat.highlight ? 'text-sm font-bold truncate' : 'text-3xl font-mono leading-none'} mt-1 uppercase tracking-tighter`}>{stat.value}</div>
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-12 bg-white">
          <header className="flex justify-between items-center mb-8 pb-4 border-b border-grid">
            <h2 className="text-2xl font-bold uppercase tracking-tighter">
              {activeTab === 'jobs' && "01 // Remote Opportunities"}
              {activeTab === 'resumes' && "02 // Professional Identity"}
              {activeTab === 'history' && "03 // Application Ledger"}
            </h2>
            
            <div className="flex space-x-3">
               {activeTab === 'jobs' && profile && (
                  <>
                    <button onClick={handleTriggerAlerts} className="px-4 py-2 border border-grid text-ink bg-accent/20 text-[10px] uppercase font-bold hover:bg-accent/40 transition-all flex items-center gap-2">
                       Test Auto-Scraper
                    </button>
                    <button onClick={handleScrubJobs} className="px-4 py-2 bg-ink text-bg text-[10px] uppercase font-bold hover:opacity-90 transition-opacity">Scrub Web</button>
                    <button onClick={handleRunMatching} className="px-4 py-2 border border-grid text-[10px] uppercase font-bold hover:bg-ink hover:text-bg transition-all">Analyze Fit</button>
                  </>
               )}
            </div>
          </header>

        <AnimatePresence mode="wait">
          {activeTab === 'jobs' && (
            <motion.div key="jobs" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
              {!profile && (
                <div className="p-12 border-2 border-dashed border-grid bg-bg/10 text-center">
                  <AlertCircle className="mx-auto mb-4 opacity-20" size={32} />
                  <p className="text-[11px] uppercase font-bold tracking-widest mb-6 opacity-60">Operator credentials missing // Resume upload or LinkedIn sync required</p>
                  <div className="flex flex-col items-center gap-4">
                    <button onClick={() => setActiveTab('resumes')} className="w-64 py-3 border border-grid text-[10px] uppercase font-bold hover:bg-ink hover:text-bg transition-all">Initialize Manual Profile</button>
                    <button 
                      onClick={handleLinkedInConnect}
                      className="w-64 py-3 bg-[#0077b5] text-white text-[10px] uppercase font-bold hover:bg-[#005582] transition-colors flex items-center justify-center gap-2"
                    >
                      Connect via LinkedIn
                    </button>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 divide-y border border-grid">
                {jobs.map(job => (
                  <JobCard 
                    key={job.id} 
                    job={job} 
                    onApply={() => startTailoring(job)} 
                    onDelete={() => handleDeleteJob(job.id)} 
                    userSkills={profile?.resume_parsed?.skills} 
                  />
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'resumes' && (
            <motion.div key="resumes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-4xl">
              {isEditingProfile && profile ? (
                <ProfileEditor 
                  initialData={profile.resume_parsed} 
                  onSave={handleSaveProfile}
                  onCancel={() => setIsEditingProfile(false)}
                />
              ) : (
                <div className="bg-white border border-grid p-8 shadow-[4px_4px_0px_#141414]">
                  <div className="flex justify-between items-center mb-8 border-b border-grid pb-4">
                      <h3 className="text-sm font-bold uppercase tracking-widest">Base Identity Store</h3>
                      <div className="flex gap-4 items-center">
                         {!profile && (
                           <button 
                             onClick={handleLinkedInConnect}
                             className="flex items-center gap-2 text-[10px] bg-[#0077b5] text-white px-3 py-1.5 font-bold uppercase tracking-widest hover:bg-[#005582] transition-colors"
                           >
                             Connect LinkedIn
                           </button>
                         )}
                         {profile && !isEditingProfile && (
                           <button onClick={() => setIsEditingProfile(true)} className="text-[10px] font-bold text-blue-700 uppercase tracking-widest hover:underline">Edit_Profile</button>
                         )}
                         {profile && <button onClick={() => setProfile(null)} className="text-[10px] font-bold text-red-700 uppercase tracking-widest hover:underline text-xs">Clear Local Store</button>}
                      </div>
                  </div>
                  
                  {!profile ? (
                    <textarea 
                      className="w-full h-[500px] p-6 border border-grid bg-bg/5 font-mono text-xs focus:outline-none focus:bg-white transition-colors"
                      placeholder="PASTE_RESUME_CONTENT_HERE..."
                      onBlur={(e) => { if (e.target.value.trim()) { handleResumeUpload(e.target.value); } }}
                    />
                  ) : (
                    <div className="space-y-12">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <p className="text-3xl font-bold tracking-tighter uppercase">{profile.resume_parsed?.name}</p>
                          <p className="text-xs font-mono opacity-60 tracking-wider inline-block border-b border-grid">
                            {profile.resume_parsed?.contact?.email} // {profile.resume_parsed?.contact?.phone}
                          </p>
                        </div>
                        <div className="bg-ink p-4 text-bg">
                          <div className="text-[10px] uppercase font-bold opacity-60 mb-1">V-Hash</div>
                          <div className="text-[10px] font-mono">0x28B...FA1</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-8">
                        <section className="col-span-2 space-y-8">
                          <h4 className="text-[10px] uppercase tracking-widest font-bold mb-4 bg-bg px-2 py-1 border-l-2 border-ink inline-block">Experience</h4>
                          {profile.resume_parsed?.experience?.map((exp: any, i: number) => (
                            <div key={i} className="relative pl-6 border-l border-grid">
                              <div className="absolute w-2 h-2 bg-ink -left-[4.5px] top-1" />
                              <div className="flex justify-between items-start mb-2 uppercase tracking-tight">
                                <p className="text-sm font-bold">{exp.title}</p>
                                <p className="text-[10px] font-mono opacity-40">{exp.date}</p>
                              </div>
                              <p className="text-[11px] font-serif-italic text-ink/70 mb-3">{exp.company}</p>
                              <ul className="space-y-1 text-[11px] leading-relaxed opacity-80">
                                {exp.bullets?.map((b: string, j: number) => <li key={j}>— {b}</li>)}
                              </ul>
                            </div>
                          ))}
                        </section>
                        <div className="space-y-12">
                          <section>
                            <h4 className="text-[10px] uppercase tracking-widest font-bold mb-4 bg-bg px-2 py-1 border-l-2 border-ink inline-block">Skills</h4>
                            <div className="flex flex-wrap gap-1">
                              {profile.resume_parsed?.skills?.map((s: string) => <span key={s} className="px-2 py-0.5 border border-grid text-[9px] font-bold uppercase tracking-tighter">{s}</span>)}
                            </div>
                          </section>
                          <section>
                            <h4 className="text-[10px] uppercase tracking-widest font-bold mb-4 bg-bg px-2 py-1 border-l-2 border-ink inline-block">Certification</h4>
                            {profile.resume_parsed?.education?.map((e: any, i: number) => (
                              <div key={i} className="mb-4">
                                <p className="text-[11px] font-bold">{e.degree}</p>
                                <p className="text-[10px] font-mono opacity-60 underline">{e.school}</p>
                              </div>
                            ))}
                          </section>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="border border-grid overflow-hidden shadow-[4px_4px_0px_#141414]">
                <table className="w-full text-left bg-white font-mono text-[11px]">
                  <thead>
                    <tr className="border-b border-grid bg-bg uppercase font-bold text-[10px]">
                      <th className="px-6 py-3">Log_Company</th>
                      <th className="px-6 py-3">Log_Position</th>
                      <th className="px-6 py-3 text-center">Log_Date</th>
                      <th className="px-6 py-3 text-center">Log_Status</th>
                      <th className="px-6 py-3 text-right">Log_Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-grid">
                    {history.map(item => (
                      <tr key={item.id} className="row-hover">
                        <td className="px-6 py-4 font-bold">{item.company.toUpperCase()}</td>
                        <td className="px-6 py-4 opacity-80">{item.title}</td>
                        <td className="px-6 py-4 text-center opacity-60">{new Date(item.created_at).toISOString().split('T')[0]}</td>
                        <td className="px-6 py-4 text-center">
                          {item.status === 'submitted' ? (
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-[9px] uppercase font-bold tracking-widest border border-green-200">Submitted</span>
                          ) : (
                            <span className="px-2 py-1 bg-accent/20 text-ink/60 text-[9px] uppercase font-bold tracking-widest border border-grid/20">Drafted</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <a href={`/api/documents/${item.id}/pdf`} className="inline-flex items-center space-x-2 border border-current px-3 py-1 font-bold uppercase hover:bg-ink hover:text-bg transition-colors"><Download size={10} /><span>Retrieve_PDF</span></a>
                        </td>
                      </tr>
                    ))}
                    {history.length === 0 && <tr><td colSpan={5} className="px-8 py-20 text-center opacity-40 italic">Document ledger is empty.</td></tr>}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </main>

      <TailoringModal job={tailoringJob} result={tailoredResult} isLoading={isLoading} onClose={() => { setTailoringJob(null); setTailoredResult(null); }} onSave={handleSaveAndApply} onSubmit={handleSubmitApplication} />
    </div>
  );
}
