"use client";

import { useEffect, useId, useRef, useState } from "react";
import { api, Icon } from "./ui";
import { POPULAR_ROLES } from "@/lib/roles-data";

const THIS_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: THIS_YEAR + 5 - 1980 + 1 }, (_, i) => String(THIS_YEAR + 5 - i));
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const DEGREES = [
  "10th (SSC)", "12th (HSC)", "ITI", "Diploma", "B.A.", "B.Com", "B.Sc", "BBA", "BCA", "B.Tech", "B.E.", "B.Pharm", "B.Ed", "LLB",
  "M.A.", "M.Com", "M.Sc", "MBA", "MCA", "M.Tech", "M.E.", "PhD", "Other",
];
const LANGUAGES = ["English", "Hindi", "Marathi", "Bengali", "Gujarati", "Punjabi", "Urdu", "Tamil", "Telugu", "Kannada", "Malayalam", "Odia"];

/*
 * Each question is either a chat line (text) or a small form. Forms marked `repeat` let the student add
 * as many entries as they need. Answers go to the server as they are, so nothing is lost in parsing.
 */
const QUESTIONS = [
  { key: "name", q: "Hi! Let's build your resume together. What is your full name?", required: true },
  { key: "role", q: "Which job are you looking for?", hint: "Tap one below or type your own.", picks: POPULAR_ROLES },
  { key: "city", q: "Which city and state do you live in?", hint: "e.g. Bhopal, Madhya Pradesh" },
  {
    key: "contact", q: "How can companies reach you?", form: [
      { key: "email", label: "Email", type: "email", required: true, placeholder: "e.g. riya.sharma@gmail.com" },
      { key: "phone", label: "Phone", type: "tel", required: true, placeholder: "e.g. 98765 43210" },
      { key: "linkedin", label: "LinkedIn profile (optional)", placeholder: "e.g. linkedin.com/in/riya-sharma", wide: true },
    ],
  },
  {
    key: "education", q: "Tell me about your education. Start with your highest one.", repeat: "Add another education", form: [
      { key: "degree", label: "Course", type: "select", options: DEGREES, required: true, other: "Course name" },
      { key: "stream", label: "Subject / stream (optional)", placeholder: "e.g. Commerce, Computer Science" },
      { key: "school", label: "College or school", required: true, placeholder: "e.g. Govt. Hamidia College", wide: true },
      { key: "board", label: "University or board (optional)", placeholder: "e.g. Barkatullah University, CBSE", wide: true },
      { key: "start", label: "Start year", type: "select", options: YEARS },
      { key: "end", label: "End year", type: "select", options: ["Pursuing", ...YEARS] },
      { key: "marks", label: "Marks (optional)", placeholder: "e.g. 72% or 8.1 CGPA" },
    ],
  },
  {
    key: "experience", q: "Any jobs or internships?", repeat: "Add another job", skip: "I'm a fresher", form: [
      { key: "role", label: "Job title", required: true, placeholder: "e.g. Accounts Intern" },
      { key: "company", label: "Company", required: true, placeholder: "e.g. ABC Traders" },
      { key: "type", label: "Type", type: "select", options: ["Full-time", "Internship", "Part-time", "Freelance", "Apprenticeship"] },
      { key: "city", label: "City (optional)", placeholder: "e.g. Indore" },
      { key: "start", label: "Started", type: "month" },
      { key: "end", label: "Ended", type: "month", hideIf: "current" },
      { key: "current", label: "I work here now", type: "check", wide: true },
      { key: "work", label: "What did you do? Tap the points that are true, or type your own (one per line)", type: "textarea", wide: true, suggest: "bullets", placeholder: "Handled daily billing in Tally\nPrepared monthly GST returns" },
      { key: "result", label: "Your best result, with a number if you can (optional)", wide: true, placeholder: "e.g. Cut month-end closing time from 5 days to 3 days" },
    ],
  },
  { key: "skills", q: "What are your main skills? Tools, software and subjects you know.", hint: "Tap to add, or type your own. Separate with commas.", suggest: true },
  {
    key: "strengths", q: "Which of these are your strengths? Pick the ones that are true for you.",
    hint: "They go in the Core Competencies section, which recruiters and ATS software look for. Pick at least 3.", form: [
      { key: "picked", label: "Your strengths", type: "chips", options: "strengths", wide: true },
      { key: "own", label: "Add your own (optional, separate with commas)", wide: true, placeholder: "e.g. Client Handling, Report Writing" },
    ],
  },
  {
    key: "projects", q: "Any projects you are proud of?", repeat: "Add another project", skip: "No projects", form: [
      { key: "name", label: "Project name", required: true, placeholder: "e.g. Expense Tracker", wide: true },
      { key: "about", label: "What it does, or what you did. One point per line", type: "textarea", wide: true, placeholder: "A web app to log daily spending\nShows a monthly chart of expenses" },
      { key: "tools", label: "Tools used (optional)", placeholder: "e.g. React, Firebase" },
      { key: "link", label: "Link (optional)", placeholder: "e.g. github.com/riya/expenses" },
    ],
  },
  {
    key: "extras", q: "Almost done! Anything else for your resume?", skip: "Skip", form: [
      { key: "languages", label: "Languages you speak", type: "chips", options: LANGUAGES, wide: true },
      { key: "certificates", label: "Certificates (optional). One per line", type: "textarea", wide: true, placeholder: "Tally Prime certificate, NIIT\nGoogle Digital Marketing" },
      { key: "achievements", label: "Awards or achievements (optional). One per line", type: "textarea", wide: true, placeholder: "College topper 2023\nNSS volunteer" },
    ],
  },
];

