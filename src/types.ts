export interface Job {
  id: string | number;
  title: string;
  company: string;
  description: string;
  location: string;
  url: string;
  source: string;
  is_remote: boolean;
  score?: number;
  reasoning?: string;
  matchedSkills?: string[];
  missingSkills?: string[];
  created_at?: string;
}

export interface ParsedResume {
  name: string;
  contact: {
    email: string;
    phone: string;
    linkedin?: string;
  };
  skills: string[];
  experience: {
    title: string;
    company: string;
    date: string;
    bullets: string[];
  }[];
  education: {
    degree: string;
    school: string;
    year: string;
  }[];
}

export interface UserProfile {
  email: string;
  resume_raw: string;
  resume_parsed: ParsedResume;
  updated_at?: string;
}

export interface DocumentVersion {
  id: string | number;
  job_id: string | number;
  title: string;
  company: string;
  created_at: string;
  resume_text?: string;
  cover_letter_text?: string;
  metadata?: any;
  status?: string;
}

export interface TailoredResult {
  tailoredResume: string;
  coverLetter: string;
  metadata: {
    improvementNotes: string;
    focusKeywords: string[];
  };
}
