"use client";

import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useArtworksCursor } from "@hooks/useArtworksCursor";
import { useDebouncedValue } from "@hooks/useDebouncedValue";
import { useTechniques } from "@hooks/useTechniques";
import { getArtworkById, listArtworks } from "@services/artworks.service";
import { listEventArtists, type EventArtistOption } from "@services/events.service";
import { parseScan } from "../model/parseScan";
import type { CajaArtwork } from "../model/artwork";
import { pavilionId, useCashierPavilions } from "./useCashierPavilions";

/**
 * Buscador de la caja: texto/código, pabellón, técnica y artista, más la
 * lectura de QR. `resolve()` recibe lo que leyó la cámara o se digitó y
 * devuelve la obra si el código era de una obra.
 */
export function useArtworkFinder(eventId?: string) {
  const qc = useQueryClient();
  const pavs = useCashierPavilions(eventId);

  const [text, setText] = useState("");
  const [pickedPavilion, setPavilion] = useState("");
  const [technique, setTechnique] = useState("");
  const [artist, setArtist] = useState<EventArtistOption | null>(null);
  const [artistQ, setArtistQ] = useState("");

  // Cajera con pabellón asignado: siempre filtra por uno de los suyos.
  const pavilion =
    pavs.locked && !pavs.options.some((p) => pavilionId(p) === pickedPavilion)
      ? pavilionId(pavs.options[0])
      : pickedPavilion;

  const q = useDebouncedValue(text.trim(), 200);
  const list = useArtworksCursor({
    q: q || undefined,
    event: eventId,
    pavilion: pavilion || undefined,
    technique: technique || undefined,
    artist: artist?.id,
    includeHidden: 1, // la caja vende aunque el catálogo en línea no se haya revelado
    project: "tagId,dimensionsText",
    limit: 24,
    enabled: !!eventId,
    keepPrevious: true,
  });

  const techniques = useTechniques();
  const debouncedArtistQ = useDebouncedValue(artistQ.trim(), 250);
  const artists = useQuery({
    queryKey: ["caja", "artists", eventId, pavilion, debouncedArtistQ],
    queryFn: () => listEventArtists(eventId!, { q: debouncedArtistQ || undefined, pavilionId: pavilion || undefined, limit: 30 }),
    enabled: !!eventId,
    staleTime: 60_000,
  });

  const resolve = useCallback(
    async (raw: string): Promise<CajaArtwork | null> => {
      const target = parseScan(raw);
      if (target.kind === "text") {
        setText(target.q);
        return null;
      }
      try {
        if (target.kind === "artist") {
          const [found] = await listEventArtists(eventId!, { artistId: target.id, limit: 1 });
          setArtist(found ?? { id: target.id, label: "Artista escaneado" });
          setText("");
          return null;
        }
        // Código de copia digitado (FDM25-XXXXXX-01-0004): primero la obra.
        let id = target.kind === "artwork" ? target.id : "";
        if (target.kind === "code") {
          const { docs } = await listArtworks({ q: target.prefix, event: eventId, includeHidden: 1, limit: 2 } as any);
          if (docs.length !== 1) {
            setText(target.prefix); // ninguna o varias: que la cajera elija
            return null;
          }
          id = String(docs[0].id);
        }
        const res = await qc.fetchQuery({
          queryKey: ["artwork-detail", id],
          queryFn: () => getArtworkById(id),
          staleTime: 0, // el stock tiene que ser el de ahora
        });
        const copy = target.copy;
        if (!copy) return res.doc as CajaArtwork;
        const c = (res.copies as any[] | undefined)?.find((x) => Number(x.number) === copy);
        if (c && c.status !== "available") {
          toast.warning(`La copia ${copy} figura ${c.status === "sold" ? "vendida" : "reservada"}: se descontará otra copia libre.`);
        }
        return { ...(res.doc as CajaArtwork), copy };
      } catch {
        toast.error("No se encontró la obra de ese código.");
        return null;
      }
    },
    [eventId, qc],
  );

  const clearFilters = () => {
    setText("");
    setTechnique("");
    setArtist(null);
    if (!pavs.locked) setPavilion("");
  };

  return {
    text, setText,
    pavilion, setPavilion, pavilionOptions: pavs.options, pavilionLocked: pavs.locked,
    technique, setTechnique, techniqueOptions: techniques.data ?? [],
    artist, setArtist, setArtistQ, artistOptions: artists.data ?? [],
    rows: list.rows as CajaArtwork[],
    isLoading: list.isLoading,
    isSearching: list.isFetching && !list.isFetchingNextPage,
    hasNextPage: list.hasNextPage,
    isFetchingNextPage: list.isFetchingNextPage,
    loadMore: list.loadMore,
    resolve,
    clearFilters,
  };
}

export type ArtworkFinder = ReturnType<typeof useArtworkFinder>;
