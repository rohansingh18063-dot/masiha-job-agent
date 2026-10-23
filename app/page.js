import App from "./_components/App";
import { currentUser } from "@/lib/auth";
import { googleEnabled } from "@/lib/google";
import { captchaSiteKey } from "@/lib/captcha";
import { HUB_URL } from "@/lib/config";

export const dynamic = "force-dynamic";

// Open to everyone. Visitors are asked to sign up only when they try to upload or build a resume.
export default async function Page() {
  const signedIn = !!(await currentUser());
  return <App hubUrl={HUB_URL} signedIn={signedIn} google={googleEnabled()} captchaKey={captchaSiteKey()} />;
}
