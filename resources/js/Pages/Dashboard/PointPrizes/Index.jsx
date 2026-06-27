import React, { useState, useEffect } from "react";
import { Head, usePage, useForm, router } from "@inertiajs/react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import {
    IconGift,
    IconPencil,
    IconTrash,
    IconPlus,
    IconSearch,
    IconX,
    IconDatabaseOff,
} from "@tabler/icons-react";
import toast from "react-hot-toast";
import { useAuthorization } from "@/Utils/authorization";
import Pagination from "@/Components/Dashboard/Pagination";
import InputSelect from "@/Components/Dashboard/InputSelect";

export default function Index({ pointPrizes = {}, products = [], filters = {} }) {
    const { flash } = usePage().props;
    const { can } = useAuthorization();
    const canCreate = can("point-prizes-create");
    const canEdit = can("point-prizes-edit");
    const canDelete = can("point-prizes-delete");

    const [search, setSearch] = useState(filters.search || "");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPrize, setEditingPrize] = useState(null);

    const formattedProducts = React.useMemo(() => {
        return products.map(p => ({
            ...p,
            display_name: `${p.title} (${p.barcode || p.sku || "No Barcode"}) - Stok: ${p.stock}`
        }));
    }, [products]);

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        product_id: "",
        points_required: "",
    });

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash]);

    // Handle search input change
    const handleSearch = (e) => {
        e.preventDefault();
        router.get(
            route("point-prizes.index"),
            { search },
            { preserveState: true, replace: true }
        );
    };

    // Open Modal for Add
    const openAddModal = () => {
        clearErrors();
        reset();
        setEditingPrize(null);
        setIsModalOpen(true);
    };

    // Open Modal for Edit
    const openEditModal = (prize) => {
        clearErrors();
        setEditingPrize(prize);
        setData({
            product_id: prize.product_id || "",
            points_required: prize.points_required || "",
        });
        setIsModalOpen(true);
    };

    // Handle form submit
    const handleSubmit = (e) => {
        e.preventDefault();
        if (editingPrize) {
            put(route("point-prizes.update", editingPrize.id), {
                onSuccess: () => {
                    setIsModalOpen(false);
                    reset();
                },
            });
        } else {
            post(route("point-prizes.store"), {
                onSuccess: () => {
                    setIsModalOpen(false);
                    reset();
                },
            });
        }
    };

    // Handle Delete
    const handleDelete = (prize) => {
        if (confirm(`Hapus hadiah poin '${prize.product?.title}'?`)) {
            router.delete(route("point-prizes.destroy", prize.id));
        }
    };

    return (
        <>
            <Head title="Hadiah Poin" />

            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <IconGift size={28} className="text-primary-500" />
                        Master Hadiah Poin
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Kelola daftar hadiah penukaran poin yang diambil dari persediaan produk yang sudah ada.
                    </p>
                </div>
                {canCreate && (
                    <button
                        onClick={openAddModal}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-medium text-sm transition-colors shadow-sm"
                    >
                        <IconPlus size={18} />
                        Tambah Hadiah
                    </button>
                )}
            </div>

            {/* List and Search Panel */}
            <div className="space-y-4">
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <form onSubmit={handleSearch} className="w-full sm:w-80 relative">
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Cari kode atau nama produk..."
                            className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-955 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                        />
                        <button type="submit" className="absolute left-3 top-2.5 text-slate-400">
                            <IconSearch size={18} />
                        </button>
                    </form>
                    <div className="text-xs text-slate-400 dark:text-slate-500">
                        Total: {pointPrizes.total || 0} hadiah
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                    {pointPrizes.data && pointPrizes.data.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">No</th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Barcode / SKU</th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Nama Produk</th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Jumlah POIN</th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Stok Toko</th>
                                        {(canEdit || canDelete) && (
                                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 text-right">Aksi</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {pointPrizes.data.map((prize, idx) => (
                                        <tr key={prize.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors">
                                            <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                                                {(pointPrizes.current_page - 1) * pointPrizes.per_page + idx + 1}
                                            </td>
                                            <td className="px-6 py-4 text-sm font-mono font-semibold text-slate-700 dark:text-slate-300">
                                                {prize.product?.barcode || prize.product?.sku || "-"}
                                            </td>
                                            <td className="px-6 py-4 text-sm font-semibold text-slate-850 dark:text-white">
                                                {prize.product?.title || "Produk Terhapus"}
                                            </td>
                                            <td className="px-6 py-4 text-sm font-bold text-primary-600 dark:text-primary-400">
                                                {prize.points_required} Poin
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-800 dark:text-slate-200">
                                                <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                                                    (prize.product?.stock || 0) > 10
                                                        ? "bg-success-50 text-success-700 dark:bg-success-950/20 dark:text-success-400"
                                                        : (prize.product?.stock || 0) > 0
                                                        ? "bg-warning-50 text-warning-700 dark:bg-warning-950/20 dark:text-warning-400"
                                                        : "bg-danger-50 text-danger-700 dark:bg-danger-950/20 dark:text-danger-400"
                                                }`}>
                                                    {prize.product?.stock || 0} unit
                                                </span>
                                            </td>
                                            {(canEdit || canDelete) && (
                                                <td className="px-6 py-4 text-sm text-right space-x-2">
                                                    {canEdit && (
                                                        <button
                                                            onClick={() => openEditModal(prize)}
                                                            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                                                            title="Edit Hadiah"
                                                        >
                                                            <IconPencil size={18} />
                                                        </button>
                                                    )}
                                                    {canDelete && (
                                                        <button
                                                            onClick={() => handleDelete(prize)}
                                                            className="p-1.5 rounded-lg text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-950/30 hover:text-danger-700 transition-colors"
                                                            title="Hapus Hadiah"
                                                        >
                                                            <IconTrash size={18} />
                                                        </button>
                                                    )}
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center p-12 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 text-slate-400">
                                <IconDatabaseOff size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">Tidak Ada Hadiah</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-500 max-w-sm mt-1">
                                Belum ada hadiah poin yang ditambahkan atau tidak ada hasil pencarian yang cocok.
                            </p>
                        </div>
                    )}
                </div>

                {pointPrizes.data && pointPrizes.data.length > 0 && (
                    <div className="mt-4">
                        <Pagination links={pointPrizes.links} />
                    </div>
                )}
            </div>

            {/* Form Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden shadow-2xl animate-scale-up">
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <IconGift size={20} className="text-primary-500" />
                                {editingPrize ? "Edit Hadiah Poin" : "Tambah Hadiah Poin"}
                            </h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                <IconX size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <InputSelect
                                selected={formattedProducts.find(p => p.id === parseInt(data.product_id)) || null}
                                setSelected={(product) => setData("product_id", product ? product.id : "")}
                                data={formattedProducts}
                                displayKey="display_name"
                                searchable={true}
                                label="Pilih Produk"
                                placeholder="-- Pilih Produk Hadiah --"
                                errors={errors.product_id}
                            />

                            <div>
                                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                                    Jumlah POIN Dibutuhkan
                                </label>
                                <input
                                    type="number"
                                    value={data.points_required}
                                    onChange={(e) => setData("points_required", e.target.value)}
                                    placeholder="Contoh: 50"
                                    min="1"
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-850 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                                    required
                                />
                                {errors.points_required && (
                                    <p className="text-xs text-danger-600 dark:text-danger-400 mt-1 font-medium">{errors.points_required}</p>
                                )}
                            </div>

                            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-sm transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="px-4 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-medium text-sm transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
                                >
                                    {processing ? "Menyimpan..." : "Simpan Hadiah"}
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
