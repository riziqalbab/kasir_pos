import React, { useState } from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, useForm, router, Link } from "@inertiajs/react";
import Button from "@/Components/Dashboard/Button";
import Search from "@/Components/Dashboard/Search";
import Pagination from "@/Components/Dashboard/Pagination";
import { useAuthorization } from "@/Utils/authorization";
import {
    IconScale,
    IconPlus,
    IconTrash,
    IconDatabaseOff,
    IconArrowLeft,
} from "@tabler/icons-react";
import toast from "react-hot-toast";

export default function Index({ units }) {
    const { can } = useAuthorization();
    const canCreateUnits = can("units-create");
    const canDeleteUnits = can("units-delete");

    const { data, setData, post, processing, reset, errors } = useForm({
        name: "",
    });

    const submit = (e) => {
        e.preventDefault();
        post(route("units.store"), {
            onSuccess: () => {
                toast.success("Satuan berhasil ditambahkan");
                reset("name");
            },
            onError: (err) => {
                if (err.name) {
                    toast.error(err.name);
                } else {
                    toast.error("Gagal menambahkan satuan");
                }
            },
        });
    };

    const handleDelete = (id) => {
        if (confirm("Apakah Anda yakin ingin menghapus satuan ini?")) {
            router.delete(route("units.destroy", id), {
                onSuccess: () => toast.success("Satuan berhasil dihapus"),
                onError: () => toast.error("Gagal menghapus satuan"),
            });
        }
    };

    return (
        <>
            <Head title="Data Satuan" />

            {/* Header */}
            <div className="mb-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <IconScale className="text-primary-500" size={28} />
                            Data Satuan
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">
                            Kelola daftar satuan ukuran yang digunakan untuk produk Anda.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left/Middle Column - List of Units */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Search & Actions */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="w-full sm:w-80">
                            <Search url={route("units.index")} placeholder="Cari satuan..." />
                        </div>
                        <div className="text-xs text-slate-400 dark:text-slate-500">
                            Total: {units.total} satuan
                        </div>
                    </div>

                    {/* Table / List */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                        {units.data.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-850/50">
                                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                                No
                                            </th>
                                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                                Nama Satuan
                                            </th>
                                            {(canDeleteUnits) && (
                                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 text-right">
                                                    Aksi
                                                </th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                                        {units.data.map((unit, index) => (
                                            <tr
                                                key={unit.id}
                                                className="hover:bg-slate-50/50 dark:hover:bg-slate-850/30 transition-colors"
                                            >
                                                <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                                                    {(units.current_page - 1) * units.per_page + index + 1}
                                                </td>
                                                <td className="px-6 py-4 text-sm font-semibold text-slate-800 dark:text-slate-200">
                                                    {unit.name}
                                                </td>
                                                {canDeleteUnits && (
                                                    <td className="px-6 py-4 text-sm text-right">
                                                        <button
                                                            onClick={() => handleDelete(unit.id)}
                                                            className="p-1.5 rounded-lg text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-950/30 hover:text-danger-700 transition-colors"
                                                            title="Hapus Satuan"
                                                        >
                                                            <IconTrash size={18} />
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center p-12 text-center">
                                <div className="w-16 h-16 rounded-2xl bg-slate-550/10 dark:bg-slate-800 flex items-center justify-center mb-4">
                                    <IconDatabaseOff size={32} className="text-slate-400 dark:text-slate-650" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-700 dark:text-slate-350">
                                    Tidak Ada Data Satuan
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-500 max-w-sm mt-1">
                                    Mungkin data tidak ditemukan atau Anda belum memasukkan satuan kustom.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Pagination */}
                    {units.data.length > 0 && (
                        <div className="mt-4">
                            <Pagination links={units.links} />
                        </div>
                    )}
                </div>

                {/* Right Column - Add Form */}
                <div className="lg:col-span-1">
                    {canCreateUnits ? (
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm sticky top-6">
                            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                                <IconPlus size={18} className="text-primary-500" />
                                Tambah Satuan Baru
                            </h3>
                            <form onSubmit={submit} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                                        Nama Satuan
                                    </label>
                                    <input
                                        type="text"
                                        value={data.name}
                                        onChange={(e) => setData("name", e.target.value)}
                                        placeholder="Contoh: box, dus, pcs, kg"
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                                        required
                                    />
                                    {errors.name && (
                                        <p className="text-xs text-danger-600 dark:text-danger-400 mt-1 font-medium">
                                            {errors.name}
                                        </p>
                                    )}
                                </div>

                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-medium transition-colors disabled:opacity-50"
                                >
                                    <IconPlus size={18} />
                                    {processing ? "Menyimpan..." : "Tambah Satuan"}
                                </button>
                            </form>
                        </div>
                    ) : (
                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 text-center text-slate-500 dark:text-slate-400 text-sm">
                            Anda tidak memiliki izin untuk menambah satuan baru.
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

Index.layout = (page) => <DashboardLayout children={page} />;
