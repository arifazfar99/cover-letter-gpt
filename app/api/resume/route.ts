import { NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("resumes")
    .select("file_name, updated_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Supabase resume status error:", error);
    return NextResponse.json(
      { error: "Failed to fetch resume status" },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json({ hasResume: false });
  }

  return NextResponse.json({
    hasResume: true,
    fileName: data.file_name,
    updatedAt: data.updated_at,
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("resume");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing resume file" }, { status: 400 });
  }

  if (
    file.type !== "application/pdf" &&
    !file.name.toLowerCase().endsWith(".pdf")
  ) {
    return NextResponse.json({ error: "Resume must be a PDF" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "Resume file is too large (max 10MB)" },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let parsedText: string;
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    parsedText = result.text;
  } catch (error) {
    console.error("Error parsing PDF:", error);
    return NextResponse.json({ error: "Failed to parse PDF" }, { status: 500 });
  } finally {
    await parser.destroy();
  }

  if (!parsedText.trim()) {
    return NextResponse.json(
      { error: "Could not extract any text from this PDF" },
      { status: 400 }
    );
  }

  // Fixed per-user path (not filename-based) so re-uploading always
  // overwrites the same Storage object instead of orphaning the old one.
  const storagePath = `${user.id}/resume.pdf`;
  const admin = createAdminClient();

  const { error: uploadError } = await admin.storage
    .from("resumes")
    .upload(storagePath, buffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    console.error("Supabase storage upload error:", uploadError);
    return NextResponse.json({ error: "Failed to store resume" }, { status: 500 });
  }

  const updatedAt = new Date().toISOString();

  const { error: dbError } = await supabase.from("resumes").upsert({
    user_id: user.id,
    file_name: file.name,
    storage_path: storagePath,
    parsed_text: parsedText,
    updated_at: updatedAt,
  });

  if (dbError) {
    console.error("Supabase resumes upsert error:", dbError);
    return NextResponse.json({ error: "Failed to save resume" }, { status: 500 });
  }

  return NextResponse.json({ fileName: file.name, updatedAt });
}
