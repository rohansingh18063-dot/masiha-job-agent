"use client";

import { useEffect, useState } from "react";
import { Icon } from "./ui";

/*
 * A Gmail link cannot carry an attachment, so we help with the resume file (PDF, or the Word file they uploaded):
 * - Phones: the share menu hands the PDF, subject and email to the Gmail app in one go.
 * - Computers: the PDF downloads once when they open Gmail, ready to attach from Downloads.
 */
const typeOf = (name) => (name.endsWith(".docx") ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : "application/pdf");

function canShareFiles(name) {
  if (!navigator.canShare || !window.matchMedia("(pointer: coarse)").matches) return false;
  try {
    return navigator.canShare({ files: [new File([""], name, { type: typeOf(name) })] });
  } catch {
    return false;
  }
}

// Fetched ahead of time: phones only allow the share menu right after a tap, so there is no time to download then.
const pdfFiles = new Map();
function resumePdf(url, name) {
  if (!pdfFiles.has(url)) {
    pdfFiles.set(url, fetch(url)
      .then((r) => { if (!r.ok) throw new Error("Resume not found"); return r.blob(); })
      .then((b) => new File([b], name, { type: typeOf(name) }))
      .catch((e) => { pdfFiles.delete(url); throw e; }));
  }
  return pdfFiles.get(url);
}

