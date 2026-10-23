"use client";

import { useEffect, useRef, useState } from "react";
import { AuthCard } from "./AuthForm";

/** Sign up / log in popup shown when a visitor tries to start without an account. */
export default function AuthModal({ open, mode: startMode = "signup", lead, google, captchaKey, onSuccess, onClose }) {
  const ref = useRef(null);
  const [mode, setMode] = useState(startMode);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      setMode(startMode);
      d.showModal();
    } else if (!open && d.open) {
      d.close();
    }
  }, [open, startMode]);

  return (
    <dialog
      ref={ref}
      className="auth-modal"
      aria-label={mode === "signup" ? "Create your account" : "Log in"}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
    >
      {open && (
        <>
          <button type="button" className="auth-close" onClick={onClose} aria-label="Close">×</button>
          <AuthCard mode={mode} lead={lead} google={google} captchaKey={captchaKey} onSwitch={setMode} onSuccess={onSuccess} />
        </>
      )}
    </dialog>
  );
}
