import React, { useEffect, useState } from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, useForm, usePage, Link } from "@inertiajs/react";
import Input from "@/Components/Dashboard/Input";
import InputSelect from "@/Components/Dashboard/InputSelect";
import toast from "react-hot-toast";
import {
    IconPackage,
    IconDeviceFloppy,
    IconArrowLeft,
    IconPhoto,
    IconBarcode,
    IconCurrencyDollar,
    IconScale,
} from "@tabler/icons-react";
import { getProductImageUrl } from "@/Utils/imageUrl";

export default function Edit({ categories, product }) {
    const { errors } = usePage().props;

    const { data, setData, post, processing } = useForm({
        image: "",
        barcode: product.barcode,
        sku: product.sku,
        title: product.title,
        category_id: product.category_id,
        satuan_beli: product.satuan_beli || "",
        isi_pcs_dalam_pack: product.isi_pcs_dalam_pack || 0,
        isi_pack_dalam_dus: product.isi_pack_dalam_dus || 1,
        isi_pcs_dalam_dus: product.isi_pcs_dalam_dus || 0,
        satuan_jual_dus: product.satuan_jual_dus || "Dus",
        harga_beli_dus: product.harga_beli_dus || 0,
        harga_jual_dus: product.harga_jual_dus || 0,
        satuan_jual_pack: product.satuan_jual_pack || "Pak",
        harga_beli_pack: product.harga_beli_pack || 0,
        harga_jual_pack: product.harga_jual_pack || 0,
        satuan_jual_pcs: product.satuan_jual_pcs || "Pcs",
        harga_beli_pcs: product.harga_beli_pcs || 0,
        harga_jual_pcs: product.harga_jual_pcs || 0,
        _method: "PUT",
    });

    const [selectedCategory, setSelectedCategory] = useState(null);
    const [imagePreview, setImagePreview] = useState(
        product.image ? getProductImageUrl(product.image) : null
    );
    const [activeTab, setActiveTab] = useState("pcs"); // 'dus', 'pack', 'pcs'

    useEffect(() => {
        if (product.category_id) {
            setSelectedCategory(
                categories.find((cat) => cat.id === product.category_id)
            );
        }
    }, [product.category_id]);

    const setSelectedCategoryHandler = (value) => {
        setSelectedCategory(value);
        setData("category_id", value?.id || "");
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setData("image", file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleConversionChange = (field, value) => {
        const val = parseInt(value, 10) || 0;
        const updatedData = { ...data, [field]: val };
        
        // Auto-calculate isi_pcs_dalam_dus
        const pcsPack = field === "isi_pcs_dalam_pack" ? val : Number(data.isi_pcs_dalam_pack || 0);
        const packDus = field === "isi_pack_dalam_dus" ? val : Number(data.isi_pack_dalam_dus || 0);
        updatedData.isi_pcs_dalam_dus = pcsPack * packDus;

        // Apply changes
        setData((prev) => ({
            ...prev,
            [field]: val,
            isi_pcs_dalam_dus: updatedData.isi_pcs_dalam_dus,
        }));
    };

    const submit = (e) => {
        e.preventDefault();
        post(route("products.update", product.id), {
            onSuccess: () => toast.success("Produk berhasil diperbarui"),
            onError: () => toast.error("Gagal memperbarui produk"),
        });
    };

    // Calculate active tab pricing
    const activeTabPricing = {
        dus: {
            buy: Number(data.harga_beli_dus) || 0,
            sell: Number(data.harga_jual_dus) || 0,
            name: data.satuan_jual_dus || "Dus",
        },
        pack: {
            buy: Number(data.harga_beli_pack) || 0,
            sell: Number(data.harga_jual_pack) || 0,
            name: data.satuan_jual_pack || "Pak",
        },
        pcs: {
            buy: Number(data.harga_beli_pcs) || 0,
            sell: Number(data.harga_jual_pcs) || 0,
            name: data.satuan_jual_pcs || "Pcs",
        },
    }[activeTab];

    const showProfit = activeTabPricing.buy > 0 && activeTabPricing.sell > 0;
    const profitAmount = activeTabPricing.sell - activeTabPricing.buy;
    const profitMargin = ((profitAmount / activeTabPricing.buy) * 100).toFixed(1);

    const getStockForUnit = (unit) => {
        const stock = product.stock || 0;
        const pcsInDus = Number(data.isi_pcs_dalam_dus || 0);
        const pcsInPack = Number(data.isi_pcs_dalam_pack || 0);

        if (unit === "dus" && pcsInDus > 0) {
            return Math.floor(stock / pcsInDus);
        }
        if (unit === "pack" && pcsInPack > 0) {
            return Math.floor(stock / pcsInPack);
        }
        return stock;
    };

    return (
        <>
            <Head title="Edit Produk" />

            <div className="mb-6">
                <Link
                    href={route("products.index")}
                    className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-primary-600 mb-3"
                >
                    <IconArrowLeft size={16} />
                    Kembali ke Produk
                </Link>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <IconPackage size={28} className="text-primary-500" />
                    Edit Produk
                </h1>
                <p className="text-sm text-slate-500 mt-1">{product.title}</p>
            </div>

            <form onSubmit={submit}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left - Image */}
                    <div className="lg:col-span-1">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
                            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                                <IconPhoto size={18} />
                                Gambar Produk
                            </h3>
                            <div className="aspect-square rounded-xl bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center overflow-hidden mb-4">
                                {imagePreview ? (
                                    <img
                                        src={imagePreview}
                                        alt="Preview"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="text-center p-6">
                                        <IconPhoto
                                            size={48}
                                            className="mx-auto text-slate-400 mb-2"
                                        />
                                        <p className="text-sm text-slate-500">
                                            Belum ada gambar
                                        </p>
                                    </div>
                                )}
                            </div>
                            <Input
                                type="file"
                                label="Ganti Gambar"
                                onChange={handleImageChange}
                                errors={errors.image}
                                accept="image/*"
                            />
                        </div>
                    </div>

                    {/* Right - Form */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
                            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                                <IconBarcode size={18} />
                                Informasi Dasar
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <InputSelect
                                        label="Kategori"
                                        data={categories}
                                        selected={selectedCategory}
                                        setSelected={setSelectedCategoryHandler}
                                        placeholder="Pilih kategori"
                                        errors={errors.category_id}
                                        searchable={true}
                                        displayKey="name"
                                    />
                                </div>
                                <Input
                                    type="text"
                                    label="Barcode"
                                    value={data.barcode}
                                    onChange={(e) =>
                                        setData("barcode", e.target.value)
                                    }
                                    errors={errors.barcode}
                                    placeholder="Kode produk"
                                />
                                <Input
                                    type="text"
                                    label="SKU (Opsional)"
                                    value={data.sku}
                                    onChange={(e) => setData("sku", e.target.value)}
                                    errors={errors.sku}
                                    placeholder="Masukkan SKU unik (atau kosongkan untuk auto-generate)"
                                />
                                <Input
                                    type="text"
                                    label="Nama Produk"
                                    value={data.title}
                                    onChange={(e) =>
                                        setData("title", e.target.value)
                                    }
                                    errors={errors.title}
                                    placeholder="Nama produk"
                                />
                                <Input
                                    type="text"
                                    label="Satuan Beli"
                                    value={data.satuan_beli}
                                    onChange={(e) =>
                                        setData("satuan_beli", e.target.value)
                                    }
                                    errors={errors.satuan_beli}
                                    placeholder="Dus / Box / Pcs"
                                />
                            </div>
                        </div>

                        {/* Conversion Section */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
                            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                                <IconScale size={18} />
                                Keterangan Isi Barang (Konversi Satuan)
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                <Input
                                    type="number"
                                    label="Isi [Pcs] dalam se-Pack"
                                    value={data.isi_pcs_dalam_pack}
                                    onChange={(e) =>
                                        handleConversionChange("isi_pcs_dalam_pack", e.target.value)
                                    }
                                    errors={errors.isi_pcs_dalam_pack}
                                    placeholder="0"
                                />
                                <div className="relative">
                                    <span className="absolute -left-2 top-[38px] text-lg font-bold text-slate-400">×</span>
                                    <Input
                                        type="number"
                                        label="Isi [Pack] dalam se-dus"
                                        value={data.isi_pack_dalam_dus}
                                        onChange={(e) =>
                                            handleConversionChange("isi_pack_dalam_dus", e.target.value)
                                        }
                                        errors={errors.isi_pack_dalam_dus}
                                        placeholder="1"
                                    />
                                </div>
                                <div className="relative">
                                    <span className="absolute -left-2 top-[38px] text-lg font-bold text-slate-400">=</span>
                                    <Input
                                        type="number"
                                        label="Isi [Pcs] dalam se-dus"
                                        value={data.isi_pcs_dalam_dus}
                                        errors={errors.isi_pcs_dalam_dus}
                                        disabled={true}
                                        placeholder="0"
                                        className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-semibold"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Pricing & Stock Tabbed Layout */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
                            <div className="flex items-center justify-between mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">
                                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                    <IconCurrencyDollar size={18} />
                                    Harga & Stok per Satuan Jual
                                </h3>
                                {/* Tabs Selector */}
                                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                                    {["dus", "pack", "pcs"].map((tab) => (
                                        <button
                                            key={tab}
                                            type="button"
                                            onClick={() => setActiveTab(tab)}
                                            className={`px-4 py-1.5 rounded-lg text-xs font-semibold uppercase transition-all duration-200 ${
                                                activeTab === tab
                                                    ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm"
                                                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                                            }`}
                                        >
                                            {tab === "pcs"
                                                ? data.satuan_jual_pcs || "PCS"
                                                : tab === "pack"
                                                ? data.satuan_jual_pack || "PAK"
                                                : data.satuan_jual_dus || "DUS"}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Tab Content */}
                            {activeTab === "dus" && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input
                                        type="text"
                                        label="Nama Satuan Jual (DUS)"
                                        value={data.satuan_jual_dus}
                                        onChange={(e) => setData("satuan_jual_dus", e.target.value)}
                                        errors={errors.satuan_jual_dus}
                                        placeholder="Dus"
                                    />
                                    <div className="flex flex-col justify-end">
                                        <label className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                                            Stok Saat Ini (DUS)
                                        </label>
                                        <div className="py-2.5 px-3 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-sm">
                                            {getStockForUnit("dus")} {data.satuan_jual_dus}
                                        </div>
                                    </div>
                                    <Input
                                        type="number"
                                        label="Harga Beli (DUS)"
                                        value={data.harga_beli_dus}
                                        onChange={(e) => setData("harga_beli_dus", e.target.value)}
                                        errors={errors.harga_beli_dus}
                                        placeholder="0"
                                    />
                                    <Input
                                        type="number"
                                        label="Harga Jual (DUS)"
                                        value={data.harga_jual_dus}
                                        onChange={(e) => setData("harga_jual_dus", e.target.value)}
                                        errors={errors.harga_jual_dus}
                                        placeholder="0"
                                    />
                                </div>
                            )}

                            {activeTab === "pack" && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input
                                        type="text"
                                        label="Nama Satuan Jual (PACK)"
                                        value={data.satuan_jual_pack}
                                        onChange={(e) => setData("satuan_jual_pack", e.target.value)}
                                        errors={errors.satuan_jual_pack}
                                        placeholder="Pak"
                                    />
                                    <div className="flex flex-col justify-end">
                                        <label className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                                            Stok Saat Ini (PACK)
                                        </label>
                                        <div className="py-2.5 px-3 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-sm">
                                            {getStockForUnit("pack")} {data.satuan_jual_pack}
                                        </div>
                                    </div>
                                    <Input
                                        type="number"
                                        label="Harga Beli (PACK)"
                                        value={data.harga_beli_pack}
                                        onChange={(e) => setData("harga_beli_pack", e.target.value)}
                                        errors={errors.harga_beli_pack}
                                        placeholder="0"
                                    />
                                    <Input
                                        type="number"
                                        label="Harga Jual (PACK)"
                                        value={data.harga_jual_pack}
                                        onChange={(e) => setData("harga_jual_pack", e.target.value)}
                                        errors={errors.harga_jual_pack}
                                        placeholder="0"
                                    />
                                </div>
                            )}

                            {activeTab === "pcs" && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input
                                        type="text"
                                        label="Nama Satuan Jual (PCS)"
                                        value={data.satuan_jual_pcs}
                                        onChange={(e) => setData("satuan_jual_pcs", e.target.value)}
                                        errors={errors.satuan_jual_pcs}
                                        placeholder="Pcs"
                                    />
                                    <div className="flex flex-col justify-end">
                                        <label className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                                            Stok Saat Ini (PCS)
                                        </label>
                                        <div className="py-2.5 px-3 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-sm">
                                            {getStockForUnit("pcs")} {data.satuan_jual_pcs}
                                        </div>
                                    </div>
                                    <Input
                                        type="number"
                                        label="Harga Beli (PCS)"
                                        value={data.harga_beli_pcs}
                                        onChange={(e) => setData("harga_beli_pcs", e.target.value)}
                                        errors={errors.harga_beli_pcs}
                                        placeholder="0"
                                    />
                                    <Input
                                        type="number"
                                        label="Harga Jual (PCS)"
                                        value={data.harga_jual_pcs}
                                        onChange={(e) => setData("harga_jual_pcs", e.target.value)}
                                        errors={errors.harga_jual_pcs}
                                        placeholder="0"
                                    />
                                </div>
                            )}

                            {/* Stock warning/info footer */}
                            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                    Stok Saat Ini (Keseluruhan)
                                </p>
                                <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">
                                    {product.stock} Pcs ({product.stock_breakdown})
                                </p>
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                    Perubahan stok dilakukan melalui transaksi atau stock opname.
                                </p>
                            </div>

                            {/* Profit Estimation */}
                            {showProfit && (
                                <div className="mt-4 p-4 rounded-xl bg-success-50 dark:bg-success-950/30 border border-success-200 dark:border-success-900">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-success-700 dark:text-success-400 font-medium">
                                                Estimasi Profit per {activeTabPricing.name}
                                            </p>
                                            <p className="text-2xl font-bold text-success-600 dark:text-success-500 mt-1">
                                                + Rp {profitAmount.toLocaleString("id-ID")}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-success-700 dark:text-success-400 font-medium">
                                                Margin
                                            </p>
                                            <p className="text-xl font-bold text-success-600 dark:text-success-500 mt-1">
                                                {profitMargin}%
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3">
                            <Link
                                href={route("products.index")}
                                className="px-6 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition-colors"
                            >
                                Batal
                            </Link>
                            <button
                                type="submit"
                                disabled={processing}
                                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-medium transition-colors disabled:opacity-50"
                            >
                                <IconDeviceFloppy size={18} />
                                {processing ? "Menyimpan..." : "Simpan Perubahan"}
                            </button>
                        </div>
                    </div>
                </div>
            </form>
        </>
    );
}

Edit.layout = (page) => <DashboardLayout children={page} />;
