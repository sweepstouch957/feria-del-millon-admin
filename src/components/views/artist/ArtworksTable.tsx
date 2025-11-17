"use client";

import Image from "next/image";
import { Button } from "@mui/material";
import { ExternalLink, Edit3, Share2, Loader2, QrCode } from "lucide-react";
import { ArtworkRow } from "@/hooks/useArtworksCursor";

export default function ArtworksTable({
  rows,
  loading,
  onView,
  onEdit,
  onShare,
  onLoadMore,
  hasMore,
  loadingMore,
  onOpenQr,
}: {
  rows: ArtworkRow[];
  loading: boolean;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onShare: (msg: string) => void;
  onLoadMore: () => void;
  hasMore: boolean;
  loadingMore: boolean;
  onOpenQr: (id: string) => void;
}) {
  const formatMoney = (n?: number, currency: string = "COP") =>
    typeof n === "number"
      ? new Intl.NumberFormat("es-CO", {
          style: "currency",
          currency,
          minimumFractionDigits: 0,
        }).format(n)
      : "—";

  const doShare = async (id: string, title: string) => {
    const url = `${window.location.origin}/obra/${encodeURIComponent(id)}`;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
      } else {
        await navigator.clipboard.writeText(url);
      }
      onShare("Enlace listo para compartir ✨");
    } catch {
      await navigator.clipboard.writeText(url);
      onShare("Enlace copiado al portapapeles");
    }
  };

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-3">Obra</th>
              <th className="text-left px-4 py-3">Pabellón</th>
              <th className="text-left px-4 py-3">Técnica</th>
              <th className="text-left px-4 py-3">Precio</th>
              <th className="text-left px-4 py-3">Stock</th>
              <th className="text-left px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-12 text-center text-gray-500"
                >
                  <Loader2 className="w-5 h-5 animate-spin inline-block mr-2" />
                  Cargando obras…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-12 text-center text-gray-500"
                >
                  No hay obras aún. ¡Crea tu primera obra! ✨
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-t hover:bg-gray-50/40 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 bg-gray-100 rounded-md overflow-hidden ring-1 ring-gray-200">
                        {r.image ? (
                          <Image
                            src={r.image}
                            alt={r.title}
                            width={56}
                            height={56}
                            className="w-14 h-14 object-cover"
                          />
                        ) : (
                          <div className="w-14 h-14 bg-gray-100" />
                        )}
                      </div>
                      <div>
                        <div className="font-semibold leading-tight">
                          {r.title}
                        </div>
                        <div className="text-gray-500 text-xs">
                          {r.year || "—"}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">{r?.pavilionInfo?.name || "—"}</td>
                  <td className="px-4 py-3">
                    {r?.techniqueInfo?.name || r.technique || "—"}
                  </td>
                  <td className="px-4 py-3">
                    {formatMoney(r.price, r.currency)}
                  </td>
                  <td className="px-4 py-3">
                    {typeof r.stock === "number" ? r.stock : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => onView(r.id)}
                      >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        Ver
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => onEdit(r.id)}
                      >
                        <Edit3 className="w-4 h-4 mr-1" />
                        Editar
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => doShare(r.id, r.title)}
                      >
                        <Share2 className="w-4 h-4 mr-1" />
                        Compartir
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => onOpenQr(r.id)}
                      >
                        <QrCode className="w-4 h-4 mr-1" />
                        Ver QR
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="p-4 border-t flex items-center justify-between">
        <div className="text-xs text-gray-500">
          {rows.length > 0 ? `${rows.length} ítems` : "\u00A0"}
        </div>
        <Button
          variant="outlined"
          size="small"
          disabled={!hasMore || loadingMore}
          onClick={onLoadMore}
        >
          {loadingMore && (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          )}
          Cargar más
        </Button>
      </div>
    </div>
  );
}
