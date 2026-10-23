import { getResumeFile, DOCX } from "@/lib/profile";
import { currentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";

/**
 * A student's resume file. Only that student (or the admin) can open it: the link is no longer put in
 * emails, so nobody else ever needs it, and resumes hold phone numbers and addresses.
 */
export async function GET(_req, { params }) {
  const { token } = await params;
  if (!/^[a-f0-9]{24}$/.test(token)) return new Response("Not found", { status: 404 });
  const me = await currentUser();
  if (me?.resumeToken !== token && !(await isAdmin())) return new Response("Not found", { status: 404 });
  const file = await getResumeFile(token);
  if (!file) return new Response("Not found", { status: 404 });
  const word = file.mime === DOCX;
  return new Response(file.bytes, {
    headers: {
      "content-type": file.mime,
      "content-disposition": `${word ? "attachment" : "inline"}; filename="resume.${word ? "docx" : "pdf"}"`,
      "cache-control": "private, no-store",
      "x-robots-tag": "noindex",
    },
  });
}
