"use client";

import { useState } from "react";
import {
  Alert, Box, Stack, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, Typography,
} from "@mui/material";
import PageHeader from "@/components/ui/PageHeader";
import { useAuth } from "@/provider/authProvider";
import { SHOP_URL } from "@/core/constants";
import { formatCOP } from "@/utils/money";
import { useActiveEvent } from "@hooks/events/useActiveEvent";
import { useArtworksCursor } from "@hooks/useArtworksCursor";
import { artistName, artworkId, imageOf, stockOf, type CajaArtwork } from "@features/caja/model/artwork";
import { PracticeBanner } from "@features/caja/components/PracticeBanner";
import { ENTRY_DEMOS, ERRORS, ROLE_TABS, STEPS, type ErrorCase, type GuideRole } from "../model/guide";
import { QrTile } from "./QrTile";

const grid = { display: "grid", gap: 1.5, gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 200px), 1fr))" } as const;

function Section({ title, children, hint }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <Box component="section" sx={{ mt: 4, breakInside: "avoid-page" }}>
      <Typography variant="h6" fontWeight={600}>{title}</Typography>
      {hint && <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>{hint}</Typography>}
      {children}
    </Box>
  );
}

function ErrorTable({ rows }: { rows: ErrorCase[] }) {
  return (
    <TableContainer sx={{ border: "1px solid", borderColor: "divider" }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Si sale…</TableCell>
            <TableCell>Qué pasó</TableCell>
            <TableCell>Qué haces</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.message}>
              <TableCell sx={{ fontWeight: 600 }}>{r.message}</TableCell>
              <TableCell>{r.what}</TableCell>
              <TableCell>{r.todo}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

/** QR de obras reales para practicar la venta: unas con stock y, si hay, una agotada. */
function ArtworkDemos({ eventId }: { eventId: string }) {
  const list = useArtworksCursor({ event: eventId, includeHidden: 1, limit: 24, enabled: !!eventId, project: "tagId" });
  const rows = (list.rows ?? []) as CajaArtwork[];
  const picks = [...rows.filter((a) => stockOf(a) > 0).slice(0, 5), ...rows.filter((a) => stockOf(a) <= 0).slice(0, 1)];
  if (list.isLoading) return <Typography color="text.secondary">Cargando obras…</Typography>;
  if (!picks.length) return <Alert severity="info">Todavía no hay obras cargadas en la feria.</Alert>;
  return (
    <Box sx={grid}>
      {picks.map((a) => (
        <QrTile
          key={artworkId(a)}
          value={`${SHOP_URL}/obra/${artworkId(a)}`}
          title={a.title || "Obra"}
          image={imageOf(a)}
          caption={
            stockOf(a) > 0
              ? `${artistName(a)} · ${formatCOP(a.price)} · quedan ${stockOf(a)}`
              : `${artistName(a)} · AGOTADA: al cobrar sale «Esta obra ya se vendió».`
          }
        />
      ))}
    </Box>
  );
}

/** Guía de la caja: qué hace cada rol, QR para practicar y qué hacer con cada error. */
export function GuidePage() {
  const { user } = useAuth();
  const r = user?.roles ?? {};
  const [tab, setTab] = useState<GuideRole>(r.jefeCaja ? "coordinadora" : r.taquilla && !r.cajero ? "taquilla" : "cajera");
  const { eventId } = useActiveEvent();

  return (
    <Box sx={{ maxWidth: 1080, mx: "auto" }}>
      <PageHeader
        crumb="Caja"
        title="Guía y práctica"
        description="Cómo cobrar, cómo validar y qué hacer cuando algo sale mal. Con QR de prueba para practicar."
        actions={[{ label: "Imprimir", kind: "sec", onClick: () => window.print() }]}
      />
      <PracticeBanner />

      <Alert severity="info" sx={{ mb: 2 }}>
        Para practicar sin cobrar ni guardar nada, tu cuenta tiene que estar en <strong>modo práctica</strong> (lo activa
        administración). En «Validar entradas» elige <strong>Práctica</strong> para probar los QR de abajo. Abre esta guía
        en otra pantalla o imprímela y escanea desde el celular o la tablet de la caja.
      </Alert>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" allowScrollButtonsMobile>
        {ROLE_TABS.map((t) => <Tab key={t.value} value={t.value} label={t.label} />)}
      </Tabs>

      <Section title="Paso a paso">
        <Stack component="ol" spacing={1} sx={{ pl: 2.5, m: 0 }}>
          {STEPS[tab].map((s) => (
            <Typography component="li" key={s} fontSize={15} lineHeight={1.55}>{s}</Typography>
          ))}
        </Stack>
      </Section>

      {(tab === "cajera" || tab === "coordinadora") && (
        <>
          <Section
            title="QR de obras para practicar"
            hint="Son obras reales de la feria. En «Vender obra» toca el ícono de QR y escanea uno. En modo práctica la venta no se guarda ni baja el stock."
          >
            {eventId ? <ArtworkDemos eventId={eventId} /> : <Typography color="text.secondary">Sin feria activa.</Typography>}
          </Section>
          <Section title="Si algo sale mal en la caja">
            <ErrorTable rows={ERRORS.caja} />
          </Section>
        </>
      )}

      {tab === "taquilla" && (
        <Section title="Si algo sale mal en la taquilla">
          <ErrorTable rows={ERRORS.taquilla} />
        </Section>
      )}

      <Section
        title="QR de entradas para practicar"
        hint="Escanéalos en «Validar entradas» con el modo Práctica. Cada uno muestra un caso de la puerta."
      >
        <Box sx={grid}>
          {ENTRY_DEMOS.map((d) => (
            <QrTile key={d.key} value={d.token} title={d.title} caption={d.expect} />
          ))}
        </Box>
      </Section>

      <Section title="Si algo sale mal en la puerta">
        <ErrorTable rows={ERRORS.puerta} />
      </Section>
    </Box>
  );
}
