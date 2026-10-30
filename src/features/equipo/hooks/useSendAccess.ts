"use client";

import { useState } from "react";
import { sendAccessEmail } from "@services/auth.service";
import type { Credential } from "../model/roster";

export type AccessResult = { email: string; error?: string };

/** Manda los correos de acceso uno por uno: un rechazo no frena a los demás. */
export function useSendAccess() {
  const [results, setResults] = useState<AccessResult[]>([]);
  const [running, setRunning] = useState(false);

  const run = async (people: Credential[]) => {
    setRunning(true);
    setResults([]);
    const loginUrl = `${window.location.origin}/login`;
    for (const { email, password } of people) {
      let r: AccessResult = { email };
      try {
        await sendAccessEmail(email, password, loginUrl);
      } catch (e: any) {
        r = { email, error: e?.response?.data?.error || e?.message || "Error" };
      }
      setResults((prev) => [...prev, r]);
    }
    setRunning(false);
  };

  return { results, running, run };
}
