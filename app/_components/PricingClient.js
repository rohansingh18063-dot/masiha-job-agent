"use client";

import { useEffect, useState } from "react";
import { api } from "./ui";
import Plans from "./Plans";

/**
 * Pricing page buttons. Logged-in students with payments switched on can buy here directly;
 * everyone else is sent to start for free.
 */
export default function PricingClient({ signedIn, paymentsOn }) {
  const [me, setMe] = useState(null);
  useEffect(() => {
    if (signedIn && paymentsOn) api("/api/me").then(setMe).catch(() => {});
  }, [signedIn, paymentsOn]);

  if (me?.plan?.paymentsOn) {
    return (
      <div className="panel" style={{ maxWidth: 520 }}>
        <Plans me={me} setMe={setMe} />
      </div>
    );
  }
  return (
    <div className="row" style={{ marginTop: 8 }}>
      <a className="btn btn-iris btn-lg" href="/">{signedIn ? "Go to my companies" : "Start free"}</a>
      {!paymentsOn && <span className="muted" style={{ fontSize: 14 }}>Paid plans open soon. Until then, every city is free to use.</span>}
      {paymentsOn && !signedIn && <span className="muted" style={{ fontSize: 14 }}>Make a free account, then buy a plan from your companies page or here.</span>}
    </div>
  );
}
