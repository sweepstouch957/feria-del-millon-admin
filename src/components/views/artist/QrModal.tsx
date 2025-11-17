"use client";

import { useMemo } from "react";
import Image from "next/image";
import { Button } from "@mui/material";
import { Download, ExternalLink, X, QrCode } from "lucide-react";
import { useArtworkDetail } from "@hooks/useArtworkDetail";

export default function QRModal({
  artworkId,
  open,
  onClose,
}: {
  artworkId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const enabled = Boolean(open && artworkId);
  const { data, isFetching } = useArtworkDetail(
    enabled ? artworkId! : undefined
  );

  const { qrImg, qrTarget, title } = useMemo(() => {
    const doc: any = data?.doc;
    const qr = doc?.meta?.qrPublic || {};
    return {
      qrImg: qr.imageUrl as string | undefined,
      qrTarget: qr.target as string | undefined,
      title: (doc?.title as string) || "QR",
    };
  }, [data]);

  if (!open) return null;

  const downloadQr = async () => {
    if (!qrImg) return;
    const resp = await fetch(qrImg);
    const blob = await resp.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${title.toLowerCase().replace(/\s+/g, "-")}-qr.png`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div
      className="fixed inset-0 z-[55] bg-black/50 p-4 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <QrCode className="w-4 h-4" />
            <h3 className="font-semibold">Código QR</h3>
          </div>
          <button className="p-1 rounded hover:bg-gray-100" onClick={onClose}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5">
          {isFetching ? (
            <div className="text-center text-gray-500 py-10">
              Cargando QR…
            </div>
          ) : qrImg ? (
            <div className="space-y-4">
              <div className="relative w-full aspect-square bg-gray-50 rounded-xl overflow-hidden ring-1 ring-gray-200">
                <Image
                  src={qrImg}
                  alt="QR"
                  fill
                  className="object-contain p-4"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outlined" size="small" onClick={downloadQr}>
                  <Download className="w-4 h-4 mr-1" />
                  Descargar QR
                </Button>
                {qrTarget && (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => window.open(qrTarget, "_blank")}
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    Abrir destino
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-10">
              No se encontró un QR para esta obra.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
