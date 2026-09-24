import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function parseResume(text: string) {
  const result = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Parse the following resume text into a structured JSON format including name, contact, skills, experience (title, company, date, bullets), and education.\n\nResume Text:\n${text}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          contact: { 
            type: Type.OBJECT,
            properties: {
              email: { type: Type.STRING },
              phone: { type: Type.STRING },
              linkedin: { type: Type.STRING }
            }
          },
          skills: { type: Type.ARRAY, items: { type: Type.STRING } },
          experience: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                company: { type: Type.STRING },
                date: { type: Type.STRING },
                bullets: { type: Type.ARRAY, items: { type: Type.STRING } }
              }
            }
          },
          education: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                degree: { type: Type.STRING },
                school: { type: Type.STRING },
                year: { type: Type.STRING }
              }
            }
          }
        },
        required: ["name"]
      }
    }
  });
  return JSON.parse(result.text);
}

export async function matchJobs(resumeParsed: any, jobDescriptions: any[]) {
  const result = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analyze the fit between this resume and these job descriptions with high granularity.
    
    CRITICAL INSTRUCTIONS:
    1. PRIORITIZE SKILLS: Evaluate specific library/language matches. If a job requires "React" and the user has "React", that is a high-value match.
    2. EXPERIENCE RELEVANCE: Look for title and bullet point alignment.
    3. SCORING: 
       - 90-100: Exceptional match in both skills and seniority.
       - 70-89: Strong match with minor skill gaps.
       - 40-69: Partial match, significant upskilling required.
       - 0-39: Poor match.

    4. REASONING: provide a detailed breakdown including:
       a) Matching Skills: Specific keywords found in both.
       b) Missing Skills: Critical requirements not found in resume.
       c) Seniority Fit: Assessing total years and responsibility levels vs job requirements.

    Resume JSON Data:
    ${JSON.stringify(resumeParsed)}

    Target Job Descriptions:
    ${JSON.stringify(jobDescriptions)}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            jobId: { type: Type.STRING },
            score: { type: Type.INTEGER },
            reasoning: { type: Type.STRING },
            matchedSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
            missingSkills: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        }
      }
    }
  });
  return JSON.parse(result.text);
}

export async function tailorApplication(resumeRaw: string, jobDescription: string) {
  const result = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Create a tailored resume and cover letter based on this original resume and job description. Do not make up facts. Focus on highlighting relevant experience.\n\nOriginal Resume:\n${resumeRaw}\n\nJob Description:\n${jobDescription}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          tailoredResume: { type: Type.STRING },
          coverLetter: { type: Type.STRING },
          metadata: { 
            type: Type.OBJECT,
            properties: {
              focusKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
              improvementNotes: { type: Type.STRING }
            }
          }
        }
      }
    }
  });
  return JSON.parse(result.text);
}

export async function searchRemoteJobs(query: string) {
  const result = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Find 5 sample remote job postings for "${query}" from varied sources. Return a list of JSON objects with title, company, description, location (Remote), url, source, and is_remote (true).`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            company: { type: Type.STRING },
            description: { type: Type.STRING },
            location: { type: Type.STRING },
            url: { type: Type.STRING },
            source: { type: Type.STRING },
            is_remote: { type: Type.BOOLEAN }
          }
        }
      }
    }
  });
  return JSON.parse(result.text);
}
