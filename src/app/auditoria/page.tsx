"use client";

import * as React from "react";
import {
  Box, Card, Stack, Button, TextField, MenuItem, Chip, Typography, Tooltip,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer, LinearProgress, CircularProgress,
} from "@mui/material";
import { FileSpreadsheet, RefreshCw } from "lucide-react";
import { useInfiniteQuery } from "@tanstack/react-query";
import PageHeader from "@/components/ui/PageHeader";
import { listAudit, type AuditEntry } from "@services/audit.service";
import { toCsv, downloadCsv, stamp } from "@/utils/csv";

const GROUPS = [
  ["", "Todo"],
  ["acceso", "Accesos"],
  ["venta", "Ventas de obras / pagos"],
  ["entrada", "Entradas / taquilla / puerta"],
  ["obra", "Obras"],
  ["usuario", "Usuarios y roles"],
  ["config", "Configuración"],
  ["convocatoria", "Convocatoria"],
  ["otro", "Otros"],
] as const;

const KINDS = [
  ["", "Todos"],
  ["login", "Inicios de sesión"],
  ["login_failed", "Login fallido"],
  ["action", "Acciones"],
  ["denied", "Denegados"],
] as const;

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("es-CO", { timeZone: "America/Bogota", dateStyle: "short", timeStyle: "medium" });

/** "Chrome · Android" a partir del user-agent. */
function device(ua = "") {
  const b = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "";
  const o = /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Windows/.test(ua) ? "Windows" : /Mac OS/.test(ua) ? "Mac" : "";
  return [b, o].filter(Boolean).join(" · ") || (ua ? ua.slice(0, 24) : "—");
}

function Result({ e }: { e: AuditEntry }) {
  if (e.kind === "login_failed") return <Chip size="small" color="error" label="Fallido" />;
  if (e.kind === "denied") return <Chip size="small" color="warning" label={`Denegado ${e.status}`} />;
  if (e.status >= 400) return <Chip size="small" color="error" variant="outlined" label={`Error ${e.status}`} />;
  return <Chip size="small" color="success" variant="outlined" label="OK" />;
}

export default function AuditPage() {
  const [f, setF] = React.useState({ from: "", to: "", group: "", kind: "", email: "", q: "" });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((p) => ({ ...p, [k]: e.target.value }));
  // Los campos de texto esperan a que se deje de escribir.
  const [typed, setTyped] = React.useState({ email: "", q: "" });
  React.useEffect(() => {
    const t = setTimeout(() => setTyped({ email: f.email, q: f.q }), 400);
    return () => clearTimeout(t);
  }, [f.email, f.q]);

  const params = Object.fromEntries(
    Object.entries({ ...f, ...typed }).filter(([, v]) => v)
  );
  const query = useInfiniteQuery({
    queryKey: ["audit", params],
    queryFn: ({ pageParam }) => listAudit({ ...params, before: pageParam || undefined, limit: 200 }),
    initialPageParam: "" as string,
    getNextPageParam: (last) => last.nextBefore || undefined,
    staleTime: 15_000,
  });
  const rows = query.data?.pages.flatMap((p) => p.items) || [];

  const exportCsv = () =>
    downloadCsv(`auditoria_${stamp()}.csv`, toCsv(rows, [
      { header: "Fecha", value: (r) => fmt(r.at) },
      { header: "Usuario", value: (r) => r.userName || "" },
      { header: "Correo", value: (r) => r.email || "" },
      { header: "Roles", value: (r) => r.roles.join(", ") },
      { header: "Acción", value: (r) => r.action },
      { header: "Tipo", value: (r) => r.kind },
      { header: "Estado HTTP", value: (r) => r.status },
      { header: "Ruta", value: (r) => `${r.method} ${r.path}` },
      { header: "Id afectado", value: (r) => r.targetId || "", text: true },
      { header: "IP", value: (r) => r.ip || "", text: true },
      { header: "Dispositivo", value: (r) => device(r.ua) },
    ]));

  return (
    <Box>
      <PageHeader
        crumb="Seguridad"
        title="Auditoría"
        description="Quién entró al panel, desde dónde y qué cambió: ventas, taquilla, puerta, obras, usuarios y configuración. Las consultas (solo mirar) no se registran."
        actions={[
          { label: "Exportar", kind: "sec", icon: <FileSpreadsheet size={14} />, disabled: !rows.length, onClick: exportCsv },
          { label: "Actualizar", kind: "sec", icon: <RefreshCw size={14} />, disabled: query.isFetching, onClick: () => query.refetch() },
        ]}
      />

      <Stack direction={{ xs: "column", md: "row" }} spacing={2} mb={3} useFlexGap flexWrap="wrap">
        <TextField size="small" type="date" label="Desde" value={f.from} onChange={set("from")} InputLabelProps={{ shrink: true }} />
        <TextField size="small" type="date" label="Hasta" value={f.to} onChange={set("to")} InputLabelProps={{ shrink: true }} />
        <TextField size="small" select label="Área" value={f.group} onChange={set("group")} sx={{ minWidth: 200 }}>
          {GROUPS.map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
        </TextField>
        <TextField size="small" select label="Tipo" value={f.kind} onChange={set("kind")} sx={{ minWidth: 160 }}>
          {KINDS.map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
        </TextField>
        <TextField size="small" label="Correo del usuario" value={f.email} onChange={set("email")} sx={{ minWidth: 200 }} />
        <TextField size="small" label="Buscar acción, ruta o IP" value={f.q} onChange={set("q")} sx={{ minWidth: 220 }} />
      </Stack>

      <Card>
        {query.isFetching && <LinearProgress />}
        {query.isLoading ? (
          <Box sx={{ p: 4, textAlign: "center" }}><CircularProgress /></Box>
        ) : query.isError ? (
          <Typography sx={{ p: 3 }} color="error">
            No se pudo cargar la auditoría ({(query.error as any)?.response?.status || "sin conexión"}). Solo la ve un superusuario.
          </Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Usuario</TableCell>
                  <TableCell>Acción</TableCell>
                  <TableCell>Resultado</TableCell>
                  <TableCell>IP / dispositivo</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow><TableCell colSpan={5} align="center" sx={{ color: "text.secondary", py: 3 }}>Sin registros con estos filtros.</TableCell></TableRow>
                ) : rows.map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>{fmt(r.at)}</TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{r.userName || (r.email ? "—" : "Anónimo")}</Typography>
                      <Typography variant="caption" color="text.secondary" component="div">{r.email}</Typography>
                      {r.roles.length > 0 && (
                        <Stack direction="row" spacing={0.5} mt={0.5} flexWrap="wrap" useFlexGap>
                          {r.roles.map((x) => <Chip key={x} size="small" label={x} sx={{ height: 18, fontSize: 11 }} />)}
                        </Stack>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{r.action}</Typography>
                      <Tooltip title={r.path}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>
                          {r.method} {r.targetId ? `· ${r.targetId}` : ""} · {r.ms} ms
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell><Result e={r} /></TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: "monospace" }}>{r.ip || "—"}</Typography>
                      <Tooltip title={r.ua || ""}>
                        <Typography variant="caption" color="text.secondary">{device(r.ua)}</Typography>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        {query.hasNextPage && (
          <Box sx={{ p: 2, textAlign: "center" }}>
            <Button variant="outlined" onClick={() => query.fetchNextPage()} disabled={query.isFetchingNextPage}>
              {query.isFetchingNextPage ? "Cargando…" : "Cargar más"}
            </Button>
          </Box>
        )}
      </Card>
    </Box>
  );
}
