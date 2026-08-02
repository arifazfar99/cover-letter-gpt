import { NextResponse } from "next/server";
import { OpenAI } from "openai";
import { createClient } from "@/lib/supabase/server";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `Act as an elite career strategist and executive-level cover letter writer. You will be given a job description along with the job applicant's resume. You will create a highly personalized cover letter for the applicant, based on their resume and the provided job description.
Requirements:
1. Align the applicant's experience with the job description.
2. Use compelling storytelling to show career growth and impact.
3. Include strategic opening and closing hooks that capture recruiter attention.
4. Highlight quantifiable achievements from the resume.
5. Naturally integrate job-specific keywords for ATS optimization.
6. Keep to 3-5 well-crafted paragraphs, formatted for professional presentation.
7. Ensure language is polished, natural, and persuasive at an executive standard.`;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const jobTitle = typeof body?.jobTitle === "string" ? body.jobTitle.trim() : "";
  const companyName =
    typeof body?.companyName === "string" ? body.companyName.trim() : "";
  const jobDescription =
    typeof body?.jobDescription === "string" ? body.jobDescription.trim() : "";

  if (!jobTitle || !companyName || !jobDescription) {
    return NextResponse.json(
      { error: "Missing job title, company name, or job description" },
      { status: 400 }
    );
  }

  const { data: resume, error: resumeError } = await supabase
    .from("resumes")
    .select("parsed_text")
    .eq("user_id", user.id)
    .maybeSingle();

  if (resumeError) {
    console.error("Supabase resume fetch error:", resumeError);
    return NextResponse.json({ error: "Failed to load resume" }, { status: 500 });
  }

  if (!resume) {
    return NextResponse.json({ error: "Upload a resume first" }, { status: 400 });
  }

  const messages = [
    { role: "system" as const, content: SYSTEM_PROMPT },
    {
      role: "user" as const,
      content: `My Resume: ${resume.parsed_text}. Job title: ${jobTitle}. Company name: ${companyName}. Job Description: ${jobDescription}.`,
    },
  ];

  try {
    const completion = await openai.chat.completions.create({
      messages,
      model: "gpt-5-mini",
    });

    const coverLetter = completion.choices[0].message.content;
    return NextResponse.json({ coverLetter });
  } catch (error) {
    console.error("OpenAI API error:", error);
    return NextResponse.json(
      { error: "Failed to generate cover letter" },
      { status: 500 }
    );
  }
}
