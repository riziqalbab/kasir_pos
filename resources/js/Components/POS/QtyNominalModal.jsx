import React, { useState, useEffect } from "react";
import {
    IconX,
    IconCheck,
    IconScale,
    IconCash,
    IconCalculator,
} from "@tabler/icons-react";

export default function QtyNominalModal({
    isOpen,
    onClose,
    item,
    onConfirm,
}) {
    const [mode, setMode] = useState("qty"); // "qty" | "nominal"
    const [qtyValue, setQtyValue] = useState("1");
    const [nominalValue, setNominalValue] = useState("");

    // Calculate effective unit price
    const product = item?.product;
    const service = item?.service;
    const unitName = item?.satuan || "Unit";
    const unitKey = item?.satuan_key || "pcs";

    let unitPrice = 0;
    if (product) {
        if (unitKey === "dus") {
            unitPrice = Number(product.harga_jual_dus || product.sell_price || 0);
        } else if (unitKey === "pack") {
            unitPrice = Number(product.harga_jual_pack || product.sell_price || 0);
        } else {
            unitPrice = Number(product.harga_jual_pcs || product.sell_price || 0);
        }
    } else if (service) {
        unitPrice = Number(item.price / (item.qty || 1));
    }

    useEffect(() => {
        if (isOpen && item) {
            setMode("qty");
            const currentQty = Number(item.qty || 1);
            setQtyValue(String(currentQty));
            setNominalValue(String(Math.round(currentQty * unitPrice)));
        }
    }, [isOpen, item, unitPrice]);

    if (!isOpen || !item) return null;

    const formatPrice = (val = 0) =>
        Number(val || 0).toLocaleString("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
        });

    const handleQtyChange = (val) => {
        setQtyValue(val);
        const parsed = parseFloat(val) || 0;
        setNominalValue(String(Math.round(parsed * unitPrice)));
    };

    const handleNominalChange = (val) => {
        // Clean non-digits
        const clean = val.replace(/\D/g, "");
        setNominalValue(clean);
        const numNominal = parseInt(clean, 10) || 0;
        if (unitPrice > 0) {
            const calculatedQty = Number((numNominal / unitPrice).toFixed(3));
            setQtyValue(String(calculatedQty));
        }
    };

    const handleQuickQty = (addAmount) => {
        const current = parseFloat(qtyValue) || 0;
        const next = Math.max(0.001, Number((current + addAmount).toFixed(3)));
        handleQtyChange(String(next));
    };

    const handleQuickNominal = (amount) => {
        const current = parseInt(nominalValue, 10) || 0;
        const next = current + amount;
        handleNominalChange(String(next));
    };

    const handleSave = () => {
        const finalQty = parseFloat(qtyValue) || 0;
        if (finalQty > 0) {
            onConfirm(item.id, finalQty);
            onClose();
        }
    };

    const currentQtyNum = parseFloat(qtyValue) || 0;
    const currentSubtotal = Math.round(currentQtyNum * unitPrice);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                    <div>
                        <h3 className="text-base font-bold text-slate-800 dark:text-white truncate max-w-xs">
                            {product?.title || service?.name || "Item"}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Satuan: <span className="font-semibold text-primary-600 dark:text-primary-400">{unitName}</span> (@ {formatPrice(unitPrice)}/{unitName})
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <IconX size={20} />
                    </button>
                </div>

                {/* Mode Selector */}
                <div className="p-6 pb-4">
                    <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl mb-5">
                        <button
                            type="button"
                            onClick={() => setMode("qty")}
                            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                                mode === "qty"
                                    ? "bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-sm"
                                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                            }`}
                        >
                            <IconScale size={16} />
                            Input Kuantitas ({unitName})
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode("nominal")}
                            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                                mode === "nominal"
                                    ? "bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-sm"
                                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                            }`}
                        >
                            <IconCash size={16} />
                            Beli Nominal (Rp)
                        </button>
                    </div>

                    {/* Mode Content */}
                    {mode === "qty" ? (
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
                                Jumlah / Kuantitas ({unitName})
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    step="any"
                                    min="0.001"
                                    value={qtyValue}
                                    onChange={(e) => handleQtyChange(e.target.value)}
                                    placeholder="Contoh: 1.5 atau 0.4"
                                    className="w-full text-2xl font-bold font-mono px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:outline-none"
                                    autoFocus
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 uppercase">
                                    {unitName}
                                </span>
                            </div>

                            {/* Quick Qty Buttons */}
                            <div className="grid grid-cols-5 gap-1.5 mt-3">
                                {[0.25, 0.5, 1, 2, 5].map((amt) => (
                                    <button
                                        key={amt}
                                        type="button"
                                        onClick={() => handleQuickQty(amt)}
                                        className="py-1.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-950/40 dark:hover:text-primary-400 transition-colors"
                                    >
                                        +{amt}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
                                Nominal Pembelian Uang (Rp)
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base font-bold text-slate-400 font-mono">
                                    Rp
                                </span>
                                <input
                                    type="text"
                                    value={nominalValue ? Number(nominalValue).toLocaleString("id-ID") : ""}
                                    onChange={(e) => handleNominalChange(e.target.value)}
                                    placeholder="Contoh: 19.000 atau 5.000"
                                    className="w-full text-2xl font-bold font-mono pl-12 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:outline-none"
                                    autoFocus
                                />
                            </div>

                            {/* Quick Nominal Buttons */}
                            <div className="grid grid-cols-4 gap-2 mt-3">
                                {[5000, 10000, 20000, 50000].map((amt) => (
                                    <button
                                        key={amt}
                                        type="button"
                                        onClick={() => handleQuickNominal(amt)}
                                        className="py-2 text-xs font-semibold rounded-xl bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors"
                                    >
                                        +{amt / 1000}rb
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Preview Summary Card */}
                    <div className="mt-5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                Volume / Qty Terhitung:
                            </p>
                            <p className="text-base font-bold text-slate-800 dark:text-white font-mono">
                                {currentQtyNum.toLocaleString("id-ID", { maximumFractionDigits: 3 })} {unitName}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                Total Harga:
                            </p>
                            <p className="text-base font-bold text-primary-600 dark:text-primary-400 font-mono">
                                {formatPrice(currentSubtotal)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 pt-2">
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={currentQtyNum <= 0}
                        className="w-full h-12 flex items-center justify-center gap-2 text-base font-bold rounded-2xl bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/30 hover:shadow-xl active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <IconCheck size={20} />
                        Simpan ke Keranjang
                    </button>
                </div>
            </div>
        </div>
    );
}

