"use client";

import { useState } from "react";
import { Alert, Box, Button, Card, CircularProgress, Stack, Typography } from "@mui/material";
import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import PageHeader from "@/components/ui/PageHeader";
import KpiStrip from "@/components/ui/KpiStrip";
import StatusPill from "@/components/ui/StatusPill";
import { Diff, when } from "@features/correcciones/components/CorrectionsPopup";
import { decideCorrection, listCorrections, type CorrectionStatus, type SaleCorrection } from "@services/corrections.service";

/* Correcciones de venta que hacen las cajeras desde su cierre o la taquilla.
   El método de pago ya quedó aplicado (solo se registra); precio y correo
   esperan aquí (o en el pop-up) a que administración apruebe. */

const TABS: { key: CorrectionStatus; label: string }[] = [
  { key: "pending", label: "Por aprobar" },
  { key: "applied", label: "Cambios de método" },
  { key: "approved", label: "Aprobadas" },
  { key: "rejected", label: "Rechazadas" },
];

export default function CorreccionesPage() {
  const [tab, setTab] = useState<CorrectionStatus>("pending");
  const lists = useQueries({
    queries: TABS.map((t) => ({ queryKey: ["corrections", t.key], queryFn: () => listCorrections(t.key), refetchInterval: 60_000 })),
  });
  const current = lists[TABS.findIndex((t) => t.key === tab)];
  const rows = current.data ?? [];

  return (
    <Box>
      <PageHeader
        crumb="Ventas"
        title="Correcciones de venta"
        description="Lo que corrigen las cajeras en sus ventas. El método de pago se aplica de una vez; precio y correo esperan su aprobación."
      />
      <KpiStrip
        loading={lists.some((l) => l.isLoading)}
        items={TABS.map((t, i) => ({ label: t.label, value: lists[i].data?.length ?? 0, onClick: () => setTab(t.key), selected: tab === t.key }))}
      />
      {current.isError && <Alert severity="error" sx={{ my: 2 }}>No cargaron las correcciones.</Alert>}
      {current.isLoading ? (
        <Box sx={{ p: 6, textAlign: "center" }}><CircularProgress /></Box>
      ) : !rows.length ? (
        <Card sx={{ p: 4, mt: 2, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">Nada en esta pestaña.</Typography>
        </Card>
      ) : (
        <Stack spacing={1.5} sx={{ mt: 2 }}>
          {rows.map((c) => <CorrectionCard key={c.id} c={c} />)}
        </Stack>
      )}
    </Box>
  );
}

const PILL: Record<CorrectionStatus, { label: string; tone: "ok" | "bad" | "mid" }> = {
  pending: { label: "Por aprobar", tone: "mid" },
  applied: { label: "Aplicado", tone: "ok" },
  approved: { label: "Aprobada", tone: "ok" },
  rejected: { label: "Rechazada", tone: "bad" },
};

function CorrectionCard({ c }: { c: SaleCorrection }) {
  const qc = useQueryClient();
  const decide = useMutation({
    mutationFn: (approve: boolean) => decideCorrection(c.id, approve),
    onSuccess: (r) => {
      toast.success(r.status === "approved" ? "Corrección aplicada." : "Corrección rechazada.");
      qc.invalidateQueries({ queryKey: ["corrections"] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? "No se pudo guardar la decisión."),
  });

  return (
    <Card sx={{ p: 2.5 }}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between">
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 600 }}>
            {c.kind === "ticket" ? "Entradas" : "Obra"}: {c.label}
            {c.buyerName ? ` · ${c.buyerName}` : ""}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {c.requestedByName || "Cajera"} · venta del {when(c.saleAt)} · pedido el {when(c.createdAt)}
          </Typography>
          <Diff c={c} />
          {c.note && <Typography variant="body2" sx={{ fontStyle: "italic" }}>“{c.note}”</Typography>}
        </Box>
        <Stack spacing={0.75} alignItems={{ xs: "flex-start", md: "flex-end" }} sx={{ flexShrink: 0 }}>
          <StatusPill label={PILL[c.status].label} tone={PILL[c.status].tone} />
          {c.decidedAt && <Typography variant="caption" color="text.secondary">Decidida {when(c.decidedAt)}</Typography>}
          <Typography variant="caption">#{c.targetId.slice(-8).toUpperCase()}</Typography>
        </Stack>
      </Stack>
      {c.status === "pending" && (
        <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
          <Button variant="contained" disabled={decide.isPending} onClick={() => decide.mutate(true)}>Aprobar</Button>
          <Button color="error" disabled={decide.isPending} onClick={() => decide.mutate(false)}>Rechazar</Button>
        </Stack>
      )}
    </Card>
  );
}
