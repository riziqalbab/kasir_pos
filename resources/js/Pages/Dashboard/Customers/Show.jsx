import React from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, Link, useForm } from "@inertiajs/react";
import {
    IconArrowLeft,
    IconDatabaseOff,
    IconReceipt,
} from "@tabler/icons-react";

const formatPrice = (value = 0) =>
    Number(value || 0).toLocaleString("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
    });

const formatDateTime = (value) =>
    value
        ? new Intl.DateTimeFormat("id-ID", {
              dateStyle: "medium",
              timeStyle: "short",
          }).format(new Date(value))
        : "-";

export default function Show({
    customer,
    stats,
    recentTransactions,
    frequentProducts,
}) {
    const hasRecentTransactions = recentTransactions.length > 0;
    const hasFrequentProducts = frequentProducts.length > 0;

    return (
        <>
            <Head title={`Pelanggan - ${customer.name}`} />

            <div className="w-full">
                <div className="mb-6">
                    <Link
                        href={route("customers.index")}
                        className="mb-3 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-primary-600"
                    >
                        <IconArrowLeft size={16} />
                        Kembali ke Pelanggan
                    </Link>

                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                            <div className="mb-2 flex items-center gap-2">
                                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                                    {customer.name}
                                </h1>
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                {customer.no_telp || "-"}{" "}
                                {customer.address ? `• ${customer.address}` : ""}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
                    <div className="space-y-6">
                        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                            <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
                                Ringkasan Pelanggan
                            </h2>
                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
                                    <p className="text-xs uppercase tracking-wide text-slate-500">
                                        Total Transaksi
                                    </p>
                                    <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                                        {stats?.total_transactions || 0}
                                    </p>
                                </div>
                                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
                                    <p className="text-xs uppercase tracking-wide text-slate-500">
                                        Total Belanja
                                    </p>
                                    <p className="mt-2 text-lg font-bold text-slate-900 dark:text-white">
                                        {formatPrice(stats?.total_spent || 0)}
                                    </p>
                                </div>
                                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
                                    <p className="text-xs uppercase tracking-wide text-slate-500">
                                        Kunjungan Terakhir
                                    </p>
                                    <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                                        {stats?.last_visit
                                            ? new Date(
                                                  stats.last_visit
                                              ).toLocaleDateString("id-ID")
                                             : "-"}
                                    </p>
                                </div>
                                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
                                    <p className="text-xs uppercase tracking-wide text-slate-500">
                                        Poin Loyalty
                                    </p>
                                    <p className="mt-2 text-lg font-bold text-emerald-600 dark:text-emerald-400">
                                        {customer.is_loyalty_member ? `${customer.loyalty_points || 0} Poin` : "Bukan Member"}
                                    </p>
                                </div>
                            </div>
                        </section>


                        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                            <div className="mb-4 flex items-center gap-2">
                                <IconReceipt size={18} className="text-primary-500" />
                                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                                    Transaksi Terakhir
                                </h2>
                            </div>
                            {hasRecentTransactions ? (
                                <div className="space-y-3">
                                    {recentTransactions.map((transaction) => (
                                        <div
                                            key={transaction.id}
                                            className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-800/50"
                                        >
                                            <div>
                                                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                                    {transaction.invoice}
                                                </p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                                    {formatDateTime(
                                                        transaction.date
                                                    )}
                                                </p>
                                            </div>
                                            <p className="text-sm font-bold text-primary-600 dark:text-primary-300">
                                                {formatPrice(transaction.total)}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center dark:bg-slate-800/50">
                                    <IconDatabaseOff
                                        size={28}
                                        className="mx-auto mb-3 text-slate-400"
                                    />
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        Belum ada transaksi pelanggan.
                                    </p>
                                </div>
                            )}
                        </section>
                    </div>

                    <div className="space-y-6">
                        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                            <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
                                Informasi
                            </h2>
                            <div className="space-y-3 text-sm text-slate-500 dark:text-slate-400">
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                                    <p className="text-xs uppercase tracking-wide text-slate-500">
                                        Total Nilai Transaksi
                                    </p>
                                    <p className="mt-1 font-semibold text-slate-900 dark:text-white">
                                        {formatPrice(
                                            customer.total_spent ||
                                                stats?.total_spent ||
                                                0
                                        )}
                                    </p>
                                </div>
                            </div>
                        </section>


                        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                            <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
                                Produk Favorit
                            </h2>
                            {hasFrequentProducts ? (
                                <div className="flex flex-wrap gap-2">
                                    {frequentProducts.map((product) => (
                                        <span
                                            key={product.id}
                                            className="inline-flex rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold text-primary-700 dark:bg-primary-950/40 dark:text-primary-300"
                                        >
                                            {product.title} x{product.total_qty}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center dark:bg-slate-800/50">
                                    <IconDatabaseOff
                                        size={28}
                                        className="mx-auto mb-3 text-slate-400"
                                    />
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        Belum ada data produk favorit.
                                    </p>
                                </div>
                            )}
                        </section>

                    </div>
                </div>
            </div>
        </>
    );
}

Show.layout = (page) => <DashboardLayout children={page} />;
