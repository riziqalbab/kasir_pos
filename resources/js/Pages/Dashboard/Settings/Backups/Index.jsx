import React, { useState } from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, router, useForm } from "@inertiajs/react";
import Modal from "@/Components/Dashboard/Modal";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import {
    IconDatabase,
    IconDownload,
    IconTrash,
    IconRestore,
    IconFileTypeZip,
    IconFileTypeSql,
    IconAlertTriangle,
    IconUpload,
    IconShieldCheck,
    IconLock,
} from "@tabler/icons-react";

export default function BackupIndex({ backups = [] }) {
    const [isCreatingDb, setIsCreatingDb] = useState(false);
    const [isCreatingFull, setIsCreatingFull] = useState(false);

    // Restore modal states
    const [showRestoreModal, setShowRestoreModal] = useState(false);
    const [selectedFilename, setSelectedFilename] = useState("");
    const [uploadedFile, setUploadedFile] = useState(null);

    const { data, setData, post, processing, reset, errors, clearErrors } = useForm({
        password: "",
        filename: "",
        backup_file: null,
    });

    const handleCreateBackup = (type) => {
        if (type === "full") {
            setIsCreatingFull(true);
        } else {
            setIsCreatingDb(true);
        }

        router.post(
            route("settings.backups.store"),
            { type },
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success("Backup berhasil dibuat");
                },
                onError: (err) => {
                    toast.error(err.message || "Gagal membuat backup");
                },
                onFinish: () => {
                    setIsCreatingDb(false);
                    setIsCreatingFull(false);
                },
            }
        );
    };

    const handleDelete = (filename) => {
        Swal.fire({
            title: "Hapus Backup?",
            text: `File "${filename}" akan dihapus secara permanen dari server.`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#ef4444",
            cancelButtonColor: "#6b7280",
            confirmButtonText: "Ya, Hapus!",
            cancelButtonText: "Batal",
        }).then((result) => {
            if (result.isConfirmed) {
                router.delete(route("settings.backups.destroy", filename), {
                    preserveScroll: true,
                    onSuccess: () => toast.success("File backup terhapus"),
                    onError: () => toast.error("Gagal menghapus file backup"),
                });
            }
        });
    };

    const openRestoreModal = (filename = null) => {
        reset();
        clearErrors();
        setSelectedFilename(filename || "");
        setUploadedFile(null);
        setData({
            password: "",
            filename: filename || "",
            backup_file: null,
        });
        setShowRestoreModal(true);
    };

    const handleRestoreSubmit = (e) => {
        e.preventDefault();

        if (!data.filename && !data.backup_file) {
            toast.error("Pilih file backup atau upload file baru untuk restore.");
            return;
        }

        if (!data.password) {
            toast.error("Masukkan password Anda untuk konfirmasi.");
            return;
        }

        post(route("settings.backups.restore"), {
            preserveScroll: true,
            onSuccess: () => {
                setShowRestoreModal(false);
                reset();
                toast.success("Data berhasil di-restore kembali!");
            },
            onError: (err) => {
                toast.error(err.password || err.message || "Gagal melakukan restore data.");
            },
        });
    };

    return (
        <DashboardLayout>
            <Head title="Backup & Restore Data" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <IconDatabase className="text-primary-600 dark:text-primary-400" size={28} />
                            Backup & Restore Data
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Kelola cadangan database dan restore data sistem untuk keamanan data bisnis Anda.
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => handleCreateBackup("database")}
                            disabled={isCreatingDb || isCreatingFull}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
                        >
                            <IconFileTypeSql size={18} className="text-sky-600 dark:text-sky-400" />
                            <span>{isCreatingDb ? "Memproses SQL..." : "Backup DB (.sql)"}</span>
                        </button>
                        
                        <button
                            type="button"
                            onClick={() => handleCreateBackup("full")}
                            disabled={isCreatingDb || isCreatingFull}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm bg-primary-600 hover:bg-primary-700 text-white shadow-lg shadow-primary-600/30 transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
                        >
                            <IconFileTypeZip size={18} />
                            <span>{isCreatingFull ? "Memproses ZIP..." : "Full Backup (.zip)"}</span>
                        </button>
                    </div>
                </div>

                {/* Info Alert Box */}
                <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl p-4 flex items-start gap-3">
                    <IconAlertTriangle size={24} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="text-xs md:text-sm text-amber-900 dark:text-amber-200 space-y-1">
                        <p className="font-semibold">Perhatian Keamanan & Prosedur Restore:</p>
                        <p>
                            • <strong>Backup Database (.sql)</strong> hanya memuat struktur & data database (proses cepat & ukuran kecil).
                        </p>
                        <p>
                            • <strong>Full Backup (.zip)</strong> memuat database SQL sekaligus seluruh file gambar produk/media toko.
                        </p>
                        <p>
                            • Proses <strong>Restore</strong> akan menimpa data database saat ini. Sistem secara otomatis membuat <em>safety auto-backup</em> dari kondisi database terakhir sebelum proses restore dijalankan.
                        </p>
                    </div>
                </div>

                {/* Quick Restore from External File Card */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-xl bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
                                <IconUpload size={24} />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                    Restore Data Dari File Eksternal
                                </h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Punya file backup <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-slate-700 dark:text-slate-300">.sql</code> atau <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-slate-700 dark:text-slate-300">.zip</code> di komputer Anda? Upload dan jalankan restore langsung.
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => openRestoreModal()}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700 transition-all duration-200 active:scale-[0.98]"
                        >
                            <IconRestore size={18} />
                            <span>Upload & Restore Backup</span>
                        </button>
                    </div>
                </div>

                {/* Table Backup History */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                    <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <IconShieldCheck size={20} className="text-emerald-500" />
                            Daftar File Backup Server ({backups.length})
                        </h2>
                    </div>

                    {backups.length === 0 ? (
                        <div className="p-12 text-center">
                            <IconDatabase size={48} className="mx-auto text-slate-300 dark:text-slate-700 mb-3" />
                            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                Belum ada file backup tersimpan di server.
                            </p>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                                Klik tombol <strong>Backup DB (.sql)</strong> atau <strong>Full Backup (.zip)</strong> di kanan atas untuk membuat file backup pertama Anda.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs md:text-sm text-slate-600 dark:text-slate-300">
                                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 font-semibold uppercase text-[11px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                                    <tr>
                                        <th className="px-6 py-3.5">Nama File</th>
                                        <th className="px-6 py-3.5">Tipe Backup</th>
                                        <th className="px-6 py-3.5">Ukuran File</th>
                                        <th className="px-6 py-3.5">Tanggal Dibuat</th>
                                        <th className="px-6 py-3.5 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                    {backups.map((backup, idx) => (
                                        <tr
                                            key={idx}
                                            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                                        >
                                            <td className="px-6 py-4 font-mono font-medium text-slate-900 dark:text-white flex items-center gap-2">
                                                {backup.extension === "zip" ? (
                                                    <IconFileTypeZip size={20} className="text-amber-500 shrink-0" />
                                                ) : (
                                                    <IconFileTypeSql size={20} className="text-sky-500 shrink-0" />
                                                )}
                                                <span className="truncate max-w-xs">{backup.filename}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span
                                                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                                                        backup.extension === "zip"
                                                            ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                                                            : "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300"
                                                    }`}
                                                >
                                                    {backup.type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-mono text-slate-500 dark:text-slate-400">
                                                {backup.size}
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                                                {backup.created_at}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <a
                                                        href={route("settings.backups.download", backup.filename)}
                                                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                                        title="Unduh File"
                                                    >
                                                        <IconDownload size={16} />
                                                    </a>
                                                    <button
                                                        type="button"
                                                        onClick={() => openRestoreModal(backup.filename)}
                                                        className="p-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                                                        title="Restore dari File Ini"
                                                    >
                                                        <IconRestore size={16} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDelete(backup.filename)}
                                                        className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-800/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                                        title="Hapus File"
                                                    >
                                                        <IconTrash size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Restore Confirmation Modal */}
            <Modal
                show={showRestoreModal}
                onClose={() => setShowRestoreModal(false)}
                maxWidth="md"
            >
                <div className="p-6 space-y-5">
                    <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
                        <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                            <IconRestore size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                Konfirmasi Restore Data
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Verifikasi keamanan & sumber file restore database
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleRestoreSubmit} className="space-y-4">
                        {/* Source Option */}
                        {selectedFilename ? (
                            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl">
                                <span className="block text-xs text-slate-500 mb-1">File Restore Terpilih:</span>
                                <span className="font-mono text-sm font-semibold text-slate-900 dark:text-white">
                                    {selectedFilename}
                                </span>
                            </div>
                        ) : (
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                    Upload File Backup (.sql atau .zip)
                                </label>
                                <input
                                    type="file"
                                    accept=".sql,.zip"
                                    onChange={(e) => {
                                        const file = e.target.files[0];
                                        setUploadedFile(file);
                                        setData("backup_file", file);
                                    }}
                                    className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 dark:file:bg-primary-950 dark:file:text-primary-300 border border-slate-200 dark:border-slate-700 rounded-xl p-1"
                                />
                            </div>
                        )}

                        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-xl text-xs text-amber-800 dark:text-amber-300 space-y-1">
                            <p className="font-semibold flex items-center gap-1">
                                <IconAlertTriangle size={16} />
                                Peringatan Restore:
                            </p>
                            <p>Proses ini akan memperbarui tabel database sesuai isi file backup. Sistem akan membuat <em>auto-backup</em> data saat ini secara otomatis.</p>
                        </div>

                        {/* Password Input */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                                <IconLock size={14} />
                                Konfirmasi Password Pengguna:
                            </label>
                            <input
                                type="password"
                                placeholder="Masukkan password login Anda"
                                value={data.password}
                                onChange={(e) => setData("password", e.target.value)}
                                required
                                className="w-full text-sm rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-primary-500 focus:border-primary-500"
                            />
                            {errors.password && (
                                <p className="text-xs text-rose-500 mt-1">{errors.password}</p>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                            <button
                                type="button"
                                onClick={() => setShowRestoreModal(false)}
                                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 transition-all"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                disabled={processing}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/30 transition-all disabled:opacity-50"
                            >
                                <IconRestore size={16} />
                                <span>{processing ? "Proses Restore..." : "Jalankan Restore"}</span>
                            </button>
                        </div>
                    </form>
                </div>
            </Modal>
        </DashboardLayout>
    );
}
