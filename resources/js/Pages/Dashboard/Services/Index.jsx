import React, { useState, useEffect } from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, useForm, router } from "@inertiajs/react";
import Button from "@/Components/Dashboard/Button";
import Search from "@/Components/Dashboard/Search";
import Pagination from "@/Components/Dashboard/Pagination";
import { useAuthorization } from "@/Utils/authorization";
import {
    IconBriefcase,
    IconPlus,
    IconTrash,
    IconEdit,
    IconDatabaseOff,
    IconScale,
    IconCoin,
} from "@tabler/icons-react";
import toast from "react-hot-toast";

const formatPrice = (value = 0) =>
    Number(value || 0).toLocaleString("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
    });

export default function Index({ services, units }) {
    const { can } = useAuthorization();
    const canCreateServices = can("services-create");
    const canEditServices = can("services-edit");
    const canDeleteServices = can("services-delete");

    const [editMode, setEditMode] = useState(false);
    const [editId, setEditId] = useState(null);

    const { data, setData, post, put, processing, reset, errors, clearErrors } = useForm({
        name: "",
        description: "",
        prices: [{ unit_id: "", price: "" }],
    });

    // Handle adding unit price row
    const addPriceRow = () => {
        setData("prices", [...data.prices, { unit_id: "", price: "" }]);
    };

    // Handle removing unit price row
    const removePriceRow = (index) => {
        const newPrices = [...data.prices];
        newPrices.splice(index, 1);
        setData("prices", newPrices);
    };

    // Handle updating price row fields
    const handlePriceChange = (index, field, value) => {
        const newPrices = [...data.prices];
        newPrices[index][field] = value;
        setData("prices", newPrices);
    };

    // Handle form submit
    const submit = (e) => {
        e.preventDefault();

        // Validate that no duplicate units are selected
        const selectedUnits = data.prices.map((p) => p.unit_id);
        const hasDuplicates = selectedUnits.some(
            (val, i) => selectedUnits.indexOf(val) !== i
        );

        if (hasDuplicates) {
            toast.error("Setiap satuan hanya boleh dipilih satu kali.");
            return;
        }

        // Validate that all rows have a selected unit and price
        const hasEmpty = data.prices.some((p) => !p.unit_id || p.price === "");
        if (hasEmpty) {
            toast.error("Semua satuan dan harga wajib diisi.");
            return;
        }

        if (editMode) {
            put(route("services.update", editId), {
                onSuccess: () => {
                    toast.success("Jasa berhasil diperbarui");
                    cancelEdit();
                },
                onError: (err) => {
                    toast.error("Gagal memperbarui jasa");
                },
            });
        } else {
            post(route("services.store"), {
                onSuccess: () => {
                    toast.success("Jasa berhasil ditambahkan");
                    resetForm();
                },
                onError: (err) => {
                    toast.error("Gagal menambahkan jasa");
                },
            });
        }
    };

    const resetForm = () => {
        reset("name", "description", "prices");
        clearErrors();
    };

    const cancelEdit = () => {
        setEditMode(false);
        setEditId(null);
        resetForm();
    };

    const startEdit = (service) => {
        setEditMode(true);
        setEditId(service.id);
        clearErrors();

        // Map existing prices
        const mappedPrices = service.service_prices.map((sp) => ({
            unit_id: sp.unit_id,
            price: sp.price,
        }));

        setData({
            name: service.name,
            description: service.description || "",
            prices: mappedPrices.length > 0 ? mappedPrices : [{ unit_id: "", price: "" }],
        });
    };

    const handleDelete = (id) => {
        if (confirm("Apakah Anda yakin ingin menghapus jasa ini?")) {
            router.delete(route("services.destroy", id), {
                onSuccess: () => toast.success("Jasa berhasil dihapus"),
                onError: () => toast.error("Gagal menghapus jasa"),
            });
        }
    };

    return (
        <>
            <Head title="Data Jasa / Layanan" />

            {/* Header */}
            <div className="mb-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <IconBriefcase className="text-primary-500" size={28} />
                            Data Jasa / Layanan
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">
                            Kelola layanan non-barang serta konfigurasi tarif per satuan unitnya.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left/Middle Column - List of Services */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Search & Actions */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="w-full sm:w-80">
                            <Search url={route("services.index")} placeholder="Cari jasa..." />
                        </div>
                        <div className="text-xs text-slate-400 dark:text-slate-500">
                            Total: {services.total} jasa
                        </div>
                    </div>

                    {/* Table / List */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                        {services.data.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-850/50">
                                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-550 w-16">
                                                No
                                            </th>
                                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-550">
                                                Nama Jasa
                                            </th>
                                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-550">
                                                Keterangan
                                            </th>
                                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-550">
                                                Tarif per Satuan
                                            </th>
                                            {(canEditServices || canDeleteServices) && (
                                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-550 text-right w-24">
                                                    Aksi
                                                </th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                                        {services.data.map((service, index) => (
                                            <tr
                                                key={service.id}
                                                className="hover:bg-slate-50/50 dark:hover:bg-slate-850/30 transition-colors"
                                            >
                                                <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                                                    {(services.current_page - 1) * services.per_page + index + 1}
                                                </td>
                                                <td className="px-6 py-4 text-sm font-semibold text-slate-850 dark:text-slate-200">
                                                    {service.name}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-550 dark:text-slate-400 max-w-xs truncate">
                                                    {service.description || "-"}
                                                </td>
                                                <td className="px-6 py-4 text-sm">
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {service.service_prices.map((sp) => (
                                                            <span
                                                                key={sp.id}
                                                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-705 dark:text-slate-300 border border-slate-200 dark:border-slate-750"
                                                            >
                                                                <IconScale size={12} className="text-slate-400" />
                                                                {sp.unit?.name}:
                                                                <span className="text-primary-600 dark:text-primary-400 font-bold ml-0.5">
                                                                    {formatPrice(sp.price)}
                                                                </span>
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                                {(canEditServices || canDeleteServices) && (
                                                    <td className="px-6 py-4 text-sm text-right flex items-center justify-end gap-1">
                                                        {canEditServices && (
                                                            <button
                                                                onClick={() => startEdit(service)}
                                                                className="p-1.5 rounded-lg text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/30 hover:text-primary-700 transition-colors"
                                                                title="Edit Jasa"
                                                            >
                                                                <IconEdit size={18} />
                                                            </button>
                                                        )}
                                                        {canDeleteServices && (
                                                            <button
                                                                onClick={() => handleDelete(service.id)}
                                                                className="p-1.5 rounded-lg text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-950/30 hover:text-danger-700 transition-colors"
                                                                title="Hapus Jasa"
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
                                <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                                    <IconDatabaseOff size={32} className="text-slate-400 dark:text-slate-600" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">
                                    Tidak Ada Data Jasa
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-500 max-w-sm mt-1">
                                    Layanan jasa masih kosong. Anda dapat menambah jasa baru menggunakan form di sebelah kanan.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Pagination */}
                    {services.data.length > 0 && (
                        <div className="mt-4">
                            <Pagination links={services.links} />
                        </div>
                    )}
                </div>

                {/* Right Column - Add/Edit Form */}
                <div className="lg:col-span-1">
                    {canCreateServices || canEditServices ? (
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm sticky top-6">
                            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-350 mb-4 flex items-center gap-2">
                                <IconPlus size={18} className="text-primary-500" />
                                {editMode ? "Edit Jasa / Layanan" : "Tambah Jasa Baru"}
                            </h3>
                            <form onSubmit={submit} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                                        Nama Jasa / Layanan
                                    </label>
                                    <input
                                        type="text"
                                        value={data.name}
                                        onChange={(e) => setData("name", e.target.value)}
                                        placeholder="Contoh: Jasa Print, Cuci Mobil"
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                                        required
                                    />
                                    {errors.name && (
                                        <p className="text-xs text-danger-600 dark:text-danger-400 mt-1 font-medium">
                                            {errors.name}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                                        Keterangan
                                    </label>
                                    <textarea
                                        value={data.description}
                                        onChange={(e) => setData("description", e.target.value)}
                                        placeholder="Masukkan deskripsi detail mengenai layanan ini"
                                        rows={3}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all resize-none"
                                    />
                                    {errors.description && (
                                        <p className="text-xs text-danger-600 dark:text-danger-400 mt-1 font-medium">
                                            {errors.description}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-1.5">
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">
                                            Konfigurasi Tarif per Satuan
                                        </label>
                                        <button
                                            type="button"
                                            onClick={addPriceRow}
                                            className="text-xs text-primary-550 hover:text-primary-650 font-bold flex items-center gap-0.5"
                                        >
                                            <IconPlus size={14} /> Add
                                        </button>
                                    </div>

                                    <div className="space-y-2">
                                        {data.prices.map((row, index) => (
                                            <div key={index} className="flex items-center gap-2">
                                                <select
                                                    value={row.unit_id}
                                                    onChange={(e) =>
                                                        handlePriceChange(
                                                            index,
                                                            "unit_id",
                                                            e.target.value
                                                        )
                                                    }
                                                    className="w-1/2 px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
                                                    required
                                                >
                                                    <option value="">Pilih Satuan</option>
                                                    {units.map((u) => (
                                                        <option key={u.id} value={u.id}>
                                                            {u.name}
                                                        </option>
                                                    ))}
                                                </select>
                                                <div className="relative w-1/2">
                                                    <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">
                                                        Rp
                                                    </div>
                                                    <input
                                                        type="number"
                                                        value={row.price}
                                                        onChange={(e) =>
                                                            handlePriceChange(
                                                                index,
                                                                "price",
                                                                e.target.value
                                                            )
                                                        }
                                                        placeholder="Harga"
                                                        className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
                                                        required
                                                    />
                                                </div>
                                                {data.prices.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removePriceRow(index)}
                                                        className="p-2 text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-950/20 rounded-xl"
                                                    >
                                                        <IconTrash size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    {errors.prices && (
                                        <p className="text-xs text-danger-600 dark:text-danger-400 mt-1 font-medium">
                                            {errors.prices}
                                        </p>
                                    )}
                                </div>

                                <div className="flex gap-2 pt-2">
                                    {editMode && (
                                        <button
                                            type="button"
                                            onClick={cancelEdit}
                                            className="w-1/2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-705 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors"
                                        >
                                            Batal
                                        </button>
                                    )}
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-medium transition-colors disabled:opacity-50 ${
                                            editMode ? "w-1/2" : "w-full"
                                        }`}
                                    >
                                        <IconCoin size={18} />
                                        {processing
                                            ? "Menyimpan..."
                                            : editMode
                                            ? "Simpan Edit"
                                            : "Tambah Jasa"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    ) : (
                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 text-center text-slate-500 dark:text-slate-400 text-sm">
                            Anda tidak memiliki izin untuk mengelola jasa / layanan.
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

Index.layout = (page) => <DashboardLayout children={page} />;
