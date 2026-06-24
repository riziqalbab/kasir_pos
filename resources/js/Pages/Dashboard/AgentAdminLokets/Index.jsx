import React, { useState, useEffect } from "react";
import { Head, usePage, useForm, router } from "@inertiajs/react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import {
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

export default function Index({ agentAdminLokets = {}, filters = {} }) {
    const { flash } = usePage().props;
    const { can } = useAuthorization();
    const canCreate = can("agent-admin-lokets-create");
    const canEdit = can("agent-admin-lokets-edit");
    const canDelete = can("agent-admin-lokets-delete");

    const [search, setSearch] = useState(filters.search || "");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingType, setEditingType] = useState(null);

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        code: "",
        amount: 0,
        description: "",
    });

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash]);

    // Handle search input change
    const handleSearch = (e) => {
        e.preventDefault();
        router.get(
            route("agent-admin-lokets.index"),
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
    const openEditModal = (loket) => {
        clearErrors();
        setEditingType(loket);
        setData({
            code: loket.code,
            amount: loket.amount || 0,
            description: loket.description || "",
        });
        setIsModalOpen(true);
    };

    // Handle form submit
    const handleSubmit = (e) => {
        e.preventDefault();
        if (editingType) {
            put(route("agent-admin-lokets.update", editingType.id), {
                onSuccess: () => {
                    setIsModalOpen(false);
                    reset();
                },
            });
        } else {
            post(route("agent-admin-lokets.store"), {
                onSuccess: () => {
                    setIsModalOpen(false);
                    reset();
                },
            });
        }
    };

    // Handle Delete
    const handleDelete = (loket) => {
        if (confirm(`Hapus admin loket ${loket.code}?`)) {
            router.delete(route("agent-admin-lokets.destroy", loket.id));
        }
    };

    return (
        <>
            <Head title="Admin Loket" />

            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <IconTable size={28} className="text-primary-500" />
                        Admin Loket
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Daftar nominal biaya admin loket/counter yang ditagihkan kepada pelanggan.
                    </p>
                </div>
                {canCreate && (
                    <button
                        onClick={openAddModal}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold transition-all shadow-lg shadow-primary-500/20"
                    >
                        <IconPlus size={18} />
                        Tambah Admin Loket
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
                            placeholder="Cari kode, nominal, atau keterangan..."
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
                                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 w-16">No</th>
                                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Kode</th>
                                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Admin Loket</th>
                                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Keterangan</th>
                                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {agentAdminLokets.data && agentAdminLokets.data.length > 0 ? (
                                agentAdminLokets.data.map((loket, index) => (
                                    <tr key={loket.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                                        <td className="p-4 text-sm text-slate-500 dark:text-slate-400">
                                            {(agentAdminLokets.current_page - 1) * agentAdminLokets.per_page + index + 1}
                                        </td>
                                        <td className="p-4 text-sm font-semibold text-slate-800 dark:text-slate-200">{loket.code}</td>
                                        <td className="p-4 text-sm font-semibold text-slate-850 dark:text-slate-200">
                                            Rp {new Intl.NumberFormat("id-ID").format(loket.amount)}
                                        </td>
                                        <td className="p-4 text-sm text-slate-500 dark:text-slate-400">
                                            {loket.description || "-"}
                                        </td>
                                        <td className="p-4 text-sm text-right flex items-center justify-end gap-2">
                                            {canEdit && (
                                                <button
                                                    onClick={() => openEditModal(loket)}
                                                    className="p-1.5 rounded-lg text-warning-500 hover:bg-warning-50 dark:hover:bg-warning-950/20 transition-colors"
                                                    title="Edit Admin Loket"
                                                >
                                                    <IconPencil size={18} />
                                                </button>
                                            )}
                                            {canDelete && (
                                                <button
                                                    onClick={() => handleDelete(loket)}
                                                    className="p-1.5 rounded-lg text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-950/20 transition-colors"
                                                    title="Hapus Admin Loket"
                                                >
                                                    <IconTrash size={18} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="p-8 text-center text-slate-500 dark:text-slate-400">
                                        Tidak ada data admin loket.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {agentAdminLokets.links && (
                    <div className="p-4 border-t border-slate-100 dark:border-slate-800">
                        <Pagination links={agentAdminLokets.links} />
                    </div>
                )}
            </div>

            {/* Modal Dialog */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                                {editingType ? "Edit Admin Loket" : "Tambah Admin Loket"}
                            </h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                <IconX size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Kode</label>
                                <input
                                    type="text"
                                    value={data.code}
                                    onChange={(e) => setData("code", e.target.value)}
                                    placeholder="Misal: Asuransi / BRIVA01"
                                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    required
                                />
                                {errors.code && <p className="text-xs text-danger-500 mt-1">{errors.code}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Admin Loket (Nominal)</label>
                                <input
                                    type="number"
                                    value={data.amount}
                                    onChange={(e) => setData("amount", parseInt(e.target.value) || 0)}
                                    placeholder="0"
                                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    min="0"
                                    required
                                />
                                {errors.amount && <p className="text-xs text-danger-500 mt-1">{errors.amount}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Keterangan</label>
                                <input
                                    type="text"
                                    value={data.description}
                                    onChange={(e) => setData("description", e.target.value)}
                                    placeholder="Opsional, misal: 0K s/d 100K"
                                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
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
