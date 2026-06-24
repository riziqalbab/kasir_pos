import React from "react";
import {
    IconShoppingBag,
    IconPhoto,
    IconMinus,
    IconPlus,
} from "@tabler/icons-react";
import { getProductImageUrl } from "@/Utils/imageUrl";

const formatPrice = (value = 0) =>
    Number(value || 0).toLocaleString("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
    });

// Single Product Card
function ProductCard({ product, onAddToCart, isAdding }) {
    const hasStock = product.stock > 0;
    const lowStock = product.stock > 0 && product.stock <= 5;
    const promoBadge = product.pricing_badge;
    const promoPrice = Number(promoBadge?.promo_price || 0);
    const basePrice = Number(promoBadge?.base_price || product.sell_price || 0);
    const showPromo = promoBadge && promoPrice > 0 && promoPrice < basePrice;
    const showBadge = Boolean(promoBadge?.label);

    return (
        <button
            onClick={() => hasStock && onAddToCart(product)}
            disabled={!hasStock || isAdding}
            className={`
                group relative flex flex-col bg-white dark:bg-slate-900
                rounded-2xl border border-slate-200 dark:border-slate-800
                overflow-hidden transition-all duration-200
                ${
                    hasStock
                        ? "hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer"
                        : "opacity-60 cursor-not-allowed"
                }
            `}
        >
            {/* Product Image */}
            <div className="relative aspect-square bg-slate-100 dark:bg-slate-800 overflow-hidden">
                {product.image ? (
                    <img
                        src={getProductImageUrl(product.image)}
                        alt={product.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <IconPhoto
                            size={32}
                            className="text-slate-300 dark:text-slate-600"
                        />
                    </div>
                )}

                {/* Stock Badge */}
                {lowStock && (
                    <span className="absolute top-2 right-2 px-2 py-0.5 text-[10px] font-medium bg-warning-100 text-warning-700 dark:bg-warning-900/50 dark:text-warning-400 rounded-full max-w-[80%] truncate">
                        Sisa: {product.stock_breakdown || `${product.stock} Pcs`}
                    </span>
                )}

                {showBadge && (
                    <span className="absolute left-2 top-2 max-w-[70%] truncate rounded-full bg-rose-500 px-2 py-0.5 text-[11px] font-semibold text-white shadow-lg">
                        {promoBadge.label}
                    </span>
                )}

                {/* Out of Stock Overlay */}
                {!hasStock && (
                    <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center">
                        <span className="px-3 py-1 bg-danger-500 text-white text-xs font-semibold rounded-full">
                            Habis
                        </span>
                    </div>
                )}

                {/* Hover Add Indicator (centered on image) */}
                {hasStock && (
                    <div className="absolute inset-0 bg-primary-500/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex items-center justify-center">
                        <div className="bg-primary-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                            + Tambah
                        </div>
                    </div>
                )}
            </div>

            {/* Product Info */}
            <div className="flex-1 p-3 flex flex-col justify-between min-h-[80px]">
                <h3 className="text-sm font-medium text-slate-800 dark:text-slate-200 line-clamp-2 leading-tight">
                    {product.title}
                </h3>
                <div className="mt-2">
                    {showPromo && (
                        <p className="text-xs text-slate-400 line-through">
                            {formatPrice(basePrice)}
                        </p>
                    )}
                    <p className="text-base font-bold text-primary-600 dark:text-primary-400">
                        {formatPrice(showPromo ? promoPrice : product.sell_price)}
                    </p>
                    {showBadge && !showPromo && (
                        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                            Promo tersedia
                        </p>
                    )}
                </div>
            </div>

        </button>
    );
}

// Category Tab Button
function CategoryTab({ category, isActive, onClick }) {
    return (
        <button
            onClick={onClick}
            className={`
                px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap
                transition-all duration-200 min-h-touch
                ${
                    isActive
                        ? "bg-primary-500 text-white shadow-md shadow-primary-500/30"
                        : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700"
                }
            `}
        >
            {category.name}
        </button>
    );
}

// Search Input
function SearchInput({
    value,
    onChange,
    onSearch,
    isSearching,
    placeholder,
    inputRef,
}) {
    return (
        <div className="relative">
            <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onSearch?.()}
                placeholder={
                    placeholder ||
                    "Cari produk atau scan barcode... (/ untuk fokus)"
                }
                className="w-full h-12 pl-4 pr-12 rounded-xl border border-slate-200 dark:border-slate-700
                    bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200
                    placeholder-slate-400 dark:placeholder-slate-500
                    focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 dark:focus:border-primary-500
                    transition-all text-base"
                disabled={isSearching}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {isSearching ? (
                    <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                    <IconShoppingBag size={20} className="text-slate-400" />
                )}
            </div>
        </div>
    );
}

