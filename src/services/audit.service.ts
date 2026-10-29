import apiClient from "@/axios";

export type AuditGroup = "acceso" | "venta" | "entrada" | "obra" | "config" | "usuario" | "convocatoria" | "otro";
export type AuditKind = "login" | "login_failed" | "action" | "denied";

export interface AuditEntry {
  id: string;
  at: string;
  kind: AuditKind;
  group: AuditGroup;
  action: string;
  method: string;
  path: string;
  targetId?: string;
  status: number;
  ms: number;
  userId?: string;
  email?: string;
  userName?: string;
  roles: string[];
  ip?: string;
  ua?: string;
}

export interface AuditFilters {
  from?: string;
  to?: string;
  group?: string;
  kind?: string;
  email?: string;
  q?: string;
  before?: string;
  limit?: number;
}

export async function listAudit(params: AuditFilters) {
  const { data } = await apiClient.get<{ items: AuditEntry[]; nextBefore: string | null }>("/audit", { params });
  return data;
}
