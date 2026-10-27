"use client";

import { useState } from "react";
import { Box, Card, CardContent, Typography, useMediaQuery, useTheme } from "@mui/material";
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
  const wide = useMediaQuery(useTheme().breakpoints.up("md"));
  const finder = useArtworkFinder(eventId);
  const { data: cities = [] } = useCities();
  const checkout = useCheckout(eventId, cities);
  const access = useCajaAccess();

  const [selected, setSelected] = useState<CajaArtwork | null>(null);
  const [done, setDone] = useState<SaleResult | null>(null);

  const artPavilion = String(selected?.pavilionInfo?._id ?? selected?.pavilion ?? "");
  const outsidePavilion =
    !!selected && finder.pavilionLocked && !finder.pavilionOptions.some((p) => pavilionId(p) === artPavilion);

  const pick = (a: CajaArtwork) => {
    setDone(null);
    setSelected(a);
  };
  const next = () => {
    setDone(null);
    setSelected(null);
    checkout.reset();
    finder.setText("");
  };

  const showFinder = wide || (!selected && !done);
  const showCheckout = wide || !!selected || !!done;

  return (
    <Box sx={{ maxWidth: 1240, mx: "auto" }}>
      <PageHeader
        crumb="Caja"
        title="Vender obra"
        description="Escanea el QR o busca la obra, toma los datos del comprador y cobra."
        actions={[{ label: "Mi cierre del día", kind: "sec", href: "/caja/cierre" }]}
      />
      <PracticeBanner />

      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "minmax(0, 7fr) minmax(0, 5fr)" }, alignItems: "start" }}>
        {showFinder && (
          <ArtworkFinderPanel finder={finder} selectedId={selected ? artworkId(selected) : undefined} onPick={pick} />
        )}

        {showCheckout && (
          <Card variant="outlined" sx={{ borderRadius: 0, position: { md: "sticky" }, top: { md: 16 } }}>
            <CardContent sx={{ p: 2, "&:last-child": { pb: 0 } }}>
              {done ? (
                <Box sx={{ pb: 2 }}>
                  <SaleDone result={done} onNext={next} />
                </Box>
              ) : selected ? (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
                  <SelectedArtwork artwork={selected} outsidePavilion={outsidePavilion} onChange={() => setSelected(null)} />
                  <SaleForm
                    key={artworkId(selected)}
                    artwork={selected}
                    cities={cities}
                    disabled={outsidePavilion}
                    canLayaway={access.canLayaway}
                    isPending={checkout.isPending}
                    onSubmit={(values) =>
                      checkout.mutate(
                        { artwork: selected, values },
                        { onSuccess: setDone, onError: (e) => toast.error(checkoutError(e)) },
                      )
                    }
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
