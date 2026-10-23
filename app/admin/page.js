"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, Logo } from "../_components/ui";
import { TrustBadge } from "../_components/CompanyCard";

// The admin sheet's columns, in order. Bold ones are required.
const COLUMNS = [
  "Company", "Website", "Email Type", "Best Email (HR first)", "Email 2", "Email 3", "Likely HR Email (guess)",
  "Email Found On", "Career Page", "Contact Page", "Phone", "Address", "City", "State", "LinkedIn Page",
  "Trust Score", "Notes", "Source", "Updated",
];
const REQUIRED = ["Company", "Best Email (HR first)", "City", "State"];

const SAMPLE_ROW = [
  "Example Software Pvt Ltd", "https://example.com", "HR", "hr@example.com", "careers@example.com", "", "",
  "https://example.com/careers", "https://example.com/careers", "https://example.com/contact", "+91 98XXXXXXXX",
  "MP Nagar, Bhopal", "Bhopal", "Madhya Pradesh", "https://www.linkedin.com/company/example", "85",
  "Hiring freshers", "Company website", "2026-10-01",
];

const csvCell = (v) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

const isLink = (v) => /^https?:\/\//i.test(v || "");

function Details({ c }) {
  const fields = [
    ["Website", c.website], ["Email type", c.emailType], ["Best email (HR first)", c.emails[0]],
    ["Email 2", c.emails[1]], ["Email 3", c.emails[2]], ["Likely HR email (guess)", c.hrGuess],
    ["Email found on", c.foundOn], ["Career page", c.careerPage], ["Contact page", c.contactPage],
    ["Phone", c.phone], ["Address", c.address], ["LinkedIn page", c.linkedin], ["Trust", c.trustText],
    ["Notes", c.notes], ["Source", c.source], ["Updated", c.updated], ["Industry", c.industry], ["About", c.about],
    ["Mail domain checked", c.verified ? "Yes: matches website and receives mail" : "No"],
    ["First added", c.addedAt ? new Date(c.addedAt).toLocaleDateString("en-IN") : ""],
  ];
  return (
    <dl className="details">
      {fields.filter(([, v]) => v).map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{isLink(v) ? <a href={v} target="_blank" rel="noopener nofollow">{v}</a> : v}</dd>
        </div>
      ))}
    </dl>
  );
}

