import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
    IconSearch,
    IconPackage,
    IconCheck,
    IconChevronDown,
    IconX,
    IconLoader2,
} from "@tabler/icons-react";

export default function AsyncProductSelect({
    selected,
    onSelect,
    label = "Pilih Produk Hadiah",
    placeholder = "-- Cari & Pilih Produk Hadiah --",
    error,
    searchRouteName = "point-prizes.search-products",
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [options, setOptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const containerRef = useRef(null);
    const inputRef = useRef(null);

    // Search backend when query changes
    useEffect(() => {
        if (!query.trim()) {
            setOptions([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        const timer = setTimeout(() => {
            const searchUrl = typeof route === "function" ? route(searchRouteName) : "/dashboard/point-prizes/search-products";
            axios
                .get(searchUrl, { params: { q: query.trim() } })
                .then((res) => {
                    setOptions(res.data || []);
                })
                .catch(() => {
                    setOptions([]);
                })
                .finally(() => {
                    setLoading(false);
                });
        }, 300);

        return () => clearTimeout(timer);
    }, [query, searchRouteName]);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Focus input when opened
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    const handleSelect = (product) => {
        onSelect(product);
        setIsOpen(false);
        setQuery("");
        setOptions([]);
    };

    const handleClear = (e) => {
        e.stopPropagation();
        onSelect(null);
    };

    return (
        <div ref={containerRef} className="relative space-y-1.5">
            {label && (
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {label}
                </label>
            )}

            {/* Trigger Button */}
            <div
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full min-h-[42px] px-3 py-2 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                    isOpen
                        ? "border-primary-500 ring-2 ring-primary-500/20 bg-white dark:bg-slate-950"
                        : error
                        ? "border-danger-500 bg-white dark:bg-slate-950"
                        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
            >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    <IconPackage size={18} className="text-slate-400 shrink-0" />
                    {selected ? (
                        <div className="flex items-center justify-between w-full min-w-0 pr-1">
                            <span className="text-sm font-medium text-slate-850 dark:text-slate-100 truncate">
                                {selected.title || selected.name}
                                <span className="text-xs text-slate-400 font-mono ml-1.5">
                                    ({selected.barcode || selected.sku || "No Barcode"})
                                </span>
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium ml-2 shrink-0">
                                Stok: {selected.stock ?? 0}
                            </span>
                        </div>
                    ) : (
                        <span className="text-sm text-slate-400 dark:text-slate-500 truncate">
                            {placeholder}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                    {selected && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Hapus pilihan"
                        >
                            <IconX size={16} />
                        </button>
                    )}
                    <IconChevronDown
                        size={18}
                        className={`text-slate-400 transition-transform duration-200 ${
                            isOpen ? "rotate-180 text-primary-500" : ""
                        }`}
                    />
                </div>
            </div>

            {error && <p className="text-xs font-medium text-danger-500">{error}</p>}

            {/* Dropdown panel */}
            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden animate-fade-in">
                    {/* Search Input Box */}
                    <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                        <div className="relative flex items-center">
                            <IconSearch
                                size={16}
                                className="absolute left-3 text-slate-400 pointer-events-none"
                            />
                            <input
                                ref={inputRef}
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Cari nama, barcode, atau SKU produk..."
                                className="w-full pl-9 pr-8 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                            {loading ? (
                                <IconLoader2
                                    size={16}
                                    className="absolute right-3 text-primary-500 animate-spin"
                                />
                            ) : query ? (
                                <button
                                    type="button"
                                    onClick={() => setQuery("")}
                                    className="absolute right-3 text-slate-400 hover:text-slate-600"
                                >
                                    <IconX size={14} />
                                </button>
                            ) : null}
                        </div>
                    </div>

                    {/* Results list */}
                    <div className="max-h-56 overflow-y-auto p-1 divide-y divide-slate-100 dark:divide-slate-800/50">
                        {loading && options.length === 0 ? (
                            <div className="p-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                                <IconLoader2 size={16} className="animate-spin text-primary-500" />
                                Mencari produk di server...
                            </div>
                        ) : options.length > 0 ? (
                            options.map((prod) => {
                                const isSelected = selected?.id === prod.id;
                                return (
                                    <button
                                        key={prod.id}
                                        type="button"
                                        onClick={() => handleSelect(prod)}
                                        className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between gap-3 text-xs transition-colors ${
                                            isSelected
                                                ? "bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 font-semibold"
                                                : "hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200"
                                        }`}
                                    >
                                        <div className="min-w-0 flex-1">
                                            <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                                                {prod.title}
                                            </p>
                                            <p className="text-[11px] text-slate-400 font-mono">
                                                {prod.barcode || prod.sku || "Tanpa Barcode"}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span
                                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                    prod.stock > 10
                                                        ? "bg-success-50 text-success-700 dark:bg-success-950/30 dark:text-success-400"
                                                        : prod.stock > 0
                                                        ? "bg-warning-50 text-warning-700 dark:bg-warning-950/30 dark:text-warning-400"
                                                        : "bg-danger-50 text-danger-700 dark:bg-danger-950/30 dark:text-danger-400"
                                                }`}
                                            >
                                                Stok: {prod.stock}
                                            </span>
                                            {isSelected && <IconCheck size={16} className="text-primary-500" />}
                                        </div>
                                    </button>
                                );
                            })
                        ) : query.trim() ? (
                            <div className="p-4 text-center text-xs text-slate-400">
                                Produk dengan kata kunci "<strong>{query}</strong>" tidak ditemukan.
                            </div>
                        ) : (
                            <div className="p-4 text-center text-xs text-slate-400 flex flex-col items-center gap-1">
                                <IconSearch size={20} className="text-slate-300 dark:text-slate-600" />
                                <span>Ketik nama, barcode, atau SKU untuk mencari produk.</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
