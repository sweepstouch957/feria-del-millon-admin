"use client";

import { useState } from "react";
import {
  Box, Stack, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, Typography,
} from "@mui/material";
import PageHeader from "@/components/ui/PageHeader";
import { useAuth } from "@/provider/authProvider";
import { ERRORS, ROLE_TABS, STEPS, type ErrorCase, type GuideRole } from "../model/guide";

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

/** Guía de la caja: qué hace cada rol y qué hacer con cada error. */
export function GuidePage() {
  const { user } = useAuth();
  const r = user?.roles ?? {};
  const [tab, setTab] = useState<GuideRole>(r.jefeCaja ? "coordinadora" : r.taquilla && !r.cajero ? "taquilla" : "cajera");

  return (
    <Box sx={{ maxWidth: 1080, mx: "auto" }}>
      <PageHeader
        crumb="Caja"
        title="Guía de caja"
        description="Cómo cobrar, cómo validar y qué hacer cuando algo sale mal, según tu rol."
        actions={[{ label: "Imprimir", kind: "sec", onClick: () => window.print() }]}
      />

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
        <Section title="Si algo sale mal en la caja">
          <ErrorTable rows={ERRORS.caja} />
        </Section>
      )}

      {tab === "taquilla" && (
        <Section title="Si algo sale mal en la taquilla">
          <ErrorTable rows={ERRORS.taquilla} />
        </Section>
      )}

      <Section title="Si algo sale mal en la puerta">
        <ErrorTable rows={ERRORS.puerta} />
      </Section>
    </Box>
  );
}
