"use client";

import { useEffect, useState } from "react";

/** True only after `/api/auth/me` returns a session. Logged-out chrome paints first. */
export function useCloudSignedIn(): boolean {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/auth/me");
        if (!cancelled) setSignedIn(response.ok);
      } catch {
        if (!cancelled) setSignedIn(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return signedIn;
}
