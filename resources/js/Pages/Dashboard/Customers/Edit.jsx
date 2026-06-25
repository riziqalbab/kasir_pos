import React from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, useForm, Link } from "@inertiajs/react";
import Input from "@/Components/Dashboard/Input";
import Textarea from "@/Components/Dashboard/TextArea";
import toast from "react-hot-toast";
import { IconUsers, IconDeviceFloppy, IconArrowLeft } from "@tabler/icons-react";

export default function Edit({ customer }) {
    const { data, setData, post, processing, errors } = useForm({
        id: customer.id,
        member_code: customer.member_code || "",
        name: customer.name,
        no_telp: customer.no_telp || "",
        address: customer.address || "",
        is_loyalty_member: !!customer.is_loyalty_member,
        loyalty_points: customer.loyalty_points || 0,
        _method: "PUT",
    });

    const submit = (e) => {
        e.preventDefault();
        post(route("customers.update", customer.id), {
            onSuccess: () => toast.success("Pelanggan berhasil diperbarui"),
            onError: () => toast.error("Gagal memperbarui pelanggan"),
        });
    };

    return (
        <>
            <Head title="Edit Pelanggan" />

            <div className="mb-6">
                <Link
                    href={route("customers.index")}
                    className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-primary-600 mb-3"
                >
                    <IconArrowLeft size={16} />
                    Kembali ke Pelanggan
                </Link>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <IconUsers size={28} className="text-primary-500" />
                    Edit Pelanggan
                </h1>
                <p className="text-sm text-slate-500 mt-1">{customer.name}</p>
            </div>

            <form onSubmit={submit}>
                <div className="max-w-3xl">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                type="text"
                                label="Kode Pelanggan"
                                placeholder="Masukkan kode pelanggan/member"
                                errors={errors.member_code}
                                onChange={(e) => setData("member_code", e.target.value)}
                                value={data.member_code}
                            />
                            <Input
                                type="text"
                                label="Nama Pelanggan"
                                placeholder="Nama lengkap"
                                errors={errors.name}
                                onChange={(e) => setData("name", e.target.value)}
                                value={data.name}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                type="text"
                                label="No. WA (Opsional)"
                                placeholder="08xxxxxxxxxx"
                                errors={errors.no_telp}
                                onChange={(e) => setData("no_telp", e.target.value)}
                                value={data.no_telp}
                            />
                        </div>

                        <div className="flex items-center gap-2 py-2">
                            <input
                                type="checkbox"
                                id="is_loyalty_member"
                                checked={data.is_loyalty_member}
                                onChange={(e) =>
                                    setData("is_loyalty_member", e.target.checked)
                                }
                                className="rounded border-slate-300 dark:border-slate-700 text-primary-600 focus:ring-primary-500"
                            />
                            <label
                                htmlFor="is_loyalty_member"
                                className="text-sm font-medium text-slate-700 dark:text-slate-300 select-none cursor-pointer"
                            >
                                Aktifkan sebagai Member Loyalty (Dapatkan Poin)
                            </label>
                        </div>

                        {data.is_loyalty_member && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                    type="number"
                                    label="Jumlah Poin"
                                    placeholder="Masukkan jumlah poin"
                                    errors={errors.loyalty_points}
                                    onChange={(e) => setData("loyalty_points", e.target.value)}
                                    value={data.loyalty_points}
                                />
                            </div>
                        )}

                        <Textarea
                            label="Alamat"
                            placeholder="Masukkan alamat lengkap"
                            errors={errors.address}
                            onChange={(e) => setData("address", e.target.value)}
                            value={data.address}
                            rows={3}
                        />
                    </div>

                    <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                        <Link
                            href={route("customers.index")}
                            className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition-colors"
                        >
                            Batal
                        </Link>
                        <button
                            type="submit"
                            disabled={processing}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-medium transition-colors disabled:opacity-50"
                        >
                            <IconDeviceFloppy size={18} />
                            {processing ? "Menyimpan..." : "Simpan Perubahan"}
                        </button>
                    </div>
                </div>
            </form>
        </>
    );
}

Edit.layout = (page) => <DashboardLayout children={page} />;
