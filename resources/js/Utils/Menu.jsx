import { usePage } from "@inertiajs/react";
import {
    IconBooks,
    IconBox,
    IconCategory,
    IconChartArrowsVertical,
    IconChartBar,
    IconChartBarPopular,
    IconChartInfographic,
    IconCirclePlus,
    IconClockHour6,
    IconClipboardCheck,
    IconCreditCard,
    IconCrown,
    IconFileCertificate,
    IconFileDescription,
    IconFolder,
    IconGift,
    IconLayout2,
    IconBuildingStore,
    IconSchool,
    IconShoppingCart,
    IconTable,
    IconUserBolt,
    IconUserShield,
    IconUserSquare,
    IconUsers,
    IconUsersPlus,
    IconFileInvoice,
    IconBuildingWarehouse,
    IconCurrencyDollar,
    IconWallet,
    IconFileSearch,
    IconTruckDelivery,
    IconTruckReturn,
    IconSpeakerphone,
    IconBuildingBank,
    IconScale,
    IconBriefcase,
} from "@tabler/icons-react";
import hasAnyPermission from "./Permission";
import React from "react";

export default function Menu() {
    // define use page
    const { url } = usePage();

    // define menu navigations
    const menuNavigation = [
        {
            title: "Overview",
            details: [
                {
                    title: "Dashboard",
                    href: route("dashboard"),
                    active: url === "/dashboard" ? true : false, // Update comparison here
                    icon: <IconLayout2 size={20} strokeWidth={1.5} />,
                    permissions: hasAnyPermission(["dashboard-access"]),
                },
            ],
        },
        {
            title: "Master Data",
            details: [
                {
                    title: "Kategori",
                    href: route("categories.index"),
                    active: url === "/dashboard/categories" ? true : false, // Update comparison here
                    icon: <IconFolder size={20} strokeWidth={1.5} />,
                    permissions: hasAnyPermission(["categories-access"]),
                },
                {
                    title: "Produk",
                    href: route("products.index"),
                    active: url === "/dashboard/products" ? true : false, // Update comparison here
                    icon: <IconBox size={20} strokeWidth={1.5} />,
                    permissions: hasAnyPermission(["products-access"]),
                },
                {
                    title: "Pelanggan",
                    href: route("customers.index"),
                    active: url === "/dashboard/customers" ? true : false, // Update comparison here
                    icon: <IconUsersPlus size={20} strokeWidth={1.5} />,
                    permissions: hasAnyPermission(["customers-access"]),
                },
                {
                    title: "Supplier",
                    href: route("suppliers.index"),
                    active: url.startsWith("/dashboard/suppliers"),
                    icon: <IconBuildingWarehouse size={20} strokeWidth={1.5} />,
                    permissions: hasAnyPermission(["suppliers-access"]),
                },
                {
                    title: "Satuan",
                    href: route("units.index"),
                    active: url.startsWith("/dashboard/units"),
                    icon: <IconScale size={20} strokeWidth={1.5} />,
                    permissions: hasAnyPermission(["units-access"]),
                },
                {
                    title: "Jasa",
                    href: route("services.index"),
                    active: url.startsWith("/dashboard/services"),
                    icon: <IconBriefcase size={20} strokeWidth={1.5} />,
                    permissions: hasAnyPermission(["services-access"]),
                },
                {
                    title: "Hadiah Poin",
                    href: route("point-prizes.index"),
                    active: url === "/dashboard/point-prizes" || url.startsWith("/dashboard/point-prizes"),
                    icon: <IconGift size={20} strokeWidth={1.5} />,
                    permissions: hasAnyPermission(["point-prizes-access"]),
                },
            ],
        },
        {
            title: "Sales",
            details: [
                {
                    title: "POS Kasir",
                    href: route("transactions.index"),
                    active: url === "/dashboard/transactions" ? true : false, // Update comparison here
                    icon: <IconShoppingCart size={20} strokeWidth={1.5} />,
                    permissions: hasAnyPermission(["transactions-access"]),
                },
                {
                    title: "Riwayat Transaksi",
                    href: route("transactions.history"),
                    active:
                        url === "/dashboard/transactions/history"
                            ? true
                            : false,
                    icon: <IconClockHour6 size={20} strokeWidth={1.5} />,
                    permissions: hasAnyPermission(["transactions-access"]),
                },
                {
                    title: "Retur Penjualan",
                    href: route("sales-returns.index"),
                    active: url.startsWith("/dashboard/sales-returns"),
                    icon: <IconFileCertificate size={20} strokeWidth={1.5} />,
                    permissions: hasAnyPermission(["sales-returns-access"]),
                },
                {
                    title: "Piutang",
                    href: route("receivables.index"),
                    active: url.startsWith("/dashboard/receivables"),
                    icon: <IconFileInvoice size={20} strokeWidth={1.5} />,
                    permissions: hasAnyPermission(["receivables-access"]),
                },
                {
                    title: "Aging & Pengingat",
                    href: route("aging.index"),
                    active: url.startsWith("/dashboard/aging"),
                    icon: <IconChartBar size={20} strokeWidth={1.5} />,
                    permissions: hasAnyPermission(["receivables-access"]),
                },
            ],
        },
        {
            title: "Inventory",
            details: [
                {
                    title: "Stock Opname",
                    href: route("stock-opnames.index"),
                    active: url.startsWith("/dashboard/stock-opnames"),
                    icon: <IconFileDescription size={20} strokeWidth={1.5} />,
                    permissions: hasAnyPermission(["stock-opnames-access"]),
                },
                {
                    title: "Mutasi Stok",
                    href: route("stock-mutations.index"),
                    active: url.startsWith("/dashboard/stock-mutations"),
                    icon: (
                        <IconChartArrowsVertical size={20} strokeWidth={1.5} />
                    ),
                    permissions: hasAnyPermission(["stock-mutations-access"]),
                },
            ],
        },
        {
            title: "Procurement",
            details: [
                {
                    title: "Purchase Order",
                    href: route("purchase-orders.index"),
                    active: url.startsWith("/dashboard/purchase-orders"),
                    icon: <IconClipboardCheck size={20} strokeWidth={1.5} />,
                    permissions: hasAnyPermission(["purchase-orders-access"]),
                },
                {
                    title: "Penerimaan Barang",
                    href: route("goods-receivings.index"),
                    active: url.startsWith("/dashboard/goods-receivings"),
                    icon: <IconTruckDelivery size={20} strokeWidth={1.5} />,
                    permissions: hasAnyPermission(["goods-receivings-access"]),
                },
                {
                    title: "Retur Supplier",
                    href: route("supplier-returns.index"),
                    active: url.startsWith("/dashboard/supplier-returns"),
                    icon: <IconTruckReturn size={20} strokeWidth={1.5} />,
                    permissions: hasAnyPermission(["supplier-returns-access"]),
                },
                {
                    title: "Hutang Supplier",
                    href: route("payables.index"),
                    active: url.startsWith("/dashboard/payables"),
                    icon: <IconCurrencyDollar size={20} strokeWidth={1.5} />,
                    permissions: hasAnyPermission(["payables-access"]),
                },
            ],
        },
        {
            title: "Reports",
            details: [
                {
                    title: "Laporan Penjualan",
                    href: route("reports.sales.index"),
                    active: url.startsWith("/dashboard/reports/sales"),
                    icon: (
                        <IconChartArrowsVertical size={20} strokeWidth={1.5} />
                    ),
                    permissions: hasAnyPermission(["reports-access"]),
                },
                {
                    title: "Laporan Keuntungan",
                    href: route("reports.profits.index"),
                    active: url.startsWith("/dashboard/reports/profits"),
                    icon: <IconChartBarPopular size={20} strokeWidth={1.5} />,
                    permissions: hasAnyPermission(["profits-access"]),
                },
                {
                    title: "Advanced Insights",
                    href: route("reports.insights.index"),
                    active: url.startsWith("/dashboard/reports/insights"),
                    icon: <IconChartBar size={20} strokeWidth={1.5} />,
                    permissions: hasAnyPermission(["reports-access"]),
                },
            ],
        },
        {
            title: "Agen Link",
            details: [
                {
                    title: "Pencatatan Agen",
                    href: route("agent-transactions.index"),
                    active: url.startsWith("/dashboard/agent-transactions") || url.startsWith("/dashboard/agent-transactions/print"),
                    icon: <IconBuildingBank size={20} strokeWidth={1.5} />,
                    permissions: hasAnyPermission(["agent-transactions-access"]),
                },
                {
                    title: "Tipe Transaksi",
                    href: route("agent-transaction-types.index"),
                    active: url.startsWith("/dashboard/agent-transaction-types"),
                    icon: <IconTable size={20} strokeWidth={1.5} />,
                    permissions: hasAnyPermission(["agent-transaction-types-access"]),
                },
                {
                    title: "Admin Bank Link",
                    href: route("agent-admin-banks.index"),
                    active: url.startsWith("/dashboard/agent-admin-banks"),
                    icon: <IconTable size={20} strokeWidth={1.5} />,
                    permissions: hasAnyPermission(["agent-admin-banks-access"]),
                },
                {
                    title: "Admin Loket",
                    href: route("agent-admin-lokets.index"),
                    active: url.startsWith("/dashboard/agent-admin-lokets"),
                    icon: <IconTable size={20} strokeWidth={1.5} />,
                    permissions: hasAnyPermission(["agent-admin-lokets-access"]),
                },
                {
                    title: "Rekening Bank",
                    href: route("settings.bank-accounts.index"),
                    active: url.startsWith("/dashboard/settings/bank-accounts"),
                    icon: <IconCreditCard size={20} strokeWidth={1.5} />,
                    permissions: hasAnyPermission(["payment-settings-access"]),
                },
            ],
        },
        {
            title: "Operations & Control",
            details: [
                {
                    title: "Shift Kasir",
                    href: route("cashier-shifts.index"),
                    active: url.startsWith("/dashboard/cashier-shifts"),
                    icon: <IconWallet size={20} strokeWidth={1.5} />,
                    permissions: hasAnyPermission(["cashier-shifts-access"]),
                },
                {
                    title: "Audit Log",
                    href: route("audit-logs.index"),
                    active: url.startsWith("/dashboard/audit-logs"),
                    icon: <IconFileSearch size={20} strokeWidth={1.5} />,
                    permissions: hasAnyPermission(["audit-logs-access"]),
                },
            ],
        },
        {
            title: "User Management",
            details: [
                {
                    title: "Hak Akses",
                    href: route("permissions.index"),
                    active: url === "/dashboard/permissions" ? true : false, // Update comparison here
                    icon: <IconUserBolt size={20} strokeWidth={1.5} />,
                    permissions: hasAnyPermission(["permissions-access"]),
                },
                {
                    title: "Akses Group",
                    href: route("roles.index"),
                    active: url === "/dashboard/roles" ? true : false, // Update comparison here
                    icon: <IconUserShield size={20} strokeWidth={1.5} />,
                    permissions: hasAnyPermission(["roles-access"]),
                },
                {
                    title: "Pengguna",
                    icon: <IconUsers size={20} strokeWidth={1.5} />,
                    permissions: hasAnyPermission(["users-access"]),
                    subdetails: [
                        {
                            title: "Data Pengguna",
                            href: route("users.index"),
                            icon: <IconTable size={20} strokeWidth={1.5} />,
                            active: url === "/dashboard/users" ? true : false,
                            permissions: hasAnyPermission(["users-access"]),
                        },
                        {
                            title: "Tambah Data Pengguna",
                            href: route("users.create"),
                            icon: (
                                <IconCirclePlus size={20} strokeWidth={1.5} />
                            ),
                            active:
                                url === "/dashboard/users/create"
                                    ? true
                                    : false,
                            permissions: hasAnyPermission(["users-create"]),
                        },
                    ],
                },
            ],
        },
        {
            title: "Pengaturan",
            details: [
                {
                    title: "Profil Toko",
                    href: route("settings.store"),
                    active: url === "/dashboard/settings/store",
                    icon: <IconBuildingStore size={20} strokeWidth={1.5} />,
                    permissions: hasAnyPermission(["dashboard-access"]),
                },
                {
                    title: "Target Penjualan",
                    href: route("settings.target"),
                    active: url === "/dashboard/settings/target",
                    icon: <IconChartInfographic size={20} strokeWidth={1.5} />,
                    permissions: hasAnyPermission(["dashboard-access"]),
                },
                {
                    title: "Poin Pelanggan",
                    href: route("settings.loyalty"),
                    active: url === "/dashboard/settings/loyalty",
                    icon: <IconCrown size={20} strokeWidth={1.5} />,
                    permissions: hasAnyPermission(["dashboard-access"]),
                },
            ],
        },
    ];

    return menuNavigation;
}
