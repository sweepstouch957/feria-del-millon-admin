"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Button } from "@mui/material";
import { X, Share2, QrCode, Plus, Minus, RefreshCw } from "lucide-react";
import type { ArtworkDetailResponse } from "@services/artworks.service";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

export default function ArtworkDetailModal({
  id,
  data,
  open,
  loading,
  onClose,
  onOpenQr,
}: {
  id: string | null;
  data?: ArtworkDetailResponse;
  open: boolean;
  loading: boolean;
  onClose: () => void;
  onOpenQr?: (id: string) => void;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const formatMoney = (n?: number, currency: string = "COP") =>
    typeof n === "number"
      ? new Intl.NumberFormat("es-CO", {
          style: "currency",
          currency,
          minimumFractionDigits: 0,
        }).format(n)
      : "—";

  const share = async () => {
    if (!id) return;
    const url = `${window.location.origin}/obra/${encodeURIComponent(id)}`;
    try {
      if (navigator.share)
        await navigator.share({ title: data?.doc.title || "Obra", url });
      else await navigator.clipboard.writeText(url);
    } catch {
      await navigator.clipboard.writeText(url);
    }
  };

  const openQr = () => {
    if (!id) return;
    if (onOpenQr) onOpenQr(id);
    else {
      const target =
        (data as any)?.doc?.meta?.qrPublic?.target ||
        (data as any)?.doc?.meta?.qrPublic?.imageUrl;
      if (target) window.open(String(target), "_blank");
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b">
            <h3 className="font-semibold">Detalle de la obra</h3>
            <button
              className="p-1 rounded hover:bg-gray-100"
              onClick={onClose}
              aria-label="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5">
            {loading ? (
              <div className="py-12 text-center text-gray-500">Cargando…</div>
            ) : data ? (
              <div className="grid md:grid-cols-2 gap-6">
                {/* Imagen */}
                <button
                  type="button"
                  className="relative w-full bg-gray-50 rounded-xl overflow-hidden ring-1 ring-gray-200 group"
                  style={{ aspectRatio: "4 / 3" }}
                  onClick={() => setPreviewOpen(true)}
                  title="Ver imagen en grande"
                >
                  {data.doc.image ? (
                    <Image
                      src={data.doc.image}
                      alt={data.doc.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      quality={90}
                      className="object-contain"
                      priority={false}
                    />
                  ) : (
                    <div className="absolute inset-0 grid place-items-center text-gray-400 text-sm">
                      Sin imagen
                    </div>
                  )}

                  <div className="pointer-events-none absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition">
                    <div className="inline-flex items-center gap-2 text-white text-xs bg-black/50 px-2 py-1 rounded">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        className="opacity-90"
                      >
                        <path
                          d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                        <circle
                          cx="12"
                          cy="12"
                          r="3"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                      </svg>
                      Click para ampliar
                    </div>
                  </div>
                </button>

                {/* Info */}
                <div className="min-w-0">
                  <h4 className="text-xl font-bold break-words">
                    {data.doc.title}
                  </h4>
                  <p className="text-gray-600 mt-2 whitespace-pre-line break-words">
                    {data.doc.description || "—"}
                  </p>

                  <dl className="mt-4 text-sm text-gray-700 space-y-1">
                    <div className="flex gap-2">
                      <dt className="font-semibold shrink-0">Técnica:</dt>
                      <dd className="truncate">
                        {data.doc.techniqueInfo?.name ||
                          data.doc.technique ||
                          "—"}
                      </dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="font-semibold shrink-0">Pabellón:</dt>
                      <dd className="truncate">
                        {data.doc.pavilionInfo?.name || "—"}
                      </dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="font-semibold shrink-0">Precio:</dt>
                      <dd>{formatMoney(data.doc.price, data.doc.currency)}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="font-semibold shrink-0">Año:</dt>
                      <dd>{data.doc.year || "—"}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="font-semibold shrink-0">Stock:</dt>
                      <dd>
                        {typeof data.doc.stock === "number"
                          ? data.doc.stock
                          : "—"}
                      </dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="font-semibold shrink-0">TagId:</dt>
                      <dd>{(data as any)?.doc?.tagId || "—"}</dd>
                    </div>
                  </dl>

                  <div className="mt-5 flex flex-wrap items-center gap-2">
                    <Button variant="outlined" size="small" onClick={share}>
                      <Share2 className="w-4 h-4 mr-1" />
                      Compartir
                    </Button>
                    <Button variant="outlined" size="small" onClick={openQr}>
                      <QrCode className="w-4 h-4 mr-1" />
                      Ver QR
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-gray-500">
                No se encontró la obra.
              </div>
            )}
          </div>
        </div>
      </div>

      {previewOpen && data?.doc.image && (
        <ImagePreviewModal
          src={data.doc.image}
          alt={data.doc.title}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </>
  );
}

function ImagePreviewModal({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt?: string;
  onClose: () => void;
}) {
  const [previewScale, setPreviewScale] = useState(1);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/80 p-4 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-6xl max-h-[88vh] bg-black rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <TransformWrapper
          initialScale={1}
          minScale={0.5}
          maxScale={4}
          wheel={{ step: 0.12 }}
          doubleClick={{ disabled: false, step: 0.6 }}
          pinch={{ step: 0.2 }}
          onTransformed={(ref: any) => {
            const s =
              ref?.state?.scale ??
              ref?.instance?.transformState?.scale ??
              1;
            setPreviewScale(s);
          }}
        >
          {({ zoomIn, zoomOut, resetTransform }) => (
            <>
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-white/95 rounded-full shadow flex items-center">
                <Button
                  size="small"
                  variant="text"
                  onClick={() => zoomOut()}
                  aria-label="Reducir"
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="text-xs w-12 text-center select-none">
                  {Math.round((previewScale || 1) * 100)}%
                </span>
                <Button
                  size="small"
                  variant="text"
                  onClick={() => zoomIn()}
                  aria-label="Ampliar"
                >
                  <Plus className="w-4 h-4" />
                </Button>
                <Button
                  size="small"
                  variant="text"
                  onClick={() => {
                    resetTransform();
                    setPreviewScale(1);
                  }}
                  aria-label="Reset"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>

              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 text-[11px] text-white/90 bg-white/10 backdrop-blur px-3 py-1 rounded-full">
                Rueda para hacer zoom • Arrastra para mover • Doble clic para
                ampliar
              </div>

              <div className="w-full h-[88vh] max-h-[88vh] overflow-auto cursor-grab active:cursor-grabbing">
                <TransformComponent
                  wrapperStyle={{ width: "100%", height: "100%" }}
                  contentStyle={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "100%",
                    height: "100%",
                  }}
                >
                  <div className="relative w-full h-full">
                    <Image
                      src={src}
                      alt={alt ?? "preview"}
                      fill
                      sizes="100vw"
                      quality={95}
                      className="object-contain select-none"
                      style={{
                        imageRendering: "auto",
                        backfaceVisibility: "hidden",
                        transform: "translateZ(0)",
                        willChange: "transform",
                      }}
                      priority
                    />
                  </div>
                </TransformComponent>
              </div>
            </>
          )}
        </TransformWrapper>

        <button
          onClick={onClose}
          className="absolute top-3 right-3 bg-white/90 hover:bg-white rounded-full p-2 z-20"
          aria-label="Cerrar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
