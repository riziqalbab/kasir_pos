import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { IconCamera, IconCameraOff, IconAlertCircle } from "@tabler/icons-react";

export default function BarcodeCameraScanner({
    onScan,
    isScanning,
    onToggle,
    cooldownMs = 2000,
}) {
    const html5QrcodeRef = useRef(null);
    const lastScanTimeRef = useRef(0);
    const [scanError, setScanError] = useState(null);
    const [isCoolingDown, setIsCoolingDown] = useState(false);
    const [lastScannedText, setLastScannedText] = useState("");

    useEffect(() => {
        if (!isScanning) {
            if (html5QrcodeRef.current) {
                try {
                    if (html5QrcodeRef.current.isScanning) {
                        html5QrcodeRef.current.stop().catch(() => {});
                    }
                } catch (e) {
                    // ignore stop errors
                }
            }
            return;
        }

        if (typeof window !== "undefined" && window.isSecureContext === false) {
            setScanError(
                "Akses kamera membutuhkan koneksi aman (HTTPS atau localhost)."
            );
            return;
        }

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setScanError(
                "Browser ini tidak mendukung fitur kamera (getUserMedia)."
            );
            return;
        }

        setScanError(null);
        const elementId = "reader-camera-barcode";
        const html5Qrcode = new Html5Qrcode(elementId);
        html5QrcodeRef.current = html5Qrcode;

        const config = {
            fps: 15,
            qrbox: { width: 250, height: 140 },
            aspectRatio: 1.777778,
        };

        html5Qrcode
            .start(
                { facingMode: "environment" },
                config,
                (decodedText) => {
                    if (!decodedText) return;

                    const now = Date.now();
                    if (now - lastScanTimeRef.current < cooldownMs) {
                        return; // Ignore scans during cooldown period
                    }

                    lastScanTimeRef.current = now;
                    setIsCoolingDown(true);
                    setLastScannedText(decodedText);
                    onScan(decodedText);

                    setTimeout(() => {
                        setIsCoolingDown(false);
                    }, cooldownMs);
                },
                () => {
                    // Ignore frame scan failures
                }
            )
            .catch((err) => {
                console.error("Camera start error:", err);
                const msg = String(err);
                if (msg.includes("NotAllowedError") || msg.includes("Permission denied")) {
                    setScanError(
                        "Izin kamera ditolak atau diblokir browser. Silakan izinkan akses kamera pada ikon gembok/setelan alamat browser Anda."
                    );
                } else if (msg.includes("NotFoundError") || msg.includes("DevicesNotFoundError")) {
                    setScanError("Kamera tidak ditemukan pada perangkat Anda.");
                } else {
                    setScanError(
                        "Gagal membuka kamera: " + (err.message || "Pastikan kamera tidak digunakan oleh aplikasi lain.")
                    );
                }
            });

        return () => {
            if (html5QrcodeRef.current) {
                try {
                    if (html5QrcodeRef.current.isScanning) {
                        html5QrcodeRef.current.stop().catch(() => {});
                    }
                } catch (e) {
                    // ignore stop errors
                }
            }
        };
    }, [isScanning, cooldownMs]);

    return (
        <div className="space-y-3">
            <button
                type="button"
                onClick={onToggle}
                className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                    isScanning
                        ? "bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/30 dark:text-rose-400"
                        : "bg-primary-50 text-primary-600 hover:bg-primary-100 dark:bg-primary-950/30 dark:text-primary-400"
                }`}
            >
                {isScanning ? <IconCameraOff size={16} /> : <IconCamera size={16} />}
                <span>{isScanning ? "Tutup Kamera Scanner" : "Scan Barcode via Kamera"}</span>
            </button>

            {isScanning && (
                <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 dark:border-slate-800">
                    <div id="reader-camera-barcode" className="w-full max-h-56 overflow-hidden" />
                    {scanError ? (
                        <div className="flex items-center gap-2 p-4 text-xs font-medium text-rose-400">
                            <IconAlertCircle size={16} />
                            <span>{scanError}</span>
                        </div>
                    ) : isCoolingDown ? (
                        <div className="bg-emerald-950/80 py-2 text-center text-xs font-semibold text-emerald-400">
                            ✓ Ter-scan: {lastScannedText} (Jeda 2 detik...)
                        </div>
                    ) : (
                        <p className="py-2 text-center text-[11px] text-slate-400">
                            Arahkan kamera ke barcode produk
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
