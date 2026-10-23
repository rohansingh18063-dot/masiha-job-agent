"use client";

import { useRef, useState } from "react";
import { api, Icon } from "./ui";

export default function Start({ onDone, onChat, requireAuth }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [over, setOver] = useState(false);

  // Visitors sign up first, then the file chooser opens.
  const pick = () =>
    requireAuth("Make a free account first, then choose your resume and we will start reading it.", () => input.current?.click());

  // A file dropped by a visitor is kept; we ask them to sign up, then carry on with that same file.
  function upload(file) {
    if (!file) return;
    setError("");
    requireAuth(`Nice, we have ${file.name}. Make a free account and we will start reading it right away.`, () => send(file));
    if (input.current) input.current.value = "";
  }

  async function send(file) {
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      onDone(await api("/api/profile/upload", { method: "POST", form }));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="start">
      <div className="wrap">
        <span className="eyebrow" style={{ color: "#C9BEFF" }}>Step 1 of 2 · Your profile</span>
        <h1 className="h" style={{ marginTop: 12 }}>
          One resume. HR teams across your city. <em>One click each.</em>
        </h1>
        <p className="lead">
          Start with your resume. We write a personal email for each company near you. You review it and send it from your own Gmail.
        </p>

        {error && <p className="alert err" style={{ maxWidth: 900, marginBottom: 16 }}>{error}</p>}

        <div className="choices">
          <div className="choice">
            <span className="ico"><Icon name="upload" color="#fff" size={24} /></span>
            <h2>I have a resume</h2>
            <p>Upload your PDF or Word file. We keep it exactly as it is and only read your details for the emails. It takes a second.</p>
            <div
              className={`drop${over ? " on" : ""}`}
              onClick={pick}
              onDragOver={(e) => { e.preventDefault(); setOver(true); }}
              onDragLeave={() => setOver(false)}
              onDrop={(e) => { e.preventDefault(); setOver(false); upload(e.dataTransfer.files?.[0]); }}
            >
              {busy ? "Reading your resume…" : "Drop your file here, or click to choose (PDF or .docx, max 5 MB)"}
            </div>
            <input
              ref={input}
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              hidden
              onChange={(e) => upload(e.target.files?.[0])}
            />
            <button className="btn btn-iris" disabled={busy} onClick={pick}>
              {busy ? <span className="spin" /> : <Icon name="file" size={18} />} {busy ? "Working on it" : "Upload resume"}
            </button>
          </div>

          <div className="choice alt">
            <span className="ico"><Icon name="chat" color="#0B0A1A" size={24} /></span>
            <h2>Build one with me</h2>
            <p>No resume yet? Answer 9 quick questions, like a chat. We turn your answers into a clean PDF resume.</p>
            <button className="btn btn-ink" onClick={onChat} disabled={busy}>
              <Icon name="spark" size={18} /> Start building
            </button>
          </div>
        </div>

        <div className="steps-row">
          <span><b>1</b>Make your profile once</span>
          <span><b>2</b>Pick your state and city</span>
          <span><b>3</b>Review and send, one click each</span>
        </div>
        {/* Plans preview: what the student gets, in their terms, before any money talk. */}
        <div className="start-plans">
          <div className="start-plans-head">
            <h2>Start free. Reach more companies when you are ready.</h2>
            <p>One city is free for as long as you like. Applying in other cities too? Open all of India for a few days.</p>
          </div>
          <div className="start-plan-row">
            <div className="start-plan">
              <b>Free</b>
              <span>Every company in your city</span>
            </div>
            <div className="start-plan">
              <b>₹99 <small>/ 10 days</small></b>
              <span>Every city and state · about ₹10 a day</span>
            </div>
            <div className="start-plan best">
              <em>Most chosen</em>
              <b>₹199 <small>/ 30 days</small></b>
              <span>Every city and state · under ₹7 a day</span>
            </div>
          </div>
          <p className="start-plans-foot">
            One-time payment, no auto-renewal. <a href="/pricing">Compare plans</a> · <a href="/guide">How it works</a>
          </p>
        </div>
      </div>
    </section>
  );
}
