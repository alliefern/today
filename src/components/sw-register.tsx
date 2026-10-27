"use client";

import { useEffect } from "react";

/** registers the tiny service worker that makes the app installable */
export function SwRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // installability is a nice-to-have; the app works fine without it
    });
  }, []);
  return null;
}
