import React, { useEffect, useMemo, useState } from "react";
import { Head, router } from "@inertiajs/react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import InputSelect from "@/Components/Dashboard/InputSelect";
import Pagination from "@/Components/Dashboard/Pagination";
import {
    IconBuildingBank,
    IconCoin,
    IconDatabaseOff,
    IconFileSpreadsheet,
    IconReceipt2,
    IconArrowsExchange,
    IconFilter,
    IconX,
    IconSearch,
} from "@tabler/icons-react";

const SummaryCard = ({ icon, title, value, description, gradient }) => (
    <div
        className={`relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br ${gradient} text-white shadow-lg`}
    >
        <div className="absolute top-0 right-0 w-24 h-24 opacity-20">
            {React.cloneElement(icon, {
                size: 96,
                strokeWidth: 0.5,
                className: "transform translate-x-4 -translate-y-4",
            })}
        </div>
        <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
                <div className="p-2 rounded-xl bg-white/20">
                    {React.cloneElement(icon, { size: 18 })}
                </div>
                <span className="text-sm font-medium opacity-90">{title}</span>
            </div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-sm opacity-80 mt-1">{description}</p>
        </div>
    </div>
);

const defaultFilterState = {
    start_date: "",
    end_date: "",
    type_id: "",
    bank_account_id: "",
    status: "",
};

const formatCurrency = (value = 0) =>
    new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
    }).format(value);

const castFilterString = (value) =>
    typeof value === "number" ? String(value) : value ?? "";

const statusBadgeClass = (status) =>
    status === "success"
        ? "bg-success-50 text-success-700 ring-success-600/10 dark:bg-success-950/20 dark:text-success-400"
        : status === "pending"
        ? "bg-amber-50 text-amber-700 ring-amber-600/10 dark:bg-amber-950/20 dark:text-amber-400"
        : "bg-danger-50 text-danger-700 ring-danger-600/10 dark:bg-danger-950/20 dark:text-danger-400";

const statusLabel = (status) =>
    status === "success" ? "Berhasil" : status === "pending" ? "Pending" : "Gagal";