// Main ProductGrid Component
export default function ProductGrid({
    products = [],
    categories = [],
    selectedCategory,
    onCategoryChange,
    searchQuery,
    onSearchChange,
    onSearch,
    isSearching,
    onAddToCart,
    addingProductId,
    searchInputRef,
    placeholder,
}) {
    const normalizedSelectedCategory =
        selectedCategory === null ? null : Number(selectedCategory);

    // Filter products by category and search
    const filteredProducts = products.filter((product) => {
        const matchesCategory =
            normalizedSelectedCategory === null ||
            Number(product.category_id) === normalizedSelectedCategory;
        const matchesSearch =
            !searchQuery ||
            product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            product.barcode?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    return (
        <div className="h-full flex flex-col">
            {/* Search Bar */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                <SearchInput
                    value={searchQuery}
                    onChange={onSearchChange}
                    onSearch={onSearch}
                    isSearching={isSearching}
                    placeholder={placeholder}
                    inputRef={searchInputRef}
                />
            </div>

            {/* Category Tabs */}
            {categories && categories.length > 0 && (
                <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 overflow-x-auto scrollbar-hide">
                    <div className="flex gap-2">
                        <CategoryTab
                            category={{ id: null, name: "Semua" }}
                            isActive={normalizedSelectedCategory === null}
                            onClick={() => onCategoryChange(null)}
                        />
                        {categories.map((category) => (
                            <CategoryTab
                                key={category.id}
                                category={category}
                                isActive={
                                    normalizedSelectedCategory ===
                                    Number(category.id)
                                }
                                onClick={() => onCategoryChange(Number(category.id))}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Products Table */}
            <div className="flex-1 overflow-y-auto p-4 scrollbar-thin bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl m-4 mt-0">
                {filteredProducts.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50">
                                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-550">
                                        Produk / Barcode
                                    </th>
                                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-550">
                                        Kategori
                                    </th>
                                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-550">
                                        Stok
                                    </th>
                                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-550">
                                        Harga Jual
                                    </th>
                                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-550 text-right">
                                        Aksi
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {filteredProducts.map((product) => {
                                    const hasStock = product.stock > 0;
                                    const lowStock = product.stock > 0 && product.stock <= 5;
                                    const promoBadge = product.pricing_badge;
                                    const promoPrice = Number(promoBadge?.promo_price || 0);
                                    const basePrice = Number(promoBadge?.base_price || product.sell_price || 0);
                                    const showPromo = promoBadge && promoPrice > 0 && promoPrice < basePrice;
                                    const showBadge = Boolean(promoBadge?.label);

                                    return (
                                        <tr
                                            key={product.id}
                                            onClick={() => hasStock && onAddToCart(product)}
                                            className={`
                                                hover:bg-slate-50/70 dark:hover:bg-slate-80/40 transition-colors cursor-pointer group
                                                ${!hasStock ? "opacity-60 cursor-not-allowed" : ""}
                                            `}
                                        >
                                            <td className="px-4 py-3">
                                                <div className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                                                    {product.title}
                                                </div>
                                                {product.is_service ? (
                                                    product.description && (
                                                        <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 line-clamp-1">
                                                            {product.description}
                                                        </div>
                                                    )
                                                ) : (
                                                    <div className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-2 mt-0.5">
                                                        {product.barcode && <span>Code: {product.barcode}</span>}
                                                        {product.sku && <span>SKU: {product.sku}</span>}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                                                <span className="px-2 py-0.5 text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md">
                                                    {product.is_service ? "Jasa" : (product.category?.name || "Umum")}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm font-medium">
                                                {product.is_service ? (
                                                    <span className="px-2 py-0.5 text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 rounded-full">
                                                        Jasa
                                                    </span>
                                                ) : !hasStock ? (
                                                    <span className="px-2 py-0.5 text-xs font-semibold bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400 rounded-full">
                                                        Habis
                                                    </span>
                                                ) : lowStock ? (
                                                    <span className="px-2 py-0.5 text-xs font-semibold bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400 rounded-full">
                                                        Sisa: {product.stock_breakdown || `${product.stock} Pcs`}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-700 dark:text-slate-300">
                                                        {product.stock_breakdown || `${product.stock} Pcs`}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                {showPromo && (
                                                    <span className="text-xs text-slate-400 line-through mr-1.5">
                                                        {formatPrice(basePrice)}
                                                    </span>
                                                )}
                                                <span className="font-bold text-primary-600 dark:text-primary-400">
                                                    {formatPrice(showPromo ? promoPrice : product.sell_price)}
                                                </span>
                                                {showBadge && (
                                                    <span className="ml-1.5 rounded-full bg-rose-100 dark:bg-rose-950/30 px-2 py-0.5 text-[10px] font-semibold text-rose-650 dark:text-rose-400">
                                                        {promoBadge.label}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    type="button"
                                                    disabled={!hasStock || addingProductId === product.id}
                                                    className={`
                                                        px-3 py-1.5 rounded-xl font-medium text-xs transition-colors
                                                        ${
                                                            hasStock
                                                                ? "bg-primary-500 hover:bg-primary-600 text-white shadow-sm"
                                                                : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed"
                                                        }
                                                    `}
                                                >
                                                    {addingProductId === product.id ? "..." : "+ Pilih"}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-650">
                        <IconShoppingBag
                            size={48}
                            strokeWidth={1.5}
                            className="mb-3"
                        />
                        <p className="text-sm">
                            {searchQuery
                                ? "Produk tidak ditemukan"
                                : "Tidak ada produk"}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

// Export sub-components
ProductGrid.Card = ProductCard;
ProductGrid.CategoryTab = CategoryTab;
ProductGrid.SearchInput = SearchInput;
