import { createClient } from "@/lib/supabase/server";
import { CoverLetterApp } from "./CoverLetterApp";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: resume } = await supabase
    .from("resumes")
    .select("file_name, updated_at")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <CoverLetterApp
      initialResume={
        resume
          ? { fileName: resume.file_name, updatedAt: resume.updated_at }
          : null
      }
    />
  );
}
