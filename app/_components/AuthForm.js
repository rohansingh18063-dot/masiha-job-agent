"use client";

import { useEffect, useRef, useState } from "react";
import { api, Header, Icon } from "./ui";

const COPY = {
  login: {
    title: "Welcome back",
    lead: "Log in to see your companies, your emails and your resume.",
    button: "Log in",
    busy: "Logging in",
    switchText: "New here?",
    switchLink: "Create an account",
    switchHref: "/signup",
  },
  signup: {
    title: "Create your account",
    lead: "Make a free account. Your resume and the companies you email are saved to it, so you can log in from any device.",
    button: "Create account",
    busy: "Creating account",
    switchText: "Already have an account?",
    switchLink: "Log in",
    switchHref: "/login",
  },
};

export default function AuthForm({ mode, hubUrl, google, notice, captchaKey }) {
  return (
    <>
      <Header hubUrl={hubUrl} />
      <main className="auth">
        <AuthCard mode={mode} google={google} notice={notice} captchaKey={captchaKey} onSuccess={() => window.location.replace("/")} />
      </main>
    </>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.6 13.3l7.9 6.1C12.4 13.7 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 7l7.4 5.7c4.3-4 6.9-9.9 6.9-17.2z" />
      <path fill="#FBBC05" d="M10.5 28.6A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.6l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.5 2.3-6.3 0-11.6-4.2-13.5-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z" />
    </svg>
  );
}

/** Cloudflare Turnstile "I am human" check, shown on sign-up when it is set up. */
function HumanCheck({ siteKey, onToken }) {
  const box = useRef(null);
  useEffect(() => {
    let id = null;
    let gone = false;
    const draw = () => {
      if (gone || !window.turnstile || !box.current) return;
      id = window.turnstile.render(box.current, {
        sitekey: siteKey,
        callback: onToken,
        "expired-callback": () => onToken(""),
        "error-callback": () => onToken(""),
      });
    };
    if (window.turnstile) draw();
    else {
      let tag = document.querySelector("script[data-turnstile]");
      if (!tag) {
        tag = document.createElement("script");
        tag.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        tag.async = true;
        tag.dataset.turnstile = "1";
        document.head.appendChild(tag);
      }
      tag.addEventListener("load", draw);
    }
    return () => {
      gone = true;
      if (id !== null && window.turnstile) window.turnstile.remove(id);
    };
  }, [siteKey, onToken]);
  return <div ref={box} style={{ minHeight: 65 }} />;
}

/**
 * The log in / sign up form. Used on its own page and inside the sign-in popup.
 * With onSwitch, the "New here?" link flips the mode in place instead of changing page.
 */
export function AuthCard({ mode, onSuccess, onSwitch, lead, google = false, notice = "", captchaKey = "", autoFocus = true }) {
  const t = COPY[mode];
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [agree, setAgree] = useState(false);
  const [captcha, setCaptcha] = useState("");
  const [checkRound, setCheckRound] = useState(0); // a new "I am human" check after each failed try

  const signup = mode === "signup";
  const cleanName = username.trim().toLowerCase();
  const nameOk = /^[a-z0-9][a-z0-9_.]{2,29}$/.test(cleanName);
  const lengthOk = password.length >= 8;
  const matchOk = password === confirm && confirm.length > 0;

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (signup && !nameOk) return setError("Username must be 3 to 30 characters: small letters, numbers, _ or . (start with a letter or number).");
    if (signup && !lengthOk) return setError("Password must be at least 8 characters.");
    if (signup && !matchOk) return setError("The two passwords do not match.");
    if (signup && !agree) return setError("Please tick the box to agree to the privacy policy.");
    if (signup && captchaKey && !captcha) return setError("Please complete the “I am human” check.");
    setBusy(true);
    try {
      await api("/api/auth", { method: "POST", body: { action: mode, username: cleanName, password, ...(signup ? { agree, captcha } : {}) } });
      await onSuccess();
    } catch (err) {
      setError(err.message);
      setBusy(false);
      if (signup && captchaKey) {
        setCaptcha("");
        setCheckRound((n) => n + 1);
      }
    }
  }

  function switchMode(e) {
    if (!onSwitch) return;
    e.preventDefault();
    setError("");
    setConfirm("");
    onSwitch(signup ? "login" : "signup");
  }

  return (
    <form className="auth-card" onSubmit={submit} noValidate>
      <h1 className="h">{t.title}</h1>
      <p className="muted" style={{ margin: 0 }}>{lead || t.lead}</p>

      {notice && <p className="alert err" style={{ margin: 0 }} role="alert">{notice}</p>}
      {google && (
        <>
          <a className="btn btn-line btn-lg google-btn" href="/api/auth/google">
            <GoogleMark /> Continue with Google
          </a>
          <p className="fineprint">By continuing with Google, you agree to our <a href="/privacy" target="_blank" rel="noopener">privacy policy</a>.</p>
          <div className="or"><span>or {signup ? "make a username" : "use your username"}</span></div>
        </>
      )}

      <label className="field">
        Username
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={30}
          placeholder="e.g. rohit_singh"
          required
          autoFocus={autoFocus}
        />
        {signup && <small className={username && !nameOk ? "hint bad" : "hint"}>Small letters, numbers, _ or . · 3 to 30 characters</small>}
      </label>

      <label className="field">
        Password
        <input
          type={show ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={signup ? "new-password" : "current-password"}
          maxLength={200}
          required
        />
        {signup && <small className={password && !lengthOk ? "hint bad" : "hint"}>At least 8 characters. Do not use your username.</small>}
      </label>

      {signup && (
        <label className="field">
          Confirm password
          <input
            type={show ? "text" : "password"}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            maxLength={200}
            required
          />
          {confirm && !matchOk && <small className="hint bad">The two passwords do not match.</small>}
        </label>
      )}

      <label className="row" style={{ gap: 8, fontSize: 14 }}>
        <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> Show password
      </label>

      {signup && (
        <label className="consent">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} required />
          <span>
            I agree to the <a href="/privacy" target="_blank" rel="noopener">privacy policy</a>: my resume and details are
            saved to write emails for me, and I can delete my account at any time.
          </span>
        </label>
      )}
      {signup && captchaKey && <HumanCheck key={checkRound} siteKey={captchaKey} onToken={setCaptcha} />}

      {error && <p className="alert err" style={{ margin: 0 }} role="alert">{error}</p>}

      <button className="btn btn-iris btn-lg" type="submit" disabled={busy}>
        {busy ? <span className="spin" /> : null} {busy ? t.busy : t.button}
      </button>

      <p className="auth-switch">
        {t.switchText} <a href={t.switchHref} onClick={switchMode}>{t.switchLink}</a>
      </p>

      <p className="tip" style={{ margin: 0, display: "flex", gap: 8 }}>
        <Icon name="shield" size={18} />
        <span>
          Your password is stored scrambled, so nobody can read it, not even us.
          {mode === "login" && " Forgot it? Ask the Masiha team to reset it for you."}
        </span>
      </p>
    </form>
  );
}
