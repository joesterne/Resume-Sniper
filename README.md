# ResumeSniper

**ResumeSniper** is an AI-powered remote job intelligence platform and tailored application engine. It scrubs live remote job listings, performs deep granular skill matching against candidate resumes, generates tailored resumes and cover letters with PDF exports, tracks opportunities through an interactive drag-and-drop Kanban pipeline, and sends automated email alerts for high-fit roles.

---

## Table of Contents

- [Overview & Architecture](#overview--architecture)
- [Key Features](#key-features)
  - [1. Profile & Resume Intelligence](#1-profile--resume-intelligence)
  - [2. Remote Job Scraping & Advanced Filtering](#2-remote-job-scraping--advanced-filtering)
  - [3. Granular Match Scoring & Skill Highlighting](#3-granular-match-scoring--skill-highlighting)
  - [4. Tailored Document Generation & PDF Export](#4-tailored-document-generation--pdf-export)
  - [5. Application Pipeline & Drag-and-Drop Kanban Board](#5-application-pipeline--drag-and-drop-kanban-board)
  - [6. Automated Job Alerts & Email Dispatcher](#6-automated-job-alerts--email-dispatcher)
- [Technology Stack](#technology-stack)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Database Schema (Firestore)](#database-schema-firestore)
- [Getting Started](#getting-started)
- [Security & Compliance](#security--compliance)

---

## Overview & Architecture

ResumeSniper combines an Express backend with a Vite + React 19 single-page frontend. Google Cloud Firestore handles persistent storage for user profiles, scrubbed job listings, and application lifecycle documents, while Google Gemini models drive parsing, job discovery, granular fit analysis, and tailored document drafting.

```
                      +-----------------------------------+
                      |         React 19 Frontend         |
                      |   (Vite, Tailwind CSS, Motion)    |
                      +-----------------+-----------------+
                                        |
                             REST API / SPA Proxy
                                        |
                      +-----------------v-----------------+
                      |          Express Server           |
                      |     (server.ts / Node.js runtime) |
                      +--------+------------------+-------+
                               |                  |
               +---------------+                  +---------------+
               |                                                  |
     +---------v---------+                              +---------v---------+
     |   Google Gemini   |                              |  Cloud Firestore  |
     |   (@google/genai) |                              |  (firebase-admin) |
     +-------------------+                              +-------------------+
```

---

## Key Features

### 1. Profile & Resume Intelligence
- **AI Resume Parsing**: Extracts structured entities (name, contact info, skills, work experience with impact bullets, and education) from raw text.
- **In-App Profile Editor**: Modify parsed candidate credentials, reorder experience bullets, and adjust skill tags.
- **LinkedIn OAuth Integration**: Sync candidate identity and contact data directly via LinkedIn OAuth 2.0.

### 2. Remote Job Scraping & Advanced Filtering
- **Automated Web Scrubbing**: Searches and aggregates remote engineering and tech positions via Gemini.
- **Company Name Filtering**: Live case-insensitive search bar with instant clear and quick-select company badges.
- **Sorting Controls**: Sort opportunities by **Date Added** (Newest / Oldest) or **Match Score** (Highest / Lowest).
- **Opportunity Removal**: Delete jobs with a safety confirmation prompt.

### 3. Granular Match Scoring & Skill Highlighting
- **Deep Compatibility Analysis**: Evaluates resume experience against requirements, returning a 0–100% score with detailed rationale.
- **Skill Gap Identification**: Pinpoints both matched competencies and missing qualifications.
- **Readable Card Expansion**: Expandable job descriptions with matched skills highlighted in real-time.

### 4. Tailored Document Generation & PDF Export
- **Customized Resumes & Cover Letters**: Generates customized resumes and targeted cover letters tailored to specific job listings.
- **Pre-Commit Studio**: Review and edit generated documents before saving or submitting.
- **Server-Side PDF Rendering**: Generates downloadable PDF application packets using `pdfkit` via `/api/documents/:id/pdf`.

### 5. Application Pipeline & Drag-and-Drop Kanban Board
- **5 Application Lifecycle Stages**:
  - `Drafted` (`00 // DRAFT`): Tailored documents saved for later submission.
  - `Applied` (`01 // APPLIED`): Submitted applications currently in review.
  - `Interviewing` (`02 // INTERVIEWING`): Recruiter screens, technical assessments, and final rounds.
  - `Offer` (`03 // OFFER`): Formal offers extended (triggers celebratory confetti animations).
  - `Rejected` (`04 // REJECTED`): Closed or archived requisitions.
- **HTML5 Drag-and-Drop**: Native drag-and-drop between columns with optimistic UI updates and server persistence.
- **Accessible Stage Changer**: Dropdown selector on every card for 1-click stage switching on touch screens.
- **Pipeline Search & Metrics**: Real-time filtering by company/title, with active stage counters.
- **Dual View Modes**: Seamless toggle between the visual **Kanban Board** and the tabular **Table Ledger**.

### 6. 'Career Velocity' Analytics Dashboard
- **Recharts Data Visualization**: Interactive charts mapping job application frequency and cumulative velocity over time based on Firestore history records.
- **Dual Visual Modes**:
  - **Cumulative Trend**: Smooth gradient Area Chart depicting total volume growth over time.
  - **Daily Volume**: Discrete Bar Chart showcasing application dispatch bursts per calendar day.
- **Velocity Metrics Strip**:
  - **Total Applications**: Lifetime tailored & submitted applications.
  - **7-Day Velocity**: Applications dispatched per week with relative pace percentage comparison.
  - **Active Funnel**: Total opportunities progressing through Interview and Offer stages.
  - **Funnel Conversion**: Stage progression rate calculated against overall volume.
- **Interactive Controls**: Timeframe slicing (`7d`, `14d`, `30d`, `All Time`), custom dark monospace tooltips with date breakdowns, and collapsible view states.

### 7. Automated Job Alerts & Email Dispatcher
- **Scheduled Background Cron**: Evaluates candidate profiles against fresh remote job postings on a recurring 12-hour schedule.
- **High-Fit Filtering**: Filters opportunities meeting or exceeding an 80% match threshold.
- **HTML Email Delivery**: Formats and dispatches notification emails via SMTP using `nodemailer`.
- **Manual Trigger**: Admin endpoint (`/api/admin/trigger-alerts`) for instant on-demand job scrubbing and notifications.

---

## Technology Stack

- **Frontend**: React 19, TypeScript, Recharts, Tailwind CSS v4, Motion (Framer Motion), Lucide React, Canvas Confetti.
- **Backend**: Express.js, TypeScript, TSX, Node.js.
- **AI & LLM**: Google Gemini API via `@google/genai`.
- **Database**: Google Cloud Firestore (via `firebase-admin` and client SDK).
- **PDF Generation**: PDFKit.
- **Scheduling & Notifications**: `node-cron`, `nodemailer`.
- **Authentication**: LinkedIn OAuth 2.0.

---

## Environment Variables

Copy `.env.example` to `.env` and provide your credentials:

```bash
cp .env.example .env
```

| Variable | Description | Required |
|---|---|---|
| `GEMINI_API_KEY` | Google Gemini API key for parsing, job matching, and document tailoring | Yes |
| `LINKEDIN_CLIENT_ID` | OAuth Client ID for LinkedIn login & profile import | Optional |
| `LINKEDIN_CLIENT_SECRET` | OAuth Client Secret for LinkedIn authentication | Optional |
| `SMTP_HOST` | Outgoing SMTP host (e.g., `smtp.gmail.com`) | Optional (for alerts) |
| `SMTP_PORT` | SMTP port (`587` for STARTTLS, `465` for SSL) | Optional |
| `SMTP_USER` | Email username / address for alerts | Optional |
| `SMTP_PASS` | App password / token for email authentication | Optional |
| `EMAIL_FROM` | Sender display name and email address | Optional |

*Note: Firebase configuration is loaded automatically from `firebase-applet-config.json`.*

---

## API Reference

### Profile Management
- `GET /api/profile/:email` — Retrieve candidate profile and parsed resume data.
- `POST /api/profile` — Create or update user profile with raw and parsed resume text.

### Jobs
- `GET /api/jobs` — Retrieve scrubbed remote job opportunities (sorted by creation date).
- `POST /api/jobs/bulk` — Batch-insert scrubbed job listings into Firestore.
- `DELETE /api/jobs/:id` — Remove a job posting from the database.

### Tailoring & Submissions
- `POST /api/tailor` — Save a drafted tailored resume and cover letter package.
- `POST /api/applications/submit` — Submit an application directly and transition to the `applied` stage.
- `GET /api/documents/:email` — Retrieve user application document ledger and stages.
- `PATCH /api/documents/:id/status` — Update an application's lifecycle stage (used by Kanban drag-and-drop).
- `DELETE /api/documents/:id` — Delete an application record from the ledger.
- `GET /api/documents/:id/pdf` — Stream and download the combined tailored resume and cover letter PDF.

### Authentication & Background Tasks
- `GET /api/auth/linkedin/url` — Generate LinkedIn OAuth authorization URL.
- `GET /api/auth/linkedin/callback` — LinkedIn OAuth redirect callback handler.
- `POST /api/admin/trigger-alerts` — Manually trigger background job alert evaluation and email dispatch.
- `GET /api/health` — Service health check.

---

## Database Schema (Firestore)

Defined in `firebase-blueprint.json` and secured via `firestore.rules`:

### Collections
1. **`users/{email}`** (`UserProfile`):
   - `email`: Candidate email string.
   - `resume_raw`: Raw unformatted resume text.
   - `resume_parsed`: Structured JSON object with skills, experience, and education.
   - `updated_at`: Server timestamp.

2. **`jobs/{jobId}`** (`Job`):
   - `title`, `company`, `description`, `location`, `url`, `source`, `is_remote`.
   - `score`, `reasoning`: Compatibility metrics.
   - `created_at`: Server timestamp.

3. **`documents/{docId}`** (`ApplicationDocument`):
   - `user_email`: Owner email reference.
   - `job_id`: Associated job reference.
   - `title`, `company`: Target position information.
   - `resume_text`, `cover_letter_text`: Tailored document content.
   - `metadata`: Keyword focus and AI improvement notes.
   - `status`: Lifecycle stage (`draft`, `applied`, `interviewing`, `offer`, `rejected`).
   - `created_at`, `updated_at`: Server timestamps.

---

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Set up `.env` with your `GEMINI_API_KEY` (see [Environment Variables](#environment-variables)).

### 3. Run Development Server
```bash
npm run dev
```
The application will start on `http://localhost:3000`.

### 4. Build for Production
```bash
npm run build
npm start
```

---

## Security & Compliance

- **Secrets Isolation**: `.gitignore` strictly blocks all `.env` files, certificates, private keys, service account JSON files, and credential patterns from being committed.
- **Attribute-Based Access Control**: Firestore security rules restrict candidate document access strictly to the verified document owner.
- **Optimistic Concurrency**: Stage transitions synchronize across `documents` and `applications` collections with automatic rollback on network failure.
