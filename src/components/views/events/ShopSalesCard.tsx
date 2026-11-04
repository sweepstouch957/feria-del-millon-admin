"use client";

/* Tienda en línea antes y durante la feria, desde la ficha de la feria:
   - "Mostrar las obras": revela las obras ocultas hasta el evento (página del
     artista, catálogo, QR) sin esperar la fecha de inicio. Comprar sigue
     bloqueado mientras la venta en línea esté pausada.
   - "Permitir comprar (modo feria)": abre la compra desde el QR de cada obra.
     Mientras esté apagado, la obra con stock se ve con el botón deshabilitado. */
import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Box, Card, CardContent, Stack, Switch, Typography } from "@mui/material";
import StatusPill from "@components/ui/StatusPill";
import { setCatalogReveal, type EventDoc } from "@services/events.service";
import { getSiteConfig, updateSiteConfig } from "@services/siteConfig.service";

const ymd = (s?: string) => (s ? new Date(`${s}T12:00:00`).toLocaleDateString("es-CO", { day: "numeric", month: "short" }) : "");

export default function ShopSalesCard({ event }: { event: EventDoc | null | undefined }) {
  const qc = useQueryClient();
  const eventId = String((event as any)?.id ?? (event as any)?._id ?? "");
  const [revealed, setRevealed] = React.useState(!!(event as any)?.catalogRevealed);
  React.useEffect(() => setRevealed(!!(event as any)?.catalogRevealed), [event]);
  const started = !!event?.validFrom && Date.now() >= new Date(event.validFrom).getTime();

  const site = useQuery({ queryKey: ["site-config"], queryFn: getSiteConfig, staleTime: 30_000 });
  const sales = site.data?.landing.catalogSales;
  const fairMode = !!sales?.fairMode;

  const reveal = useMutation({
    mutationFn: (on: boolean) => setCatalogReveal(eventId, on),
    onMutate: (on) => setRevealed(on),
    onError: () => setRevealed(!!(event as any)?.catalogRevealed),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }),
  });

  // Se pide la configuración fresca justo antes de guardar: así no se pisa lo que
  // alguien haya cambiado en Personalización mientras esta página estaba abierta.
  const toggleFair = useMutation({
    mutationFn: async (on: boolean) => {
      const fresh = await getSiteConfig();
      return updateSiteConfig({ ...fresh, landing: { ...fresh.landing, catalogSales: { ...fresh.landing.catalogSales, fairMode: on } } });
    },
    onSuccess: (data) => qc.setQueryData(["site-config"], data),
  });

  const row = (title: string, help: React.ReactNode, control: React.ReactNode) => (
    <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" sx={{ py: 1.25 }}>
      <Box>
        <Typography fontWeight={600}>{title}</Typography>
        <Typography variant="body2" color="text.secondary">{help}</Typography>
      </Box>
      {control}
    </Stack>
  );

  return (
    <Card>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1} sx={{ mb: 1 }}>
          <Typography variant="h6">Tienda en línea</Typography>
          <Stack direction="row" gap={1}>
            <StatusPill tone={revealed || started ? "ok" : "mid"} dot={revealed || started} label={revealed || started ? "Obras visibles" : "Obras ocultas"} />
            <StatusPill tone={fairMode ? "ok" : "warn"} dot={fairMode} label={fairMode ? "Se puede comprar" : "Compra bloqueada"} />
          </Stack>
        </Stack>

        {row(
          "Mostrar las obras antes de la feria",
          started
            ? "La feria ya empezó: las obras se ven solas."
            : "Se ven en la página de cada artista (QR del catálogo) y en las fichas. Sin esto, salen hasta el día de inicio.",
          <Switch color="success" checked={revealed || started} disabled={started || reveal.isPending || !eventId} onChange={(e) => reveal.mutate(e.target.checked)} />,
        )}

        {row(
          "Permitir comprar (modo feria)",
          <>
            Apagado: la obra disponible se ve con el botón «Venta en feria» deshabilitado.
            Encendido: se compra desde el QR de cada obra (sin catálogo ni carrito).
            {sales?.pausedFrom && !fairMode && ` Venta en línea pausada del ${ymd(sales.pausedFrom)} al ${ymd(sales.pausedTo)}.`}
          </>,
          <Switch color="success" checked={fairMode} disabled={site.isLoading || toggleFair.isPending} onChange={(e) => toggleFair.mutate(e.target.checked)} />,
        )}

        {(reveal.isError || toggleFair.isError) && <Alert severity="error" sx={{ mt: 1 }}>No se pudo guardar. Intenta de nuevo.</Alert>}
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
          El mensaje y las fechas de la pausa se cambian en <Link href="/personalizacion">Personalización → Venta en línea del catálogo</Link>.
        </Typography>
      </CardContent>
    </Card>
  );
}
