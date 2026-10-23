"use client";

import { useEffect, useState } from "react";
import { api, Header } from "./ui";
import Start from "./Start";
import ChatBuilder from "./ChatBuilder";
import Home from "./Home";
import AuthModal from "./AuthModal";

export default function App({ hubUrl, signedIn, google, captchaKey }) {
  const [me, setMe] = useState(null);
  const [screen, setScreen] = useState(signedIn ? "loading" : "start");
  const [error, setError] = useState("");
  // Visitors can look around; the popup opens when they try to start. `then` runs once they are in.
  const [auth, setAuth] = useState(null);

  useEffect(() => {
    if (!signedIn) return;
    api("/api/me")
      .then((d) => {
        setMe(d);
        setScreen(d.hasProfile ? "home" : "start");
      })
      .catch((e) => {
        if (e.status === 401) return setScreen("start");
        setError(e.message);
        setScreen("start");
      });
  }, [signedIn]);

  const onProfile = (d) => {
    setMe(d);
    setScreen("home");
    window.scrollTo({ top: 0 });
  };

  /** Run `then` now if signed in, otherwise ask them to sign up first and run it after. */
  const requireAuth = (lead, then) => {
    if (me) return then();
    setAuth({ mode: "signup", lead, then });
  };

  async function onAuthed() {
    const d = await api("/api/me");
    const then = auth?.then;
    setAuth(null);
    setMe(d);
    setError("");
    // Someone who already made a profile goes straight to their companies.
    if (d.hasProfile) return onProfile(d);
    then?.();
  }

  return (
    <>
      <Header me={me} hubUrl={hubUrl} onLogin={screen === "loading" ? null : () => setAuth({ mode: "login" })} />
      {screen === "loading" && (
        <div className="wrap" style={{ padding: "80px 24px", display: "flex", justifyContent: "center" }}>
          <span className="spin dark" aria-label="Loading" />
        </div>
      )}
      {error && <div className="wrap" style={{ paddingTop: 16 }}><p className="alert err">{error}</p></div>}
      {screen === "start" && (
        <Start
          onDone={onProfile}
          onChat={() => requireAuth("Make a free account so your answers and your new resume are saved.", () => setScreen("chat"))}
          requireAuth={requireAuth}
        />
      )}
      {screen === "chat" && <ChatBuilder onDone={onProfile} onBack={() => setScreen(me?.hasProfile ? "home" : "start")} />}
      {screen === "home" && me && (
        <Home me={me} setMe={setMe} onRebuild={() => { setScreen("chat"); window.scrollTo({ top: 0 }); }} />
      )}
      <AuthModal
        google={google}
        captchaKey={captchaKey}
        open={!!auth}
        mode={auth?.mode}
        lead={auth?.lead}
        onSuccess={onAuthed}
        onClose={() => setAuth(null)}
      />
    </>
  );
}