const blankEntry = (q) => Object.fromEntries(q.form.map((f) => [f.key, f.type === "check" ? false : f.type === "chips" ? [] : ""]));
const monthText = (v) => (v?.year ? `${v.month ? `${v.month} ` : ""}${v.year}` : "");
const fieldValue = (f, e) => (f.other && e[f.key] === "Other" ? e[`${f.key}Other`] : e[f.key]);

/** What the student sees in their chat bubble after answering a form. */
function summary(q, value) {
  if (value == null || (Array.isArray(value) && !value.length)) return q.skip || "Skipped";
  const one = (e) => {
    if (q.key === "contact") return [e.email, e.phone, e.linkedin].filter(Boolean).join("\n");
    if (q.key === "education") return [fieldValue(q.form[0], e), e.stream, e.school, [e.start, e.end].filter(Boolean).join(" - "), e.marks].filter(Boolean).join(" · ");
    if (q.key === "experience") return [`${e.role} at ${e.company}`, e.type, [monthText(e.start), e.current ? "Present" : monthText(e.end)].filter(Boolean).join(" - ")].filter(Boolean).join(" · ");
    if (q.key === "projects") return e.name;
    if (q.key === "strengths") return [...(e.picked || []), e.own].filter(Boolean).join(", ");
    if (q.key === "extras") return [e.languages?.join(", "), e.certificates, e.achievements].filter(Boolean).join("\n") || "Skipped";
    return "";
  };
  return Array.isArray(value) ? value.map(one).join("\n") : one(value);
}

function validate(q, entries) {
  for (const [i, e] of entries.entries()) {
    for (const f of q.form) {
      if (f.required && !String(fieldValue(f, e) || "").trim()) return `Please fill in "${f.other && e[f.key] === "Other" ? f.other : f.label}"${entries.length > 1 ? ` (entry ${i + 1})` : ""}.`;
    }
    if (q.key === "strengths" && (e.picked?.length || 0) + e.own.split(",").filter((x) => x.trim()).length < 3) {
      return "Please pick at least 3 strengths.";
    }
    if (q.key === "contact") {
      if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(e.email.trim())) return "Please check your email address, e.g. riya.sharma@gmail.com";
      if (e.phone.replace(/\D/g, "").length < 10) return "Please check your phone number. It needs at least 10 digits.";
    }
  }
  return "";
}

