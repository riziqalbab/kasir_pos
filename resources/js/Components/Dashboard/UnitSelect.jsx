import React from "react";
import { IconPlus } from "@tabler/icons-react";

export default function UnitSelect({
    label,
    value,
    onChange,
    units = [],
    errors,
    placeholder = "Pilih satuan",
    onAddClick,
}) {
    return (
        <div className="flex flex-col gap-2 w-full">
            <label className="text-slate-600 dark:text-slate-400 text-sm font-medium">
                {label}
            </label>
            <div className="flex gap-2">
                <select
                    value={value || ""}
                    onChange={onChange}
                    className="w-full px-3 py-2 border text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-white text-slate-855 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:focus:border-primary-500 dark:border-slate-800 transition-all cursor-pointer"
                >
                    <option value="">{placeholder}</option>
                    {units.map((unit) => (
                        <option key={unit.id} value={unit.name}>
                            {unit.name}
                        </option>
                    ))}
                </select>
                {onAddClick && (
                    <button
                        type="button"
                        onClick={onAddClick}
                        className="px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-350 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center transition-colors"
                        title="Tambah Satuan Baru"
                    >
                        <IconPlus size={18} />
                    </button>
                )}
            </div>
            {errors && (
                <small className="text-xs text-danger-600 dark:text-danger-400 font-medium">
                    {errors}
                </small>
            )}
        </div>
    );
}
