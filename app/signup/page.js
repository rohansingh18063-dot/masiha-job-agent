import { redirect } from "next/navigation";
import AuthForm from "../_components/AuthForm";
import { currentUser } from "@/lib/auth";
import { googleEnabled } from "@/lib/google";
import { captchaSiteKey } from "@/lib/captcha";
import { HUB_URL } from "@/lib/config";

export const dynamic = "force-dynamic";
export const metadata = { title: "Create account · Masiha Job Agent" };

export default async function SignupPage() {
  if (await currentUser()) redirect("/");
  return <AuthForm mode="signup" hubUrl={HUB_URL} google={googleEnabled()} captchaKey={captchaSiteKey()} />;
}
