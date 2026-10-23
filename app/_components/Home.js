"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, Icon, initials } from "./ui";
import { INDIA_STATES } from "@/lib/states";
import CompanyCard from "./CompanyCard";
import Plans from "./Plans";
import { ROLE_TITLES } from "@/lib/roles-data";
import { INDIA_CITIES, canonicalCity } from "@/lib/cities";

export default function Home({ me, setMe, onRebuild }) {
  const p = me.profile;
  const [prefs, setPrefs] = useState(me.prefs);
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("open");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [drafts, setDrafts] = useState({});
  const [busyIds, setBusyIds] = useState({});
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState("");
  const [editBusy, setEditBusy] = useState(false);
  const [editMsg, setEditMsg] = useState(null);
  const fileInput = useRef(null);
  const [upBusy, setUpBusy] = useState(false);
  const [upMsg, setUpMsg] = useState(null);
  const [over, setOver] = useState(false);

  const remaining = Math.max(0, me.sendLimit - me.sentToday);
  const fileType = me.resumeType === "docx" ? "Word file" : "PDF";
  const uploaded = me.resumeSource === "upload";
  const resumeFile = `${p.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "My"}-Resume.${me.resumeType === "docx" ? "docx" : "pdf"}`;

  const [upgrade, setUpgrade] = useState(""); // set when the free plan does not cover the chosen city
  const limited = Boolean(me.plan?.limited);

  const load = useCallback(async (state, city, query, page = 0) => {
    setLoading(true);
    setError("");
    setUpgrade("");
    try {
      const params = new URLSearchParams({ state: state || "", city: city || "", q: query || "", page: String(page) });
      const d = await api(`/api/companies?${params}`);
      setData((prev) => (page > 0 && prev ? { ...d, open: [...prev.open, ...d.open] } : d));
      setDrafts((prev) => {
        const next = { ...prev };
        d.open.forEach((c) => { if (c.draft && !next[c.id]) next[c.id] = c.draft; });
        return next;
      });
    } catch (e) {
      if (e.status === 402) {
        setUpgrade(e.message);
        setData((prev) => (prev ? { ...prev, open: [], openTotal: 0, contacted: [], contactedTotal: 0, hasMore: false } : prev));
      } else setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Reload when filters change; wait a moment while the user is still typing a search.
  useEffect(() => {
    const t = setTimeout(() => load(me.prefs.state, me.prefs.city, q), q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, me.prefs.state, me.prefs.city, q, me.plan?.paid]);

  // An uploaded resume is read in two steps. Check back for the jobs and education read in the background.
  useEffect(() => {
    if (!p.reading) return;
    let tries = 0;
    const t = setInterval(async () => {
      tries++;
      try {
        const d = await api("/api/me");
        if (!d.profile?.reading || tries >= 45) {
          clearInterval(t);
          setMe(d);
        }
      } catch {
        if (tries >= 45) clearInterval(t);
      }
    }, 3000);
    return () => clearInterval(t);
  }, [p.reading, setMe]);

  async function savePrefs(next) {
    setPrefs(next);
    try {
      const d = await api("/api/me", { method: "PATCH", body: next });
      setMe(d);
    } catch (e) {
      setError(e.message);
    }
  }

  async function makeDraft(id, regenerate = false) {
    setBusyIds((b) => ({ ...b, [id]: true }));
    setError("");
    try {
      const { draft } = await api("/api/draft", { method: "POST", body: { companyId: id, regenerate } });
      setDrafts((d) => ({ ...d, [id]: draft }));
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setBusyIds((b) => ({ ...b, [id]: false }));
    }
  }

  // Opening Gmail is not the same as sending, so we remember it and ask the user to confirm on the card.
  async function markOpened(company, opened) {
    setDrafts((all) => {
      const { openedAt, ...draft } = all[company.id] || {};
      return { ...all, [company.id]: opened ? { ...draft, openedAt: new Date().toISOString() } : draft };
    });
    try {
      await api("/api/sent", { method: "POST", body: { companyId: company.id, opened } });
    } catch (e) {
      setError(e.message);
    }
  }

  // Only after the user says "Yes, I sent it" does the company leave their list for good.
  async function markSent(company) {
    try {
      const d = await api("/api/sent", { method: "POST", body: { companyId: company.id } });
      setMe(d);
      const sentAt = new Date().toISOString();
      setData((prev) => {
        // Other rows with the same HR email also count as contacted now.
        const moved = prev.open.filter((c) => c.hrEmail === company.hrEmail);
        const contacted = moved.map((c) => ({ ...c, sentAt, replied: false, sameHr: c.id !== company.id }));
        return {
          ...prev,
          open: prev.open.filter((c) => c.hrEmail !== company.hrEmail),
          openTotal: prev.openTotal - moved.length,
          contacted: [...contacted, ...prev.contacted],
          contactedTotal: prev.contactedTotal + moved.length,
        };
      });
    } catch (e) {
      setError(e.message);
    }
  }

  async function markReplied(company, replied) {
    try {
      await api("/api/replied", { method: "POST", body: { companyId: company.id, replied } });
      setData((prev) => ({ ...prev, contacted: prev.contacted.map((c) => (c.id === company.id ? { ...c, replied } : c)) }));
    } catch (e) {
      setError(e.message);
    }
  }

  async function applyEdit(e) {
    e.preventDefault();
    if (edit.trim().length < 3) return;
    setEditBusy(true);
    setEditMsg(null);
    try {
      const d = await api("/api/profile/edit", { method: "POST", body: { instruction: edit } });
      setMe(d);
      setDrafts({});
      setEdit("");
      setEditMsg({ type: "ok", text: uploaded ? "Details updated. Your emails now use them. Your uploaded resume file stays as it is." : "Resume updated. Your PDF link now shows the new version." });
    } catch (err) {
      setEditMsg({ type: "err", text: err.message });
    } finally {
      setEditBusy(false);
    }
  }

  // Deleting removes everything about the student straight away, so it needs them to type DELETE.
  async function deleteAccount() {
    const typed = window.prompt("This deletes your account, your resume, your emails and everything else about you. It cannot be undone.\n\nType DELETE to confirm.");
    if (typed === null) return;
    if (typed.trim() !== "DELETE") return window.alert("Your account was not deleted. To delete it, type DELETE in capital letters.");
    try {
      await api("/api/me", { method: "DELETE", body: { confirm: "DELETE" } });
      window.location.replace("/");
    } catch (err) {
      setError(err.message);
    }
  }

  // A newer resume replaces the current one. Emails not sent yet are rewritten from the new resume.
  async function replaceResume(file) {
    if (fileInput.current) fileInput.current.value = "";
    if (!file) return;
    if (!window.confirm(`Replace your current resume with ${file.name}? Emails you have not sent yet will be written again from the new resume.`)) return;
    setUpBusy(true);
    setUpMsg(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const d = await api("/api/profile/upload", { method: "POST", form });
      setMe(d);
      setPrefs(d.prefs);
      setDrafts({});
      setUpMsg({ type: "ok", text: "New resume saved exactly as you uploaded it. Download it again before you attach it." });
    } catch (err) {
      setUpMsg({ type: "err", text: err.message });
    } finally {
      setUpBusy(false);
    }
  }

  const list = tab === "open" ? data?.open || [] : data?.contacted || [];

  // Cities come from our stored list for the state, plus any city that has companies. Those come first, with counts.
  const cityCounts = prefs.state === me.prefs.state ? data?.cityCounts || {} : {};
  const cityValue = prefs.city ? canonicalCity(prefs.state, prefs.city) : "";
  const cityOptions = (() => {
    const all = [...new Set([...(INDIA_CITIES[prefs.state] || []), ...Object.keys(cityCounts), ...(cityValue ? [cityValue] : [])])];
    const byName = (a, b) => a.localeCompare(b);
    return { ready: all.filter((c) => cityCounts[c]).sort(byName), soon: all.filter((c) => !cityCounts[c]).sort(byName) };
  })();

  return (
    <div className="wrap home">
      {/* -------- Profile side -------- */}
      <aside className="side">
        <div className="panel" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="me-head">
            <span className="avatar">{initials(p.name)}</span>
            <div>
              <b>{p.name}</b>
              <span className="muted" style={{ fontSize: 14 }}>{p.headline}</span>
            </div>
          </div>
          {p.skills.length > 0 && (
            <div className="chips">{p.skills.slice(0, 8).map((s) => <span className="chip" key={s}>{s}</span>)}</div>
          )}
          <div className="row">
            <a className="btn btn-ink btn-sm" href={me.resumeUrl} target="_blank" rel="noopener"><Icon name="file" size={16} /> View resume {fileType}</a>
            <a className="btn btn-line btn-sm" href={me.resumeUrl} download={resumeFile}>Download</a>
          </div>
          {p.reading && (
            <p className="tip row" style={{ margin: 0, gap: 8, flexWrap: "nowrap" }} role="status">
              <span className="spin dark" style={{ flexShrink: 0 }} /> Reading the rest of your resume (jobs and education). You can start already.
            </p>
          )}
          <p className="tip" style={{ margin: 0 }}>
            {uploaded ? `This is the resume you uploaded, kept exactly as it is. Attach this ${fileType} in Gmail with every email you send.` : "Attach this PDF in Gmail with every email you send. If you update it below, download it again."}
          </p>
        </div>

        {me.plan?.paymentsOn && (
          <div className="panel" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <b>Your plan</b>
            <Plans me={me} setMe={setMe} compact />
          </div>
        )}

        <form className="panel" onSubmit={applyEdit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label className="field">
            {uploaded ? "Change details used in your emails" : "Change your resume"}
            <textarea rows={3} value={edit} maxLength={1000} onChange={(e) => setEdit(e.target.value)} placeholder='e.g. "Add Python to my skills" or "My phone is 98XXXXXXXX"' />
            {uploaded && <small className="hint">Your uploaded file is not changed. To change it, upload a new version below.</small>}
          </label>
          {editMsg && <p className={`alert ${editMsg.type}`} style={{ margin: 0 }}>{editMsg.text}</p>}
          <button className="btn btn-iris btn-sm" type="submit" disabled={editBusy || edit.trim().length < 3} style={{ alignSelf: "flex-start" }}>
            {editBusy ? <span className="spin" /> : <Icon name="refresh" size={16} />} {editBusy ? "Updating" : uploaded ? "Update details" : "Update resume"}
          </button>
        </form>

        <div className="panel" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <b>Have a newer resume?</b>
            <p className="muted" style={{ margin: "4px 0 0", fontSize: 14 }}>Upload it and it replaces this one. Or answer the questions again to make a fresh one.</p>
          </div>
          <div
            className={`drop${over ? " on" : ""}`}
            role="button"
            tabIndex={0}
            onClick={() => !upBusy && fileInput.current?.click()}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && !upBusy && fileInput.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setOver(true); }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => { e.preventDefault(); setOver(false); if (!upBusy) replaceResume(e.dataTransfer.files?.[0]); }}
          >
            {upBusy ? <span className="row" style={{ justifyContent: "center" }}><span className="spin dark" /> Reading your resume…</span> : "Drop your file here, or click to choose (PDF or .docx, max 5 MB)"}
          </div>
          <input
            ref={fileInput}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            hidden
            onChange={(e) => replaceResume(e.target.files?.[0])}
          />
          {upMsg && <p className={`alert ${upMsg.type}`} style={{ margin: 0 }}>{upMsg.text}</p>}
          <div className="row">
            <button className="btn btn-iris btn-sm" onClick={() => fileInput.current?.click()} disabled={upBusy}>
              <Icon name="upload" size={16} /> Upload new resume
            </button>
            {onRebuild && (
              <button className="btn btn-line btn-sm" onClick={onRebuild} disabled={upBusy}>
                <Icon name="chat" size={16} /> Build again
              </button>
            )}
          </div>
        </div>

        <div className="panel" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <b>Your data</b>
          <p className="muted" style={{ margin: 0, fontSize: 14 }}>
            Read how we use your information in our <a href="/privacy" target="_blank" rel="noopener">privacy policy</a>.
          </p>
          <button className="btn btn-ghost btn-sm" style={{ alignSelf: "flex-start", color: "var(--err)", paddingLeft: 0 }} onClick={deleteAccount}>
            Delete my account
          </button>
        </div>
      </aside>

      {/* -------- Companies -------- */}
      <section>
        <div className="list-head">
          <div>
            <span className="eyebrow">Step 2 of 2 · Reach out</span>
            <h1 className="h" style={{ marginTop: 6 }}>Companies near you</h1>
          </div>
        </div>

        <div className="filters">
          <label className="field">
            Job you want
            <input
              value={prefs.targetRole}
              maxLength={80}
              onChange={(e) => setPrefs({ ...prefs, targetRole: e.target.value })}
              onBlur={() => prefs.targetRole !== me.prefs.targetRole && savePrefs(prefs)}
              placeholder="e.g. Frontend Developer"
              list="role-list"
            />
            <datalist id="role-list">{ROLE_TITLES.map((r) => <option key={r} value={r} />)}</datalist>
          </label>
          <label className="field">
            State
            <select value={prefs.state} onChange={(e) => savePrefs({ ...prefs, state: e.target.value, city: "" })}>
              <option value="">{limited ? "Choose your state" : "All states"}</option>
              {INDIA_STATES.map((s) => (
                <option key={s} value={s}>{s}{data?.statesWithData && !data.statesWithData.includes(s) ? " (coming soon)" : ""}</option>
              ))}
            </select>
          </label>
          <label className="field">
            City
            <select value={cityValue} onChange={(e) => savePrefs({ ...prefs, city: e.target.value })} disabled={!prefs.state}>
              <option value="">{!prefs.state ? "Choose a state first" : limited ? "Choose your city" : `All cities in ${prefs.state}`}</option>
              {cityOptions.ready.length > 0 && (
                <optgroup label="Cities with companies">
                  {cityOptions.ready.map((c) => <option key={c} value={c}>{c} ({cityCounts[c]})</option>)}
                </optgroup>
              )}
              {cityOptions.soon.length > 0 && (
                <optgroup label="More cities (coming soon)">
                  {cityOptions.soon.map((c) => <option key={c} value={c}>{c}</option>)}
                </optgroup>
              )}
            </select>
          </label>
        </div>

        <label className="search">
          <Icon name="search" size={18} />
          <input type="search" value={q} maxLength={100} onChange={(e) => setQ(e.target.value)} placeholder="Search company, website or email" aria-label="Search companies" />
        </label>

        {remaining === 0 && (
          <p className="alert ok" style={{ marginBottom: 16 }}>You have sent {me.sendLimit} emails today. Great work! Come back tomorrow for more.</p>
        )}
        {error && <p className="alert err" style={{ marginBottom: 16 }}>{error}</p>}

        {data && (
          <div className="tabs" role="tablist">
            <button role="tab" aria-selected={tab === "open"} onClick={() => setTab("open")}>To contact ({data.openTotal})</button>
            <button role="tab" aria-selected={tab === "sent"} onClick={() => setTab("sent")}>Contacted ({data.contactedTotal})</button>
          </div>
        )}

        {tab === "open" && data?.open?.length > 0 && remaining > 0 && (
          <p className="tip" style={{ marginTop: 0 }}>
            Press “Write email” on a company, check the email, then send it from Gmail. Come back and tell us if it went out.
          </p>
        )}

        {upgrade && (
          <div className="panel upgrade" style={{ marginBottom: 16 }}>
            <h2 className="h" style={{ fontSize: 22, margin: "0 0 6px" }}>Open every city</h2>
            <Plans me={me} setMe={setMe} reason={upgrade} />
          </div>
        )}
        {!upgrade && data?.needCity && (
          <div className="empty">
            <b>Pick your state and city above to see companies.</b>
            <p style={{ margin: "6px 0 0" }}>The free plan covers one city. You can change it until you send your first email.</p>
          </div>
        )}

        {data?.needCity || upgrade ? null : loading && !data ? (
          <div className="empty"><span className="spin dark" style={{ display: "inline-block" }} /></div>
        ) : list.length === 0 ? (
          <div className="empty">
            {tab === "open"
              ? q
                ? "No companies match your search. Try a shorter word or another state."
                : cityValue
                  ? `No companies to contact in ${cityValue} yet. We add new companies every week.`
                  : "No companies to contact here right now. Try another state, or check back soon: we add new companies every week."
              : "You have not emailed any company here yet."}
            {tab === "open" && !q && cityValue && (
              <div style={{ marginTop: 14 }}>
                <button className="btn btn-line btn-sm" onClick={() => savePrefs({ ...prefs, city: "" })}>Show all of {prefs.state}</button>
              </div>
            )}
          </div>
        ) : (
          <div className="cards">
            {list.map((c) => (
              <CompanyCard
                key={c.id}
                company={c}
                mode={tab}
                draft={drafts[c.id]}
                busy={Boolean(busyIds[c.id])}
                canSend={remaining > 0}
                resumeUrl={me.resumeUrl}
                resumeFile={resumeFile}
                showState={!prefs.state}
                onDraft={(regen) => makeDraft(c.id, regen)}
                onChange={(d) => setDrafts((all) => ({ ...all, [c.id]: d }))}
                onOpened={(v) => markOpened(c, v)}
                onSent={() => markSent(c)}
                onReplied={(v) => markReplied(c, v)}
              />
            ))}
          </div>
        )}

        {tab === "open" && data?.hasMore && (
          <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
            <button className="btn btn-line" onClick={() => load(me.prefs.state, me.prefs.city, q, data.page + 1)} disabled={loading}>
              {loading ? <span className="spin dark" /> : null} Show more companies ({data.openTotal - data.open.length} left)
            </button>
          </div>
        )}

        <p className="tip" style={{ marginTop: 20 }}>
          We do not promise an opening at these companies. A short, personal email helps the HR team remember you when a role opens. Once you confirm you emailed an HR team, it moves to “Contacted”, so you never email the same HR twice.
        </p>
      </section>
    </div>
  );
}
