import React, { useState, useEffect } from "react";
import { Head, usePage, useForm, router, Link } from "@inertiajs/react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import {
    IconBuildingBank,
    IconPlus,
    IconSearch,
    IconX,
    IconPencil,
    IconTrash,
    IconPrinter,
    IconCurrencyDollar,
    IconTrendingUp,
    IconWallet,
    IconHelpCircle,
    IconAlertCircle,
    IconCircleCheck,
    IconDeviceFloppy,
    IconCalendar
} from "@tabler/icons-react";
import toast from "react-hot-toast";
import { useAuthorization } from "@/Utils/authorization";
import Pagination from "@/Components/Dashboard/Pagination";

export default function Index({
    transactions = {},
    filters = {},
    stats = {},
    bankAccounts = [],
    transactionTypes = [],
    activeCashierShift = null
}) {
    const { flash, auth } = usePage().props;
    const { can } = useAuthorization();
    const canCreate = can("agent-transactions-create") && activeCashierShift !== null;
    const canEdit = can("agent-transactions-edit");
    const canDelete = can("agent-transactions-delete");

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTx, setEditingTx] = useState(null);

    // Filter states
    const [search, setSearch] = useState(filters.search || "");
    const [startDate, setStartDate] = useState(filters.start_date || "");
    const [endDate, setEndDate] = useState(filters.end_date || "");
    const [typeId, setTypeId] = useState(filters.type_id || "");
    const [bankAccountId, setBankAccountId] = useState(filters.bank_account_id || "");
    const [statusFilter, setStatusFilter] = useState(filters.status || "");

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        agent_transaction_type_id: "",
        bank_account_id: "",
        customer_name: "",
        customer_phone: "",
        reference_number: "",
        nominal: "",
        admin_fee_customer: "",
        admin_fee_bank: "",
        admin_fee_payment_method: "cash",
        status: "success",
        notes: "",
    });

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash]);

    // Handle filter submit
    const handleFilterSubmit = (e) => {
        e.preventDefault();
        router.get(
            route("agent-transactions.index"),
            {
                search,
                start_date: startDate,
                end_date: endDate,
                type_id: typeId,
                bank_account_id: bankAccountId,
                status: statusFilter,
            },
            { preserveState: true }
        );
    };

    // Reset filters
    const handleResetFilters = () => {
        setSearch("");
        setStartDate("");
        setEndDate("");
        setTypeId("");
        setBankAccountId("");
        setStatusFilter("");
        router.get(route("agent-transactions.index"), {}, { preserveState: true });
    };

    // Open add modal
    const openAddModal = () => {
        clearErrors();
        reset();
        setIsModalOpen(true);
        setEditingTx(null);
    };

    // Open edit modal
    const openEditModal = (tx) => {
        clearErrors();
        setEditingTx(tx);
        setData({
            agent_transaction_type_id: tx.agent_transaction_type_id,
            bank_account_id: tx.bank_account_id || "",
            customer_name: tx.customer_name || "",
            customer_phone: tx.customer_phone || "",
            reference_number: tx.reference_number || "",
            nominal: tx.nominal,
            admin_fee_customer: tx.admin_fee_customer,
            admin_fee_bank: tx.admin_fee_bank,
            admin_fee_payment_method: tx.admin_fee_payment_method,
            status: tx.status,
            notes: tx.notes || "",
        });
        setIsModalOpen(true);
    };

    // Automatically set default fees when transaction type changes
    const handleTypeChange = (id) => {
        setData("agent_transaction_type_id", id);
        const selectedType = transactionTypes.find((t) => t.id === parseInt(id));
        if (selectedType) {
            setData((prevData) => ({
                ...prevData,
                agent_transaction_type_id: id,
                admin_fee_customer: selectedType.default_admin_fee_customer,
                admin_fee_bank: selectedType.default_admin_fee_bank,
            }));
        }
    };

    // Form submit
    const handleSubmit = (e) => {
        e.preventDefault();
        if (editingTx) {
            put(route("agent-transactions.update", editingTx.id), {
                onSuccess: () => {
                    setIsModalOpen(false);
                    reset();
                },
            });
        } else {
            post(route("agent-transactions.store"), {
                onSuccess: () => {
                    setIsModalOpen(false);
                    reset();
                },
            });
        }
    };

    // Status quick change
    const handleStatusChange = (tx, newStatus) => {
        router.patch(
            route("agent-transactions.status", tx.id),
            { status: newStatus },
            {
                preserveScroll: true,
                onSuccess: () => toast.success("Status transaksi berhasil diubah"),
            }
        );
    };

    // Delete transaction
    const handleDelete = (tx) => {
        if (confirm(`Hapus transaksi senilai Rp ${new Intl.NumberFormat("id-ID").format(tx.nominal)}?`)) {
            router.delete(route("agent-transactions.destroy", tx.id));
        }
    };

    // Format Rupiah helper
    const formatRp = (val) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val);

    return (
        <>
            <Head title="Pencatatan Transaksi Agen" />

            {/* Header */}
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <IconBuildingBank size={28} className="text-primary-500" />
                        Pencatatan Agen
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Pencatatan transaksi Agen BRILink, transfer, tarik tunai, dan pembayaran tagihan lainnya.
                    </p>
                </div>
                <div>
                    {activeCashierShift ? (
                        <button
                            onClick={openAddModal}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold transition-all shadow-lg shadow-primary-500/20"
                        >
                            <IconPlus size={18} />
                            Catat Transaksi
                        </button>
                    ) : (
                        <span className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-400 text-sm font-semibold cursor-not-allowed">
                            <IconAlertCircle size={18} />
                            Buka Shift untuk Mencatat
                        </span>
                    )}
                </div>
            </div>

            {/* Cashier Shift Warning Banner */}
            {!activeCashierShift && (
                <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-200 flex items-start gap-3">
                    <IconAlertCircle className="mt-0.5 shrink-0" size={20} />
                    <div>
                        <p className="font-semibold text-sm">Shift kasir Anda saat ini belum aktif.</p>
                        <p className="text-xs mt-1">
                            Anda harus membuka shift kasir terlebih dahulu di menu{" "}
                            <Link href={route("cashier-shifts.index")} className="underline font-bold hover:text-amber-600">
                                Shift Kasir
                            </Link>{" "}
                            untuk dapat mencatat transaksi agen baru.
                        </p>
                    </div>
                </div>
            )}

            {/* Stats Cards Dashboard */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Total Volume */}
                <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 text-white p-5 rounded-2xl shadow-md border border-indigo-600">
                    <div className="flex justify-between items-center opacity-85">
                        <span className="text-xs font-bold uppercase tracking-wider">Volume Transaksi</span>
                        <IconTrendingUp size={22} />
                    </div>
                    <h3 className="text-xl font-bold mt-2 truncate">
                        {formatRp(stats.total_volume)}
                    </h3>
                    <p className="text-xs opacity-75 mt-1">Total nominal transaksi sukses</p>
                </div>

                {/* Net Profit */}
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white p-5 rounded-2xl shadow-md border border-emerald-600">
                    <div className="flex justify-between items-center opacity-85">
                        <span className="text-xs font-bold uppercase tracking-wider">Laba Bersih Agen</span>
                        <IconCurrencyDollar size={22} />
                    </div>
                    <h3 className="text-xl font-bold mt-2 truncate">
                        {formatRp(stats.total_profit)}
                    </h3>
                    <p className="text-xs opacity-75 mt-1">Admin Customer - Admin Bank</p>
                </div>

                {/* Admin Customer */}
                <div className="bg-gradient-to-br from-amber-500 to-amber-700 text-white p-5 rounded-2xl shadow-md border border-amber-600">
                    <div className="flex justify-between items-center opacity-85">
                        <span className="text-xs font-bold uppercase tracking-wider">Biaya Admin Loket</span>
                        <IconWallet size={22} />
                    </div>
                    <h3 className="text-xl font-bold mt-2 truncate">
                        {formatRp(stats.total_customer_fees)}
                    </h3>
                    <p className="text-xs opacity-75 mt-1">Total biaya yang ditagih ke pelanggan</p>
                </div>

                {/* Admin Bank */}
                <div className="bg-gradient-to-br from-rose-500 to-rose-700 text-white p-5 rounded-2xl shadow-md border border-rose-600">
                    <div className="flex justify-between items-center opacity-85">
                        <span className="text-xs font-bold uppercase tracking-wider">Biaya Admin Bank</span>
                        <IconX size={22} />
                    </div>
                    <h3 className="text-xl font-bold mt-2 truncate">
                        {formatRp(stats.total_bank_fees)}
                    </h3>
                    <p className="text-xs opacity-75 mt-1">Biaya admin yang dipotong pihak bank</p>
                </div>
            </div>

            {/* Filter Panel */}
            <div className="mb-6 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                    <IconSearch size={16} />
                    Pencarian & Filter
                </h3>
                <form onSubmit={handleFilterSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        {/* Search Input */}
                        <div className="lg:col-span-2">
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Nama Cst / No. Telp / No. Ref</label>
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Cari..."
                                className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none"
                            />
                        </div>

                        {/* Start Date */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Tanggal Mulai</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none"
                            />
                        </div>

                        {/* End Date */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Tanggal Selesai</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none"
                            />
                        </div>

                        {/* Transaction Type */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Tipe Transaksi</label>
                            <select
                                value={typeId}
                                onChange={(e) => setTypeId(e.target.value)}
                                className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none"
                            >
                                <option value="">Semua Tipe</option>
                                {transactionTypes.map((type) => (
                                    <option key={type.id} value={type.id}>
                                        {type.name} ({type.type})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Bank Account */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Rekening Bank</label>
                            <select
                                value={bankAccountId}
                                onChange={(e) => setBankAccountId(e.target.value)}
                                className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none"
                            >
                                <option value="">Semua Bank</option>
                                {bankAccounts.map((bank) => (
                                    <option key={bank.id} value={bank.id}>
                                        {bank.bank_name} - {bank.account_name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Status Filter */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Status</label>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none"
                            >
                                <option value="">Semua Status</option>
                                <option value="success">Berhasil</option>
                                <option value="pending">Pending</option>
                                <option value="failed">Gagal</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={handleResetFilters}
                            className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                            Reset
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-xs font-semibold shadow-md transition-colors"
                        >
                            Terapkan Filter
                        </button>
                    </div>
                </form>
            </div>

            {/* List Table of Log */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Tanggal/Waktu</th>
                                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Kasir</th>
                                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Jenis Transaksi</th>
                                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Bank / EDC</th>
                                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Nominal</th>
                                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Admin Customer</th>
                                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Laba Bersih</th>
                                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</th>
                                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {transactions.data && transactions.data.length > 0 ? (
                                transactions.data.map((tx) => (
                                    <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                                        <td className="p-4 text-xs text-slate-600 dark:text-slate-400">
                                            {tx.transaction_date ? new Date(tx.transaction_date).toLocaleString("id-ID") : "-"}
                                        </td>
                                        <td className="p-4 text-sm text-slate-850 dark:text-slate-200">
                                            {tx.cashier?.name || "-"}
                                        </td>
                                        <td className="p-4 text-sm">
                                            <p className="font-semibold text-slate-800 dark:text-slate-200">
                                                {tx.agent_transaction_type?.name || "-"}
                                            </p>
                                            <p className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                                                {tx.agent_transaction_type?.code || "-"}
                                            </p>
                                        </td>
                                        <td className="p-4 text-sm text-slate-700 dark:text-slate-300">
                                            {tx.bank_account ? (
                                                <>
                                                    <p className="font-semibold">{tx.bank_account.bank_name}</p>
                                                    <p className="text-xs text-slate-400">{tx.bank_account.account_number}</p>
                                                </>
                                            ) : (
                                                <span className="text-slate-400 text-xs">Cash Only</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-sm font-bold text-slate-800 dark:text-slate-200">
                                            {formatRp(tx.nominal)}
                                        </td>
                                        <td className="p-4 text-sm font-medium text-slate-700 dark:text-slate-300">
                                            <p>{formatRp(tx.admin_fee_customer)}</p>
                                            <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-500 uppercase font-bold">
                                                {tx.admin_fee_payment_method}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                            {formatRp(tx.net_profit)}
                                        </td>
                                        <td className="p-4 text-sm">
                                            <select
                                                value={tx.status}
                                                onChange={(e) => handleStatusChange(tx, e.target.value)}
                                                className={`px-2.5 py-1 rounded-lg text-xs font-bold focus:outline-none border-0 ring-1 ring-inset ${
                                                    tx.status === "success"
                                                        ? "bg-success-50 text-success-700 ring-success-600/10 dark:bg-success-950/20 dark:text-success-400"
                                                        : tx.status === "pending"
                                                        ? "bg-amber-50 text-amber-700 ring-amber-600/10 dark:bg-amber-950/20 dark:text-amber-400"
                                                        : "bg-danger-50 text-danger-700 ring-danger-600/10 dark:bg-danger-950/20 dark:text-danger-400"
                                                }`}
                                            >
                                                <option value="success">Berhasil</option>
                                                <option value="pending">Pending</option>
                                                <option value="failed">Gagal</option>
                                            </select>
                                        </td>
                                        <td className="p-4 text-sm text-right flex items-center justify-end gap-1.5">
                                            <a
                                                href={route("agent-transactions.print", tx.id)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                                title="Cetak Struk"
                                            >
                                                <IconPrinter size={18} />
                                            </a>
                                            {canEdit && (
                                                <button
                                                    onClick={() => openEditModal(tx)}
                                                    className="p-1.5 rounded-lg text-warning-500 hover:bg-warning-50 dark:hover:bg-warning-950/20 transition-colors"
                                                    title="Edit Transaksi"
                                                >
                                                    <IconPencil size={18} />
                                                </button>
                                            )}
                                            {canDelete && (
                                                <button
                                                    onClick={() => handleDelete(tx)}
                                                    className="p-1.5 rounded-lg text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-950/20 transition-colors"
                                                    title="Hapus Catatan"
                                                >
                                                    <IconTrash size={18} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="9" className="p-8 text-center text-slate-500 dark:text-slate-400">
                                        Tidak ada catatan transaksi agen yang sesuai.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {transactions.links && (
                    <div className="p-4 border-t border-slate-100 dark:border-slate-800">
                        <Pagination links={transactions.links} />
                    </div>
                )}
            </div>

            {/* Modal Dialog Form */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                                {editingTx ? "Edit Transaksi Agen" : "Catat Transaksi Agen"}
                            </h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                <IconX size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
                            {/* Transaction Type */}
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Jenis Layanan / Tipe Transaksi</label>
                                <select
                                    value={data.agent_transaction_type_id}
                                    onChange={(e) => handleTypeChange(e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    required
                                >
                                    <option value="">-- Pilih Tipe Transaksi --</option>
                                    {transactionTypes.map((type) => (
                                        <option key={type.id} value={type.id}>
                                            [{type.code}] {type.name} ({type.type === 'debet' ? 'Debet/Masuk' : 'Kredit/Keluar'})
                                        </option>
                                    ))}
                                </select>
                                {errors.agent_transaction_type_id && <p className="text-xs text-danger-500 mt-1">{errors.agent_transaction_type_id}</p>}
                            </div>

                            {/* Bank Account / EDC */}
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Bank / EDC Agen</label>
                                <select
                                    value={data.bank_account_id}
                                    onChange={(e) => setData("bank_account_id", e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                >
                                    <option value="">-- Tanpa Bank (Kas Fisik) --</option>
                                    {bankAccounts.map((bank) => (
                                        <option key={bank.id} value={bank.id}>
                                            {bank.bank_name} - {bank.account_name} ({bank.account_number})
                                        </option>
                                    ))}
                                </select>
                                {errors.bank_account_id && <p className="text-xs text-danger-500 mt-1">{errors.bank_account_id}</p>}
                            </div>

                            {/* Nominal & Reference Number */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Nominal Transaksi (Rp)</label>
                                    <input
                                        type="number"
                                        value={data.nominal}
                                        onChange={(e) => setData("nominal", parseInt(e.target.value) || 0)}
                                        placeholder="Misal: 1000000"
                                        className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        min="0"
                                        required
                                    />
                                    {errors.nominal && <p className="text-xs text-danger-500 mt-1">{errors.nominal}</p>}
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">No. Referensi / Trace / Struk</label>
                                    <input
                                        type="text"
                                        value={data.reference_number}
                                        onChange={(e) => setData("reference_number", e.target.value)}
                                        placeholder="Opsional, no referensi EDC..."
                                        className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    />
                                    {errors.reference_number && <p className="text-xs text-danger-500 mt-1">{errors.reference_number}</p>}
                                </div>
                            </div>

                            {/* Fees */}
                            <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/20 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Admin Pelanggan (Loket)</label>
                                    <input
                                        type="number"
                                        value={data.admin_fee_customer}
                                        onChange={(e) => setData("admin_fee_customer", parseInt(e.target.value) || 0)}
                                        placeholder="0"
                                        className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none"
                                        min="0"
                                        required
                                    />
                                    {errors.admin_fee_customer && <p className="text-xs text-danger-500 mt-1">{errors.admin_fee_customer}</p>}
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Admin Bank (EDC)</label>
                                    <input
                                        type="number"
                                        value={data.admin_fee_bank}
                                        onChange={(e) => setData("admin_fee_bank", parseInt(e.target.value) || 0)}
                                        placeholder="0"
                                        className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none"
                                        min="0"
                                        required
                                    />
                                    {errors.admin_fee_bank && <p className="text-xs text-danger-500 mt-1">{errors.admin_fee_bank}</p>}
                                </div>
                            </div>

                            {/* Payment Method for Admin Fee & Status */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Biaya Admin Dibayar</label>
                                    <select
                                        value={data.admin_fee_payment_method}
                                        onChange={(e) => setData("admin_fee_payment_method", e.target.value)}
                                        className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        required
                                    >
                                        <option value="cash">Tunai (Masuk Laci Kas)</option>
                                        <option value="bank">Non-Tunai / Bank (Saldo Bank)</option>
                                    </select>
                                    {errors.admin_fee_payment_method && <p className="text-xs text-danger-500 mt-1">{errors.admin_fee_payment_method}</p>}
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Status Transaksi</label>
                                    <select
                                        value={data.status}
                                        onChange={(e) => setData("status", e.target.value)}
                                        className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        required
                                    >
                                        <option value="success">Berhasil (Sukses)</option>
                                        <option value="pending">Pending (Menggantung)</option>
                                        <option value="failed">Gagal / Dibatalkan</option>
                                    </select>
                                    {errors.status && <p className="text-xs text-danger-500 mt-1">{errors.status}</p>}
                                </div>
                            </div>

                            {/* Customer Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Nama Pelanggan (Cst)</label>
                                    <input
                                        type="text"
                                        value={data.customer_name}
                                        onChange={(e) => setData("customer_name", e.target.value)}
                                        placeholder="Nama pelanggan..."
                                        className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    />
                                    {errors.customer_name && <p className="text-xs text-danger-500 mt-1">{errors.customer_name}</p>}
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">No. Telp Pelanggan</label>
                                    <input
                                        type="text"
                                        value={data.customer_phone}
                                        onChange={(e) => setData("customer_phone", e.target.value)}
                                        placeholder="Nomor HP..."
                                        className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    />
                                    {errors.customer_phone && <p className="text-xs text-danger-500 mt-1">{errors.customer_phone}</p>}
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Catatan Tambahan</label>
                                <textarea
                                    value={data.notes}
                                    onChange={(e) => setData("notes", e.target.value)}
                                    placeholder="Memo/Catatan detail transaksi..."
                                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    rows="2"
                                />
                                {errors.notes && <p className="text-xs text-danger-500 mt-1">{errors.notes}</p>}
                            </div>

                            {/* Submit buttons */}
                            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-semibold transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
                                >
                                    <IconDeviceFloppy size={18} />
                                    {processing ? "Menyimpan..." : "Simpan"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}

Index.layout = (page) => <DashboardLayout children={page} />;
