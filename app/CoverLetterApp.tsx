"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Wordmark } from "./Logo";

type ResumeInfo = {
  fileName: string;
  updatedAt: string;
} | null;

export function CoverLetterApp({ initialResume }: { initialResume: ResumeInfo }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [resume, setResume] = useState<ResumeInfo>(initialResume);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [jobTitle, setJobTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [jobDescription, setJobDescription] = useState("");

  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [coverLetter, setCoverLetter] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append("resume", file);

    try {
      const res = await fetch("/api/resume", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setUploadError(data.error ?? "Couldn't attach that resume. Try again.");
        return;
      }

      setResume({ fileName: data.fileName, updatedAt: data.updatedAt });
    } catch {
      setUploadError("Couldn't attach that resume. Try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setGenerating(true);
    setGenerateError(null);
    setCoverLetter(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobTitle, companyName, jobDescription }),
      });
      const data = await res.json();

      if (!res.ok) {
        setGenerateError(data.error ?? "Couldn't write the letter. Try again.");
        return;
      }

      setCoverLetter(data.coverLetter);
    } catch {
      setGenerateError("Couldn't write the letter. Try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleCopy() {
    if (!coverLetter) return;
    await navigator.clipboard.writeText(coverLetter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    if (!coverLetter) return;
    const blob = new Blob([coverLetter], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cover-letter.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-border px-6 py-4 lg:px-12">
        <Wordmark className="text-lg" markClassName="text-accent" />
        <button
          onClick={handleSignOut}
          className="rounded-md px-3 py-1.5 text-sm text-text-muted transition-colors hover:bg-bg-dim hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-soft"
        >
          Sign out
        </button>
      </header>

      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-6 py-10 lg:grid-cols-[380px_1fr] lg:gap-12 lg:px-12 lg:py-14">
        <div className="flex flex-col gap-8">
          <section className="flex flex-col gap-3">
            <h2 className="font-mono text-xs font-medium uppercase tracking-widest text-text-muted">
              Resume
            </h2>

            {resume ? (
              <div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-4">
                <DocumentIcon className="h-8 w-8 shrink-0 text-accent" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text">{resume.fileName}</p>
                  <p className="font-mono text-xs text-text-muted">
                    Updated {new Date(resume.updatedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="shrink-0 text-sm font-medium text-accent underline-offset-4 hover:underline disabled:opacity-50"
                >
                  Replace
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-bg-dim px-4 py-8 text-center transition-colors hover:border-accent hover:bg-accent-soft/40">
                <DocumentIcon className="h-8 w-8 text-text-muted" />
                <span className="text-sm font-medium text-text">Attach your resume</span>
                <span className="font-mono text-xs text-text-muted">PDF, up to 10MB</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  disabled={uploading}
                  className="sr-only"
                />
              </label>
            )}

            {resume && (
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                disabled={uploading}
                className="sr-only"
              />
            )}

            {uploading && (
              <p className="font-mono text-xs text-text-muted">Reading your resume…</p>
            )}
            {uploadError && (
              <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
                {uploadError}
              </p>
            )}
          </section>

          <form onSubmit={handleGenerate} className="flex flex-col gap-4">
            <h2 className="font-mono text-xs font-medium uppercase tracking-widest text-text-muted">
              Job details
            </h2>

            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Job title
              <input
                required
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className="rounded-md border border-border bg-surface px-3 py-2.5 text-sm text-text outline-none transition-colors focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent-soft"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Company name
              <input
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="rounded-md border border-border bg-surface px-3 py-2.5 text-sm text-text outline-none transition-colors focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent-soft"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Job description
              <textarea
                required
                rows={7}
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                className="rounded-md border border-border bg-surface px-3 py-2.5 text-sm text-text outline-none transition-colors focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent-soft"
              />
            </label>

            <button
              type="submit"
              disabled={!resume || generating}
              className="mt-1 rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-contrast transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:bg-bg-dim disabled:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-soft focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            >
              {generating ? "Writing…" : "Write my letter"}
            </button>
            {generateError && (
              <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
                {generateError}
              </p>
            )}
          </form>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-mono text-xs font-medium uppercase tracking-widest text-text-muted">
              Your letter
            </h2>
            {coverLetter && (
              <div className="flex gap-4">
                <button
                  onClick={handleCopy}
                  className="text-sm font-medium text-accent underline-offset-4 hover:underline"
                >
                  {copied ? "Copied" : "Copy text"}
                </button>
                <button
                  onClick={handleDownload}
                  className="text-sm font-medium text-accent underline-offset-4 hover:underline"
                >
                  Download .txt
                </button>
              </div>
            )}
          </div>

          <div className="rounded-lg bg-[#ffffff] p-8 text-[#20242c] shadow-[0_1px_2px_rgba(20,24,31,0.06),0_8px_24px_rgba(20,24,31,0.08)] sm:p-12">
            {generating ? (
              <div className="flex flex-col gap-3">
                {[100, 92, 96, 60, 100, 88, 40].map((width, i) => (
                  <div
                    key={i}
                    className="h-3 rounded motion-safe:animate-pulse"
                    style={{ width: `${width}%`, backgroundColor: "#EDEAE2" }}
                  />
                ))}
              </div>
            ) : coverLetter ? (
              <div className="animate-letter-in flex flex-col gap-6">
                <div className="flex flex-col gap-1 border-b border-[#e4ddcf] pb-4 font-mono text-xs uppercase tracking-widest text-[#8a8f99]">
                  <span>{today}</span>
                  <span>
                    Re: {jobTitle} — {companyName}
                  </span>
                </div>
                <p className="whitespace-pre-wrap font-letter text-[15px] leading-relaxed">
                  {coverLetter}
                </p>
              </div>
            ) : (
              <div className="ruled-paper flex min-h-[24rem] items-start justify-center pt-16">
                <p className="max-w-xs text-center font-letter italic text-[#9a9fa8]">
                  Your tailored letter will appear here once you write one.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M14 3v5h5" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M9 13h6M9 17h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
