"use client";

import { useEffect, useRef } from "react";
import { BrowserMultiFormatReader, Result } from "@zxing/library";

type BetterQrScannerProps = {
    /** Se llama cuando se decodifica correctamente un QR */
    onResult: (text: string, raw: Result) => void;
    /** Se llama en errores NO fatales de lectura (opcional) */
    onError?: (err: unknown) => void;
    /** Si es false, el escáner no intenta leer */
    active?: boolean;
    /** deviceId concreto si quieres una cámara específica */
    deviceId?: string;
    /** Clase CSS para el video */
    className?: string;
};

// 👉 Helper para escoger la “mejor” cámara (preferir trasera)
function pickBestVideoDevice(devices: MediaDeviceInfo[]): string {
    const videoDevices = devices.filter((d) => d.kind === "videoinput");
    if (!videoDevices.length) {
        throw new Error("No se encontraron cámaras");
    }

    // Preferimos labels que parezcan cámara trasera
    const backLike = videoDevices.find((d) =>
        /back|rear|environment|atr[aá]s|tr[aá]s|principal/i.test(d.label || "")
    );

    if (backLike) {
        return backLike.deviceId;
    }

    // Fallback: última cámara (en muchos móviles suele ser la trasera)
    return videoDevices[videoDevices.length - 1].deviceId;
}

export function BetterQrScanner({
    onResult,
    onError,
    active = true,
    deviceId,
    className,
}: BetterQrScannerProps) {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
    const stopRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        // si NO está activo, paramos cámara/lectura
        if (!active) {
            if (stopRef.current) {
                stopRef.current();
                stopRef.current = null;
            }
            return;
        }

        const codeReader = new BrowserMultiFormatReader();
        codeReaderRef.current = codeReader;

        let cancelled = false;

        const start = async () => {
            try {
                const videoInputDevices = await codeReader.listVideoInputDevices();

                if (!videoInputDevices.length) {
                    throw new Error("No se encontraron cámaras");
                }

                const selectedDeviceId =
                    deviceId || pickBestVideoDevice(videoInputDevices as MediaDeviceInfo[]);

                // Esperamos a que el <video> exista en el DOM
                const el = videoRef.current;
                if (!el) {
                    // pequeño retry si por timing todavía es null
                    requestAnimationFrame(start);
                    return;
                }

                const controls: any = await codeReader.decodeFromVideoDevice(
                    selectedDeviceId,
                    el,
                    (result, err) => {
                        if (cancelled) return;

                        if (result) {
                            onResult(result.getText(), result);
                        } else if (err && onError) {
                            // errores típicos "no se detectó nada" → opcional log
                            onError(err);
                        }
                    }
                );

                // guardar función de stop
                stopRef.current = () => {
                    try {
                        controls.stop();
                    } catch (e) {
                        // por si ya está parado
                    }
                    codeReader.reset();
                };
            } catch (err) {
                if (onError) onError(err);
                console.error("[BetterQrScanner] error", err);
            }
        };

        start();

        // cleanup
        return () => {
            cancelled = true;
            if (stopRef.current) {
                stopRef.current();
                stopRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active, deviceId]);

    return (
        <video
            ref={videoRef}
            className={className}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            muted
            playsInline
        />
    );
}
