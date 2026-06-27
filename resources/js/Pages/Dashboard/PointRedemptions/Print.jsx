import React, { useEffect } from "react";
import { Head, Link } from "@inertiajs/react";
import { IconArrowLeft, IconPrinter } from "@tabler/icons-react";

export default function Print({ redemption, storeProfile }) {
    useEffect(() => {
        // Automatically trigger print on load
        const timer = setTimeout(() => {
            window.print();
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    const storeName = storeProfile?.name || "KASIR POS LOYALTY";
    const storeAddress = storeProfile?.address || "";
    const storePhone = storeProfile?.phone || "";

    // Calculate points balance info
    // redemption.customer?.loyalty_points is the current balance after this redemption deduction
    const currentPoints = redemption.customer ? (redemption.customer.loyalty_points || 0) : 0;
    const initialPoints = currentPoints + redemption.total_points;

    return (
        <>
            <Head title={`Struk Tukar Poin - ${redemption.redemption_code}`} />

            <div className="min-h-screen bg-slate-100 dark:bg-slate-950 py-8 px-4 print:bg-white print:p-0 flex flex-col items-center">
                {/* Print Control Bar */}
                <div className="w-full max-w-[80mm] mb-6 flex justify-between items-center print:hidden">
                    <Link
                        href={route("transactions.index")}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:underline"
                    >
                        <IconArrowLeft size={16} />
                        Kembali
                    </Link>
                    <button
                        onClick={() => window.print()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-900 transition-colors"
                    >
                        <IconPrinter size={16} />
                        Cetak Struk
                    </button>
                </div>

                {/* Struk Thermal 58mm/80mm Style */}
                <div className="w-full max-w-[80mm] bg-white text-slate-900 p-6 shadow-md border border-slate-200 print:shadow-none print:border-0 print:p-2 font-mono text-xs">
                    {/* Header */}
                    <div className="text-center space-y-1">
                        <h2 className="text-sm font-bold uppercase tracking-wider">{storeName}</h2>
                        {storeAddress && <p className="text-[10px] leading-tight opacity-80">{storeAddress}</p>}
                        {storePhone && <p className="text-[10px] opacity-80">Telp: {storePhone}</p>}
                        <div className="text-[11px] font-bold mt-2 border border-slate-900 py-1 uppercase">
                            Struk Penukaran Poin
                        </div>
                        <p className="border-b border-dashed border-slate-400 my-2"></p>
                    </div>

                    {/* Meta Info */}
                    <div className="space-y-1.5 text-[11px]">
                        <div className="flex justify-between">
                            <span>No. Ref :</span>
                            <span className="font-semibold">{redemption.redemption_code}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Waktu :</span>
                            <span>{redemption.created_at ? new Date(redemption.created_at).toLocaleString("id-ID") : "-"}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Kasir :</span>
                            <span className="font-semibold uppercase">{redemption.cashier?.name || "-"}</span>
                        </div>
                        {redemption.customer && (
                            <>
                                <p className="border-b border-dotted border-slate-300 my-1"></p>
                                <div className="flex justify-between">
                                    <span>Pelanggan:</span>
                                    <span className="font-semibold">{redemption.customer.name}</span>
                                </div>
                                {redemption.customer.no_telp && (
                                    <div className="flex justify-between">
                                        <span>No HP :</span>
                                        <span>{redemption.customer.no_telp}</span>
                                    </div>
                                )}
                            </>
                        )}
                        <p className="border-b border-dashed border-slate-400 my-2"></p>
                    </div>

                    {/* Items list */}
                    <div className="space-y-2 py-1">
                        <div className="flex justify-between font-bold text-[10px]">
                            <span className="w-1/2">HADIAH</span>
                            <span className="w-1/4 text-center">QTY</span>
                            <span className="w-1/4 text-right">POIN</span>
                        </div>
                        <p className="border-b border-dotted border-slate-350 my-1"></p>
                        {redemption.items && redemption.items.map((item) => (
                            <div key={item.id} className="space-y-0.5">
                                <div className="flex justify-between text-[11px]">
                                    <span className="w-1/2 font-semibold truncate">{item.point_prize?.name || "Hadiah"}</span>
                                    <span className="w-1/4 text-center">{item.quantity}</span>
                                    <span className="w-1/4 text-right">{item.points * item.quantity}</span>
                                </div>
                                <div className="text-[10px] text-slate-500 text-left">
                                    ({item.points} Poin / unit)
                                </div>
                            </div>
                        ))}
                        <p className="border-b border-dashed border-slate-400 my-2"></p>
                    </div>

                    {/* Loyalty Points info */}
                    <div className="space-y-1.5 text-[11px] pt-1">
                        <div className="flex justify-between">
                            <span>Saldo Awal Poin :</span>
                            <span>{initialPoints} Poin</span>
                        </div>
                        <div className="flex justify-between font-bold text-red-650">
                            <span>Total Poin Ditukar :</span>
                            <span>-{redemption.total_points} Poin</span>
                        </div>
                        <p className="border-b border-dotted border-slate-300 my-1.5"></p>
                        <div className="flex justify-between text-xs font-bold text-success-650 pt-0.5">
                            <span>SISA POIN :</span>
                            <span>{currentPoints} Poin</span>
                        </div>
                    </div>

                    {redemption.notes && (
                        <div className="mt-4 p-2 bg-slate-50 border border-slate-200 rounded text-[10px]">
                            <span className="font-semibold block mb-0.5">Catatan:</span>
                            <span className="text-slate-600 block leading-tight">{redemption.notes}</span>
                        </div>
                    )}

                    {/* Footer */}
                    <div className="text-center mt-6 space-y-1 text-[10px] opacity-80">
                        <p className="border-b border-dashed border-slate-400 my-2"></p>
                        <p className="font-semibold uppercase">Terima Kasih</p>
                        <p>Atas Kesetiaan & Dukungan Anda</p>
                        <p>Simpan Struk Ini Sebagai Bukti Penukaran</p>
                    </div>
                </div>
            </div>
        </>
    );
}
