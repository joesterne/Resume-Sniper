// Browser-side AI client. Calls the server's /api/ai endpoints so the Gemini
// API key stays on the server — the browser used to import src/lib/gemini
// directly with the key inlined into the bundle by vite.config's define.
// Function names and signatures match the old client-side module so call
// sites in App.tsx only change their import.

async function postAi(path: string, body: unknown) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`AI request failed: ${res.status}`);
  return res.json();
}

export function parseResume(text: string) {
  return postAi('/api/ai/parse', { text });
}

export function searchRemoteJobs(query: string) {
  return postAi('/api/ai/search', { query });
}

export function matchJobs(resumeParsed: any, jobDescriptions: any[]) {
  return postAi('/api/ai/match', { resumeParsed, jobDescriptions });
}

export function tailorApplication(resumeRaw: string, jobDescription: string) {
  return postAi('/api/ai/tailor', { resumeRaw, jobDescription });
}
