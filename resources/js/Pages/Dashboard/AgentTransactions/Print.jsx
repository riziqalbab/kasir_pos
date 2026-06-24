import React, { useEffect } from "react";
import { Head, Link, usePage } from "@inertiajs/react";
import { IconArrowLeft, IconPrinter } from "@tabler/icons-react";

export default function Print({ transaction, storeProfile }) {
    useEffect(() => {
        // Automatically trigger print on load
        const timer = setTimeout(() => {
            window.print();
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    const formatRp = (val) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val);

    const storeName = storeProfile?.name || "AGEN BANK LINK";
    const storeAddress = storeProfile?.address || "";
    const storePhone = storeProfile?.phone || "";

    const total = (transaction.agent_transaction_type?.type === 'debet')
        ? (transaction.nominal + transaction.admin_fee_customer)
        : transaction.nominal;

    return (
        <>
            <Head title={`Struk Agen - Ref ${transaction.reference_number || transaction.id}`} />

            <div className="min-h-screen bg-slate-100 dark:bg-slate-950 py-8 px-4 print:bg-white print:p-0 flex flex-col items-center">
                {/* Print Control Bar */}
                <div className="w-full max-w-[80mm] mb-6 flex justify-between items-center print:hidden">
                    <Link
                        href={route("agent-transactions.index")}
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
                        <p className="border-b border-dashed border-slate-400 my-2"></p>
                    </div>

                    {/* Meta Info */}
                    <div className="space-y-1.5 text-[11px]">
                        <div className="flex justify-between">
                            <span>Waktu :</span>
                            <span>{transaction.transaction_date ? new Date(transaction.transaction_date).toLocaleString("id-ID") : "-"}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Kasir :</span>
                            <span className="font-semibold uppercase">{transaction.cashier?.name || "-"}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Layanan :</span>
                            <span className="font-semibold uppercase">{transaction.agent_transaction_type?.name || "-"}</span>
                        </div>
                        {transaction.bank_account && (
                            <div className="flex justify-between">
                                <span>Bank/EDC :</span>
                                <span>{transaction.bank_account.bank_name}</span>
                            </div>
                        )}
                        {transaction.reference_number && (
                            <div className="flex justify-between">
                                <span>No. Ref :</span>
                                <span className="font-semibold">{transaction.reference_number}</span>
                            </div>
                        )}
                        {transaction.customer_name && (
                            <div className="flex justify-between">
                                <span>Nama Cst :</span>
                                <span>{transaction.customer_name}</span>
                            </div>
                        )}
                        {transaction.customer_phone && (
                            <div className="flex justify-between">
                                <span>No HP Cst :</span>
                                <span>{transaction.customer_phone}</span>
                            </div>
                        )}
                        <p className="border-b border-dashed border-slate-400 my-2"></p>
                    </div>

                    {/* Financial details */}
                    <div className="space-y-1.5 text-[11px] pt-1">
                        <div className="flex justify-between">
                            <span>Nominal :</span>
                            <span className="font-bold">{formatRp(transaction.nominal)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Biaya Admin :</span>
                            <span>
                                {formatRp(transaction.admin_fee_customer)}
                                {transaction.agent_admin_loket ? ` (${transaction.agent_admin_loket.code})` : ''}
                            </span>
                        </div>
                        <p className="border-b border-dashed border-slate-400 my-2"></p>
                        <div className="flex justify-between text-xs font-bold pt-1">
                            <span>TOTAL :</span>
                            <span>{formatRp(total)}</span>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="text-center mt-6 space-y-1 text-[10px] opacity-80">
                        <p className="border-b border-dashed border-slate-400 my-2"></p>
                        <p className="font-semibold uppercase">Terima Kasih</p>
                        <p>Simpan Struk Ini Sebagai Bukti</p>
                        <p>Transaksi Yang Sah</p>
                    </div>
                </div>
            </div>
        </>
    );
}
