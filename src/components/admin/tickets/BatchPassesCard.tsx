"use client";

/* Pases en lote sin correo: "Bavaria 1..N", todos los días, 1 persona cada uno.
   Sale un ZIP con una imagen por pase (para mandarlas por WhatsApp a quien las
   reparte). Después, en la lista, el lápiz de cada fila le pone el correo y el
   nombre real y le reenvía el pase. */
import * as React from "react";
import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from "@mui/material";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { createBatchPasses, type BatchPass } from "@/services/ticket.service";

const W = 1080, H = 1350;

const loadImg = (src: string) =>
  new Promise<HTMLImageElement | null>((ok) => {
    const i = new Image();
    i.onload = () => ok(i);
    i.onerror = () => ok(null);
    i.src = src;
  });

/** Imagen del pase: logo, nombre, QR grande, código y "todos los días". */
async function passPng(p: BatchPass, eventName: string, logo: HTMLImageElement | null): Promise<Blob> {
  const { default: QRCode } = await import("qrcode");
  const qr = document.createElement("canvas");
  await QRCode.toCanvas(qr, p.qrToken, { width: 760, margin: 1, errorCorrectionLevel: "M" });

  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d")!;
  g.fillStyle = "#F5F4EF"; g.fillRect(0, 0, W, H);
  g.textAlign = "center"; g.fillStyle = "#0B0B0A";
  let y = 70;
  if (logo) {
    const lh = 110, lw = (logo.width / logo.height) * lh;
    g.drawImage(logo, (W - lw) / 2, y, lw, lh);
    y += lh + 40;
  }
  g.fillStyle = "#3FA46E"; g.font = "600 30px system-ui, sans-serif";
  g.fillText("PASE DE INGRESO · TODOS LOS DÍAS", W / 2, y + 30);
  g.fillStyle = "#0B0B0A"; g.font = "700 64px system-ui, sans-serif";
  g.fillText(p.name.toUpperCase(), W / 2, y + 110, W - 120);
  g.drawImage(qr, (W - 760) / 2, y + 150, 760, 760);
  g.font = "600 40px ui-monospace, monospace";
  g.fillText(p.shortCode, W / 2, y + 970);
  g.fillStyle = "#5F5E57"; g.font = "400 28px system-ui, sans-serif";
  g.fillText(`${eventName} · 1 persona · muéstralo en la entrada`, W / 2, y + 1020, W - 120);
  return new Promise((ok) => c.toBlob((b) => ok(b!), "image/png"));
}

async function downloadZip(label: string, eventName: string, passes: BatchPass[]) {
  const [{ default: JSZip }, logo] = await Promise.all([import("jszip"), loadImg("/logo-m.png")]);
  const zip = new JSZip();
  for (const p of passes) zip.file(`${p.name}.png`, await passPng(p, eventName, logo));
  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pases-${label.toLowerCase().replace(/\s+/g, "-")}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export default function BatchPassesCard({ eventId }: { eventId: string }) {
  const qc = useQueryClient();
  const [label, setLabel] = React.useState("");
  const [count, setCount] = React.useState(30);
  const [busy, setBusy] = React.useState(false);
  const [last, setLast] = React.useState<{ label: string; eventName: string; passes: BatchPass[] } | null>(null);

  const run = async () => {
    setBusy(true);
    try {
      const r = await createBatchPasses(eventId, label.trim(), count);
      const done = { label: label.trim(), eventName: r.eventName, passes: r.passes };
      setLast(done);
      qc.invalidateQueries({ queryKey: ["invitations", eventId] });
      await downloadZip(done.label, done.eventName, done.passes);
      toast.success(`${r.passes.length} pases creados: ${r.passes[0]?.name} … ${r.passes[r.passes.length - 1]?.name}`);
    } catch (e: any) {
      toast.error(e?.response?.data?.error || e?.message || "No se pudieron crear los pases");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Stack spacing={1.5}>
          <Typography variant="h6">Pases en lote (sin correo)</Typography>
          <Typography variant="body2" color="text.secondary">
            Para empresas o aliados que reparten entradas y no tienen los correos: cada pase sirve todos los días para 1 persona.
            Sale un ZIP con una imagen por pase para mandarlas por WhatsApp. Después, en la lista de abajo, busca «{label || "Bavaria"} 3» y con el lápiz
            le pones su correo y nombre reales: le llega su pase.
          </Typography>
          <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", sm: "2fr 1fr auto" }, alignItems: "center" }}>
            <TextField label="Nombre del lote" placeholder="Bavaria" value={label} onChange={(e) => setLabel(e.target.value)} disabled={busy} />
            <TextField label="Cantidad" type="number" value={count} disabled={busy}
              onChange={(e) => setCount(Math.min(200, Math.max(1, parseInt(e.target.value, 10) || 1)))}
              slotProps={{ htmlInput: { min: 1, max: 200 } }} />
            <Button variant="contained" size="large" startIcon={<Download size={16} />} disabled={busy || !label.trim()} onClick={run}>
              {busy ? "Creando…" : `Crear ${count} y descargar`}
            </Button>
          </Box>
          <Alert severity="warning">
            Cada imagen es una entrada válida: quien la tenga, entra. Si creas otro lote con el mismo nombre, sigue la numeración (no se repiten).
          </Alert>
          {last && (
            <Box>
              <Button size="small" onClick={() => downloadZip(last.label, last.eventName, last.passes)}>
                Descargar otra vez las {last.passes.length} imágenes de «{last.label}»
              </Button>
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