const AgentLink = ({
    transactions,
    summary,
    byType,
    byBankAccount,
    filters,
    bankAccounts,
    transactionTypes,
}) => {
    const [showFilters, setShowFilters] = useState(false);
    const [filterData, setFilterData] = useState({
        ...defaultFilterState,
        start_date: castFilterString(filters?.start_date),
        end_date: castFilterString(filters?.end_date),
        type_id: castFilterString(filters?.type_id),
        bank_account_id: castFilterString(filters?.bank_account_id),
        status: castFilterString(filters?.status),
    });

    const typeFromFilters = useMemo(
        () =>
            transactionTypes.find(
                (t) => castFilterString(t.id) === filterData.type_id
            ) ?? null,
        [transactionTypes, filterData.type_id]
    );

    const bankFromFilters = useMemo(
        () =>
            bankAccounts.find(
                (b) => castFilterString(b.id) === filterData.bank_account_id
            ) ?? null,
        [bankAccounts, filterData.bank_account_id]
    );

    const [selectedType, setSelectedType] = useState(typeFromFilters);
    const [selectedBank, setSelectedBank] = useState(bankFromFilters);

    useEffect(() => setSelectedType(typeFromFilters), [typeFromFilters]);
    useEffect(() => setSelectedBank(bankFromFilters), [bankFromFilters]);
    useEffect(() => {
        setFilterData({
            ...defaultFilterState,
            start_date: castFilterString(filters?.start_date),
            end_date: castFilterString(filters?.end_date),
            type_id: castFilterString(filters?.type_id),
            bank_account_id: castFilterString(filters?.bank_account_id),
            status: castFilterString(filters?.status),
        });
    }, [filters]);

    const handleChange = (field, value) =>
        setFilterData((prev) => ({ ...prev, [field]: value }));
    const handleSelectType = (value) => {
        setSelectedType(value);
        handleChange("type_id", value ? String(value.id) : "");
    };
    const handleSelectBank = (value) => {
        setSelectedBank(value);
        handleChange("bank_account_id", value ? String(value.id) : "");
    };

    const applyFilters = (e) => {
        e.preventDefault();
        router.get(route("reports.agent-link.index"), filterData, {
            preserveScroll: true,
            preserveState: true,
        });
        setShowFilters(false);
    };

    const resetFilters = () => {
        setFilterData(defaultFilterState);
        setSelectedType(null);
        setSelectedBank(null);
        router.get(route("reports.agent-link.index"), defaultFilterState, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    };

    const rows = transactions?.data ?? [];
    const paginationLinks = transactions?.links ?? [];
    const currentPage = transactions?.current_page ?? 1;
    const perPage = transactions?.per_page
        ? Number(transactions?.per_page)
        : rows.length || 1;

    const hasActiveFilters =
        filterData.start_date ||
        filterData.end_date ||
        filterData.type_id ||
        filterData.bank_account_id ||
        filterData.status;

    const safeSummary = {
        transactions_count: summary?.transactions_count ?? 0,
        total_volume: summary?.total_volume ?? 0,
        total_customer_fees: summary?.total_customer_fees ?? 0,
        total_bank_fees: summary?.total_bank_fees ?? 0,
        total_profit: summary?.total_profit ?? 0,
        average_profit: summary?.average_profit ?? 0,
        pending_count: summary?.pending_count ?? 0,
        failed_count: summary?.failed_count ?? 0,
    };

    const summaryCards = [
        {
            title: "Total Volume Transaksi",
            value: formatCurrency(safeSummary.total_volume),
            description: `${safeSummary.transactions_count.toLocaleString("id-ID")} transaksi berhasil`,
            icon: <IconArrowsExchange />,
            gradient: "from-primary-500 to-primary-700",
        },
        {
            title: "Profit Bersih",
            value: formatCurrency(safeSummary.total_profit),
            description: `Rata-rata: ${formatCurrency(safeSummary.average_profit)} / transaksi`,
            icon: <IconCoin />,
            gradient: "from-success-500 to-success-700",
        },
        {
            title: "Fee Customer vs Bank",
            value: formatCurrency(safeSummary.total_customer_fees),
            description: `Fee ke bank: ${formatCurrency(safeSummary.total_bank_fees)}`,
            icon: <IconReceipt2 />,
            gradient: "from-accent-500 to-accent-700",
        },
        {
            title: "Perlu Ditindaklanjuti",
            value: `${safeSummary.pending_count + safeSummary.failed_count}`,
            description: `Pending: ${safeSummary.pending_count} • Gagal: ${safeSummary.failed_count}`,
            icon: <IconBuildingBank />,
            gradient: "from-warning-500 to-warning-600",
        },
    ];

    return (
        <>
            <Head title="Laporan Agen Link" />

            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <IconArrowsExchange
                                size={28}
                                className="text-primary-500"
                            />
                            Laporan Agen Link
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Rekap volume, fee, dan profit transaksi agen (PPOB/bank)
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <a
                            href={route("reports.agent-link.export", filterData)}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                        >
                            <IconFileSpreadsheet size={18} />
                            <span>Export Excel</span>
                        </a>
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                                showFilters || hasActiveFilters
                                    ? "bg-primary-50 border-primary-200 text-primary-700 dark:bg-primary-950/50 dark:border-primary-800 dark:text-primary-400"
                                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                            }`}
                        >
                            <IconFilter size={18} />
                            <span>Filter</span>
                            {hasActiveFilters && (
                                <span className="w-2 h-2 rounded-full bg-primary-500"></span>
                            )}
                        </button>
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {summaryCards.map((card) => (
                        <SummaryCard key={card.title} {...card} />
                    ))}
                </div>

                {showFilters && (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 animate-slide-up">
                        <form onSubmit={applyFilters}>
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Tanggal Mulai
                                    </label>
                                    <input
                                        type="date"
                                        value={filterData.start_date}
                                        onChange={(e) =>
                                            handleChange("start_date", e.target.value)
                                        }
                                        className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Tanggal Akhir
                                    </label>
                                    <input
                                        type="date"
                                        value={filterData.end_date}
                                        onChange={(e) =>
                                            handleChange("end_date", e.target.value)
                                        }
                                        className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Status
                                    </label>
                                    <select
                                        value={filterData.status}
                                        onChange={(e) =>
                                            handleChange("status", e.target.value)
                                        }
                                        className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm outline-none cursor-pointer"
                                    >
                                        <option value="">Semua Status</option>
                                        <option value="success">Berhasil</option>
                                        <option value="pending">Pending</option>
                                        <option value="failed">Gagal</option>
                                    </select>
                                </div>
                                <InputSelect
                                    label="Tipe Transaksi"
                                    data={transactionTypes.map((t) => ({
                                        ...t,
                                        label: `[${t.code}] ${t.name}`,
                                    }))}
                                    selected={
                                        selectedType
                                            ? {
                                                  ...selectedType,
                                                  label: `[${selectedType.code}] ${selectedType.name}`,
                                              }
                                            : null
                                    }
                                    setSelected={handleSelectType}
                                    placeholder="Semua tipe"
                                    searchable
                                    displayKey="label"
                                />
                                <InputSelect
                                    label="Rekening Bank"
                                    data={bankAccounts.map((b) => ({
                                        ...b,
                                        label: `${b.bank_name} - ${b.account_name}`,
                                    }))}
                                    selected={
                                        selectedBank
                                            ? {
                                                  ...selectedBank,
                                                  label: `${selectedBank.bank_name} - ${selectedBank.account_name}`,
                                              }
                                            : null
                                    }
                                    setSelected={handleSelectBank}
                                    placeholder="Semua rekening"
                                    searchable
                                    displayKey="label"
                                />
                            </div>
                            <div className="flex justify-end gap-2 mt-4">
                                {hasActiveFilters && (
                                    <button
                                        type="button"
                                        onClick={resetFilters}
                                        className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                    >
                                        <IconX size={18} />
                                    </button>
                                )}
                                <button
                                    type="submit"
                                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-medium transition-colors"
                                >
                                    <IconSearch size={18} />
                                    Terapkan
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="grid gap-6 lg:grid-cols-2">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
                        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
                            Rekap per Tipe Transaksi
                        </h3>
                        <div className="space-y-3">
                            {byType.length > 0 ? (
                                byType.map((t) => (
                                    <div
                                        key={t.id}
                                        className="flex items-center justify-between text-sm"
                                    >
                                        <div>
                                            <p className="font-medium text-slate-800 dark:text-slate-200">
                                                [{t.code}] {t.name}
                                            </p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                {t.transactions_count.toLocaleString("id-ID")} transaksi
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-semibold text-slate-900 dark:text-white">
                                                {formatCurrency(t.total_volume)}
                                            </p>
                                            <p className="text-xs text-success-600 dark:text-success-400">
                                                +{formatCurrency(t.total_profit)}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-slate-400">Belum ada data.</p>
                            )}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
                        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
                            Rekap per Rekening Bank
                        </h3>
                        <div className="space-y-3">
                            {byBankAccount.length > 0 ? (
                                byBankAccount.map((b) => (
                                    <div
                                        key={b.id}
                                        className="flex items-center justify-between text-sm"
                                    >
                                        <div>
                                            <p className="font-medium text-slate-800 dark:text-slate-200">
                                                {b.bank_name}
                                            </p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                {b.account_name} • {b.transactions_count.toLocaleString("id-ID")} transaksi
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-semibold text-slate-900 dark:text-white">
                                                {formatCurrency(b.total_volume)}
                                            </p>
                                            <p className="text-xs text-success-600 dark:text-success-400">
                                                +{formatCurrency(b.total_profit)}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-slate-400">Belum ada data.</p>
                            )}
                        </div>
                    </div>
                </div>

                {rows.length > 0 ? (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-slate-100 dark:border-slate-800">
                                        <th className="px-4 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                                            No
                                        </th>
                                        <th className="px-4 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                                            Tanggal
                                        </th>
                                        <th className="px-4 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                                            Tipe
                                        </th>
                                        <th className="px-4 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                                            Rekening
                                        </th>
                                        <th className="px-4 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                                            Kasir
                                        </th>
                                        <th className="px-4 py-4 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                                            Nominal
                                        </th>
                                        <th className="px-4 py-4 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                                            Profit
                                        </th>
                                        <th className="px-4 py-4 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                                            Status
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {rows.map((tx, i) => (
                                        <tr
                                            key={tx.id}
                                            className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                        >
                                            <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-400">
                                                {i + 1 + (currentPage - 1) * perPage}
                                            </td>
                                            <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-400">
                                                {tx.transaction_date}
                                            </td>
                                            <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-300">
                                                [{tx.agent_transaction_type?.code}] {tx.agent_transaction_type?.name}
                                            </td>
                                            <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-400">
                                                {tx.bank_account?.bank_name ?? "-"}
                                            </td>
                                            <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-400">
                                                {tx.cashier?.name ?? "-"}
                                            </td>
                                            <td className="px-4 py-4 text-right text-sm font-semibold text-slate-900 dark:text-white">
                                                {formatCurrency(tx.nominal)}
                                            </td>
                                            <td className="px-4 py-4 text-right text-sm font-semibold text-success-600 dark:text-success-400">
                                                {formatCurrency(tx.net_profit)}
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <span
                                                    className={`px-2.5 py-1 rounded-lg text-xs font-bold ring-1 ring-inset ${statusBadgeClass(
                                                        tx.status
                                                    )}`}
                                                >
                                                    {statusLabel(tx.status)}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                        <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                            <IconDatabaseOff size={32} className="text-slate-400" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-800 dark:text-slate-200 mb-1">
                            Tidak Ada Data
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Tidak ada transaksi agen sesuai filter.
                        </p>
                    </div>
                )}

                {paginationLinks.length > 3 && <Pagination links={paginationLinks} />}
            </div>
        </>
    );
};

AgentLink.layout = (page) => <DashboardLayout children={page} />;

export default AgentLink;
