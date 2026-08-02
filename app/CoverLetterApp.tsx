"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
        setUploadError(data.error ?? "Failed to upload resume");
        return;
      }

      setResume({ fileName: data.fileName, updatedAt: data.updatedAt });
    } catch {
      setUploadError("Failed to upload resume");
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
        setGenerateError(data.error ?? "Failed to generate cover letter");
        return;
      }

      setCoverLetter(data.coverLetter);
    } catch {
      setGenerateError("Failed to generate cover letter");
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

  return (
    <div className="min-h-screen p-8 sm:p-16 max-w-2xl mx-auto flex flex-col gap-8">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Cover Letter GPT</h1>
        <button
          onClick={handleSignOut}
          className="text-sm underline underline-offset-4 hover:no-underline"
        >
          Sign out
        </button>
      </header>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">Resume</h2>
        {resume ? (
          <p className="text-sm text-black/70 dark:text-white/70">
            On file: <span className="font-medium">{resume.fileName}</span>{" "}
            (updated {new Date(resume.updatedAt).toLocaleString()})
          </p>
        ) : (
          <p className="text-sm text-black/70 dark:text-white/70">
            No resume on file yet — upload a PDF to get started.
          </p>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          disabled={uploading}
          className="text-sm"
        />
        {uploading && <p className="text-sm">Uploading and parsing...</p>}
        {uploadError && <p className="text-sm text-red-500">{uploadError}</p>}
      </section>

      <form onSubmit={handleGenerate} className="flex flex-col gap-4">
        <h2 className="text-sm font-medium">Job details</h2>

        <label className="flex flex-col gap-1 text-sm">
          Job title
          <input
            required
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            className="rounded border border-black/[.08] dark:border-white/[.145] bg-transparent px-3 py-2 text-sm"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Company name
          <input
            required
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="rounded border border-black/[.08] dark:border-white/[.145] bg-transparent px-3 py-2 text-sm"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Job description
          <textarea
            required
            rows={6}
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            className="rounded border border-black/[.08] dark:border-white/[.145] bg-transparent px-3 py-2 text-sm"
          />
        </label>

        <button
          type="submit"
          disabled={!resume || generating}
          className="rounded-full bg-foreground text-background font-medium text-sm h-10 disabled:opacity-50"
        >
          {generating ? "Generating..." : "Generate cover letter"}
        </button>
        {generateError && <p className="text-sm text-red-500">{generateError}</p>}
      </form>

      {coverLetter && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium">Result</h2>
          <pre className="whitespace-pre-wrap rounded border border-black/[.08] dark:border-white/[.145] p-4 text-sm font-sans">
            {coverLetter}
          </pre>
          <div className="flex gap-3">
            <button
              onClick={handleCopy}
              className="rounded-full border border-black/[.08] dark:border-white/[.145] px-4 h-9 text-sm"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
            <button
              onClick={handleDownload}
              className="rounded-full border border-black/[.08] dark:border-white/[.145] px-4 h-9 text-sm"
            >
              Download .txt
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