// One download per resume version, not one per email.
const downloaded = new Set();
function downloadOnce(url, name) {
  if (downloaded.has(url)) return;
  downloaded.add(url);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function gmailLink(to, subject, body) {
  const enc = encodeURIComponent;
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${enc(to)}&su=${enc(subject)}&body=${enc(body)}`;
}

function mailtoLink(to, subject, body) {
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function siteHost(url) {
  try {
    return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function TrustBadge({ trust, text }) {
  if (trust == null && !text) return <span className="badge plain" title="This company has no trust rating yet">Trust: not rated</span>;
  const level = trust == null ? "" : trust >= 75 ? "hi" : trust >= 50 ? "mid" : "lo";
  return (
    <span className={`badge trust ${level}`} title="How likely this email reaches the company's HR team">
      <Icon name="shield" size={13} /> Trust {text || `${trust}%`}
    </span>
  );
}

export default function CompanyCard({ company: c, mode, draft, busy, canSend, resumeUrl, resumeFile, showState, onDraft, onChange, onOpened, onSent, onReplied }) {
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [phone, setPhone] = useState(false);
  const [shareMsg, setShareMsg] = useState("");
  // A freshly written email opens; emails saved from before start folded so the list stays short.
  const [expanded, setExpanded] = useState(!draft);
  const opened = Boolean(draft?.openedAt);
  const hasDraft = Boolean(draft);
  const host = siteHost(c.website);

  useEffect(() => {
    if (!hasDraft || !canShareFiles(resumeFile)) return;
    setPhone(true);
    resumePdf(resumeUrl, resumeFile).catch(() => {});
  }, [hasDraft, resumeUrl, resumeFile]);

  async function share() {
    setShareMsg("");
    try {
      const file = await resumePdf(resumeUrl, resumeFile);
      navigator.clipboard?.writeText(c.hrEmail).catch(() => {});
      await navigator.share({ files: [file], title: draft.subject, text: draft.body });
      onOpened(true);
    } catch (e) {
      if (e?.name !== "AbortError") setShareMsg("Could not open the share menu. Use “Open Gmail” and attach your resume there.");
    }
  }

  function openGmail() {
    if (!phone) downloadOnce(resumeUrl, resumeFile);
    onOpened(true);
  }

  const copy = async () => {
    await navigator.clipboard.writeText(`To: ${c.hrEmail}\nSubject: ${draft.subject}\n\n${draft.body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <article className={`co${opened ? " asking" : ""}`}>
      <div className="co-top">
        <div className="co-body">
          <h3>
            {c.name} <TrustBadge trust={c.trust} text={c.trustText} />
            {mode === "open" && draft && !expanded && !opened && <span className="badge ok"><Icon name="check" size={13} /> Email ready</span>}
          </h3>
          <div className="facts">
            <span><Icon name="pin" size={15} /> {c.city}{showState ? `, ${c.state}` : ""}</span>
            {host && (
              <a href={/^https?:\/\//i.test(c.website) ? c.website : `https://${host}`} target="_blank" rel="noopener nofollow">
                <Icon name="globe" size={15} /> {host}
              </a>
            )}
            <span className="mail" title="HR email">
              <Icon name="mail" size={15} /> {c.hrEmail}
              {c.guessed && <em title="This address is our best guess, not confirmed"> (guess)</em>}
            </span>
          </div>
        </div>

        {mode === "open" && !draft && (
          <button className="btn btn-line btn-sm" onClick={() => onDraft(false)} disabled={busy}>
            {busy ? <span className="spin dark" /> : <Icon name="spark" size={16} />} {busy ? "Writing" : "Write email"}
          </button>
        )}

        {mode === "open" && draft && (
          <button
            className="btn btn-line btn-sm"
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
            aria-controls={`email-${c.id}`}
          >
            {expanded ? "Hide email" : "Show email"} <span className={`chev${expanded ? " up" : ""}`}><Icon name="chevron" size={16} /></span>
          </button>
        )}

        {mode === "sent" && (
          <div className="row">
            <span className="badge plain">Emailed {new Date(c.sentAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
            {c.sameHr ? (
              <span className="badge plain" title="You already emailed this HR address for another company">Same HR as an earlier email</span>
            ) : c.replied ? (
              <button className="btn btn-ghost btn-sm" onClick={() => onReplied(false)}>Undo reply</button>
            ) : (
              <button className="btn btn-line btn-sm" onClick={() => onReplied(true)}><Icon name="check" size={16} /> They replied</button>
            )}
          </div>
        )}
      </div>

      {mode === "open" && draft && (expanded || opened) && (
        <div className="draft" id={`email-${c.id}`}>
          {expanded && <>
            <div className="to">To: {c.hrEmail}</div>
            <label className="field">
              Subject
              <input value={draft.subject} maxLength={150} onChange={(e) => onChange({ ...draft, subject: e.target.value })} />
            </label>
            <label className="field">
              Email
              <textarea value={draft.body} maxLength={2500} onChange={(e) => onChange({ ...draft, body: e.target.value })} />
            </label>
            <div className="attach warn" role="note">
              <Icon name="clip" size={18} />
              {phone ? (
                <span>
                  <b>Your resume is attached for you.</b> Press “Send with resume”, then pick <b>Gmail</b>. We copy the
                  HR email, so just paste it in the “To” box and press Send.
                </span>
              ) : (
                <span>
                  <b>Attach your resume in Gmail before you press Send.</b> Your resume downloads when you open Gmail.
                  In Gmail, click the paperclip (📎) and choose <b>{resumeFile}</b> from your Downloads folder.
                </span>
              )}
              <a className="btn btn-line btn-sm" href={resumeUrl} download={resumeFile} onClick={() => downloaded.add(resumeUrl)}>
                <Icon name="file" size={16} /> Download resume
              </a>
            </div>
            {shareMsg && <p className="alert err" style={{ margin: 0 }}>{shareMsg}</p>}
          </>}
          {opened && (
            <div className="confirm" role="status">
              <span>
                <b>Did this email go out?</b> Check the “Sent” folder in Gmail. If it is there, press Yes and this
                company moves to “Contacted”. If something went wrong, press No and send it again.
              </span>
              <div className="row">
                <button
                  className="btn btn-iris btn-sm"
                  disabled={saving}
                  onClick={async () => { setSaving(true); await onSent(); setSaving(false); }}
                >
                  {saving ? <span className="spin" /> : <Icon name="check" size={16} />} Yes, I sent it
                </button>
                <button className="btn btn-line btn-sm" disabled={saving} onClick={() => onOpened(false)}>No, not sent</button>
              </div>
            </div>
          )}
          {expanded && (
            <div className="row">
              {canSend && phone && (
                <button className={`btn ${opened ? "btn-line" : "btn-iris"}`} onClick={share}>
                  <Icon name="send" size={17} /> {opened ? "Send with resume again" : "Send with resume"}
                </button>
              )}
              {canSend ? (
                <a
                  className={`btn ${opened || phone ? "btn-line" : "btn-iris"}${phone ? " btn-sm" : ""}`}
                  href={gmailLink(c.hrEmail, draft.subject, draft.body)}
                  target="_blank"
                  rel="noopener"
                  onClick={openGmail}
                >
                  {!phone && <Icon name="send" size={17} />} {phone ? "Open Gmail" : opened ? "Open Gmail again" : "Send in Gmail"}
                </a>
              ) : (
                <button className="btn btn-iris" disabled>Daily limit reached</button>
              )}
              <button className="btn btn-line btn-sm" onClick={copy}><Icon name="copy" size={16} /> {copied ? "Copied" : "Copy"}</button>
              <button className="btn btn-ghost btn-sm" onClick={() => onDraft(true)} disabled={busy}>
                {busy ? <span className="spin dark" /> : <Icon name="refresh" size={16} />} Rewrite
              </button>
              {canSend && (
                <a className="btn btn-ghost btn-sm" href={mailtoLink(c.hrEmail, draft.subject, draft.body)} onClick={openGmail}>Other mail app</a>
              )}
            </div>
          )}
        </div>
      )}
    </article>
  );
}
