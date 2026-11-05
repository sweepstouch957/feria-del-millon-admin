"use client";

/* Pestaña "Accesos (QR)": se pega la lista de correo + clave (como en
   /users/equipo/accesos) y sale un PDF con un QR por persona que entra
   directo al panel. El servidor verifica cada clave y crea un enlace de
   un solo uso (7 días); las filas con error no salen en el PDF. */
import * as React from "react";
import { Alert, Box, Button, Card, CardContent, Chip, LinearProgress, Stack, TextField, Typography } from "@mui/material";
import { Download } from "lucide-react";
import { parseCredentials } from "@features/equipo/model/roster";
import { createAccessLink } from "@services/auth.service";
import type { PdfAssets } from "./labelsPdf";

type Result = { email: string; error?: string };

export default function AccessQrTab({ loadAssets }: { loadAssets: () => Promise<PdfAssets> }) {
  const [text, setText] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [results, setResults] = React.useState<Result[]>([]);
  const { rows, skipped } = React.useMemo(() => parseCredentials(text), [text]);
  // Nombre opcional: lo que esté antes del correo en la misma línea.
  const names = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const line of text.split(/\r?\n/)) {
      const hit = rows.find((r) => line.toLowerCase().includes(r.email));
      if (hit) m.set(hit.email, line.slice(0, line.toLowerCase().indexOf(hit.email)).replace(/[\t,;|]+/g, " ").trim());
    }
    return m;
  }, [text, rows]);

  const run = async () => {
    setBusy(true);
    setResults([]);
    try {
      const cards = [];
      const out: Result[] = [];
      for (const { email, password } of rows) {
        try {
          const r = await createAccessLink(email, password);
          const name = names.get(email) || [r.firstName, r.lastName].filter(Boolean).join(" ") || email;
          cards.push({ name, email: r.email, password, url: `${window.location.origin}/login#acceso=${r.token}`, expiresAt: r.expiresAt });
          out.push({ email });
        } catch (e: any) {
          out.push({ email, error: e?.response?.data?.error || e?.message || "Error" });
        }
        setResults([...out]);
      }
      if (cards.length) {
        const [{ buildAccessPdf }, assets] = await Promise.all([import("./accessPdf"), loadAssets()]);
        const bytes = await buildAccessPdf(cards, assets, window.location.host);
        const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/pdf" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = `accesos-panel-${new Date().toISOString().slice(0, 10)}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      }
    } finally {
      setBusy(false);
    }
  };

  const failed = results.filter((r) => r.error);
  return (
    <Card><CardContent>
      <Stack spacing={2}>
        <Typography variant="body2" color="text.secondary">
          Pega la lista: <b>nombre, correo y clave</b> por línea (como la mandas por WhatsApp o Excel). Sale un PDF con una tarjeta por persona:
          el QR entra directo al panel ({typeof window !== "undefined" ? window.location.host : "panel"}) sin escribir nada, y abajo van su correo y clave de respaldo.
        </Typography>
        <Alert severity="warning">
          Cada QR sirve <b>una sola vez</b> y vence en 7 días. Quien lo escanee primero entra con esa cuenta: entrega cada tarjeta en mano.
          Si se usa o se pierde, genera otro (los anteriores siguen sirviendo hasta usarse o vencer).
        </Alert>
        <TextField
          multiline minRows={6} maxRows={16} fullWidth
          placeholder={"Nombre Apellido\tcorreo@ejemplo.com\tClave"}
          value={text} onChange={(e) => setText(e.target.value)} disabled={busy}
        />
        {skipped.length > 0 && <Alert severity="warning">Sin clave, no salen: {skipped.join(" · ")}</Alert>}
        {busy && <LinearProgress variant="determinate" value={rows.length ? (results.length / rows.length) * 100 : 0} />}
        {failed.length > 0 && (
          <Box>
            <Typography variant="caption" color="error">No salen en el PDF:</Typography>
            <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 0.5 }}>
              {failed.map((r) => <Chip key={r.email} size="small" color="error" label={`${r.email}: ${r.error}`} />)}
            </Stack>
          </Box>
        )}
        {!busy && results.length > 0 && (
          <Alert severity={failed.length ? "warning" : "success"}>{results.length - failed.length} acceso(s) en el PDF, {failed.length} con error.</Alert>
        )}
        <Box>
          <Button variant="contained" size="large" startIcon={<Download size={16} />} disabled={!rows.length || busy} onClick={run}>
            {busy ? `Generando ${results.length + 1} de ${rows.length}…` : `Generar PDF con ${rows.length} QR de acceso`}
          </Button>
        </Box>
      </Stack>
    </CardContent></Card>
  );
}
