"use client";

export async function api(path, { method = "GET", body, form } = {}) {
  const res = await fetch(path, {
    method,
    headers: form ? undefined : body ? { "content-type": "application/json" } : undefined,
    body: form || (body ? JSON.stringify(body) : undefined),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || "Something went wrong. Please try again.");
    err.status = res.status;
    throw err;
  }
  return data;
}

export function Logo({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <rect width="40" height="40" rx="12" fill="#6D4AFF" />
      <path d="M10 29V18a5 5 0 0 1 10 0v11M20 18a5 5 0 0 1 10 0v11" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M31 3.5l1.5 3.3 3.3 1.5-3.3 1.5-1.5 3.3-1.5-3.3-3.3-1.5 3.3-1.5z" fill="#FFB547" />
    </svg>
  );
}

const PATHS = {
  upload: <><path d="M12 16V4M6 10l6-6 6 6" /><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" /></>,
  chat: <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />,
  send: <><path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4z" /></>,
  check: <path d="M5 12l5 5 9-10" />,
  file: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /></>,
  copy: <><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></>,
  refresh: <><path d="M21 12a9 9 0 1 1-3-6.7L21 8" /><path d="M21 3v5h-5" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></>,
  shield: <><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /><path d="M8.5 12l2.5 2.5 4.5-5" /></>,
  spark: <path d="M12 3l2.2 5.4L20 9.3l-4.4 3.9L17 19l-5-3-5 3 1.4-5.8L4 9.3l5.8-.9z" />,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></>,
  pin: <><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></>,
  clip: <path d="M21 11.5l-8.6 8.6a5.5 5.5 0 0 1-7.8-7.8l8.6-8.6a3.7 3.7 0 0 1 5.2 5.2l-8.6 8.6a1.8 1.8 0 0 1-2.6-2.6l7.9-7.9" />,
  chevron: <path d="M6 9l6 6 6-6" />,
  search: <><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></>,
};

export function Icon({ name, size = 20, color = "currentColor", stroke = 2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}

export function Header({ me, hubUrl, onLogin }) {
  const pct = me ? Math.min(100, Math.round((me.sentToday / me.sendLimit) * 100)) : 0;
  return (
    <header className="top">
      <div className="wrap">
        <a className="brand" href="/" aria-label="Masiha Job Agent home">
          <Logo />
          <b>masiha<i>.</i></b>
          <span>Job Agent</span>
        </a>
        <div className="top-right">
          {me?.hasProfile && (
            <span className="counter" title="Emails you can send today">
              <b>{me.sentToday}/{me.sendLimit}</b> sent today
              <span className="meter"><i style={{ width: `${pct}%` }} /></span>
            </span>
          )}
          <a className="back" href="/guide">How to use</a>
          <a className="price-pill" href="/pricing"><Icon name="spark" size={14} /> Plans from ₹99</a>
          <a className="back" href={hubUrl}>All Masiha tools</a>
          {me?.username && (
            <span className="who">
              <span className="avatar sm" aria-hidden="true">{me.username[0].toUpperCase()}</span>
              <span className="who-name">{me.username}</span>
              <button className="btn btn-line btn-sm" onClick={logout}>Log out</button>
            </span>
          )}
          {!me && onLogin && (
            <button className="btn btn-line btn-sm" onClick={onLogin}>Log in</button>
          )}
        </div>
      </div>
    </header>
  );
}

async function logout() {
  try {
    await api("/api/auth", { method: "POST", body: { action: "logout" } });
  } finally {
    window.location.replace("/");
  }
}

export function initials(name = "") {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join("") || "M";
}
