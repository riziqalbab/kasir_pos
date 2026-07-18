import React, { useMemo, useState } from "react";
import { Head, Link, router, usePage } from "@inertiajs/react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import {
    IconArrowLeft,
    IconCashBanknote,
    IconReceipt,
    IconRotateClockwise2,
    IconWallet,
    IconQrcode,
    IconCreditCard,
    IconBuildingBank,
    IconDeviceMobile,
    IconHourglassLow,
} from "@tabler/icons-react";
import { useAuthorization } from "@/Utils/authorization";

const formatCurrency = (value = 0) =>
    new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
    }).format(value);

const formatDateTime = (value) => {
    if (!value) return "-";

    return new Intl.DateTimeFormat("id-ID", {
        dateStyle: "full",
        timeStyle: "short",
    }).format(new Date(value));
};

const cashierIcons = {
    cash: IconWallet,
    qris: IconQrcode,
    bank_transfer: IconBuildingBank,
    debit_credit: IconCreditCard,
    pay_later: IconHourglassLow,
};

function MetricCard({ title, value, icon: Icon }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <Icon size={18} />
                <span>{title}</span>
            </div>
            <p className="mt-3 text-xl font-semibold text-slate-900 dark:text-white">
                {value}
            </p>
        </div>
    );
}

export default function Show({ cashierShift, canForceClose = false }) {
    const { auth, errors } = usePage().props;
    const { can } = useAuthorization();
    const [actualCash, setActualCash] = useState(
        cashierShift.actual_cash !== null ? String(cashierShift.actual_cash) : ""
    );
    const [agentActualCash, setAgentActualCash] = useState(
        cashierShift.agent_actual_cash !== null ? String(cashierShift.agent_actual_cash) : ""
    );
    const [closeNotes, setCloseNotes] = useState(cashierShift.close_notes || "");

    const canCloseShift = useMemo(() => {
        if (cashierShift.status !== "open") return false;

        return (
            can("cashier-shifts-close") &&
            (cashierShift.user?.id === auth?.user?.id ||
                auth?.super ||
                canForceClose)
        );
    }, [
        auth?.super,
        auth?.user?.id,
        can,
        canForceClose,
        cashierShift.status,
        cashierShift.user?.id,
    ]);

    const actualCashNumber = Number(actualCash || 0);
    const difference = actualCash === ""
        ? null
        : actualCashNumber - Number(cashierShift.expected_cash || 0);

    const agentActualCashNumber = Number(agentActualCash || 0);
    const agentDifference = agentActualCash === ""
        ? null
        : agentActualCashNumber - Number(cashierShift.agent_expected_cash || 0);

    const handleCloseShift = (event) => {
        event.preventDefault();

        router.post(route("cashier-shifts.close", cashierShift.id), {
            actual_cash: actualCashNumber,
            agent_actual_cash: agentActualCashNumber,
            close_notes: closeNotes,
        });
    };

    return (
        <>
            <Head title={`Shift #${cashierShift.id}`} />

            <div className="space-y-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <Link
                            href={route("cashier-shifts.index")}
                            className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-400"
                        >
                            <IconArrowLeft size={16} />
                            <span>Kembali ke histori shift</span>
                        </Link>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                            Shift Kasir {cashierShift.user?.name || "-"}
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Dibuka {formatDateTime(cashierShift.opened_at)}
                        </p>
                    </div>
                    <span
                        className={`inline-flex rounded-full px-3 py-1.5 text-sm font-semibold ${
                            cashierShift.status === "open"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                                : cashierShift.status === "force_closed"
                                  ? "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
                                  : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                    >
                        {cashierShift.status === "open"
                            ? "Shift Aktif"
                            : cashierShift.status === "force_closed"
                              ? "Force Closed"
                              : "Shift Closed"}
                    </span>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <MetricCard title="Modal Awal" value={formatCurrency(cashierShift.opening_cash)} icon={IconWallet} />
                    <MetricCard title="Expected Cash" value={formatCurrency(cashierShift.expected_cash)} icon={IconCashBanknote} />
                    <MetricCard title="Penjualan Tunai" value={formatCurrency(cashierShift.cash_sales_total)} icon={IconReceipt} />
                    <MetricCard title="Refund Tunai" value={formatCurrency(cashierShift.cash_refund_total)} icon={IconRotateClockwise2} />
                </div>

                <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                    <div className="space-y-6">
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                                Ringkasan Shift
                            </h2>
                            <div className="mt-5 grid gap-4 md:grid-cols-2">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Kasir</p>
                                    <p className="mt-2 text-sm text-slate-900 dark:text-white">{cashierShift.user?.name || "-"}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Dibuka Oleh</p>
                                    <p className="mt-2 text-sm text-slate-900 dark:text-white">{cashierShift.opened_by?.name || "-"}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Waktu Tutup</p>
                                    <p className="mt-2 text-sm text-slate-900 dark:text-white">{formatDateTime(cashierShift.closed_at)}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Ditutup Oleh</p>
                                    <p className="mt-2 text-sm text-slate-900 dark:text-white">{cashierShift.closed_by?.name || "-"}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Total Transaksi</p>
                                    <p className="mt-2 text-sm text-slate-900 dark:text-white">{cashierShift.transactions_count}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Total Retur</p>
                                    <p className="mt-2 text-sm text-slate-900 dark:text-white">{cashierShift.sales_returns_count}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Penjualan Non Tunai</p>
                                    <p className="mt-2 text-sm text-slate-900 dark:text-white">{formatCurrency(cashierShift.non_cash_sales_total)}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Refund Non Tunai</p>
                                    <p className="mt-2 text-sm text-slate-900 dark:text-white">{formatCurrency(cashierShift.non_cash_refund_total)}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Transaksi Agen</p>
                                    <p className="mt-2 text-sm text-slate-900 dark:text-white">{cashierShift.agent_transactions_count || 0}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Agen Kas Masuk</p>
                                    <p className="mt-2 text-sm text-slate-900 dark:text-white">{formatCurrency(cashierShift.agent_cash_in_total)}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Agen Kas Keluar</p>
                                    <p className="mt-2 text-sm text-slate-900 dark:text-white">{formatCurrency(cashierShift.agent_cash_out_total)}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Admin Agen Tunai</p>
                                    <p className="mt-2 text-sm text-slate-900 dark:text-white">{formatCurrency(cashierShift.agent_fees_cash_in_total)}</p>
                                </div>
                            </div>

                            <div className="mt-5 grid gap-4 md:grid-cols-2">
                                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Catatan Shift</p>
                                    <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{cashierShift.notes || "Tidak ada catatan pembukaan."}</p>
                                </div>
                                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Catatan Closing</p>
                                    <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{cashierShift.close_notes || "Tidak ada catatan penutupan."}</p>
                                </div>
                            </div>
                        </div>

                        {/* Analisis Pembayaran Card */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 animate-in fade-in slide-in-from-bottom-2 duration-350">
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                                Analisis Pembayaran Shift
                            </h2>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                Rincian penerimaan dan pengeluaran selama shift aktif.
                            </p>

                            <div className="mt-6 grid gap-6 md:grid-cols-2">
                                {/* Kasir Column */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800 pb-2">
                                        1. Metode Pembayaran Kasir
                                    </h3>
                                    <div className="space-y-3">
                                        {Object.entries(cashierShift.cashier_payment_breakdown || {}).map(([key, item]) => {
                                            const IconComponent = cashierIcons[key] || IconReceipt;
                                            return (
                                                <div key={key} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 rounded-lg bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-800">
                                                            <IconComponent size={18} />
                                                        </div>
                                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.name}</span>
                                                    </div>
                                                    <span className="font-semibold text-slate-900 dark:text-white">
                                                        {formatCurrency(item.amount)}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Agent Column */}
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800 pb-2 mb-4">
                                            2. Transaksi Agen
                                        </h3>
                                        
                                        {/* Bank Accounts Breakdown */}
                                        <div className="space-y-3">
                                            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                                Berdasarkan Bank / EDC
                                            </h4>
                                            {cashierShift.agent_bank_breakdown && cashierShift.agent_bank_breakdown.length > 0 ? (
                                                cashierShift.agent_bank_breakdown.map((bank) => (
                                                    <div key={bank.bank_name} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <IconBuildingBank size={16} className="text-primary-500" />
                                                                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{bank.bank_name}</span>
                                                            </div>
                                                            <span className="text-xs text-slate-500 dark:text-slate-400">{bank.count} Transaksi</span>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                                            <div>
                                                                <span className="text-slate-500 dark:text-slate-400">Masuk (Debet):</span>
                                                                <p className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(bank.cash_in)}</p>
                                                            </div>
                                                            <div>
                                                                <span className="text-slate-500 dark:text-slate-400">Keluar (Kredit):</span>
                                                                <p className="font-semibold text-rose-600 dark:text-rose-400">{formatCurrency(bank.cash_out)}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-sm text-slate-500 dark:text-slate-400 italic">Tidak ada transaksi bank.</p>
                                            )}
                                        </div>

                                        {/* Loket Breakdown */}
                                        <div className="mt-5 space-y-3">
                                            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                                Berdasarkan Loket
                                            </h4>
                                            {cashierShift.agent_loket_breakdown && cashierShift.agent_loket_breakdown.length > 0 ? (
                                                cashierShift.agent_loket_breakdown.map((loket) => (
                                                    <div key={loket.code} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2 rounded-lg bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-800">
                                                                <IconDeviceMobile size={18} className="text-amber-500" />
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{loket.code}</span>
                                                                <span className="text-[10px] text-slate-500 dark:text-slate-400">{loket.count} Transaksi</span>
                                                            </div>
                                                        </div>
                                                        <span className="font-semibold text-slate-900 dark:text-white">
                                                            {formatCurrency(loket.nominal)}
                                                        </span>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-sm text-slate-500 dark:text-slate-400 italic">Tidak ada transaksi loket.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                                Cash Closing Summary
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Kas POS Toko */}
                                <div className="space-y-3 bg-slate-50/50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Kas POS Toko</h3>
                                    <div className="flex items-center justify-between text-sm py-1.5 border-b border-slate-100 dark:border-slate-800">
                                        <span className="text-slate-500 dark:text-slate-400">Expected Cash</span>
                                        <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(cashierShift.expected_cash)}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm py-1.5 border-b border-slate-100 dark:border-slate-800">
                                        <span className="text-slate-500 dark:text-slate-400">Actual Cash</span>
                                        <span className="font-semibold text-slate-900 dark:text-white">
                                            {cashierShift.actual_cash === null ? "-" : formatCurrency(cashierShift.actual_cash)}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm py-1.5">
                                        <span className="text-slate-500 dark:text-slate-400">Selisih</span>
                                        <span className={`font-bold ${cashierShift.cash_difference === null ? "text-slate-900 dark:text-white" : cashierShift.cash_difference < 0 ? "text-rose-600 dark:text-rose-450" : cashierShift.cash_difference > 0 ? "text-emerald-600 dark:text-emerald-450" : "text-emerald-650"}`}>
                                            {cashierShift.cash_difference === null ? "-" : formatCurrency(cashierShift.cash_difference)}
                                        </span>
                                    </div>
                                </div>

                                {/* Kas Agen BRILink */}
                                <div className="space-y-3 bg-slate-50/50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Kas Agen (Cash BRILink)</h3>
                                    <div className="flex items-center justify-between text-sm py-1.5 border-b border-slate-100 dark:border-slate-800">
                                        <span className="text-slate-500 dark:text-slate-400">Expected Cash</span>
                                        <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(cashierShift.agent_expected_cash || 0)}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm py-1.5 border-b border-slate-100 dark:border-slate-800">
                                        <span className="text-slate-500 dark:text-slate-400">Actual Cash</span>
                                        <span className="font-semibold text-slate-900 dark:text-white">
                                            {cashierShift.agent_actual_cash === null ? "-" : formatCurrency(cashierShift.agent_actual_cash)}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm py-1.5">
                                        <span className="text-slate-500 dark:text-slate-400">Selisih</span>
                                        <span className={`font-bold ${cashierShift.agent_cash_difference === null ? "text-slate-900 dark:text-white" : cashierShift.agent_cash_difference < 0 ? "text-rose-600 dark:text-rose-450" : cashierShift.agent_cash_difference > 0 ? "text-emerald-600 dark:text-emerald-450" : "text-emerald-650"}`}>
                                            {cashierShift.agent_cash_difference === null ? "-" : formatCurrency(cashierShift.agent_cash_difference)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {canCloseShift && (
                            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                                    Tutup Shift
                                </h2>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                    Input kas fisik akhir untuk finalisasi cash closing toko dan kas fisik agen.
                                </p>
                                <form onSubmit={handleCloseShift} className="mt-4 space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Kas Fisik Toko Aktual</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={actualCash}
                                                onChange={(event) => setActualCash(event.target.value)}
                                                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-800 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                            />
                                            {errors?.actual_cash && (
                                                <p className="mt-2 text-xs text-rose-500">{errors.actual_cash}</p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Kas Fisik Agen Aktual</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={agentActualCash}
                                                onChange={(event) => setAgentActualCash(event.target.value)}
                                                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-800 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                            />
                                            {errors?.agent_actual_cash && (
                                                <p className="mt-2 text-xs text-rose-500">{errors.agent_actual_cash}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Catatan Closing</label>
                                        <textarea
                                            rows={4}
                                            value={closeNotes}
                                            onChange={(event) => setCloseNotes(event.target.value)}
                                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                            placeholder="Opsional"
                                        />
                                    </div>
                                    {(difference !== null || agentDifference !== null) && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {difference !== null && (
                                                <div
                                                    className={`rounded-xl px-4 py-3 text-sm ${
                                                        difference === 0
                                                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                                                            : "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300"
                                                    }`}
                                                >
                                                    Selisih Toko: {formatCurrency(difference)}
                                                </div>
                                            )}
                                            {agentDifference !== null && (
                                                <div
                                                    className={`rounded-xl px-4 py-3 text-sm ${
                                                        agentDifference === 0
                                                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                                                            : "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300"
                                                    }`}
                                                >
                                                    Selisih Agen: {formatCurrency(agentDifference)}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <button
                                        type="submit"
                                        className="inline-flex items-center gap-2 rounded-xl bg-primary-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-600"
                                    >
                                        <IconCashBanknote size={18} />
                                        <span>Finalisasi Closing</span>
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                </div>

                {/* Agent Transactions Details Section */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                            <IconBuildingBank size={20} className="text-primary-500" />
                            Rincian Transaksi Agen Link ({cashierShift.agent_transactions?.length || 0} Transaksi)
                        </h2>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Daftar semua pencatatan transaksi agen link pada shift ini.
                        </p>
                    </div>

                    {cashierShift.agent_transactions && cashierShift.agent_transactions.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-sm">
                                <thead>
                                    <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-500">
                                        <th className="p-3">Waktu</th>
                                        <th className="p-3">Tipe / Layanan</th>
                                        <th className="p-3">EDC / Rekening</th>
                                        <th className="p-3 text-right">Nominal</th>
                                        <th className="p-3 text-right">Admin Pelanggan</th>
                                        <th className="p-3 text-right">Admin Bank</th>
                                        <th className="p-3 text-right">Keuntungan (Net)</th>
                                        <th className="p-3 text-center">Status</th>
                                        <th className="p-3">Catatan</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                                    {cashierShift.agent_transactions.map((tx) => (
                                        <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                                            <td className="p-3 whitespace-nowrap text-slate-500">
                                                {formatDateTime(tx.transaction_date)}
                                            </td>
                                            <td className="p-3">
                                                <div className="font-semibold text-slate-900 dark:text-white">
                                                    {tx.agent_transaction_type?.name || "-"}
                                                </div>
                                                <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                                    tx.agent_transaction_type?.type === 'debet' 
                                                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400' 
                                                        : 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400'
                                                }`}>
                                                    {tx.agent_transaction_type?.type === 'debet' ? 'Debet/Masuk' : 'Kredit/Keluar'}
                                                </span>
                                            </td>
                                            <td className="p-3 whitespace-nowrap text-slate-600 dark:text-slate-400">
                                                {tx.bank_account ? (
                                                    <div>
                                                        <p className="font-medium text-slate-800 dark:text-slate-200">{tx.bank_account.bank_name}</p>
                                                        <p className="text-[10px] text-slate-400 font-mono">{tx.bank_account.account_number}</p>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 font-medium">Cash (Kas Fisik)</span>
                                                )}
                                            </td>
                                            <td className="p-3 text-right font-bold text-slate-900 dark:text-white">
                                                {formatCurrency(tx.nominal)}
                                            </td>
                                            <td className="p-3 text-right text-slate-600 dark:text-slate-400 font-medium">
                                                {formatCurrency(tx.admin_fee_customer)}
                                                <span className="block text-[9px] text-slate-400 uppercase font-bold">
                                                    {tx.admin_fee_payment_method}
                                                </span>
                                            </td>
                                            <td className="p-3 text-right text-slate-600 dark:text-slate-400">
                                                {formatCurrency(tx.admin_fee_bank)}
                                            </td>
                                            <td className="p-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                                                {formatCurrency(tx.net_profit)}
                                            </td>
                                            <td className="p-3 text-center whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                                                    tx.status === "success"
                                                        ? "bg-success-100 text-success-700 dark:bg-success-950/30 dark:text-success-400"
                                                        : tx.status === "pending"
                                                        ? "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                                                        : "bg-danger-100 text-danger-700 dark:bg-danger-950/30 dark:text-danger-400"
                                                }`}>
                                                    {tx.status === "success" ? "Berhasil" : tx.status === "pending" ? "Pending" : "Gagal"}
                                                </span>
                                            </td>
                                            <td className="p-3 max-w-[200px] truncate text-xs text-slate-500" title={tx.notes}>
                                                {tx.notes || "-"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="p-8 text-center bg-slate-50 dark:bg-slate-950 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                            <IconBuildingBank size={36} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                            <p className="text-slate-500 dark:text-slate-400 text-sm">Tidak ada transaksi agen link selama shift ini.</p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

Show.layout = (page) => <DashboardLayout children={page} />;