function Field({ f, value, entry, set, hints }) {
  const id = useId();
  const options = typeof f.options === "string" ? hints?.[f.options] || [] : f.options;
  if (f.type === "check") {
    return (
      <label className={`row qcheck${f.wide ? " wide" : ""}`}>
        <input type="checkbox" checked={Boolean(value)} onChange={(e) => set(f.key, e.target.checked)} /> {f.label}
      </label>
    );
  }
  if (f.type === "chips") {
    const on = value || [];
    const toggle = (o) => set(f.key, on.includes(o) ? on.filter((x) => x !== o) : [...on, o]);
    return (
      <div className={`field${f.wide ? " wide" : ""}`}>
        {f.label}
        <div className="picks">
          {options.map((o) => (
            <button key={o} type="button" className={`chip${on.includes(o) ? " on" : ""}`} aria-pressed={on.includes(o)} onClick={() => toggle(o)}>{o}</button>
          ))}
        </div>
      </div>
    );
  }
  if (f.type === "month") {
    const v = value || {};
    return (
      <div className={`field${f.wide ? " wide" : ""}`}>
        {f.label}
        <div className="pair">
          <select aria-label={`${f.label} month`} value={v.month || ""} onChange={(e) => set(f.key, { ...v, month: e.target.value })}>
            <option value="">Month</option>
            {MONTHS.map((m) => <option key={m}>{m}</option>)}
          </select>
          <select aria-label={`${f.label} year`} value={v.year || ""} onChange={(e) => set(f.key, { ...v, year: e.target.value })}>
            <option value="">Year</option>
            {YEARS.map((y) => <option key={y}>{y}</option>)}
          </select>
        </div>
      </div>
    );
  }
  return (
    <>
      <label className={`field${f.wide ? " wide" : ""}`} htmlFor={id}>
        {f.label}
        {f.type === "select" ? (
          <select id={id} value={value} onChange={(e) => set(f.key, e.target.value)}>
            <option value="">Choose…</option>
            {options.map((o) => <option key={o}>{o}</option>)}
          </select>
        ) : f.type === "textarea" ? (
          <textarea id={id} rows={3} value={value} maxLength={1500} placeholder={f.placeholder} onChange={(e) => set(f.key, e.target.value)} />
        ) : (
          <input id={id} type={f.type || "text"} value={value} maxLength={200} placeholder={f.placeholder} onChange={(e) => set(f.key, e.target.value)} />
        )}
      </label>
      {f.suggest && hints?.[f.suggest]?.length > 0 && (
        <div className="picks wide">
          {hints[f.suggest].map((line) => {
            const lines = String(value || "").split("\n").map((x) => x.trim()).filter(Boolean);
            const on = lines.includes(line);
            return (
              <button
                key={line}
                type="button"
                className={`chip${on ? " on" : ""}`}
                aria-pressed={on}
                onClick={() => set(f.key, (on ? lines.filter((x) => x !== line) : [...lines, line]).join("\n"))}
              >
                {on ? "✓ " : "+ "}{line}
              </button>
            );
          })}
        </div>
      )}
      {f.other && value === "Other" && (
        <label className="field">
          {f.other}
          <input value={entry[`${f.key}Other`] || ""} maxLength={120} onChange={(e) => set(`${f.key}Other`, e.target.value)} autoFocus />
        </label>
      )}
    </>
  );
}

function FormStep({ q, onSubmit, hints }) {
  const [entries, setEntries] = useState(() => [blankEntry(q)]);
  const [error, setError] = useState("");

  const set = (i) => (key, v) => setEntries((all) => all.map((e, j) => (j === i ? { ...e, [key]: v } : e)));

  function submit(e) {
    e.preventDefault();
    const problem = validate(q, entries);
    if (problem) return setError(problem);
    const clean = entries.map((en) => {
      const out = { ...en };
      for (const f of q.form) if (f.other && out[f.key] === "Other") out[f.key] = (out[`${f.key}Other`] || "").trim();
      for (const f of q.form) delete out[`${f.key}Other`];
      return out;
    });
    onSubmit(q.repeat ? clean : clean[0]);
  }

  return (
    <form className="qform" onSubmit={submit} noValidate>
      {entries.map((entry, i) => (
        <fieldset key={i} className="qentry">
          {q.repeat && entries.length > 1 && (
            <legend className="row" style={{ justifyContent: "space-between", width: "100%" }}>
              <b>{i + 1}.</b>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEntries((all) => all.filter((_, j) => j !== i))}>Remove</button>
            </legend>
          )}
          <div className="qgrid">
            {q.form.filter((f) => !(f.hideIf && entry[f.hideIf])).map((f) => (
              <Field key={f.key} f={f} value={entry[f.key]} entry={entry} set={set(i)} hints={hints} />
            ))}
          </div>
        </fieldset>
      ))}
      {error && <p className="alert err" style={{ margin: 0 }} role="alert">{error}</p>}
      <div className="row">
        <button className="btn btn-iris" type="submit"><Icon name="check" size={17} /> Continue</button>
        {q.repeat && entries.length < 6 && (
          <button type="button" className="btn btn-line btn-sm" onClick={() => setEntries((all) => [...all, blankEntry(q)])}>+ {q.repeat}</button>
        )}
        {q.skip && <button type="button" className="btn btn-ghost btn-sm" onClick={() => onSubmit(q.repeat ? [] : null)}>{q.skip}</button>}
      </div>
    </form>
  );
}

