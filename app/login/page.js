import { redirect } from "next/navigation";
import AuthForm from "../_components/AuthForm";
import { currentUser } from "@/lib/auth";
import { googleEnabled } from "@/lib/google";
import { HUB_URL } from "@/lib/config";

export const dynamic = "force-dynamic";
export const metadata = { title: "Log in · Masiha Job Agent" };

// Shown when "Continue with Google" comes back here instead of logging in.
const GOOGLE_ERRORS = {
  google_cancelled: "Google sign-in was cancelled. You can try again, or use your username.",
  google_expired: "That Google sign-in took too long. Please press Continue with Google again.",
  google_failed: "We could not sign you in with Google. Please try again, or use your username.",
  google_off: "Google sign-in is not set up yet. Please use your username.",
  google_limit: "Too many new accounts from here right now. Please try again later.",
};

export default async function LoginPage({ searchParams }) {
  if (await currentUser()) redirect("/");
  const { error } = await searchParams;
  return <AuthForm mode="login" hubUrl={HUB_URL} google={googleEnabled()} notice={GOOGLE_ERRORS[error] || ""} />;
}
