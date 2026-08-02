# Cover Letter GPT

A personal, single-user tool that turns one resume into a tailored cover letter for every job application. Upload your resume once, paste in a job title, company, and description, and get a polished, ATS-friendly cover letter back — no re-uploading, no subscription tiers, no one else's account but yours.

## What it does

- **Sign in** — gated behind a single Supabase Auth account. There's no public sign-up; this app is built for one person.
- **Attach a resume once** — a PDF is parsed server-side and the extracted text is cached in the database. Every future letter reuses that cached text; re-uploading simply replaces it.
- **Generate a letter** — give it a job title, company name, and job description, and it writes a letter grounded in your actual resume content via OpenAI.
- **Copy or download** — the result is shown as a real letter (date, "Re:" line, formatted body) with one-click copy-to-clipboard and `.txt` download.

## Tech stack

- **Framework**: [Next.js 15](https://nextjs.org) (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS 4
- **Auth, database & storage**: [Supabase](https://supabase.com) — Auth (email/password), Postgres, and Storage all in one project
- **AI**: [OpenAI](https://platform.openai.com) (`gpt-5-mini`) via the official SDK
- **PDF parsing**: [`pdf-parse`](https://www.npmjs.com/package/pdf-parse) v2 (the `PDFParse` class API, not the older v1 function API)

Everything runs as a single Next.js app — API routes (`app/api/*`) replace what used to be a separate Express backend. No second server or process to manage.

## Project structure

```
app/
  api/
    resume/route.ts     # POST: upload + parse + cache a resume. GET: current resume status
    generate/route.ts   # POST: generate a cover letter from the cached resume + job details
  login/page.tsx         # Sign-in page
  page.tsx                # Server component — fetches resume status, renders the app
  CoverLetterApp.tsx      # Main client component: upload, job form, result view
  Logo.tsx                # Shared wordmark component
lib/
  supabase/
    client.ts             # Browser Supabase client
    server.ts              # Server Supabase client (Server Components / Route Handlers)
    middleware.ts          # Session refresh + route protection
    admin.ts                # Service-role client (Storage writes only)
middleware.ts             # Applies auth gating to all routes except static assets
```

## Getting started

### 1. Set up Supabase

Create a Supabase project, then run this in the SQL editor:

```sql
create table public.resumes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  parsed_text text not null,
  updated_at timestamptz not null default now()
);

alter table public.resumes enable row level security;

create policy "Users manage their own resume row"
  on public.resumes
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

Then, in the dashboard:
- **Storage** → create a private bucket named `resumes`
- **Authentication → Users** → manually add the one account you'll sign in with
- **Authentication → Settings** → disable public sign-up (this app never exposes a sign-up flow, but it's good defense-in-depth)

### 2. Configure environment variables

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
```

### 3. Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to `/login`.

## Notes

- `pdf-parse` v2 depends on `pdfjs-dist`, which isn't meant to be webpack-bundled. `next.config.ts` sets `serverExternalPackages: ["pdf-parse"]` to keep it external — without this, PDF parsing throws at runtime. If you ever remove or change this, restart the dev server; `next.config.ts` changes aren't hot-reloaded.
- The resume's raw PDF and parsed text are always stored at a fixed per-user path (`{userId}/resume.pdf` in Storage, one row per user in `resumes`), so re-uploading replaces the previous file rather than accumulating orphaned copies.

## Deploy

Deploys like any Next.js app (e.g. [Vercel](https://vercel.com/new)) — just set the four environment variables above in your hosting provider.
