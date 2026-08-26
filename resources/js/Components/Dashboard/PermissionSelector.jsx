import React, { useMemo, useState } from "react";
import Checkbox from "@/Components/Dashboard/Checkbox";
import {
    IconShield,
    IconKey,
    IconSearch,
    IconCheck,
    IconX,
    IconLayout2,
    IconBox,
    IconShoppingCart,
    IconClipboardCheck,
    IconChartArrowsVertical,
    IconBuildingBank,
    IconWallet,
    IconBuildingStore,
    IconUserShield,
} from "@tabler/icons-react";

export const PERMISSION_GROUPS = [
    {
        title: "Overview & Dashboard",
        icon: IconLayout2,
        permissions: [
            { name: "dashboard-access", label: "Akses Dashboard Ringkasan" },
        ],
    },
    {
        title: "Master Data",
        icon: IconBox,
        permissions: [
            { name: "categories-access", label: "Lihat Kategori" },
            { name: "categories-create", label: "Tambah Kategori" },
            { name: "categories-edit", label: "Edit Kategori" },
            { name: "categories-delete", label: "Hapus Kategori" },
            { name: "products-access", label: "Lihat Produk" },
            { name: "products-create", label: "Tambah Produk" },
            { name: "products-edit", label: "Edit Produk" },
            { name: "products-delete", label: "Hapus Produk" },
            { name: "customers-access", label: "Lihat Pelanggan" },
            { name: "customers-create", label: "Tambah Pelanggan" },
            { name: "customers-edit", label: "Edit Pelanggan" },
            { name: "customers-delete", label: "Hapus Pelanggan" },
            { name: "suppliers-access", label: "Akses Supplier" },
            { name: "units-access", label: "Lihat Satuan" },
            { name: "units-create", label: "Tambah Satuan" },
            { name: "units-delete", label: "Hapus Satuan" },
            { name: "services-access", label: "Lihat Jasa" },
            { name: "services-create", label: "Tambah Jasa" },
            { name: "services-edit", label: "Edit Jasa" },
            { name: "services-delete", label: "Hapus Jasa" },
            { name: "point-prizes-access", label: "Lihat Hadiah Poin" },
            { name: "point-prizes-create", label: "Tambah Hadiah Poin" },
            { name: "point-prizes-edit", label: "Edit Hadiah Poin" },
            { name: "point-prizes-delete", label: "Hapus Hadiah Poin" },
        ],
    },
    {
        title: "Penjualan & Kasir (POS)",
        icon: IconShoppingCart,
        permissions: [
            { name: "transactions-access", label: "Akses POS & Riwayat Transaksi" },
            { name: "transactions-confirm-payment", label: "Konfirmasi Pembayaran Transfer" },
            { name: "sales-returns-access", label: "Lihat Retur Penjualan" },
            { name: "sales-returns-create", label: "Buat Retur Penjualan" },
            { name: "sales-returns-complete", label: "Selesaikan Retur Penjualan" },
            { name: "receivables-access", label: "Akses Piutang & Aging" },
            { name: "receivables-pay", label: "Bayar / Terima Piutang" },
            { name: "point-redemptions-access", label: "Lihat Penukaran Poin" },
            { name: "point-redemptions-create", label: "Proses Tukar Poin" },
        ],
    },
    {
        title: "Inventori & Pengadaan",
        icon: IconClipboardCheck,
        permissions: [
            { name: "stock-opnames-access", label: "Lihat Stock Opname" },
            { name: "stock-opnames-create", label: "Buat Draft Stock Opname" },
            { name: "stock-opnames-finalize", label: "Finalisasi Stock Opname" },
            { name: "stock-mutations-access", label: "Lihat Riwayat Mutasi Stok" },
            { name: "purchase-orders-access", label: "Lihat Purchase Order" },
            { name: "purchase-orders-create", label: "Buat Purchase Order" },
            { name: "purchase-orders-update", label: "Update / Proses Purchase Order" },
            { name: "purchase-orders-delete", label: "Hapus Purchase Order" },
            { name: "goods-receivings-access", label: "Lihat Penerimaan Barang" },
            { name: "goods-receivings-create", label: "Terima Barang Masuk" },
            { name: "supplier-returns-access", label: "Lihat Retur Supplier" },
            { name: "supplier-returns-create", label: "Buat Retur Supplier" },
            { name: "supplier-returns-update", label: "Update / Selesaikan Retur Supplier" },
            { name: "payables-access", label: "Akses Hutang Supplier" },
            { name: "payables-pay", label: "Bayar Hutang Supplier" },
        ],
    },
    {
        title: "Laporan",
        icon: IconChartArrowsVertical,
        permissions: [
            { name: "reports-access", label: "Laporan Penjualan & Insights" },
            { name: "profits-access", label: "Laporan Keuntungan / Laba" },
        ],
    },
    {
        title: "Agen Link",
        icon: IconBuildingBank,
        permissions: [
            { name: "agent-transactions-access", label: "Pencatatan & Laporan Transaksi Agen" },
            { name: "agent-transactions-create", label: "Input Transaksi Agen" },
            { name: "agent-transactions-edit", label: "Edit Transaksi Agen" },
            { name: "agent-transactions-delete", label: "Hapus Transaksi Agen" },
            { name: "agent-transaction-types-access", label: "Lihat Tipe Transaksi" },
            { name: "agent-transaction-types-create", label: "Tambah Tipe Transaksi" },
            { name: "agent-transaction-types-edit", label: "Edit Tipe Transaksi" },
            { name: "agent-transaction-types-delete", label: "Hapus Tipe Transaksi" },
            { name: "agent-admin-banks-access", label: "Akses Admin Bank Link" },
            { name: "agent-admin-banks-create", label: "Tambah Admin Bank Link" },
            { name: "agent-admin-banks-edit", label: "Edit Admin Bank Link" },
            { name: "agent-admin-banks-delete", label: "Hapus Admin Bank Link" },
            { name: "agent-admin-lokets-access", label: "Akses Admin Loket" },
            { name: "agent-admin-lokets-create", label: "Tambah Admin Loket" },
            { name: "agent-admin-lokets-edit", label: "Edit Admin Loket" },
            { name: "agent-admin-lokets-delete", label: "Hapus Admin Loket" },
        ],
    },
    {
        title: "Operasional & Shift",
        icon: IconWallet,
        permissions: [
            { name: "cashier-shifts-access", label: "Lihat Shift Kasir" },
            { name: "cashier-shifts-open", label: "Buka Shift Kasir" },
            { name: "cashier-shifts-close", label: "Tutup Shift Kasir" },
            { name: "cashier-shifts-force-close", label: "Force Close Shift Kasir" },
            { name: "audit-logs-access", label: "Lihat Riwayat Audit Log" },
        ],
    },
    {
        title: "Pengaturan & Backup",
        icon: IconBuildingStore,
        permissions: [
            { name: "settings-access", label: "Akses Profil Toko, Target & Loyalitas" },
            { name: "settings-edit", label: "Ubah Pengaturan Toko" },
            { name: "payment-settings-access", label: "Lihat Rekening Bank" },
            { name: "payment-settings-update", label: "Kelola Rekening Bank" },
            { name: "backups-access", label: "Lihat Database Backup" },
            { name: "backups-create", label: "Buat Backup Database" },
            { name: "backups-restore", label: "Restore Database" },
            { name: "backups-delete", label: "Hapus File Backup" },
        ],
    },
    {
        title: "User Management & Hak Akses",
        icon: IconUserShield,
        permissions: [
            { name: "users-access", label: "Lihat Data Pengguna" },
            { name: "users-create", label: "Tambah Pengguna Baru" },
            { name: "users-update", label: "Edit Data Pengguna" },
            { name: "users-delete", label: "Hapus Pengguna" },
            { name: "roles-access", label: "Lihat Group Akses (Role)" },
            { name: "roles-create", label: "Tambah Group Akses" },
            { name: "roles-update", label: "Edit Group Akses" },
            { name: "roles-delete", label: "Hapus Group Akses" },
            { name: "permissions-access", label: "Lihat Hak Akses (Permission)" },
            { name: "permissions-create", label: "Tambah Hak Akses" },
            { name: "permissions-update", label: "Edit Hak Akses" },
            { name: "permissions-delete", label: "Hapus Hak Akses" },
        ],
    },
];

