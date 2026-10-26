import type { ArtworkRow } from "@hooks/useArtworksCursor";

/** Obra tal como la usa la caja (lista o detalle traen la misma forma). */
export type CajaArtwork = ArtworkRow & { _id?: string; tagId?: string; dimensionsText?: string };

export const artworkId = (a: CajaArtwork) => String(a.id ?? a._id ?? "");

export const artistName = (a: CajaArtwork) =>
  [a.artistInfo?.firstName, a.artistInfo?.lastName].filter(Boolean).join(" ") || a.artistInfo?.email || "";

export const imageOf = (a: CajaArtwork): string | undefined => {
  if (a.image) return a.image;
  const first = a.images?.[0] as unknown;
  if (typeof first === "string") return first;
  return (first as { url?: string } | undefined)?.url;
};

export const stockOf = (a: CajaArtwork) => Number(a.stock ?? 0);