function CompanyBrowser({ states, refreshKey, onChanged }) {
  const [q, setQ] = useState("");
  const [state, setState] = useState("");
  const [page, setPage] = useState(0);
  const [res, setRes] = useState(null);
  const [open, setOpen] = useState(null);
  const [err, setErr] = useState("");

  const load = useCallback(async (query, st, pg) => {
    try {
      const params = new URLSearchParams({ q: query, state: st, page: String(pg) });
      setRes(await api(`/api/admin/companies?${params}`));
      setErr("");
    } catch (e) {
      setErr(e.message);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(q, state, page), q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q, state, page, refreshKey]);

  async function remove(c) {
    if (!confirm(`Delete ${c.name} (${c.city})? Students keep their history.`)) return;
    try {
      await api("/api/admin/companies", { method: "POST", body: { action: "delete", id: c.id } });
      setOpen(null);
      await load(q, state, page);
      onChanged();
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <div className="panel" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <h2 className="h" style={{ fontSize: 20 }}>Search companies</h2>
      <div className="filters" style={{ marginBottom: 0 }}>
        <label className="field">
          Search
          <input type="search" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Company, city, website or email" />
        </label>
        <label className="field">
          State
          <select value={state} onChange={(e) => { setState(e.target.value); setPage(0); }}>
            <option value="">All states</option>
            {states.map((s) => <option key={s.state} value={s.state}>{s.state} ({s.companies})</option>)}
          </select>
        </label>
      </div>
      {err && <p className="alert err" style={{ margin: 0 }}>{err}</p>}

      <div className="tbl">
        <table>
          <thead>
            <tr><th>Company</th><th>City</th><th>Website</th><th>HR email</th><th>Trust</th><th>Emailed by</th></tr>
          </thead>
          <tbody>
            {res && res.rows.length === 0 && <tr><td colSpan={6}>No companies found.</td></tr>}
            {res?.rows.map((c) => (
              <FragmentRow key={c.id} c={c} open={open === c.id} onToggle={() => setOpen(open === c.id ? null : c.id)} onDelete={() => remove(c)} />
            ))}
          </tbody>
        </table>
      </div>

      {res && (
        <div className="pager">
          <span>{res.total} companies · page {res.page + 1} of {res.pages}. Click a row to see every column.</span>
          <span className="row">
            <button className="btn btn-line btn-sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button>
            <button className="btn btn-line btn-sm" disabled={page + 1 >= res.pages} onClick={() => setPage(page + 1)}>Next</button>
          </span>
        </div>
      )}
    </div>
  );
}

function FragmentRow({ c, open, onToggle, onDelete }) {
  return (
    <>
      <tr className={`click${open ? " open" : ""}`} onClick={onToggle} aria-expanded={open}>
        <td><b>{c.name}</b></td>
        <td>{c.city}, {c.state}</td>
        <td className="wrapcell">{c.website ? c.website.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "") : ""}</td>
        <td className="wrapcell">{c.emails[0]}{c.guessed ? " (guess)" : ""}</td>
        <td><TrustBadge trust={c.trust} text={c.trustText} /></td>
        <td>{c.emailedBy} student{c.emailedBy === 1 ? "" : "s"}</td>
      </tr>
      {open && (
        <tr className="open">
          <td colSpan={6}>
            <Details c={c} />
            <button className="btn btn-ghost btn-sm" onClick={onDelete} style={{ color: "#A01818", marginTop: 10 }}>Delete this company</button>
          </td>
        </tr>
      )}
    </>
  );
}

function ResetPassword() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await api("/api/admin", { method: "POST", body: { action: "reset_password", username: username.trim().toLowerCase(), password } });
      setMsg({ type: "ok", text: `Password changed for ${username.trim().toLowerCase()}. Tell them the new password; they are logged out everywhere.` });
      setUsername("");
      setPassword("");
    } catch (err) {
      setMsg({ type: "err", text: err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="panel" onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <h2 className="h" style={{ fontSize: 20 }}>Reset a student&apos;s password</h2>
      <p className="muted" style={{ margin: 0, fontSize: 14 }}>
        For students who forgot their password. Passwords are stored scrambled, so you cannot see the old one, only set a new one.
      </p>
      <div className="filters" style={{ marginBottom: 0 }}>
        <label className="field">Username<input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="off" required /></label>
        <label className="field">New password (8+ characters)<input value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" minLength={8} required /></label>
      </div>
      {msg && <p className={`alert ${msg.type}`} style={{ margin: 0 }}>{msg.text}</p>}
      <button className="btn btn-line" type="submit" disabled={busy} style={{ alignSelf: "flex-start" }}>{busy ? <span className="spin dark" /> : null} Set new password</button>
    </form>
  );
}

export default function AdminPage() {
  const [state, setState] = useState("loading");
  const [data, setData] = useState(null);
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [replace, setReplace] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const file = useRef(null);

  const load = () =>
    api("/api/admin")
      .then((d) => { setData(d); setState("in"); })
      .catch(() => setState("login"));

  useEffect(() => { load(); }, []);

  async function login(e) {
    e.preventDefault();
    setMsg(null);
    try {
      await api("/api/admin", { method: "POST", body: { action: "login", password } });
      setPassword("");
      await load();
    } catch (err) {
      setMsg({ type: "err", text: err.message });
    }
  }

  async function upload(e) {
    e.preventDefault();
    const f = file.current?.files?.[0];
    if (!f) return setMsg({ type: "err", text: "Please choose an Excel (.xlsx) or CSV file." });
    if (replace && !confirm("Replace ALL existing companies with this file? Students keep their history.")) return;
    setBusy(true);
    setMsg(null);
    try {
      const form = new FormData();
      form.append("file", f);
      form.append("replace", replace ? "1" : "0");
      const r = await api("/api/admin", { method: "POST", form });
      setMsg({
        type: r.errors?.length && !r.added && !r.updated ? "err" : "ok",
        text: `Added ${r.added}, updated ${r.updated}, skipped ${r.skipped}.`,
        errors: [...(r.errors || []), ...(r.moreErrors ? [`…and ${r.moreErrors} more skipped rows.`] : [])],
      });
      file.current.value = "";
      setReplace(false);
      await load();
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setMsg({ type: "err", text: err.message });
    } finally {
      setBusy(false);
    }
  }

  async function deleteAll() {
    if (!confirm("Delete ALL companies? Students keep their history.")) return;
    await api("/api/admin", { method: "POST", body: { action: "delete_all" } });
    await load();
    setRefreshKey((k) => k + 1);
  }

  async function logout() {
    await api("/api/admin", { method: "POST", body: { action: "logout" } });
    setState("login");
  }

  const downloadSample = () => {
    const csv = [COLUMNS, SAMPLE_ROW].map((r) => r.map(csvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "companies-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <header className="top">
        <div className="wrap">
          <span className="brand"><Logo /><b>masiha<i>.</i></b><span>Job Agent · Admin</span></span>
          {state === "in" && <button className="btn btn-line btn-sm" onClick={logout}>Log out</button>}
        </div>
      </header>

      <main className="admin">
        {state === "loading" && <span className="spin dark" />}

        {state === "login" && (
          <form className="panel" onSubmit={login} style={{ maxWidth: 420, display: "flex", flexDirection: "column", gap: 14 }}>
            <h1 className="h" style={{ fontSize: 24 }}>Admin login</h1>
            <label className="field">Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required /></label>
            {msg && <p className={`alert ${msg.type}`}>{msg.text}</p>}
            <button className="btn btn-iris" type="submit">Log in</button>
          </form>
        )}

        {state === "in" && data && (
          <>
            <h1 className="h" style={{ fontSize: 28 }}>Overview</h1>
            <div className="stats">
              <div className="stat"><span>Student accounts</span><b>{data.stats.accounts}</b></div>
              <div className="stat"><span>Profiles made</span><b>{data.stats.profiles}</b></div>
              <div className="stat"><span>Emails sent today</span><b>{data.stats.emailsToday}</b></div>
              <div className="stat"><span>Emails sent, all time</span><b>{data.stats.emailsTotal}</b></div>
              <div className="stat"><span>AI calls today</span><b>{data.stats.aiToday}</b></div>
              {data.stats.payments && (
                <>
                  <div className="stat"><span>Paid plans active now</span><b>{data.stats.payments.activePlans}</b></div>
                  <div className="stat"><span>Earned today</span><b>₹{(data.stats.payments.today / 100).toLocaleString("en-IN")}</b></div>
                  <div className="stat"><span>Earned all time ({data.stats.payments.paid} payments)</span><b>₹{(data.stats.payments.total / 100).toLocaleString("en-IN")}</b></div>
                </>
              )}
              <div className="stat"><span>Companies ({data.stats.verified} mail-checked)</span><b>{data.stats.companies}</b></div>
            </div>

            <form className="panel" onSubmit={upload} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <h2 className="h" style={{ fontSize: 20 }}>Add companies (Excel or CSV)</h2>
              <p className="muted" style={{ margin: 0 }}>
                Upload your sheet as <b>.xlsx</b> or <b>.csv</b>. Only the first sheet is read, and the header row must have these column names
                (the order does not matter). Highlighted columns are required; a row is skipped if one is empty.
                If “Best Email” is empty, Email 2, Email 3 or the guessed HR email is used instead.
              </p>
              <div className="cols">
                {COLUMNS.map((c) => <span key={c} className={REQUIRED.includes(c) ? "req" : ""}>{c}</span>)}
              </div>
              <p className="muted" style={{ margin: 0, fontSize: 14 }}>
                Students see 5 details: Company, City, Website, HR email (Best Email) and Trust. Trust can be 0–100, a percent, 0–1, out of 5 or 10, or High / Medium / Low.
                Uploading the same company + city again updates it, so you can re-upload your sheet any time.
                The data is saved on the server and stays until you delete it.
              </p>
              <div className="row">
                <input ref={file} type="file" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" aria-label="Excel or CSV file" />
                <label className="row" style={{ gap: 6, fontSize: 14 }}>
                  <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} /> Replace all existing companies
                </label>
              </div>
              {msg && (
                <div className={`alert ${msg.type}`}>
                  {msg.text}
                  {msg.errors?.length > 0 && (
                    <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontWeight: 400, fontSize: 14 }}>
                      {msg.errors.map((e) => <li key={e}>{e}</li>)}
                    </ul>
                  )}
                </div>
              )}
              <div className="row">
                <button className="btn btn-iris" type="submit" disabled={busy}>{busy ? <span className="spin" /> : null} {busy ? "Importing and checking emails" : "Upload file"}</button>
                <button className="btn btn-line" type="button" onClick={downloadSample}>Download template</button>
              </div>
            </form>

            <div className="tbl">
              <table>
                <thead><tr><th>State</th><th>Cities</th><th>Companies</th><th>Mail-checked</th></tr></thead>
                <tbody>
                  {data.states.length === 0 && <tr><td colSpan={4}>No companies yet. Upload a file above.</td></tr>}
                  {data.states.map((s) => (
                    <tr key={s.state}><td>{s.state}</td><td>{s.cities}</td><td>{s.companies}</td><td>{s.verified}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>

            {data.stats.companies > 0 && (
              <CompanyBrowser states={data.states} refreshKey={refreshKey} onChanged={load} />
            )}

            <ResetPassword />

            {data.stats.companies > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={deleteAll} style={{ alignSelf: "flex-start", color: "#A01818" }}>Delete all companies</button>
            )}
          </>
        )}
      </main>
    </>
  );
}
