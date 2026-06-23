import React, { useState, useEffect } from "react";
import { Head, usePage, useForm, router } from "@inertiajs/react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import {
    IconCirclePlus,
    IconPencil,
    IconTrash,
    IconPlus,
    IconSearch,
    IconX,
    IconTable
} from "@tabler/icons-react";
import toast from "react-hot-toast";
import { useAuthorization } from "@/Utils/authorization";
import Pagination from "@/Components/Dashboard/Pagination";

export default function Index({ agentTransactionTypes = {}, filters = {} }) {
    const { flash } = usePage().props;
    const { can } = useAuthorization();
    const canCreate = can("agent-transaction-types-create");
    const canEdit = can("agent-transaction-types-edit");
    const canDelete = can("agent-transaction-types-delete");

    const [search, setSearch] = useState(filters.search || "");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingType, setEditingType] = useState(null);

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        code: "",
        name: "",
        type: "debet",
        description: "",
        default_admin_fee_customer: 0,
        default_admin_fee_bank: 0,
        is_active: true,
    });

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash]);

    // Handle search input change
    const handleSearch = (e) => {
        e.preventDefault();
        router.get(
            route("agent-transaction-types.index"),
            { search },
            { preserveState: true, replace: true }
        );
    };

    // Open Modal for Add
    const openAddModal = () => {
        clearErrors();
        reset();
        setEditingType(null);
        setIsModalOpen(true);
    };

    // Open Modal for Edit
    const openEditModal = (type) => {
        clearErrors();
        setEditingType(type);
        setData({
            code: type.code,
            name: type.name,
            type: type.type,
            description: type.description || "",
            default_admin_fee_customer: type.default_admin_fee_customer || 0,
            default_admin_fee_bank: type.default_admin_fee_bank || 0,
            is_active: type.is_active,
        });
        setIsModalOpen(true);
    };

    // Handle form submit
    const handleSubmit = (e) => {
        e.preventDefault();
        if (editingType) {
            put(route("agent-transaction-types.update", editingType.id), {
                onSuccess: () => {
                    setIsModalOpen(false);
                    reset();
                },
            });
        } else {
            post(route("agent-transaction-types.store"), {
                onSuccess: () => {
                    setIsModalOpen(false);
                    reset();
                },
            });
        }
    };

    // Handle Delete
    const handleDelete = (type) => {
        if (confirm(`Hapus tipe transaksi ${type.name}?`)) {
            router.delete(route("agent-transaction-types.destroy", type.id));
        }
    };

    return (
        <>
            <Head title="Tipe Transaksi Agen" />

            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <IconTable size={28} className="text-primary-500" />
                        Tipe Transaksi Agen
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Daftar jenis transaksi agen perbankan (Setor, Tarik, Transfer, Tagihan, dll.)
                    </p>
                </div>
                {canCreate && (
                    <button
                        onClick={openAddModal}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold transition-all shadow-lg shadow-primary-500/20"
                    >
                        <IconPlus size={18} />
                        Tambah Tipe
                    </button>
                )}
            </div>

            {/* Filter Toolbar */}
            <div className="mb-6 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
                <form onSubmit={handleSearch} className="w-full md:w-80 relative flex gap-2">
                    <div className="relative flex-1">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                            <IconSearch size={18} />
                        </span>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Cari kode atau nama tipe..."
                            className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                    </div>
                    <button
                        type="submit"
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium transition-colors"
                    >
                        Cari
                    </button>
                </form>
            </div>

            {/* List Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Kode</th>
                                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Nama Transaksi</th>
                                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Tipe (Akun)</th>
                                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Default Admin Customer</th>
                                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Default Admin Bank</th>
                                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</th>
                                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Keterangan</th>
                                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {agentTransactionTypes.data && agentTransactionTypes.data.length > 0 ? (
                                agentTransactionTypes.data.map((type) => (
                                    <tr key={type.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                                        <td className="p-4 text-sm font-mono font-bold text-slate-700 dark:text-slate-300">{type.code}</td>
                                        <td className="p-4 text-sm font-semibold text-slate-800 dark:text-slate-200">{type.name}</td>
                                        <td className="p-4 text-sm">
                                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase ${
                                                type.type === 'debet'
                                                    ? 'bg-success-50 text-success-700 dark:bg-success-950/20 dark:text-success-400'
                                                    : 'bg-danger-50 text-danger-700 dark:bg-danger-950/20 dark:text-danger-400'
                                            }`}>
                                                {type.type}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm font-medium text-slate-800 dark:text-slate-200">
                                            Rp {new Intl.NumberFormat("id-ID").format(type.default_admin_fee_customer)}
                                        </td>
                                        <td className="p-4 text-sm font-medium text-slate-800 dark:text-slate-200">
                                            Rp {new Intl.NumberFormat("id-ID").format(type.default_admin_fee_bank)}
                                        </td>
                                        <td className="p-4 text-sm">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                                type.is_active
                                                    ? 'bg-success-100 text-success-800 dark:bg-success-900/30 dark:text-success-400'
                                                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                                            }`}>
                                                {type.is_active ? 'Aktif' : 'Nonaktif'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm text-slate-500 dark:text-slate-400 truncate max-w-[200px]" title={type.description}>
                                            {type.description || "-"}
                                        </td>
                                        <td className="p-4 text-sm text-right flex items-center justify-end gap-2">
                                            {canEdit && (
                                                <button
                                                    onClick={() => openEditModal(type)}
                                                    className="p-1.5 rounded-lg text-warning-500 hover:bg-warning-50 dark:hover:bg-warning-950/20 transition-colors"
                                                    title="Edit Tipe"
                                                >
                                                    <IconPencil size={18} />
                                                </button>
                                            )}
                                            {canDelete && (
                                                <button
                                                    onClick={() => handleDelete(type)}
                                                    className="p-1.5 rounded-lg text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-950/20 transition-colors"
                                                    title="Hapus Tipe"
                                                >
                                                    <IconTrash size={18} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="8" className="p-8 text-center text-slate-500 dark:text-slate-400">
                                        Tidak ada data tipe transaksi agen.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {agentTransactionTypes.links && (
                    <div className="p-4 border-t border-slate-100 dark:border-slate-800">
                        <Pagination links={agentTransactionTypes.links} />
                    </div>
                )}
            </div>

            {/* Modal Dialog */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                                {editingType ? "Edit Tipe Transaksi" : "Tambah Tipe Transaksi"}
                            </h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                <IconX size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-5 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Kode Tipe</label>
                                    <input
                                        type="text"
                                        value={data.code}
                                        onChange={(e) => setData("code", e.target.value)}
                                        placeholder="Misal: JTA0001"
                                        className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        required
                                    />
                                    {errors.code && <p className="text-xs text-danger-500 mt-1">{errors.code}</p>}
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Nama Transaksi</label>
                                    <input
                                        type="text"
                                        value={data.name}
                                        onChange={(e) => setData("name", e.target.value)}
                                        placeholder="Misal: Transfer BRI"
                                        className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        required
                                    />
                                    {errors.name && <p className="text-xs text-danger-500 mt-1">{errors.name}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Tipe Aliran Uang</label>
                                    <select
                                        value={data.type}
                                        onChange={(e) => setData("type", e.target.value)}
                                        className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        required
                                    >
                                        <option value="debet">Debet (Uang Masuk ke Laci)</option>
                                        <option value="kredit">Kredit (Uang Keluar dari Laci)</option>
                                    </select>
                                    {errors.type && <p className="text-xs text-danger-500 mt-1">{errors.type}</p>}
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Status</label>
                                    <select
                                        value={data.is_active ? "1" : "0"}
                                        onChange={(e) => setData("is_active", e.target.value === "1")}
                                        className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        required
                                    >
                                        <option value="1">Aktif</option>
                                        <option value="0">Nonaktif</option>
                                    </select>
                                    {errors.is_active && <p className="text-xs text-danger-500 mt-1">{errors.is_active}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Biaya Admin Pelanggan</label>
                                    <input
                                        type="number"
                                        value={data.default_admin_fee_customer}
                                        onChange={(e) => setData("default_admin_fee_customer", parseInt(e.target.value) || 0)}
                                        placeholder="0"
                                        className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        min="0"
                                        required
                                    />
                                    {errors.default_admin_fee_customer && <p className="text-xs text-danger-500 mt-1">{errors.default_admin_fee_customer}</p>}
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Biaya Admin Bank / EDC</label>
                                    <input
                                        type="number"
                                        value={data.default_admin_fee_bank}
                                        onChange={(e) => setData("default_admin_fee_bank", parseInt(e.target.value) || 0)}
                                        placeholder="0"
                                        className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        min="0"
                                        required
                                    />
                                    {errors.default_admin_fee_bank && <p className="text-xs text-danger-500 mt-1">{errors.default_admin_fee_bank}</p>}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Keterangan / Memo</label>
                                <textarea
                                    value={data.description}
                                    onChange={(e) => setData("description", e.target.value)}
                                    placeholder="Opsional, keterangan tambahan..."
                                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    rows="3"
                                />
                                {errors.description && <p className="text-xs text-danger-500 mt-1">{errors.description}</p>}
                            </div>

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
                                    className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                                >
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
