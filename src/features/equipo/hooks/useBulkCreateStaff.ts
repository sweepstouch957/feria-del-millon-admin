"use client";

import { useState } from "react";
import { createUser, listUsers, updateUser } from "@services/user.service";
import { rolesFor, type RosterRow, type StaffRole } from "../model/roster";

// Contraseña temporal legible para dictarla: sin 0/O ni 1/l/I. Aleatoria de verdad (crypto).
const PASS_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
export const makePassword = () =>
  Array.from(crypto.getRandomValues(new Uint32Array(10)), (n) => PASS_CHARS[n % PASS_CHARS.length]).join("");

export type StaffDraft = RosterRow & { role: StaffRole };
export type StaffResult = StaffDraft & {
  status: "created" | "updated" | "error";
  /** Solo las cuentas nuevas: a las que ya existían no se les cambia la clave. */
  password?: string;
  error?: string;
};

const errorText = (e: any) => e?.response?.data?.error || e?.message || "Error";

/**
 * Crea las cuentas una por una (el servidor valida cada una). Si el correo ya
 * tiene cuenta, no se duplica: se le suman los roles y queda con su clave.
 */
export function useBulkCreateStaff() {
  const [results, setResults] = useState<StaffResult[]>([]);
  const [running, setRunning] = useState(false);

  const run = async (drafts: StaffDraft[], practiceMode: boolean) => {
    setRunning(true);
    setResults([]);
    for (const d of drafts) {
      const roles = rolesFor(d.role);
      let r: StaffResult;
      try {
        const password = makePassword();
        await createUser({ email: d.email, password, firstName: d.firstName, lastName: d.lastName, roles, practiceMode });
        r = { ...d, status: "created", password };
      } catch (e: any) {
        if (!/already exists/i.test(errorText(e))) {
          r = { ...d, status: "error", error: errorText(e) };
        } else {
          try {
            const { users } = await listUsers({ q: d.email, limit: 5 });
            const u = users.find((x) => x.email?.toLowerCase() === d.email);
            if (!u) throw new Error("No se encontró la cuenta existente");
            await updateUser(u.id, { roles: { ...u.roles, ...roles }, practiceMode });
            r = { ...d, status: "updated" };
          } catch (e2: any) {
            r = { ...d, status: "error", error: errorText(e2) };
          }
        }
      }
      setResults((prev) => [...prev, r]);
    }
    setRunning(false);
  };

  return { results, running, run, reset: () => setResults([]) };
}
