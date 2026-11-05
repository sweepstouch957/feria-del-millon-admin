"use client";

import { useCallback, useState } from "react";
import { Box, Card, CardContent, Typography, useMediaQuery } from "@mui/material";
import { toast } from "sonner";
import PageHeader from "@/components/ui/PageHeader";
import { eyebrow } from "@/app/theme";
import { ActiveEventGate, useActiveEvent } from "@hooks/events/useActiveEvent";
import { useCities } from "@hooks/useCities";
import { useArtworkFinder } from "../hooks/useArtworkFinder";
import { pavilionId } from "../hooks/useCashierPavilions";
import { checkoutError, useCheckout, type SaleResult } from "../hooks/useCheckout";
import { artworkId, type CajaArtwork } from "../model/artwork";
import { ArtworkFinderPanel } from "./ArtworkFinderPanel";
import { SaleDone } from "./SaleDone";
import { SaleForm } from "./SaleForm";
import { SelectedArtwork } from "./SelectedArtwork";
import { PracticeBanner } from "./PracticeBanner";
import { useCajaAccess } from "../hooks/useCajaAccess";
import type { CityDoc } from "@services/city.service";
import type { SaleValues } from "../model/sale";

// Referencia fija: un [] nuevo en cada render hacía repintar el formulario de cobro.
const NO_CITIES: CityDoc[] = [];
const WIDE = "(min-width: 1100px)";

const STEPS = ["Elegir obra", "Datos del comprador", "Cobro"];

