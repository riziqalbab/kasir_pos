import React, { useState } from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, useForm, usePage, Link } from "@inertiajs/react";
import Button from "@/Components/Dashboard/Button";
import Input from "@/Components/Dashboard/Input";
import InputSelect from "@/Components/Dashboard/InputSelect";
import UnitSelect from "@/Components/Dashboard/UnitSelect";
import QuickAddUnitModal from "@/Components/Dashboard/QuickAddUnitModal";
import toast from "react-hot-toast";
import {
    IconPackage,
    IconDeviceFloppy,
    IconArrowLeft,
    IconPhoto,
    IconBarcode,
    IconCurrencyDollar,
    IconScale,
    IconPlus,
} from "@tabler/icons-react";

export default function Create({ categories, units = [] }) {
    const { errors } = usePage().props;

    const { data, setData, post, processing } = useForm({
        image: "",
        barcode: "",
        sku: "",
        title: "",
        category_id: "",
        satuan_beli: "",
        isi_pcs_dalam_pack: 0,
        isi_pack_dalam_dus: 1,
        isi_pcs_dalam_dus: 0,
        satuan_jual_dus: "Dus",
        harga_beli_dus: 0,
        harga_jual_dus: 0,
        stok_dus: 0,
        satuan_jual_pack: "Pak",
        harga_beli_pack: 0,
        harga_jual_pack: 0,
        stok_pack: 0,
        satuan_jual_pcs: "Pcs",
        harga_beli_pcs: 0,
        harga_jual_pcs: 0,
        stok_pcs: 0,
    });

    const [selectedCategory, setSelectedCategory] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [activeTab, setActiveTab] = useState("pcs"); // 'dus', 'pack', 'pcs'
    
    // Quick Add Unit State
    const [showQuickAdd, setShowQuickAdd] = useState(false);
    const [activeUnitField, setActiveUnitField] = useState("");

    const openQuickAddModal = (field) => {
        setActiveUnitField(field);
        setShowQuickAdd(true);
    };

    const handleQuickAddSuccess = (newUnitName) => {
        if (activeUnitField) {
            setData(activeUnitField, newUnitName);
        }
    };

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

    const handleHargaBeliChange = (unitKey, value) => {
        const val = parseInt(value, 10) || 0;
        if (unitKey === "dus") {
            const packDus = Number(data.isi_pack_dalam_dus) || 1;
            const pcsDus = Number(data.isi_pcs_dalam_dus) || 1;
            setData((prev) => ({
                ...prev,
                harga_beli_dus: val,
                harga_beli_pack: Math.floor(val / packDus),
                harga_beli_pcs: Math.floor(val / pcsDus),
            }));
        } else if (unitKey === "pack") {
            const pcsPack = Number(data.isi_pcs_dalam_pack) || 1;
            setData((prev) => ({
                ...prev,
                harga_beli_pack: val,
                harga_beli_pcs: Math.floor(val / pcsPack),
            }));
        } else if (unitKey === "pcs") {
            setData("harga_beli_pcs", val);
        }
    };

    const handleConversionChange = (field, value) => {
        const val = parseInt(value, 10) || 0;
        
        setData((prev) => {
            const updated = { ...prev, [field]: val };
            
            // Auto-calculate isi_pcs_dalam_dus
            const pcsPack = field === "isi_pcs_dalam_pack" ? val : Number(prev.isi_pcs_dalam_pack || 0);
            const packDus = field === "isi_pack_dalam_dus" ? val : Number(prev.isi_pack_dalam_dus || 0);
            updated.isi_pcs_dalam_dus = pcsPack * packDus;

            // Auto-calculate buy prices if we have a buy price for DUS or PACK
            if (updated.harga_beli_dus > 0) {
                const packDusFactor = updated.isi_pack_dalam_dus || 1;
                const pcsDusFactor = updated.isi_pcs_dalam_dus || 1;
                updated.harga_beli_pack = Math.floor(updated.harga_beli_dus / packDusFactor);
                updated.harga_beli_pcs = Math.floor(updated.harga_beli_dus / pcsDusFactor);
            } else if (updated.harga_beli_pack > 0) {
                const pcsPackFactor = updated.isi_pcs_dalam_pack || 1;
                updated.harga_beli_pcs = Math.floor(updated.harga_beli_pack / pcsPackFactor);
            }

            return updated;
        });
    };

    const submit = (e) => {
        e.preventDefault();
        post(route("products.store"), {
            onSuccess: () => toast.success("Produk berhasil ditambahkan"),
            onError: () => toast.error("Gagal menyimpan produk"),
        });
    };

    // Calculate active tab profits
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

    // Calculate total computed stock in base unit (pcs) for preview
    const computedTotalStock = 
        (Number(data.stok_dus || 0) * Number(data.isi_pcs_dalam_dus || 0)) +
        (Number(data.stok_pack || 0) * Number(data.isi_pcs_dalam_pack || 0)) +
        Number(data.stok_pcs || 0);

    return (
        <>
            <Head title="Tambah Produk" />

            {/* Header */}
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
                    Tambah Produk Baru
                </h1>
            </div>

            <form onSubmit={submit}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Image */}
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
                                label="Upload Gambar"
                                onChange={handleImageChange}
                                errors={errors.image}
                                accept="image/*"
                            />
                        </div>
                    </div>

                    {/* Right Column - Form */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Basic Info */}
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
                                    placeholder="Masukkan kode produk"
                                />
                                <Input
                                    type="text"
                                    label="Nama Produk"
                                    value={data.title}
                                    onChange={(e) =>
                                        setData("title", e.target.value)
                                    }
                                    errors={errors.title}
                                    placeholder="Masukkan nama produk"
                                />
                                <UnitSelect
                                    label="Satuan Beli"
                                    value={data.satuan_beli}
                                    onChange={(e) => setData("satuan_beli", e.target.value)}
                                    units={units}
                                    errors={errors.satuan_beli}
                                    placeholder="Dus / Box / Pcs"
                                    onAddClick={() => openQuickAddModal("satuan_beli")}
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
                                    <UnitSelect
                                        label="Nama Satuan Jual (DUS)"
                                        value={data.satuan_jual_dus}
                                        onChange={(e) => setData("satuan_jual_dus", e.target.value)}
                                        units={units}
                                        errors={errors.satuan_jual_dus}
                                        placeholder="Dus"
                                        onAddClick={() => openQuickAddModal("satuan_jual_dus")}
                                    />
                                    <Input
                                        type="number"
                                        label="Stok Awal (DUS)"
                                        value={data.stok_dus}
                                        onChange={(e) => setData("stok_dus", e.target.value)}
                                        errors={errors.stok_dus}
                                        placeholder="0"
                                    />
                                    <Input
                                        type="number"
                                        label="Harga Beli (DUS)"
                                        value={data.harga_beli_dus}
                                        onChange={(e) => handleHargaBeliChange("dus", e.target.value)}
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
                                    <UnitSelect
                                        label="Nama Satuan Jual (PACK)"
                                        value={data.satuan_jual_pack}
                                        onChange={(e) => setData("satuan_jual_pack", e.target.value)}
                                        units={units}
                                        errors={errors.satuan_jual_pack}
                                        placeholder="Pak"
                                        onAddClick={() => openQuickAddModal("satuan_jual_pack")}
                                    />
                                    <Input
                                        type="number"
                                        label="Stok Awal (PACK)"
                                        value={data.stok_pack}
                                        onChange={(e) => setData("stok_pack", e.target.value)}
                                        errors={errors.stok_pack}
                                        placeholder="0"
                                    />
                                    <Input
                                        type="number"
                                        label="Harga Beli (PACK)"
                                        value={data.harga_beli_pack}
                                        onChange={(e) => handleHargaBeliChange("pack", e.target.value)}
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
                                    <UnitSelect
                                        label="Nama Satuan Jual (PCS)"
                                        value={data.satuan_jual_pcs}
                                        onChange={(e) => setData("satuan_jual_pcs", e.target.value)}
                                        units={units}
                                        errors={errors.satuan_jual_pcs}
                                        placeholder="Pcs"
                                        onAddClick={() => openQuickAddModal("satuan_jual_pcs")}
                                    />
                                    <Input
                                        type="number"
                                        label="Stok Awal (PCS)"
                                        value={data.stok_pcs}
                                        onChange={(e) => setData("stok_pcs", e.target.value)}
                                        errors={errors.stok_pcs}
                                        placeholder="0"
                                    />
                                    <Input
                                        type="number"
                                        label="Harga Beli (PCS)"
                                        value={data.harga_beli_pcs}
                                        onChange={(e) => handleHargaBeliChange("pcs", e.target.value)}
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

                            {/* Stock equivalence display */}
                            <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs flex justify-between items-center text-slate-500">
                                <span>Estimasi Total Stok Terdaftar (dalam PCS):</span>
                                <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                                    {computedTotalStock} Pcs
                                </span>
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

                        {/* Submit */}
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
                                {processing ? "Menyimpan..." : "Simpan Produk"}
                            </button>
                        </div>
                    </div>
                </div>
            </form>

            {/* Quick Add Unit Modal */}
            <QuickAddUnitModal
                show={showQuickAdd}
                onClose={() => setShowQuickAdd(false)}
                onSuccess={handleQuickAddSuccess}
            />
        </>
    );
}

Create.layout = (page) => <DashboardLayout children={page} />;
