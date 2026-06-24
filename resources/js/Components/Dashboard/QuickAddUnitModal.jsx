import React, { useState } from "react";
import { useForm } from "@inertiajs/react";
import Modal from "@/Components/Dashboard/Modal";
import Input from "@/Components/Dashboard/Input";
import toast from "react-hot-toast";
import { IconScale, IconPlus } from "@tabler/icons-react";

export default function QuickAddUnitModal({ show, onClose, onSuccess }) {
    const { data, setData, post, processing, reset, errors } = useForm({
        name: "",
    });

    const submit = (e) => {
        e.preventDefault();
        
        post(route("units.store"), {
            onSuccess: () => {
                toast.success("Satuan berhasil ditambahkan");
                const addedName = data.name;
                onSuccess(addedName);
                reset("name");
                onClose();
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

    return (
        <Modal show={show} onClose={onClose} title="Tambah Satuan Baru" maxWidth="md">
            <form onSubmit={submit} className="space-y-4">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs mb-2">
                    <IconScale size={16} />
                    <span>Satuan baru akan otomatis ditambahkan ke daftar pilihan produk.</span>
                </div>
                
                <Input
                    type="text"
                    label="Nama Satuan"
                    value={data.name}
                    onChange={(e) => setData("name", e.target.value)}
                    errors={errors.name}
                    placeholder="Contoh: box, bal, kg, ltr, lusin"
                    required={true}
                />

                <div className="flex justify-end gap-2 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850 text-sm font-medium transition-colors"
                    >
                        Batal
                    </button>
                    <button
                        type="submit"
                        disabled={processing}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-medium text-sm transition-colors disabled:opacity-50"
                    >
                        <IconPlus size={16} />
                        {processing ? "Menyimpan..." : "Tambah Satuan"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
