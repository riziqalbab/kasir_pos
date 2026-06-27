import React, { useState, useEffect } from "react";
import {
    IconPrinter,
    IconX,
    IconLoader2,
    IconCheck,
    IconAlertCircle,
    IconRefresh,
    IconSettings,
} from "@tabler/icons-react";
import toast from "react-hot-toast";

/**
 * PrinterBridgeSettingsModal - Client-side printer configuration modal
 */
export default function PrinterBridgeSettingsModal({ isOpen, onClose, onSave }) {
    const [settings, setSettings] = useState({
        silent_print_enabled: false,
        printer_bridge_url: "http://localhost:3001",
        preferred_format: "thermal80",
    });
    
    const [bridgeStatus, setBridgeStatus] = useState("idle"); // 'idle' | 'checking' | 'connected' | 'disconnected'
    const [bridgeInfo, setBridgeInfo] = useState(null);
    const [isTesting, setIsTesting] = useState(false);

    // Load initial settings from localStorage on open
    useEffect(() => {
        if (isOpen) {
            const savedEnabled = localStorage.getItem("silent_print_enabled") === "true";
            const savedUrl = localStorage.getItem("printer_bridge_url") || "http://localhost:3001";
            const savedFormat = localStorage.getItem("preferred_format") || "thermal80";
            
            const initialSettings = {
                silent_print_enabled: savedEnabled,
                printer_bridge_url: savedUrl,
                preferred_format: savedFormat,
            };
            
            setSettings(initialSettings);
            verifyBridge(savedUrl);
        }
    }, [isOpen]);

    // Query bridge /status endpoint
    const verifyBridge = async (url = settings.printer_bridge_url) => {
        if (!url) return;
        setBridgeStatus("checking");
        setBridgeInfo(null);
        
        // Clean URL trailing slash
        const cleanUrl = url.replace(/\/$/, "");
        
        try {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 2500); // 2.5 sec timeout
            
            const response = await fetch(`${cleanUrl}/status`, {
                signal: controller.signal,
                mode: "cors"
            });
            clearTimeout(id);
            
            if (response.ok) {
                const data = await response.json();
                setBridgeStatus("connected");
                setBridgeInfo(data.config || null);
            } else {
                setBridgeStatus("disconnected");
            }
        } catch (err) {
            console.error("Bridge health check failed:", err);
            setBridgeStatus("disconnected");
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        const val = type === "checkbox" ? checked : value;
        setSettings((prev) => {
            const updated = { ...prev, [name]: val };
            // If URL changed, auto re-verify after user stops typing
            return updated;
        });
    };

    const handleSave = (e) => {
        e.preventDefault();
        
        localStorage.setItem("silent_print_enabled", settings.silent_print_enabled ? "true" : "false");
        localStorage.setItem("printer_bridge_url", settings.printer_bridge_url);
        localStorage.setItem("preferred_format", settings.preferred_format);
        
        toast.success("Pengaturan printer berhasil disimpan");
        onSave?.(settings);
        onClose();
    };

    const triggerTestPrint = async () => {
        if (bridgeStatus !== "connected") {
            toast.error("Bridge tidak terhubung. Tidak dapat mencetak.");
            return;
        }
        
        setIsTesting(true);
        const cleanUrl = settings.printer_bridge_url.replace(/\/$/, "");
        
        try {
            const response = await fetch(`${cleanUrl}/test-print`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                }
            });
            
            const result = await response.json();
            if (result.success) {
                toast.success("Uji cetak dikirim ke printer!");
            } else {
                toast.error("Gagal cetak: " + result.error);
            }
        } catch (err) {
            toast.error("Gagal mengirim perintah cetak ke bridge.");
        } finally {
            setIsTesting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 text-white">
                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                            <IconPrinter size={20} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg">
                                Pengaturan Printer (Bridge)
                            </h3>
                            <p className="text-xs text-white/80">
                                Hubungkan printer thermal via Electron Desktop App
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                    >
                        <IconX size={18} />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSave} className="p-6 space-y-5">
                    {/* Enable Silent Print */}
                    <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <div>
                            <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 cursor-pointer" htmlFor="silent_print_enabled">
                                Aktifkan Silent Print
                            </label>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                                Cetak otomatis tanpa dialog browser
                            </span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                id="silent_print_enabled"
                                name="silent_print_enabled"
                                checked={settings.silent_print_enabled}
                                onChange={handleChange}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-650 peer-checked:bg-indigo-600"></div>
                        </label>
                    </div>

                    {/* Bridge URL */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                            URL Printer Bridge
                        </label>
                        <div className="relative flex rounded-xl shadow-sm">
                            <input
                                type="text"
                                name="printer_bridge_url"
                                value={settings.printer_bridge_url}
                                onChange={handleChange}
                                placeholder="http://localhost:3001"
                                className="w-full h-11 px-4 pr-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                            />
                            <button
                                type="button"
                                onClick={() => verifyBridge()}
                                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-indigo-500"
                                title="Periksa Koneksi"
                            >
                                <IconRefresh size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Bridge Status Indicator */}
                    <div className="flex items-center justify-between text-xs px-1">
                        <span className="text-slate-500 dark:text-slate-400">Status Jembatan:</span>
                        <div className="flex items-center gap-1.5 font-medium">
                            {bridgeStatus === "checking" && (
                                <span className="text-amber-500 flex items-center gap-1">
                                    <IconLoader2 size={14} className="animate-spin" />
                                    Menghubungkan...
                                </span>
                            )}
                            {bridgeStatus === "connected" && (
                                <span className="text-success-600 dark:text-success-400 flex items-center gap-1">
                                    <IconCheck size={14} />
                                    Terhubung ({bridgeInfo?.engine === 'native' ? 'HTML Spooler' : 'Raw ESC/POS'})
                                </span>
                            )}
                            {bridgeStatus === "disconnected" && (
                                <span className="text-danger-600 dark:text-danger-400 flex items-center gap-1">
                                    <IconAlertCircle size={14} />
                                    Terputus (Buka Electron App)
                                </span>
                            )}
                            {bridgeStatus === "idle" && (
                                <span className="text-slate-400">Belum diuji</span>
                            )}
                        </div>
                    </div>

                    {/* Preferred Receipt Format */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                            Format Cetak Default
                        </label>
                        <select
                            name="preferred_format"
                            value={settings.preferred_format}
                            onChange={handleChange}
                            className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                        >
                            <option value="thermal80">Struk Thermal 80mm</option>
                            <option value="thermal58">Struk Thermal 58mm</option>
                            <option value="invoice">Invoice A4 (Browser Native)</option>
                            <option value="shipping">Resi Pengiriman</option>
                        </select>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-slate-100 dark:border-slate-800 my-2"></div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={triggerTestPrint}
                            disabled={bridgeStatus !== "connected" || isTesting}
                            className="flex-1 h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isTesting ? (
                                <IconLoader2 size={16} className="animate-spin" />
                            ) : (
                                <IconPrinter size={16} />
                            )}
                            Cetak Uji Coba
                        </button>
                        
                        <button
                            type="submit"
                            className="flex-1 h-11 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-md shadow-indigo-500/10 hover:shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
                        >
                            <IconCheck size={16} />
                            Simpan
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
