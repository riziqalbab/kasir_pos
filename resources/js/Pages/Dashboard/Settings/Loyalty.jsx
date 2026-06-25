import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, useForm } from "@inertiajs/react";
import Button from "@/Components/Dashboard/Button";
import toast from "react-hot-toast";
import { IconCrown, IconDeviceFloppy, IconSettings, IconCoin } from "@tabler/icons-react";

export default function Loyalty({ settings }) {
    const { data, setData, post, processing, errors } = useForm({
        loyalty_points_enabled: settings?.loyalty_points_enabled || false,
        loyalty_points_threshold: settings?.loyalty_points_threshold || 10000,
        loyalty_points_awarded: settings?.loyalty_points_awarded || 1,
    });

    const submit = (e) => {
        e.preventDefault();
        post(route("settings.loyalty.update"), {
            preserveScroll: true,
            onSuccess: () => toast.success("Pengaturan poin berhasil disimpan"),
            onError: () => toast.error("Gagal menyimpan pengaturan poin"),
        });
    };

    return (
        <>
            <Head title="Pengaturan Poin Pelanggan" />

            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                        Pengaturan Poin Pelanggan
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Atur sistem perolehan poin loyalty untuk transaksi pelanggan Anda
                    </p>
                </div>

                {/* Form Card */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
                    <form onSubmit={submit} className="space-y-6">
                        {/* Enabled Toggle */}
                        <div className="flex items-start gap-4">
                            <div className="p-3 rounded-xl bg-primary-100 dark:bg-primary-900/30">
                                <IconCrown
                                    size={24}
                                    className="text-primary-600 dark:text-primary-400"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Sistem Poin Loyalty
                                </label>
                                <p className="text-xs text-slate-500 mb-3">
                                    Aktifkan atau nonaktifkan sistem reward poin untuk pelanggan
                                </p>
                                <label className="inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only"
                                        checked={data.loyalty_points_enabled}
                                        onChange={(e) =>
                                            setData(
                                                "loyalty_points_enabled",
                                                e.target.checked
                                            )
                                        }
                                    />
                                    <span
                                        className={`w-11 h-6 flex items-center bg-slate-300 rounded-full p-1 transition ${
                                            data.loyalty_points_enabled ? "bg-primary-500" : ""
                                        }`}
                                    >
                                        <span
                                            className={`bg-white w-4 h-4 rounded-full shadow transform transition ${
                                                data.loyalty_points_enabled ? "translate-x-5" : ""
                                            }`}
                                        />
                                    </span>
                                </label>
                                {errors.loyalty_points_enabled && (
                                    <p className="mt-1 text-sm text-danger-500">
                                        {errors.loyalty_points_enabled}
                                    </p>
                                )}
                            </div>
                        </div>

                        {data.loyalty_points_enabled && (
                            <div className="pl-0 md:pl-16 space-y-6 border-t border-slate-100 dark:border-slate-800 pt-6 animate-fade-in">
                                {/* Threshold Input */}
                                <div className="flex items-start gap-4">
                                    <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800">
                                        <IconCoin
                                            size={24}
                                            className="text-slate-600 dark:text-slate-400"
                                        />
                                    </div>
                                    <div className="flex-1 max-w-md">
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                            Minimal Nominal per Transaksi (Threshold)
                                        </label>
                                        <input
                                            type="number"
                                            value={data.loyalty_points_threshold}
                                            onChange={(e) =>
                                                setData(
                                                    "loyalty_points_threshold",
                                                    e.target.value
                                                )
                                            }
                                            placeholder="Contoh: 10000"
                                            className="w-full h-12 px-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/20 transition-all"
                                        />
                                        <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
                                            Pelanggan akan mendapat poin kelipatan dari nominal ini.
                                        </p>
                                        {errors.loyalty_points_threshold && (
                                            <p className="mt-1 text-sm text-danger-500">
                                                {errors.loyalty_points_threshold}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Awarded Points Input */}
                                <div className="flex items-start gap-4">
                                    <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800">
                                        <IconSettings
                                            size={24}
                                            className="text-slate-600 dark:text-slate-400"
                                        />
                                    </div>
                                    <div className="flex-1 max-w-md">
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                            Jumlah Poin yang Diperoleh
                                        </label>
                                        <input
                                            type="number"
                                            value={data.loyalty_points_awarded}
                                            onChange={(e) =>
                                                setData(
                                                    "loyalty_points_awarded",
                                                    e.target.value
                                                )
                                            }
                                            placeholder="Contoh: 1"
                                            className="w-full h-12 px-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/20 transition-all"
                                        />
                                        <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
                                            Jumlah poin yang diperoleh per kelipatan nominal belanja.
                                        </p>
                                        {errors.loyalty_points_awarded && (
                                            <p className="mt-1 text-sm text-danger-500">
                                                {errors.loyalty_points_awarded}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                            <Button
                                type="submit"
                                variant="primary"
                                disabled={processing}
                                className="flex items-center gap-2"
                            >
                                <IconDeviceFloppy size={18} />
                                {processing ? "Menyimpan..." : "Simpan Pengaturan"}
                            </Button>
                        </div>
                    </form>
                </div>

                {/* Info Tip */}
                <div className="bg-primary-50 dark:bg-primary-950/30 rounded-xl p-4 border border-primary-200 dark:border-primary-900">
                    <p className="text-sm text-primary-700 dark:text-primary-300">
                        <strong>Simulasi:</strong> Jika Threshold diatur <strong>Rp 10.000</strong> dan Poin Diperoleh <strong>2 Poin</strong>, maka pelanggan yang berbelanja sebesar <strong>Rp 25.000</strong> akan mendapatkan kelipatan 2 &times; 2 = <strong>4 Poin</strong>.
                    </p>
                </div>
            </div>
        </>
    );
}

Loyalty.layout = (page) => <DashboardLayout children={page} />;