/** 1 Elegir obra → 2 Datos → 3 Cobro. Con la obra elegida, datos y cobro van en el mismo formulario. */
function Steps({ current }: { current: number }) {
  return (
    <Box component="ol" aria-label="Pasos de la venta" sx={{ display: "flex", alignItems: "center", flexWrap: "nowrap", gap: { xs: 0.75, sm: 1.25 }, listStyle: "none", p: 0, m: "0 0 16px", minWidth: 0 }}>
      {STEPS.map((label, i) => {
        const n = i + 1;
        const active = current === n || (current === 2 && n === 3);
        const doneStep = current > n && !active;
        return (
          <Box component="li" key={label} aria-current={active ? "step" : undefined} sx={{ display: "flex", alignItems: "center", gap: { xs: 0.75, sm: 1.25 }, minWidth: 0 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box
                component="span"
                sx={(t) => {
                  const inv = t.palette.mode === "dark";
                  return {
                    width: 26, height: 26, borderRadius: "50%", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 600,
                    transition: "background-color .25s ease, color .25s ease",
                    bgcolor: doneStep ? "#3FA46E" : active ? (inv ? "#F5F4EF" : "#0B0B0A") : t.palette.action.selected,
                    color: doneStep ? "#0B0B0A" : active ? (inv ? "#0B0B0A" : "#F5F4EF") : "text.secondary",
                  };
                }}
              >
                {doneStep ? "✓" : n}
              </Box>
              {/* Celular: solo el nombre del paso activo; los demás, el número. */}
              <Typography component="span" sx={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", color: active || doneStep ? "text.primary" : "text.secondary", display: { xs: active ? "inline" : "none", sm: "inline" } }}>
                {label}
              </Typography>
            </Box>
            {n < STEPS.length && <Box component="span" aria-hidden sx={{ width: { xs: 14, sm: 28 }, flex: "none", height: "1px", bgcolor: "divider" }} />}
          </Box>
        );
      })}
    </Box>
  );
}

export function CajaPage() {
  const { eventId, isLoading, isError, refetch } = useActiveEvent();
  if (!eventId) return <ActiveEventGate isLoading={isLoading} isError={isError} onRetry={refetch} />;
  return <Caja eventId={eventId} />;
}

/**
 * Caja de obras. Escritorio/tablet: buscador a la izquierda y cobro a la
 * derecha. Celular: un paso a la vez (buscar → cobrar → listo).
 */
function Caja({ eventId }: { eventId: string }) {
  // Dos columnas desde 1100 px (escritorio, tablet acostada grande); debajo, un paso
  // a la vez (celular y tablet). Antes era 900 px y con el menú abierto no cabían.
  // noSsr: sin esto el primer render es "celular" y la pantalla salta al montar.
  const wide = useMediaQuery(WIDE, { noSsr: true });
  const finder = useArtworkFinder(eventId);
  const cities = useCities().data ?? NO_CITIES;
  const checkout = useCheckout(eventId, cities);
  const { mutate: charge, reset: resetCheckout } = checkout;
  const access = useCajaAccess();

  const [selected, setSelected] = useState<CajaArtwork | null>(null);
  const [done, setDone] = useState<SaleResult | null>(null);

  const artPavilion = String(selected?.pavilionInfo?._id ?? selected?.pavilion ?? "");
  const outsidePavilion =
    !!selected && finder.pavilionLocked && !finder.pavilionOptions.some((p) => pavilionId(p) === artPavilion);

  // Estables: el buscador cambia en cada tecla y no debe repintar las tarjetas ni el cobro.
  const pick = useCallback((a: CajaArtwork) => {
    setDone(null);
    setSelected(a);
  }, []);
  const clearSelection = useCallback(() => setSelected(null), []);
  const submit = useCallback(
    (values: SaleValues) => {
      if (!selected) return;
      charge({ artwork: selected, values }, { onSuccess: setDone, onError: (e) => toast.error(checkoutError(e)) });
    },
    [selected, charge],
  );
  const { setText } = finder;
  const next = useCallback(() => {
    setDone(null);
    setSelected(null);
    resetCheckout();
    setText("");
  }, [resetCheckout, setText]);

  const showFinder = wide || (!selected && !done);
  const showCheckout = wide || !!selected || !!done;

  return (
    <Box sx={{ maxWidth: 1240, mx: "auto" }}>
      <PageHeader
        crumb="Caja"
        title="Vender obra"
        description={wide ? "Primero escanea el QR de la obra o búscala por su nombre. Después sigue los pasos 1, 2 y 3." : undefined}
        actions={[{ label: "Mi cierre del día", kind: "sec", href: "/caja/cierre" }]}
      />
      <PracticeBanner />
      <Steps current={done ? 4 : selected ? 2 : 1} />

      <Box
        sx={{
          display: "grid",
          gap: 2,
          alignItems: "start",
          gridTemplateColumns: "minmax(0, 1fr)",
          // El cobro con ancho propio (360–460 px); el buscador se queda con el resto.
          [`@media ${WIDE}`]: { gridTemplateColumns: "minmax(0, 1fr) minmax(360px, 460px)" },
        }}
      >
        {showFinder && (
          <ArtworkFinderPanel finder={finder} selectedId={selected ? artworkId(selected) : undefined} onPick={pick} />
        )}

        {showCheckout && (
          // Sin scroll propio: en tablets el scroll interno (sticky + overflow +
          // overscroll contain) se trababa con el dedo y no se llegaba a apartar
          // ni a cobrar. Ahora baja toda la página; total y botón quedan pegados
          // abajo (overflow visible para que ese sticky funcione).
          <Card
            variant="outlined"
            sx={{
              borderRadius: 0,
              overflow: "visible",
              // El formulario se acomoda al ancho de esta caja, no al de la pantalla.
              containerType: "inline-size",
              containerName: "cobro",
            }}
          >
            <CardContent sx={{ p: { xs: 1.5, sm: 2 }, "&:last-child": { pb: 0 } }}>
              {done ? (
                <Box sx={{ pb: 2 }}>
                  <SaleDone result={done} onNext={next} />
                </Box>
              ) : selected ? (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
                  <SelectedArtwork artwork={selected} outsidePavilion={outsidePavilion} onChange={clearSelection} />
                  <SaleForm
                    key={artworkId(selected)}
                    artwork={selected}
                    cities={cities}
                    disabled={outsidePavilion}
                    canLayaway={access.canLayaway}
                    isPending={checkout.isPending}
                    onSubmit={submit}
                  />
                </Box>
              ) : (
                <Box sx={{ py: 4, textAlign: "center" }}>
                  <Typography sx={{ ...eyebrow, color: "text.secondary" }}>Sin obra</Typography>
                  <Typography color="text.secondary" sx={{ mt: 1 }}>
                    Escanea el QR o toca una obra de la lista para cobrarla.
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        )}
      </Box>
    </Box>
  );
}
