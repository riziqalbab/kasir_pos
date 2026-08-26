import React from "react";
import { Head, Link, usePage } from "@inertiajs/react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import {
    IconShoppingCart,
    IconBox,
    IconFolder,
    IconUsers,
    IconBuildingWarehouse,
    IconScale,
    IconBriefcase,
    IconGift,
    IconFileInvoice,
    IconCurrencyDollar,
    IconClipboardCheck,
    IconTruckDelivery,
    IconTruckReturn,
    IconFileCertificate,
    IconFileDescription,
    IconChartArrowsVertical,
    IconChartBarPopular,
    IconBuildingBank,
    IconWallet,
    IconFileSearch,
    IconUserShield,
    IconBuildingStore,
} from "@tabler/icons-react";
import hasAnyPermission from "@/Utils/Permission";

const cards = [
    {
        title: "POS Transaksi",
        desc: "Mulai transaksi kasir",
        icon: <IconShoppingCart size={22} />,
        route: "transactions.index",
        perms: ["transactions-access"],
    },
    {
        title: "Produk",
        desc: "Kelola data produk & stok",
        icon: <IconBox size={22} />,
        route: "products.index",
        perms: ["products-access"],
    },
    {
        title: "Kategori",
        desc: "Kelola kategori produk",
        icon: <IconFolder size={22} />,
        route: "categories.index",
        perms: ["categories-access"],
    },
    {
        title: "Pelanggan",
        desc: "Kelola data pelanggan",
        icon: <IconUsers size={22} />,
        route: "customers.index",
        perms: ["customers-access"],
    },
    {
        title: "Supplier",
        desc: "Kelola data supplier",
        icon: <IconBuildingWarehouse size={22} />,
        route: "suppliers.index",
        perms: ["suppliers-access"],
    },
    {
        title: "Satuan Unit",
        desc: "Kelola satuan multi-unit",
        icon: <IconScale size={22} />,
        route: "units.index",
        perms: ["units-access"],
    },
    {
        title: "Jasa",
        desc: "Kelola layanan jasa",
        icon: <IconBriefcase size={22} />,
        route: "services.index",
        perms: ["services-access"],
    },
    {
        title: "Hadiah Poin",
        desc: "Kelola katalog hadiah poin",
        icon: <IconGift size={22} />,
        route: "point-prizes.index",
        perms: ["point-prizes-access"],
    },
    {
        title: "Stock Opname",
        desc: "Audit & penyesuaian stok",
        icon: <IconFileDescription size={22} />,
        route: "stock-opnames.index",
        perms: ["stock-opnames-access"],
    },
    {
        title: "Mutasi Stok",
        desc: "Riwayat keluar masuk stok",
        icon: <IconChartArrowsVertical size={22} />,
        route: "stock-mutations.index",
        perms: ["stock-mutations-access"],
    },
    {
        title: "Purchase Order",
        desc: "Pemesanan barang ke supplier",
        icon: <IconClipboardCheck size={22} />,
        route: "purchase-orders.index",
        perms: ["purchase-orders-access"],
    },
    {
        title: "Penerimaan Barang",
        desc: "Penerimaan PO dari supplier",
        icon: <IconTruckDelivery size={22} />,
        route: "goods-receivings.index",
        perms: ["goods-receivings-access"],
    },
    {
        title: "Retur Penjualan",
        desc: "Kelola retur pelanggan",
        icon: <IconFileCertificate size={22} />,
        route: "sales-returns.index",
        perms: ["sales-returns-access"],
    },
    {
        title: "Retur Supplier",
        desc: "Kelola retur barang ke supplier",
        icon: <IconTruckReturn size={22} />,
        route: "supplier-returns.index",
        perms: ["supplier-returns-access"],
    },
    {
        title: "Piutang Pelanggan",
        desc: "Nota barang pelanggan & pembayaran",
        icon: <IconFileInvoice size={22} />,
        route: "receivables.index",
        perms: ["receivables-access"],
    },
    {
        title: "Hutang Supplier",
        desc: "Catat hutang supplier & pembayaran",
        icon: <IconCurrencyDollar size={22} />,
        route: "payables.index",
        perms: ["payables-access"],
    },
    {
        title: "Laporan Penjualan",
        desc: "Lihat ringkasan & laporan penjualan",
        icon: <IconChartArrowsVertical size={22} />,
        route: "reports.sales.index",
        perms: ["reports-access"],
    },
    {
        title: "Laporan Keuntungan",
        desc: "Lihat laporan profit & margin",
        icon: <IconChartBarPopular size={22} />,
        route: "reports.profits.index",
        perms: ["profits-access"],
    },
    {
        title: "Transaksi Agen",
        desc: "Pencatatan transaksi agen link",
        icon: <IconBuildingBank size={22} />,
        route: "agent-transactions.index",
        perms: ["agent-transactions-access"],
    },
    {
        title: "Shift Kasir",
        desc: "Buka, tutup & pantau shift kasir",
        icon: <IconWallet size={22} />,
        route: "cashier-shifts.index",
        perms: ["cashier-shifts-access"],
    },
    {
        title: "Audit Log",
        desc: "Riwayat aktivitas sistem",
        icon: <IconFileSearch size={22} />,
        route: "audit-logs.index",
        perms: ["audit-logs-access"],
    },
    {
        title: "Data Pengguna",
        desc: "Kelola pengguna & hak akses",
        icon: <IconUserShield size={22} />,
        route: "users.index",
        perms: ["users-access"],
    },
    {
        title: "Pengaturan Toko",
        desc: "Profil toko, target & loyalitas",
        icon: <IconBuildingStore size={22} />,
        route: "settings.store",
        perms: ["settings-access"],
    },
];

function AccessPage() {
    const { auth } = usePage().props;

    const visibleCards = cards.filter((card) =>
        hasAnyPermission(card.perms, auth?.permissions)
    );

    return (
        <>
            <Head title="Pilih Akses" />
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                        Pilih Akses
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Menu yang tersedia sesuai dengan hak akses akun Anda.
                    </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {visibleCards.length ? (
                        visibleCards.map((card) => (
                            <Link
                                key={card.title}
                                href={route(card.route)}
                                className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-start gap-3 hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-md transition-all shadow-sm"
                            >
                                <div className="w-11 h-11 rounded-xl bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-300 flex items-center justify-center shrink-0">
                                    {card.icon}
                                </div>
                                <div className="space-y-1 min-w-0">
                                    <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                                        {card.title}
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                                        {card.desc}
                                    </p>
                                </div>
                            </Link>
                        ))
                    ) : (
                        <div className="col-span-full text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                            Tidak ada modul yang dapat diakses. Silakan hubungi administrator.
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

AccessPage.layout = (page) => <DashboardLayout children={page} />;

export default AccessPage;