export default function ChatBuilder({ onDone, onBack }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [hints, setHints] = useState(null);
  const end = useRef(null);
  const box = useRef(null);
  const done = step >= QUESTIONS.length;
  const current = QUESTIONS[step];

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    box.current?.focus();
  }, [step, busy]);

  function answer(value) {
    // Once we know the job, fetch its suggested skills, strengths and work points.
    if (current.key === "role") {
      setHints(null);
      api(`/api/role?title=${encodeURIComponent(value)}`).then(setHints).catch(() => {});
    }
    setAnswers((a) => ({ ...a, [current.key]: value }));
    setText("");
    setStep((s) => s + 1);
  }

  function submit(e, picked) {
    e?.preventDefault();
    const value = (picked ?? text).trim();
    if (!value && current.required) return;
    answer(/^skip$/i.test(value) ? "" : value);
  }

  // Tapping a suggested skill adds it to the box (or removes it if it is already there).
  function toggleSkill(s) {
    const list = text.split(",").map((x) => x.trim()).filter(Boolean);
    const has = list.some((x) => x.toLowerCase() === s.toLowerCase());
    setText((has ? list.filter((x) => x.toLowerCase() !== s.toLowerCase()) : [...list, s]).join(", "));
  }

  async function build() {
    setBusy(true);
    setError("");
    try {
      onDone(await api("/api/profile/build", { method: "POST", body: { answers } }));
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }

  const skillPicks = current?.suggest ? hints?.skills || [] : [];
  const chosen = text.toLowerCase().split(",").map((x) => x.trim());

  return (
    <div className="chat-wrap">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1 className="h" style={{ fontSize: 28 }}>Build your resume</h1>
        <button className="btn btn-ghost btn-sm" onClick={onBack} disabled={busy}>Back</button>
      </div>
      <div className="progress" aria-hidden="true"><i style={{ width: `${(Math.min(step, QUESTIONS.length) / QUESTIONS.length) * 100}%` }} /></div>

      <div className="chat" aria-live="polite">
        {QUESTIONS.slice(0, step + 1).map((q, i) => (
          <div key={q.key} style={{ display: "contents" }}>
            <div className="bubble bot">{q.q}{q.hint && <small>{q.hint}</small>}</div>
            {i === step && q.picks && (
              <div className="picks">
                {q.picks.map((r) => <button key={r} type="button" className="chip" onClick={() => submit(null, r)}>{r}</button>)}
              </div>
            )}
            {i === step && skillPicks.length > 0 && (
              <div className="picks">
                {skillPicks.map((s) => (
                  <button key={s} type="button" className={`chip${chosen.includes(s.toLowerCase()) ? " on" : ""}`} onClick={() => toggleSkill(s)}>{s}</button>
                ))}
              </div>
            )}
            {i === step && q.form && <FormStep key={q.key} q={q} onSubmit={answer} hints={hints} />}
            {i < step && <div className="bubble me">{q.form ? summary(q, answers[q.key]) : answers[q.key] || "Skipped"}</div>}
          </div>
        ))}
        {done && (
          <div className="bubble bot">
            {busy ? "Making your resume…" : "Thanks! That's everything I need. Ready to create your resume?"}
          </div>
        )}
        <div ref={end} />
      </div>

      {error && <p className="alert err" style={{ marginTop: 16 }}>{error}</p>}

      {done ? (
        <div className="composer">
          <button className="btn btn-iris btn-lg" onClick={build} disabled={busy} style={{ flex: 1 }}>
            {busy ? <span className="spin" /> : <Icon name="spark" size={18} />} {busy ? "Creating your resume" : "Create my resume"}
          </button>
          <button className="btn btn-line btn-lg" onClick={() => { setStep(0); setAnswers({}); }} disabled={busy}>Start over</button>
        </div>
      ) : !current.form && (
        <form className="composer" onSubmit={submit}>
          <label htmlFor="answer" style={{ position: "absolute", left: -9999 }}>Your answer</label>
          <textarea
            id="answer"
            ref={box}
            rows={2}
            value={text}
            maxLength={2000}
            placeholder="Type your answer…"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) submit(e); }}
          />
          <button className="btn btn-iris btn-lg" type="submit" aria-label="Send answer"><Icon name="send" size={18} /></button>
        </form>
      )}
    </div>
  );
}