export default function PermissionSelector({
    roles = [],
    permissions = [],
    selectedRoles = [],
    selectedPermissions = [],
    onRolesChange,
    onPermissionsChange,
    error,
}) {
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState("roles"); // 'roles' | 'permissions'

    // Map existing system permission names
    const availablePermissionNames = useMemo(
        () => new Set(permissions.map((p) => (typeof p === "string" ? p : p.name))),
        [permissions]
    );

    // Build recognized groups filtered to only permissions that exist in backend
    const groupedPermissions = useMemo(() => {
        const handled = new Set();
        const groups = PERMISSION_GROUPS.map((group) => {
            const validPerms = group.permissions.filter((p) => {
                if (availablePermissionNames.has(p.name)) {
                    handled.add(p.name);
                    return true;
                }
                return false;
            });
            return {
                ...group,
                permissions: validPerms,
            };
        }).filter((g) => g.permissions.length > 0);

        // Catch any uncategorized permissions
        const unhandled = permissions
            .map((p) => (typeof p === "string" ? p : p.name))
            .filter((name) => !handled.has(name));

        if (unhandled.length > 0) {
            groups.push({
                title: "Lainnya",
                icon: IconKey,
                permissions: unhandled.map((name) => ({
                    name,
                    label: name,
                })),
            });
        }

        return groups;
    }, [permissions, availablePermissionNames]);

    // Filter permissions by search query
    const filteredGroups = useMemo(() => {
        if (!searchQuery.trim()) return groupedPermissions;
        const q = searchQuery.toLowerCase();

        return groupedPermissions
            .map((group) => ({
                ...group,
                permissions: group.permissions.filter(
                    (p) =>
                        p.name.toLowerCase().includes(q) ||
                        p.label.toLowerCase().includes(q)
                ),
            }))
            .filter((g) => g.permissions.length > 0);
    }, [groupedPermissions, searchQuery]);

    const handleRoleToggle = (roleName) => {
        const next = selectedRoles.includes(roleName)
            ? selectedRoles.filter((name) => name !== roleName)
            : [...selectedRoles, roleName];
        onRolesChange(next);
    };

    const handlePermissionToggle = (permName) => {
        const next = selectedPermissions.includes(permName)
            ? selectedPermissions.filter((name) => name !== permName)
            : [...selectedPermissions, permName];
        onPermissionsChange(next);
    };

    const handleSelectAllGroup = (group) => {
        const groupPermNames = group.permissions.map((p) => p.name);
        const allSelected = groupPermNames.every((name) =>
            selectedPermissions.includes(name)
        );

        let next;
        if (allSelected) {
            // Deselect group
            next = selectedPermissions.filter((name) => !groupPermNames.includes(name));
        } else {
            // Select group
            const combined = new Set([...selectedPermissions, ...groupPermNames]);
            next = Array.from(combined);
        }
        onPermissionsChange(next);
    };

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 flex items-center justify-center">
                        <IconShield size={22} />
                    </div>
                    <div>
                        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                            Pengaturan Hak Akses & Permission
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Tentukan group akses (role) atau hak akses langsung (permission) untuk pengguna ini
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl">
                    <button
                        type="button"
                        onClick={() => setActiveTab("roles")}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                            activeTab === "roles"
                                ? "bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-sm"
                                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                        }`}
                    >
                        Group Akses ({selectedRoles.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab("permissions")}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                            activeTab === "permissions"
                                ? "bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-sm"
                                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                        }`}
                    >
                        Hak Akses Granular ({selectedPermissions.length})
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-3 rounded-xl bg-danger-50 dark:bg-danger-950/40 border border-danger-200 dark:border-danger-900 text-danger-600 dark:text-danger-400 text-xs">
                    {error}
                </div>
            )}

            {/* TAB: Group Akses (Roles) */}
            {activeTab === "roles" && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            Pilih satu atau beberapa Group Akses (Role):
                        </span>
                        {selectedRoles.length > 0 && (
                            <button
                                type="button"
                                onClick={() => onRolesChange([])}
                                className="text-xs text-danger-500 hover:underline inline-flex items-center gap-1"
                            >
                                <IconX size={12} /> Kosongkan Role
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {roles.map((role) => {
                            const isSelected = selectedRoles.includes(role.name);
                            const isSuper = role.name === "super-admin";
                            const isCashier = role.name === "cashier";

                            return (
                                <label
                                    key={role.id || role.name}
                                    className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                                        isSelected
                                            ? "border-primary-500 bg-primary-50/60 dark:bg-primary-950/40 shadow-sm"
                                            : "border-slate-200 dark:border-slate-800 hover:border-primary-300 dark:hover:border-primary-800"
                                    }`}
                                >
                                    <Checkbox
                                        checked={isSelected}
                                        onChange={() => handleRoleToggle(role.name)}
                                        value={role.name}
                                        className="mt-0.5"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 capitalize truncate">
                                                {role.name}
                                            </span>
                                            {isSuper && (
                                                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
                                                    ALL
                                                </span>
                                            )}
                                            {isCashier && (
                                                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                                                    POS
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                                            {isSuper
                                                ? "Akses penuh ke seluruh menu sistem"
                                                : isCashier
                                                ? "Akses transaksi kasir & shift"
                                                : `Group akses ${role.name}`}
                                        </p>
                                    </div>
                                </label>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* TAB: Granular Permissions */}
            {activeTab === "permissions" && (
                <div className="space-y-4">
                    {/* Search bar & quick actions */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="relative w-full sm:w-72">
                            <IconSearch
                                size={16}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                            />
                            <input
                                type="text"
                                placeholder="Cari hak akses..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery("")}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    <IconX size={14} />
                                </button>
                            )}
                        </div>

                        {selectedPermissions.length > 0 && (
                            <button
                                type="button"
                                onClick={() => onPermissionsChange([])}
                                className="text-xs text-danger-500 hover:underline inline-flex items-center gap-1 self-end sm:self-auto"
                            >
                                <IconX size={12} /> Kosongkan Semua Hak Akses
                            </button>
                        )}
                    </div>

                    {/* Permissions list grouped */}
                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1 dashboard-scrollbar">
                        {filteredGroups.length > 0 ? (
                            filteredGroups.map((group) => {
                                const GroupIcon = group.icon || IconKey;
                                const groupPermNames = group.permissions.map((p) => p.name);
                                const allSelected = groupPermNames.every((name) =>
                                    selectedPermissions.includes(name)
                                );

                                return (
                                    <div
                                        key={group.title}
                                        className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-800/30 space-y-3"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <GroupIcon
                                                    size={18}
                                                    className="text-primary-500"
                                                />
                                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                                    {group.title}
                                                </h4>
                                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                                                    {
                                                        groupPermNames.filter((name) =>
                                                            selectedPermissions.includes(name)
                                                        ).length
                                                    }
                                                    /{groupPermNames.length}
                                                </span>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => handleSelectAllGroup(group)}
                                                className={`text-xs font-medium px-2 py-0.5 rounded-md transition-colors ${
                                                    allSelected
                                                        ? "text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-950/50"
                                                        : "text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/50"
                                                }`}
                                            >
                                                {allSelected ? "Batal Semua" : "Pilih Semua"}
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                            {group.permissions.map((p) => {
                                                const isChecked = selectedPermissions.includes(p.name);
                                                return (
                                                    <label
                                                        key={p.name}
                                                        className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                                                            isChecked
                                                                ? "border-primary-400 bg-primary-50/70 dark:bg-primary-950/60 text-primary-950 dark:text-primary-200"
                                                                : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                                                        }`}
                                                    >
                                                        <Checkbox
                                                            checked={isChecked}
                                                            onChange={() => handlePermissionToggle(p.name)}
                                                            value={p.name}
                                                            className="mt-0.5"
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-medium truncate">
                                                                {p.label}
                                                            </p>
                                                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono truncate">
                                                                {p.name}
                                                            </p>
                                                        </div>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="py-8 text-center text-xs text-slate-400">
                                Tidak ada hak akses yang cocok dengan pencarian "{searchQuery}"
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Summary note */}
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span>
                    Total dipilih:{" "}
                    <strong className="text-slate-800 dark:text-slate-200">
                        {selectedRoles.length} Role
                    </strong>
                    {" & "}
                    <strong className="text-slate-800 dark:text-slate-200">
                        {selectedPermissions.length} Hak Akses Langsung
                    </strong>
                </span>
            </div>
        </div>
    );
}
