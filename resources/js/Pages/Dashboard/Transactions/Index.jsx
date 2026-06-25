import React, {
    useEffect,
    useMemo,
    useState,
    useCallback,
    useRef,
} from "react";
import { Head, router, usePage, useForm } from "@inertiajs/react";
import axios from "axios";
import toast from "react-hot-toast";
import POSLayout from "@/Layouts/POSLayout";
import ProductGrid from "@/Components/POS/ProductGrid";
import CartPanel from "@/Components/POS/CartPanel";
import PaymentPanel from "@/Components/POS/PaymentPanel";
import CustomerSelect from "@/Components/POS/CustomerSelect";
import NumpadModal from "@/Components/POS/NumpadModal";
import HeldTransactions, {
    HoldButton,
} from "@/Components/POS/HeldTransactions";
import useBarcodeScanner from "@/Hooks/useBarcodeScanner";
import { getProductImageUrl } from "@/Utils/imageUrl";
import { useAuthorization } from "@/Utils/authorization";
import Pagination from "@/Components/Dashboard/Pagination";
import {
    IconUser,
    IconShoppingCart,
    IconReceipt,
    IconKeyboard,
    IconBarcode,
    IconTrash,
    IconCash,
    IconCreditCard,
    IconBuildingBank,
    IconAlertTriangle,
    IconWallet,
    IconTools,
    IconPlus,
    IconSearch,
    IconX,
    IconPencil,
    IconPrinter,
    IconTrendingUp,
    IconCurrencyDollar,
    IconAlertCircle,
    IconDeviceFloppy,
    IconCalendar,
    IconPercentage,
    IconRefresh,
} from "@tabler/icons-react";

const formatPrice = (value = 0) =>
    Number(value || 0).toLocaleString("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
    });

export default function Index({
    carts = [],
    carts_total = 0,
    heldCarts = [],
    customers = [],
    products = [],
    services = [],
    categories = [],
    initialPricingPreview = { items: [], summary: {} },
    paymentGateways = [],
    defaultPaymentGateway = "cash",
    bankAccounts = [],
    // Agent props
    agentTransactions = {},
    agentFilters = {},
    agentStats = {},
    agentTransactionTypes = [],
    agentAdminBanks = [],
    agentAdminLokets = [],
}) {
    const {
        auth,
        errors,
        lowStockNotifications = [],
        activeCashierShift,
    } = usePage().props;
    const { can } = useAuthorization();
    const canOpenShift = can("cashier-shifts-open");

    // State
    const urlParams = useMemo(() => new URLSearchParams(typeof window !== "undefined" ? window.location.search : ""), []);
    const getInitialMode = () => {
        const mode = urlParams.get("mode");
        if (mode === "jasa") return "jasa";
        if (mode === "agen_link") return "agen_link";
        return "produk";
    };
    const [transactionMode, setTransactionMode] = useState(getInitialMode());

    // Agent Permissions
    const canCreateAgent = can("agent-transactions-create") && activeCashierShift !== null;
    const canEditAgent = can("agent-transactions-edit");
    const canDeleteAgent = can("agent-transactions-delete");

    // Agent useForm
    const {
        data: agentData,
        setData: setAgentData,
        post: postAgent,
        put: putAgent,
        processing: agentProcessing,
        errors: agentErrors,
        reset: resetAgent,
        clearErrors: clearAgentErrors,
    } = useForm({
        agent_transaction_type_id: "",
        bank_account_id: "",
        agent_admin_bank_id: "",
        agent_admin_loket_id: "",
        customer_name: "",
        customer_phone: "",
        reference_number: "",
        nominal: "",
        admin_fee_customer: 0,
        admin_fee_bank: 0,
        admin_fee_payment_method: "cash",
        status: "success",
        notes: "",
    });

    const [editingAgentTx, setEditingAgentTx] = useState(null);

    // Agent filters
    const [agentSearch, setAgentSearch] = useState(agentFilters?.search || "");
    const [agentStartDate, setAgentStartDate] = useState(agentFilters?.start_date || "");
    const [agentEndDate, setAgentEndDate] = useState(agentFilters?.end_date || "");
    const [agentTypeId, setAgentTypeId] = useState(agentFilters?.type_id || "");
    const [agentBankAccountId, setAgentBankAccountId] = useState(agentFilters?.bank_account_id || "");
    const [agentStatusFilter, setAgentStatusFilter] = useState(agentFilters?.status || "");

    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [isSearching, setIsSearching] = useState(false);
    const [addingProductId, setAddingProductId] = useState(null);
    const [removingItemId, setRemovingItemId] = useState(null);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [pricingPreview, setPricingPreview] = useState(initialPricingPreview);
    const [isLoadingPricing, setIsLoadingPricing] = useState(false);
    const [discountInput, setDiscountInput] = useState("");
    const [redeemPointsInput, setRedeemPointsInput] = useState("");
    const [cashInput, setCashInput] = useState("");
    const [shippingInput, setShippingInput] = useState("");
    const [paymentMethod, setPaymentMethod] = useState(
        defaultPaymentGateway ?? "cash"
    );
    const [payLater, setPayLater] = useState(false);
    const [dueDate, setDueDate] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [mobileView, setMobileView] = useState("products"); // 'products' | 'cart'
    const [numpadOpen, setNumpadOpen] = useState(false);
    const [showShortcuts, setShowShortcuts] = useState(false);
    const [selectedBankAccount, setSelectedBankAccount] = useState(null);
    const [openingCashInput, setOpeningCashInput] = useState("");
    const [shiftNotesInput, setShiftNotesInput] = useState("");
    const normalizedSelectedCategory =
        selectedCategory === null ? null : Number(selectedCategory);
    const pricingItemsByCartId = useMemo(() => {
        const items = pricingPreview?.items || [];

        return items.reduce((accumulator, item) => {
            accumulator[item.cart_id] = item;

            return accumulator;
        }, {});
    }, [pricingPreview]);

    // Ref for search input to enable keyboard focus
    const searchInputRef = useRef(null);

    // Set default payment method
    useEffect(() => {
        setPaymentMethod(defaultPaymentGateway ?? "cash");
    }, [defaultPaymentGateway]);

    // Clear search and category on mode change
    useEffect(() => {
        setSearchQuery("");
        setSelectedCategory(null);
    }, [transactionMode]);

    useEffect(() => {
        setPricingPreview(initialPricingPreview);
    }, [initialPricingPreview]);

    // Barcode scanner integration
    const handleBarcodeScan = useCallback(
        (barcode) => {
            const product = products.find(
                (p) => p.barcode?.toLowerCase() === barcode.toLowerCase()
            );

            if (product) {
                if (product.stock > 0) {
                    handleAddToCart(product);
                    toast.success(`${product.title} ditambahkan (barcode)`);
                } else {
                    toast.error(`${product.title} stok habis`);
                }
            } else {
                toast.error(`Produk tidak ditemukan: ${barcode}`);
            }
        },
        [products]
    );

    const { isScanning } = useBarcodeScanner(handleBarcodeScan, {
        enabled: true,
        minLength: 3,
    });

    const LowStockAlerts = () => null;

    // Calculations
    const discount = useMemo(
        () => Math.max(0, Number(discountInput) || 0),
        [discountInput]
    );
    const shipping = useMemo(
        () => Math.max(0, Number(shippingInput) || 0),
        [shippingInput]
    );
    const baseSubtotal = useMemo(
        () => Number(pricingPreview?.summary?.base_subtotal ?? carts_total ?? 0),
        [pricingPreview, carts_total]
    );
    const promoDiscount = useMemo(
        () => Number(pricingPreview?.summary?.promo_discount_total ?? 0),
        [pricingPreview]
    );
    const voucherDiscount = 0;
    const loyaltyDiscount = 0;
    const subtotal = useMemo(
        () => Number(pricingPreview?.summary?.subtotal_after_promo ?? 0),
        [pricingPreview]
    );
    const payable = useMemo(
        () => Number(pricingPreview?.summary?.grand_total ?? 0),
        [pricingPreview]
    );
    const isCashPayment = !payLater && paymentMethod === "cash";
    const cash = useMemo(
        () => (isCashPayment ? Math.max(0, Number(cashInput) || 0) : payable),
        [cashInput, isCashPayment, payable]
    );
    const cartCount = useMemo(
        () => carts.reduce((total, item) => total + Number(item.qty), 0),
        [carts]
    );
    const pricingDependency = useMemo(
        () => carts.map((item) => `${item.id}:${item.qty}`).join("|"),
        [carts]
    );

    useEffect(() => {
        if (carts.length === 0) {
            setPricingPreview({
                items: [],
                summary: {
                    base_subtotal: 0,
                    promo_discount_total: 0,
                    subtotal_after_promo: 0,
                    voucher_discount_total: 0,
                    loyalty_discount_total: 0,
                    manual_discount_total: 0,
                    shipping_cost: 0,
                    grand_total: 0,
                },
            });

            return;
        }

        let cancelled = false;
        setIsLoadingPricing(true);

        axios
            .post(route("transactions.pricing-preview"), {
                customer_id: selectedCustomer?.id ?? null,
                discount,
                shipping_cost: shipping,
                redeem_points: Number(redeemPointsInput || 0),
                customer_voucher_id: null,
            })
            .then((response) => {
                if (!cancelled) {
                    setPricingPreview(response.data?.data ?? initialPricingPreview);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    toast.error("Gagal memuat promo aktif");
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setIsLoadingPricing(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [
        selectedCustomer?.id,
        pricingDependency,
        discount,
        shipping,
        redeemPointsInput,
    ]);

    useEffect(() => {
        if (!selectedCustomer?.is_loyalty_member) {
            setRedeemPointsInput("");
        }
    }, [selectedCustomer?.id, selectedCustomer?.is_loyalty_member]);

    // Payment options
    const paymentOptions = useMemo(() => {
        const options = Array.isArray(paymentGateways)
            ? paymentGateways.filter(
                  (gateway) =>
                      gateway?.value && gateway.value.toLowerCase() !== "cash"
              )
            : [];

        return [
            {
                value: "cash",
                label: "Tunai",
                description: "Pembayaran tunai langsung di kasir.",
            },
            ...options,
        ];
    }, [paymentGateways]);

    // Auto-set cash input for non-cash payment
    useEffect(() => {
        if (!isCashPayment && payable >= 0) {
            setCashInput(String(payable));
        }
    }, [isCashPayment, payable]);


    const handleOpenShift = () => {
        router.post(route("cashier-shifts.store"), {
            opening_cash: Number(openingCashInput || 0),
            notes: shiftNotesInput,
            redirect_to: "transactions",
        });
    };

    // Handle add product to cart
    const handleAddToCart = async (item) => {
        if (!item?.id) return;

        setAddingProductId(item.id);

        const payload = item.is_service
            ? { service_id: item.id, qty: 1 }
            : { product_id: item.id, sell_price: item.sell_price, qty: 1 };

        router.post(
            route("transactions.addToCart"),
            payload,
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success(`${item.title} ditambahkan`);
                    setAddingProductId(null);
                },
                onError: () => {
                    toast.error("Gagal menambahkan item");
                    setAddingProductId(null);
                },
            }
        );
    };

    // Handle update cart quantity
    const [updatingCartId, setUpdatingCartId] = useState(null);

    const handleUpdateQty = (cartId, newQty) => {
        if (newQty < 1) return;
        setUpdatingCartId(cartId);

        router.patch(
            route("transactions.updateCart", cartId),
            { qty: newQty },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setUpdatingCartId(null);
                },
                onError: (errors) => {
                    toast.error(errors?.message || "Gagal update quantity");
                    setUpdatingCartId(null);
                },
            }
        );
    };

    const handleUpdateUnit = (cartId, newSatuanKey) => {
        setUpdatingCartId(cartId);

        router.patch(
            route("transactions.updateCart", cartId),
            { satuan_key: newSatuanKey },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setUpdatingCartId(null);
                },
                onError: (errors) => {
                    toast.error(errors?.message || "Gagal update satuan");
                    setUpdatingCartId(null);
                },
            }
        );
    };

    // Handle numpad confirm for cash input
    const handleNumpadConfirm = useCallback((value) => {
        setCashInput(String(value));
    }, []);

    // Handle hold transaction
    const [isHolding, setIsHolding] = useState(false);

    const handleHoldCart = async (label = null) => {
        if (carts.length === 0) {
            toast.error("Keranjang kosong");
            return;
        }

        setIsHolding(true);

        router.post(
            route("transactions.hold"),
            { label },
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success("Transaksi ditahan");
                    setIsHolding(false);
                },
                onError: (errors) => {
                    toast.error(errors?.message || "Gagal menahan transaksi");
                    setIsHolding(false);
                },
            }
        );
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Don't trigger if user is typing in an input
            if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")
                return;

            switch (e.key) {
                case "/":
                case "F5":
                    e.preventDefault();
                    // Focus search input
                    if (searchInputRef.current) {
                        searchInputRef.current.focus();
                    }
                    break;
                case "F1":
                    e.preventDefault();
                    setNumpadOpen(true);
                    break;
                case "F2":
                    e.preventDefault();
                    if (carts.length > 0)
                        handleSubmitTransaction();
                    break;
                case "F3":
                    e.preventDefault();
                    setMobileView(
                        mobileView === "products" ? "cart" : "products"
                    );
                    break;
                case "F4":
                    e.preventDefault();
                    setShowShortcuts(!showShortcuts);
                    break;
                case "Escape":
                    setNumpadOpen(false);
                    setShowShortcuts(false);
                    setSearchQuery("");
                    break;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [carts, selectedCustomer, mobileView, showShortcuts]);

    // Handle remove from cart
    const handleRemoveFromCart = (cartId) => {
        setRemovingItemId(cartId);

        router.delete(route("transactions.destroyCart", cartId), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success("Item dihapus dari keranjang");
                setRemovingItemId(null);
            },
            onError: () => {
                toast.error("Gagal menghapus item");
                setRemovingItemId(null);
            },
        });
    };

    // Handle submit transaction
    const handleSubmitTransaction = () => {
        if (carts.length === 0) {
            toast.error("Keranjang masih kosong");
            return;
        }

        if (payLater && !selectedCustomer?.id) {
            toast.error("Pilih pelanggan terlebih dahulu untuk transaksi bayar belakangan");
            return;
        }

        if (payLater && !dueDate) {
            toast.error("Isi tanggal jatuh tempo untuk nota barang");
            return;
        }

        if (!payLater && isCashPayment && cash < payable) {
            toast.error("Jumlah pembayaran kurang dari total");
            return;
        }

        // Validate bank transfer requires bank selection
        const isBankTransfer = paymentMethod === "bank_transfer";
        if (isBankTransfer && !selectedBankAccount) {
            toast.error("Pilih rekening bank tujuan");
            return;
        }

        setIsSubmitting(true);

        router.post(
            route("transactions.store"),
            {
                customer_id: selectedCustomer?.id ?? null,
                discount,
                redeem_points: Number(redeemPointsInput || 0),
                customer_voucher_id: null,
                shipping_cost: shipping,
                grand_total: payable,
                cash: isCashPayment ? cash : payable,
                change: isCashPayment ? Math.max(cash - payable, 0) : 0,
                payment_gateway: payLater ? null : isCashPayment ? null : paymentMethod,
                bank_account_id: isBankTransfer
                    ? selectedBankAccount?.id
                    : null,
                pay_later: payLater,
                due_date: dueDate,
            },
            {
                onSuccess: () => {
                    setDiscountInput("");
                    setRedeemPointsInput("");
                    setCashInput("");
                    setShippingInput("");
                    setSelectedCustomer(null);
                    setSelectedBankAccount(null);
                    setPaymentMethod(defaultPaymentGateway ?? "cash");
                    setPayLater(false);
                    setDueDate("");
                    setIsSubmitting(false);
                    toast.success("Transaksi berhasil!");
                },
                onError: () => {
                    setIsSubmitting(false);
                    toast.error("Gagal menyimpan transaksi");
                },
            }
        );
    };

    // Agent Transaction Handlers
    const handleAgentFilterSubmit = (e) => {
        e.preventDefault();
        router.get(
            route("transactions.index"),
            {
                mode: "agen_link",
                search: agentSearch,
                start_date: agentStartDate,
                end_date: agentEndDate,
                type_id: agentTypeId,
                bank_account_id: agentBankAccountId,
                status: agentStatusFilter,
            },
            { preserveState: true }
        );
    };

    const handleAgentResetFilters = () => {
        setAgentSearch("");
        setAgentStartDate("");
        setAgentEndDate("");
        setAgentTypeId("");
        setAgentBankAccountId("");
        setAgentStatusFilter("");
        router.get(
            route("transactions.index"),
            { mode: "agen_link" },
            { preserveState: true }
        );
    };

    const handleAgentTypeChange = (id) => {
        setAgentData("agent_transaction_type_id", id);
        const selectedType = agentTransactionTypes.find((t) => t.id === parseInt(id));
        if (selectedType) {
            const matchingBank = agentAdminBanks.find((b) => b.amount === selectedType.default_admin_fee_bank);
            const matchingLoket = agentAdminLokets.find((l) => l.amount === selectedType.default_admin_fee_customer);

            setAgentData((prevData) => ({
                ...prevData,
                agent_transaction_type_id: id,
                admin_fee_customer: selectedType.default_admin_fee_customer,
                admin_fee_bank: selectedType.default_admin_fee_bank,
                agent_admin_bank_id: matchingBank ? matchingBank.id : "",
                agent_admin_loket_id: matchingLoket ? matchingLoket.id : "",
            }));
        }
    };

    const handleAgentAdminBankChange = (id) => {
        const selectedBank = agentAdminBanks.find((b) => b.id === parseInt(id));
        setAgentData((prevData) => ({
            ...prevData,
            agent_admin_bank_id: id,
            admin_fee_bank: selectedBank ? selectedBank.amount : 0,
        }));
    };

    const handleAgentAdminLoketChange = (id) => {
        const selectedLoket = agentAdminLokets.find((l) => l.id === parseInt(id));
        setAgentData((prevData) => ({
            ...prevData,
            agent_admin_loket_id: id,
            admin_fee_customer: selectedLoket ? selectedLoket.amount : 0,
        }));
    };

    const handleAgentSubmit = (e) => {
        e.preventDefault();
        if (editingAgentTx) {
            putAgent(route("agent-transactions.update", editingAgentTx.id), {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success("Transaksi agen diperbarui.");
                    setEditingAgentTx(null);
                    resetAgent();
                },
                onError: () => {
                    toast.error("Gagal memperbarui transaksi.");
                }
            });
        } else {
            postAgent(route("agent-transactions.store"), {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success("Transaksi agen dicatat.");
                    resetAgent();
                },
                onError: () => {
                    toast.error("Gagal mencatat transaksi.");
                }
            });
        }
    };

    const handleAgentStatusChange = (tx, newStatus) => {
        router.patch(
            route("agent-transactions.status", tx.id),
            { status: newStatus },
            {
                preserveScroll: true,
                onSuccess: () => toast.success("Status transaksi berhasil diubah"),
                onError: (errors) => toast.error(errors?.message || "Gagal mengubah status"),
            }
        );
    };

    const handleAgentDelete = (tx) => {
        if (confirm(`Hapus transaksi senilai Rp ${new Intl.NumberFormat("id-ID").format(tx.nominal)}?`)) {
            router.delete(route("agent-transactions.destroy", tx.id), {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success("Catatan transaksi berhasil dihapus");
                    if (editingAgentTx?.id === tx.id) {
                        handleCancelEditAgent();
                    }
                },
                onError: (errors) => toast.error(errors?.message || "Gagal menghapus transaksi"),
            });
        }
    };

    const handleEditAgent = (tx) => {
        clearAgentErrors();
        setEditingAgentTx(tx);
        setAgentData({
            agent_transaction_type_id: tx.agent_transaction_type_id,
            bank_account_id: tx.bank_account_id || "",
            agent_admin_bank_id: tx.agent_admin_bank_id || "",
            agent_admin_loket_id: tx.agent_admin_loket_id || "",
            customer_name: tx.customer_name || "",
            customer_phone: tx.customer_phone || "",
            reference_number: tx.reference_number || "",
            nominal: tx.nominal,
            admin_fee_customer: tx.admin_fee_customer,
            admin_fee_bank: tx.admin_fee_bank,
            admin_fee_payment_method: tx.admin_fee_payment_method,
            status: tx.status,
            notes: tx.notes || "",
        });
        setMobileView("cart");
    };

    const handleCancelEditAgent = () => {
        setEditingAgentTx(null);
        resetAgent();
        clearAgentErrors();
    };

    const selectedAgentType = agentTransactionTypes.find((t) => t.id === parseInt(agentData.agent_transaction_type_id));
    const agentTxTotal = selectedAgentType && selectedAgentType.type === 'debet'
        ? (parseInt(agentData.nominal) || 0) + (parseInt(agentData.admin_fee_customer) || 0)
        : (parseInt(agentData.nominal) || 0);

    // Filter products or services based on mode
    const displayItems = useMemo(() => {
        if (transactionMode === "jasa") {
            return services
                .map((service) => {
                    const defaultPrice = service.service_prices?.[0]?.price || 0;
                    return {
                        id: service.id,
                        is_service: true,
                        title: service.name,
                        description: service.description || "",
                        sell_price: defaultPrice,
                        stock: 999999,
                        stock_breakdown: "Jasa",
                        category_id: null,
                        category: null,
                        service_prices: service.service_prices || [],
                    };
                })
                .filter((item) => {
                    return (
                        !searchQuery ||
                        item.title.toLowerCase().includes(searchQuery.toLowerCase())
                    );
                });
        }

        return products.filter((product) => {
            const matchesCategory =
                normalizedSelectedCategory === null ||
                Number(product.category_id) === normalizedSelectedCategory;
            const matchesSearch =
                !searchQuery ||
                product.title
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase()) ||
                product.barcode
                    ?.toLowerCase()
                    .includes(searchQuery.toLowerCase());
            return matchesCategory && matchesSearch;
        });
    }, [products, services, transactionMode, normalizedSelectedCategory, searchQuery]);

    if (!activeCashierShift) {
        return (
            <>
                <Head title="Buka Shift Kasir" />

                <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-3xl items-center justify-center px-4 py-10">
                    <div className="w-full rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
                        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                            <IconWallet size={28} />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                            Shift kasir belum dibuka
                        </h1>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                            Buka shift terlebih dulu untuk mengaktifkan transaksi, keranjang, dan cash closing.
                        </p>

                        <div className="mt-6 grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Modal Awal
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={openingCashInput}
                                    onChange={(event) => setOpeningCashInput(event.target.value)}
                                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-800 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                    placeholder="0"
                                />
                                {errors?.opening_cash && (
                                    <p className="mt-2 text-xs text-rose-500">{errors.opening_cash}</p>
                                )}
                            </div>
                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Catatan
                                </label>
                                <input
                                    type="text"
                                    value={shiftNotesInput}
                                    onChange={(event) => setShiftNotesInput(event.target.value)}
                                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-800 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                    placeholder="Opsional"
                                />
                            </div>
                        </div>

                        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                            {canOpenShift && (
                                <button
                                    type="button"
                                    onClick={handleOpenShift}
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-500 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-600"
                                >
                                    <IconWallet size={18} />
                                    <span>Buka Shift Sekarang</span>
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => router.visit(route("cashier-shifts.index"))}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                            >
                                <span>Lihat Histori Shift</span>
                            </button>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <Head title="Transaksi" />

            <div className="h-[calc(100vh-4rem)] flex flex-col lg:flex-row">
                {/* Mobile Tab Switcher */}
                <div className="lg:hidden flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <button
                        onClick={() => setMobileView("products")}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                            mobileView === "products"
                                ? "text-primary-600 border-b-2 border-primary-500"
                                : "text-slate-500"
                        }`}
                    >
                        <IconShoppingCart size={18} />
                        <span>Produk</span>
                    </button>
                    <button
                        onClick={() => setMobileView("cart")}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors relative ${
                            mobileView === "cart"
                                ? "text-primary-600 border-b-2 border-primary-500"
                                : "text-slate-500"
                        }`}
                    >
                        <IconReceipt size={18} />
                        <span className="relative inline-flex items-center gap-1">
                            Keranjang
                            {cartCount > 0 && (
                                <span className="inline-flex items-center justify-center px-1.5 min-w-[20px] h-5 text-[11px] font-bold bg-primary-500 text-white rounded-full">
                                    {cartCount}
                                </span>
                            )}
                        </span>
                    </button>
                </div>

                {/* Left Panel - Products or Agent Link */}
                <div
                    className={`flex-1 bg-slate-100 dark:bg-slate-950 overflow-hidden ${
                        mobileView !== "products"
                            ? "hidden lg:flex lg:flex-col"
                            : "flex flex-col"
                    }`}
                >
                    {/* Transaction Mode Switcher */}
                    <div className="px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0">
                        <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl w-full sm:w-auto">
                            <button
                                type="button"
                                onClick={() => setTransactionMode("produk")}
                                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                    transactionMode === "produk"
                                        ? "bg-white dark:bg-slate-950/20 dark:bg-slate-900 text-primary-600 dark:text-primary-400 shadow-sm"
                                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                                }`}
                            >
                                <IconShoppingCart size={16} />
                                <span>Produk</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setTransactionMode("jasa")}
                                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                    transactionMode === "jasa"
                                        ? "bg-white dark:bg-slate-950/20 dark:bg-slate-900 text-primary-600 dark:text-primary-400 shadow-sm"
                                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                                }`}
                            >
                                <IconTools size={16} />
                                <span>Jasa / Layanan</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setTransactionMode("agen_link")}
                                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                    transactionMode === "agen_link"
                                        ? "bg-white dark:bg-slate-950/20 dark:bg-slate-900 text-primary-600 dark:text-primary-400 shadow-sm"
                                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                                }`}
                            >
                                <IconBuildingBank size={16} />
                                <span>Agen Link</span>
                            </button>
                        </div>
                        {transactionMode === "jasa" && (
                            <span className="text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full self-start sm:self-auto">
                                Mode Jasa Aktif
                            </span>
                        )}
                        {transactionMode === "agen_link" && (
                            <span className="text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full self-start sm:self-auto">
                                Mode Agen Link Aktif
                            </span>
                        )}
                    </div>

                    {transactionMode === "agen_link" ? (
                        /* Agent Link History List & Stats */
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                            {/* Stats Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 text-white p-3 rounded-xl shadow-sm">
                                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-85">Volume Transaksi</span>
                                    <p className="text-sm font-bold truncate mt-1">{formatPrice(agentStats?.total_volume || 0)}</p>
                                </div>
                                <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white p-3 rounded-xl shadow-sm">
                                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-85">Laba Bersih</span>
                                    <p className="text-sm font-bold truncate mt-1">{formatPrice(agentStats?.total_profit || 0)}</p>
                                </div>
                                <div className="bg-gradient-to-br from-amber-500 to-amber-700 text-white p-3 rounded-xl shadow-sm">
                                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-85">Admin Loket</span>
                                    <p className="text-sm font-bold truncate mt-1">{formatPrice(agentStats?.total_customer_fees || 0)}</p>
                                </div>
                                <div className="bg-gradient-to-br from-rose-500 to-rose-700 text-white p-3 rounded-xl shadow-sm">
                                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-85">Admin Bank</span>
                                    <p className="text-sm font-bold truncate mt-1">{formatPrice(agentStats?.total_bank_fees || 0)}</p>
                                </div>
                            </div>

                            {/* Search & Filter Card */}
                            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                <form onSubmit={handleAgentFilterSubmit} className="space-y-3">
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                                        <div className="col-span-2 sm:col-span-1">
                                            <label className="block text-[10px] font-semibold text-slate-500 mb-1">Cari Pelanggan/Ref</label>
                                            <input
                                                type="text"
                                                value={agentSearch}
                                                onChange={(e) => setAgentSearch(e.target.value)}
                                                placeholder="Cari..."
                                                className="w-full px-2.5 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-semibold text-slate-500 mb-1">Tipe Transaksi</label>
                                            <select
                                                value={agentTypeId}
                                                onChange={(e) => setAgentTypeId(e.target.value)}
                                                className="w-full px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none"
                                            >
                                                <option value="">Semua</option>
                                                {agentTransactionTypes.map((type) => (
                                                    <option key={type.id} value={type.id}>
                                                        {type.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-semibold text-slate-500 mb-1">EDC / Rekening</label>
                                            <select
                                                value={agentBankAccountId}
                                                onChange={(e) => setAgentBankAccountId(e.target.value)}
                                                className="w-full px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none"
                                            >
                                                <option value="">Semua</option>
                                                {bankAccounts.map((bank) => (
                                                    <option key={bank.id} value={bank.id}>
                                                        {bank.bank_name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-semibold text-slate-500 mb-1">Status</label>
                                            <select
                                                value={agentStatusFilter}
                                                onChange={(e) => setAgentStatusFilter(e.target.value)}
                                                className="w-full px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none"
                                            >
                                                <option value="">Semua</option>
                                                <option value="success">Berhasil</option>
                                                <option value="pending">Pending</option>
                                                <option value="failed">Gagal</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-semibold text-slate-500 mb-1">Tgl Mulai</label>
                                            <input
                                                type="date"
                                                value={agentStartDate}
                                                onChange={(e) => setAgentStartDate(e.target.value)}
                                                className="w-full px-2 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-semibold text-slate-500 mb-1">Tgl Akhir</label>
                                            <input
                                                type="date"
                                                value={agentEndDate}
                                                onChange={(e) => setAgentEndDate(e.target.value)}
                                                className="w-full px-2 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-1.5">
                                        <button
                                            type="button"
                                            onClick={handleAgentResetFilters}
                                            className="px-2.5 py-1 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-lg text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                        >
                                            Reset
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-2.5 py-1 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-xs font-semibold shadow-md transition-colors"
                                        >
                                            Filter
                                        </button>
                                    </div>
                                </form>
                            </div>

                            {/* List Table Card */}
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse text-xs">
                                        <thead>
                                            <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                                                <th className="p-3 font-semibold uppercase text-slate-500 dark:text-slate-400">Waktu</th>
                                                <th className="p-3 font-semibold uppercase text-slate-500 dark:text-slate-400">Layanan</th>
                                                <th className="p-3 font-semibold uppercase text-slate-500 dark:text-slate-400">EDC/Bank</th>
                                                <th className="p-3 font-semibold uppercase text-slate-500 dark:text-slate-400">Nominal</th>
                                                <th className="p-3 font-semibold uppercase text-slate-500 dark:text-slate-400">Admin Loket</th>
                                                <th className="p-3 font-semibold uppercase text-slate-500 dark:text-slate-400">Laba</th>
                                                <th className="p-3 font-semibold uppercase text-slate-500 dark:text-slate-400">Status</th>
                                                <th className="p-3 font-semibold uppercase text-slate-500 dark:text-slate-400 text-right">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {agentTransactions?.data && agentTransactions.data.length > 0 ? (
                                                agentTransactions.data.map((tx) => (
                                                    <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                                                        <td className="p-3 text-slate-500 whitespace-nowrap">
                                                            {tx.transaction_date ? new Date(tx.transaction_date).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" }) : "-"}
                                                        </td>
                                                        <td className="p-3">
                                                            <p className="font-semibold text-slate-800 dark:text-slate-200">
                                                                {tx.agent_transaction_type?.name || "-"}
                                                            </p>
                                                            {tx.customer_name && (
                                                                <p className="text-[10px] text-slate-400 mt-0.5">
                                                                    Cst: {tx.customer_name}
                                                                </p>
                                                            )}
                                                        </td>
                                                        <td className="p-3 text-slate-600 dark:text-slate-400">
                                                            {tx.bank_account ? (
                                                                <span className="font-medium">{tx.bank_account.bank_name}</span>
                                                            ) : (
                                                                <span className="text-slate-400">Cash</span>
                                                            )}
                                                        </td>
                                                        <td className="p-3 font-bold text-slate-800 dark:text-slate-200">
                                                            {formatPrice(tx.nominal)}
                                                        </td>
                                                        <td className="p-3">
                                                            <p className="font-semibold text-slate-700 dark:text-slate-300">{formatPrice(tx.admin_fee_customer)}</p>
                                                            <span className="inline-block px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[9px] text-slate-500 uppercase font-bold">
                                                                {tx.admin_fee_payment_method}
                                                            </span>
                                                        </td>
                                                        <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">
                                                            {formatPrice(tx.net_profit)}
                                                        </td>
                                                        <td className="p-3">
                                                            <select
                                                                value={tx.status}
                                                                onChange={(e) => handleAgentStatusChange(tx, e.target.value)}
                                                                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold focus:outline-none border-0 ring-1 ring-inset cursor-pointer ${
                                                                    tx.status === "success"
                                                                        ? "bg-success-50 text-success-700 ring-success-600/10 dark:bg-success-950/20 dark:text-success-400"
                                                                        : tx.status === "pending"
                                                                        ? "bg-amber-50 text-amber-700 ring-amber-600/10 dark:bg-amber-950/20 dark:text-amber-400"
                                                                        : "bg-danger-50 text-danger-700 ring-danger-600/10 dark:bg-danger-950/20 dark:text-danger-400"
                                                                }`}
                                                            >
                                                                <option value="success">Berhasil</option>
                                                                <option value="pending">Pending</option>
                                                                <option value="failed">Gagal</option>
                                                            </select>
                                                        </td>
                                                        <td className="p-3 text-right">
                                                            <div className="flex items-center justify-end gap-1">
                                                                <a
                                                                    href={route("agent-transactions.print", tx.id)}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="p-1 rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                                                                    title="Cetak Struk"
                                                                >
                                                                    <IconPrinter size={16} />
                                                                </a>
                                                                {canEditAgent && (
                                                                    <button
                                                                        onClick={() => handleEditAgent(tx)}
                                                                        className="p-1 rounded text-warning-500 hover:bg-warning-50 dark:hover:bg-warning-950/20"
                                                                        title="Edit Transaksi"
                                                                    >
                                                                        <IconPencil size={16} />
                                                                    </button>
                                                                )}
                                                                {canDeleteAgent && (
                                                                    <button
                                                                        onClick={() => handleAgentDelete(tx)}
                                                                        className="p-1 rounded text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-950/20"
                                                                        title="Hapus Catatan"
                                                                    >
                                                                        <IconTrash size={16} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="8" className="p-8 text-center text-slate-400">
                                                        Tidak ada catatan transaksi agen.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {agentTransactions?.links && (
                                    <div className="p-3 border-t border-slate-100 dark:border-slate-800">
                                        <Pagination links={agentTransactions.links} />
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        /* Standard POS Product/Service Grid */
                        <ProductGrid
                            products={displayItems}
                            categories={transactionMode === "produk" ? categories : []}
                            selectedCategory={transactionMode === "produk" ? selectedCategory : null}
                            onCategoryChange={(categoryId) =>
                                setSelectedCategory(
                                    categoryId === null ? null : Number(categoryId)
                                )
                            }
                            searchQuery={searchQuery}
                            onSearchChange={setSearchQuery}
                            isSearching={isSearching}
                            onAddToCart={handleAddToCart}
                            addingProductId={addingProductId}
                            searchInputRef={searchInputRef}
                            placeholder={
                                transactionMode === "produk"
                                    ? "Cari produk atau scan barcode... (tekan / untuk fokus)"
                                    : "Cari jasa / layanan... (tekan / untuk fokus)"
                            }
                        />
                    )}
                </div>

                {/* Right Panel - Cart & Payment */}
                <div
                    className={`w-full lg:w-[420px] xl:w-[480px] flex flex-col bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 min-h-0 overflow-hidden ${
                        mobileView !== "cart" ? "hidden lg:flex" : "flex"
                    }`}
                    style={{ height: "calc(100vh - 4rem)" }}
                >
                    {transactionMode === "agen_link" ? (
                        /* Agent Form Panel */
                        <div className="flex flex-col h-full overflow-hidden">
                            {/* Form Header */}
                            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between flex-shrink-0">
                                <h3 className="text-sm font-semibold text-slate-850 dark:text-white flex items-center gap-2">
                                    <IconBuildingBank size={18} className="text-primary-500" />
                                    {editingAgentTx ? "Edit Pencatatan Agen" : "Catat Transaksi Agen"}
                                </h3>
                                {editingAgentTx && (
                                    <button
                                        onClick={handleCancelEditAgent}
                                        className="text-xs font-semibold text-rose-500 hover:underline"
                                    >
                                        Batal Edit
                                    </button>
                                )}
                            </div>

                            {/* Form Body - Scrollable */}
                            <form onSubmit={handleAgentSubmit} className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                                {/* Type */}
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Layanan / Tipe Transaksi *</label>
                                    <select
                                        value={agentData.agent_transaction_type_id}
                                        onChange={(e) => handleAgentTypeChange(e.target.value)}
                                        className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        required
                                    >
                                        <option value="">-- Pilih Tipe Transaksi --</option>
                                        {agentTransactionTypes.map((type) => (
                                            <option key={type.id} value={type.id}>
                                                [{type.code}] {type.name} ({type.type === 'debet' ? 'Debet/Masuk' : 'Kredit/Keluar'})
                                            </option>
                                        ))}
                                    </select>
                                    {agentErrors.agent_transaction_type_id && <p className="text-xs text-rose-500 mt-1">{agentErrors.agent_transaction_type_id}</p>}
                                </div>

                                {/* Bank Account */}
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">EDC / Sumber Rekening Agen</label>
                                    <select
                                        value={agentData.bank_account_id}
                                        onChange={(e) => setAgentData("bank_account_id", e.target.value)}
                                        className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    >
                                        <option value="">-- Tanpa Bank (Kas Fisik) --</option>
                                        {bankAccounts.map((bank) => (
                                            <option key={bank.id} value={bank.id}>
                                                {bank.bank_name} - {bank.account_name} ({bank.account_number})
                                            </option>
                                        ))}
                                    </select>
                                    {agentErrors.bank_account_id && <p className="text-xs text-rose-500 mt-1">{agentErrors.bank_account_id}</p>}
                                </div>

                                {/* Nominal */}
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Nominal Transaksi (Rp) *</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">Rp</span>
                                        <input
                                            type="number"
                                            value={agentData.nominal}
                                            onChange={(e) => setAgentData("nominal", parseInt(e.target.value) || 0)}
                                            placeholder="0"
                                            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500"
                                            min="0"
                                            required
                                        />
                                    </div>
                                    {agentErrors.nominal && <p className="text-xs text-rose-500 mt-1">{agentErrors.nominal}</p>}
                                </div>

                                {/* Admin Fees Dropdowns */}
                                <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/20 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Admin Loket *</label>
                                        <select
                                            value={agentData.agent_admin_loket_id}
                                            onChange={(e) => handleAgentAdminLoketChange(e.target.value)}
                                            className="w-full px-2.5 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none"
                                            required
                                        >
                                            <option value="">-- Pilih --</option>
                                            {agentAdminLokets.map((loket) => (
                                                <option key={loket.id} value={loket.id}>
                                                    [{loket.code}] {formatPrice(loket.amount)}
                                                </option>
                                            ))}
                                        </select>
                                        {agentErrors.agent_admin_loket_id && <p className="text-xs text-rose-500 mt-0.5">{agentErrors.agent_admin_loket_id}</p>}
                                        <p className="text-[9px] text-slate-400 mt-1">Biaya: <span className="font-semibold">{formatPrice(agentData.admin_fee_customer)}</span></p>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Admin Bank *</label>
                                        <select
                                            value={agentData.agent_admin_bank_id}
                                            onChange={(e) => handleAgentAdminBankChange(e.target.value)}
                                            className="w-full px-2.5 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none"
                                            required
                                        >
                                            <option value="">-- Pilih --</option>
                                            {agentAdminBanks.map((bank) => (
                                                <option key={bank.id} value={bank.id}>
                                                    [{bank.code}] {formatPrice(bank.amount)}
                                                </option>
                                            ))}
                                        </select>
                                        {agentErrors.agent_admin_bank_id && <p className="text-xs text-rose-500 mt-0.5">{agentErrors.agent_admin_bank_id}</p>}
                                        <p className="text-[9px] text-slate-400 mt-1">Biaya: <span className="font-semibold">{formatPrice(agentData.admin_fee_bank)}</span></p>
                                    </div>
                                </div>

                                {/* Dynamic Payment Preview */}
                                {agentData.agent_transaction_type_id && (
                                    <div className="p-3.5 rounded-xl bg-primary-50 dark:bg-primary-950/20 border border-primary-100 dark:border-primary-900/30 flex justify-between items-center">
                                        <div>
                                            <span className="text-[10px] font-semibold text-primary-700 dark:text-primary-400 uppercase tracking-wider">Estimasi Total Pembayaran</span>
                                            <p className="text-[10px] text-slate-400">
                                                {selectedAgentType?.type === 'debet' ? "Nominal + Admin Loket" : "Nominal (Tarik Tunai)"}
                                            </p>
                                        </div>
                                        <span className="text-base font-bold text-primary-600 dark:text-primary-400">
                                            {formatPrice(agentTxTotal)}
                                        </span>
                                    </div>
                                )}

                                {/* Admin Payment Method & Status */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Admin Diterima Secara</label>
                                        <select
                                            value={agentData.admin_fee_payment_method}
                                            onChange={(e) => setAgentData("admin_fee_payment_method", e.target.value)}
                                            className="w-full px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none"
                                            required
                                        >
                                            <option value="cash">Tunai (Laci Kas)</option>
                                            <option value="bank">Transfer / Saldo Bank</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Status Transaksi</label>
                                        <select
                                            value={agentData.status}
                                            onChange={(e) => setAgentData("status", e.target.value)}
                                            className="w-full px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none"
                                            required
                                        >
                                            <option value="success">Berhasil</option>
                                            <option value="pending">Pending</option>
                                            <option value="failed">Gagal</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Customer Name & Phone */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Nama Cst (Optional)</label>
                                        <input
                                            type="text"
                                            value={agentData.customer_name}
                                            onChange={(e) => setAgentData("customer_name", e.target.value)}
                                            placeholder="Nama..."
                                            className="w-full px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">No. Telp (Optional)</label>
                                        <input
                                            type="text"
                                            value={agentData.customer_phone}
                                            onChange={(e) => setAgentData("customer_phone", e.target.value)}
                                            placeholder="No. HP..."
                                            className="w-full px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                {/* Reference Number */}
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">No. Ref / Struk EDC (Optional)</label>
                                    <input
                                        type="text"
                                        value={agentData.reference_number}
                                        onChange={(e) => setAgentData("reference_number", e.target.value)}
                                        placeholder="Kode Ref EDC..."
                                        className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    />
                                </div>

                                {/* Notes */}
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Catatan Tambahan</label>
                                    <textarea
                                        value={agentData.notes}
                                        onChange={(e) => setAgentData("notes", e.target.value)}
                                        placeholder="Catatan..."
                                        className="w-full px-2 py-1 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-850 dark:text-slate-200 focus:outline-none"
                                        rows="2"
                                    />
                                </div>
                            </form>

                            {/* Submit Button Block - Fixed at Bottom */}
                            <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex-shrink-0">
                                <button
                                    onClick={handleAgentSubmit}
                                    disabled={agentProcessing || !canCreateAgent}
                                    className={`w-full h-11 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                                        canCreateAgent && !agentProcessing
                                            ? "bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white shadow-md shadow-primary-500/20"
                                            : "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                                    }`}
                                >
                                    {agentProcessing ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <IconDeviceFloppy size={16} />
                                            <span>{editingAgentTx ? "Simpan Perubahan" : "Catat Transaksi"}</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* Standard POS Cart & Payments */
                        <>
                            {/* Customer Select - Fixed */}
                            <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
                                <CustomerSelect
                                    customers={customers}
                                    selected={selectedCustomer}
                                    onSelect={setSelectedCustomer}
                                    placeholder="Pilih pelanggan..."
                                    error={errors?.customer_id}
                                    label="Pelanggan"
                                />
                            </div>

                            {/* Held Transactions & Alerts */}
                            {heldCarts.length > 0 && (
                                <div className="p-3 border-b border-slate-200 dark:border-slate-800">
                                    <HeldTransactions
                                        heldCarts={heldCarts}
                                        hasActiveCart={carts.length > 0}
                                    />
                                </div>
                            )}

                            {/* Cart Items - Scrollable */}
                            <div className="flex-1 overflow-y-auto min-h-0">
                                {/* Hold Button - at top of cart section */}
                                {carts.length > 0 && (
                                    <div className="p-3 border-b border-slate-200 dark:border-slate-800">
                                        <HoldButton
                                            hasItems={carts.length > 0}
                                            onHold={handleHoldCart}
                                            isHolding={isHolding}
                                        />
                                    </div>
                                )}

                                <div className="p-3 border-b border-slate-200 dark:border-slate-800">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                            <IconShoppingCart size={16} />
                                            Keranjang
                                        </h3>
                                        {carts.length > 0 && (
                                            <span className="px-2.5 py-0.5 text-xs font-bold bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300 rounded-full whitespace-nowrap">
                                                {cartCount} item
                                            </span>
                                        )}
                                    </div>

                                    {carts.length > 0 ? (
                                        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                                            {carts.map((item) => (
                                                (() => {
                                                    const pricingItem =
                                                        pricingItemsByCartId[item.id];
                                                    const baseLineTotal = Number(
                                                        pricingItem?.line_base_total ??
                                                            item.price ??
                                                            0
                                                    );
                                                    const effectiveLineTotal = Number(
                                                        pricingItem?.line_total ??
                                                            item.price ??
                                                            0
                                                    );
                                                    const effectiveUnitPrice = Number(
                                                        pricingItem?.effective_unit_price ??
                                                            item.product?.sell_price ??
                                                            0
                                                    );
                                                    const baseUnitPrice = Number(
                                                        pricingItem?.base_unit_price ??
                                                            item.product?.sell_price ??
                                                            0
                                                    );
                                                    const pricingRule =
                                                        pricingItem?.pricing_rule;

                                                    const availableUnits = [];
                                                    if (item.product) {
                                                        if (item.product?.satuan_jual_pcs) {
                                                            availableUnits.push({ key: "pcs", label: item.product.satuan_jual_pcs, price: Number(item.product.harga_jual_pcs || item.product.sell_price || 0) });
                                                        } else {
                                                            availableUnits.push({ key: "pcs", label: "Pcs", price: Number(item.product?.sell_price || 0) });
                                                        }
                                                        if (item.product?.isi_pcs_dalam_pack > 0) {
                                                            availableUnits.push({ key: "pack", label: item.product.satuan_jual_pack || "Pak", price: Number(item.product.harga_jual_pack || 0) });
                                                        }
                                                        if (item.product?.isi_pcs_dalam_dus > 0) {
                                                            availableUnits.push({ key: "dus", label: item.product.satuan_jual_dus || "Dus", price: Number(item.product.harga_jual_dus || 0) });
                                                        }
                                                    } else if (item.service) {
                                                        if (item.service.service_prices) {
                                                            item.service.service_prices.forEach((sp) => {
                                                                availableUnits.push({
                                                                    key: String(sp.unit_id),
                                                                    label: sp.unit?.name || "Unit",
                                                                    price: Number(sp.price || 0),
                                                                });
                                                            });
                                                        }
                                                    }

                                                    return (
                                                <div
                                                    key={item.id}
                                                    className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 group"
                                                >
                                                    <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-700 overflow-hidden flex-shrink-0">
                                                        {item.product?.image ? (
                                                            <img
                                                                src={getProductImageUrl(
                                                                    item.product.image
                                                                )}
                                                                alt={item.product.title}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400">
                                                                {item.is_service ? <IconTools size={18} /> : <IconShoppingCart size={18} />}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                                                            {item.product?.title || item.service?.name}
                                                        </h4>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            {availableUnits.length > 1 ? (
                                                                <select
                                                                    value={item.satuan_key || "pcs"}
                                                                    onChange={(e) => handleUpdateUnit(item.id, e.target.value)}
                                                                    disabled={updatingCartId === item.id}
                                                                    className="px-1.5 py-0.5 rounded text-[10px] font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-350 focus:outline-none"
                                                                >
                                                                    {availableUnits.map((u) => (
                                                                        <option key={u.key} value={u.key}>
                                                                            {u.label} ({formatPrice(u.price)})
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            ) : (
                                                                <span className="text-[10px] text-slate-500 font-medium bg-slate-150 dark:bg-slate-800 px-1 py-0.5 rounded">
                                                                    {item.satuan_key || "pcs"}
                                                                </span>
                                                            )}
                                                            <span className="text-[10px] text-slate-400">
                                                                x{item.qty}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="text-right flex-shrink-0">
                                                        <div className="text-xs font-bold text-slate-800 dark:text-slate-250">
                                                            {formatPrice(effectiveLineTotal)}
                                                        </div>
                                                        {pricingRule && (
                                                            <div className="text-[10px] text-emerald-600 font-medium">
                                                                Promo Aktif
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-1">
                                                        <button
                                                            onClick={() =>
                                                                handleUpdateQty(
                                                                    item.id,
                                                                    Number(item.qty) - 1
                                                                )
                                                            }
                                                            disabled={
                                                                Number(item.qty) <= 1 ||
                                                                updatingCartId === item.id
                                                            }
                                                            className="p-1 text-slate-500 hover:text-slate-700 disabled:opacity-30"
                                                        >
                                                            -
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                handleUpdateQty(
                                                                    item.id,
                                                                    Number(item.qty) + 1
                                                                )
                                                            }
                                                            disabled={updatingCartId === item.id}
                                                            className="p-1 text-slate-500 hover:text-slate-700"
                                                        >
                                                            +
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                handleRemoveFromCart(
                                                                    item.id
                                                                )
                                                            }
                                                            disabled={removingItemId === item.id}
                                                            className="p-1 text-rose-500 hover:text-rose-700"
                                                        >
                                                            <IconTrash size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })()
                                    ))}
                                </div>
                            ) : (
                                <div className="py-6 text-center">
                                    <IconShoppingCart
                                        size={32}
                                        className="mx-auto text-slate-300 dark:text-slate-600 mb-2"
                                    />
                                    <p className="text-sm text-slate-400">
                                        Keranjang kosong
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Payment Details - Scrollable */}
                        <div className="p-3 space-y-4">
                            {/* Pay later toggle */}
                            <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                                <div>
                                    <p className="text-sm font-semibold text-slate-800 dark:text-white">
                                        Bayar Belakangan (Nota Barang)
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        Tidak perlu bayar sekarang, catat sebagai piutang.
                                    </p>
                                </div>
                                <label className="inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only"
                                        checked={payLater}
                                        onChange={(e) => {
                                            setPayLater(e.target.checked);
                                            if (e.target.checked) {
                                                setSelectedBankAccount(null);
                                                setPaymentMethod("cash");
                                            }
                                        }}
                                    />
                                    <span
                                        className={`w-11 h-6 flex items-center bg-slate-300 rounded-full p-1 transition ${
                                            payLater ? "bg-primary-500" : ""
                                        }`}
                                    >
                                        <span
                                            className={`bg-white w-4 h-4 rounded-full shadow transform transition ${
                                                payLater ? "translate-x-5" : ""
                                            }`}
                                        />
                                    </span>
                                </label>
                            </div>

                            {payLater && (
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                                        Tanggal Jatuh Tempo
                                    </label>
                                    <input
                                        type="date"
                                        value={dueDate}
                                        onChange={(e) => setDueDate(e.target.value)}
                                        className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                                    />
                                </div>
                            )}

                            {/* Payment Method Selection */}
                            <div>
                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                                    Metode Pembayaran
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {paymentOptions.map((method) => (
                                        <button
                                            key={method.value}
                                            onClick={() =>
                                                !payLater &&
                                                setPaymentMethod(method.value)
                                            }
                                            disabled={payLater}
                                            className={`p-3 rounded-xl border-2 transition-all flex items-center gap-2 ${
                                                paymentMethod === method.value && !payLater
                                                    ? "border-primary-500 bg-primary-50 dark:bg-primary-950/30"
                                                    : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                                            } ${payLater ? "opacity-50 cursor-not-allowed" : ""}`}
                                        >
                                            <div
                                                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                                    paymentMethod ===
                                                        method.value &&
                                                    !payLater
                                                        ? "bg-primary-500 text-white"
                                                        : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                                                }`}
                                            >
                                                {method.value === "cash" ? (
                                                    <IconCash size={16} />
                                                ) : method.value ===
                                                  "bank_transfer" ? (
                                                    <IconBuildingBank
                                                        size={16}
                                                    />
                                                ) : (
                                                    <IconCreditCard size={16} />
                                                )}
                                            </div>
                                            <div className="text-left">
                                                <p
                                                    className={`text-sm font-semibold ${
                                                        paymentMethod ===
                                                        method.value
                                                            ? "text-primary-700 dark:text-primary-300"
                                                            : "text-slate-700 dark:text-slate-300"
                                                    }`}
                                                >
                                                    {method.label}
                                                </p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Bank Selector - Only for bank_transfer */}
                            {paymentMethod === "bank_transfer" &&
                                bankAccounts.length > 0 &&
                                !payLater && (
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                                            Rekening Tujuan
                                        </label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {bankAccounts.map((bank) => {
                                                const isActive =
                                                    selectedBankAccount?.id ===
                                                    bank.id;
                                                return (
                                                    <button
                                                        key={bank.id}
                                                        onClick={() =>
                                                            setSelectedBankAccount(
                                                                bank
                                                            )
                                                        }
                                                        className={`p-3 rounded-xl border-2 transition-colors flex items-center gap-3 text-left ${
                                                            isActive
                                                                ? "border-primary-500 bg-primary-50 dark:bg-primary-950/30"
                                                                : "border-slate-200 dark:border-slate-700 hover:border-primary-200 dark:hover:border-primary-800"
                                                        }`}
                                                    >
                                                        <div className="w-10 h-10 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden">
                                                            {bank.logo_url ? (
                                                                <img
                                                                    src={
                                                                        bank.logo_url
                                                                    }
                                                                    alt={
                                                                        bank.bank_name
                                                                    }
                                                                    className="max-w-full max-h-full object-contain"
                                                                />
                                                            ) : (
                                                                <IconBuildingBank
                                                                    size={18}
                                                                    className="text-slate-500"
                                                                />
                                                            )}
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                                                {
                                                                    bank.bank_name
                                                                }
                                                            </p>
                                                            <p className="text-xs text-slate-600 dark:text-slate-400">
                                                                {
                                                                    bank.account_number
                                                                }
                                                            </p>
                                                            <p className="text-[11px] text-slate-500 dark:text-slate-500">
                                                                a.n.{" "}
                                                                {
                                                                    bank.account_name
                                                                }
                                                            </p>
                                                        </div>
                                                        {isActive && (
                                                            <span className="text-[11px] font-semibold text-primary-600">
                                                                Dipilih
                                                            </span>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}


                            {/* Discount Input */}
                            {promoDiscount > 0 && (
                                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                                                Promo otomatis aktif
                                            </p>
                                            <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80">
                                                Harga item sudah disesuaikan berdasarkan rule promo yang berlaku.
                                            </p>
                                        </div>
                                        <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                                            -{formatPrice(promoDiscount)}
                                        </span>
                                    </div>
                                </div>
                            )}




                            <div>
                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                                    Diskon Manual (Rp)
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                                        Rp
                                    </span>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={discountInput}
                                        onChange={(e) =>
                                            setDiscountInput(
                                                e.target.value.replace(
                                                    /[^\d]/g,
                                                    ""
                                                )
                                            )
                                        }
                                        placeholder="0"
                                        className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                                    />
                                </div>
                            </div>

                            {/* Shipping Cost Input */}
                            <div>
                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                                    Ongkos Kirim (Rp)
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                                        Rp
                                    </span>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={shippingInput}
                                        onChange={(e) =>
                                            setShippingInput(
                                                e.target.value.replace(
                                                    /[^\d]/g,
                                                    ""
                                                )
                                            )
                                        }
                                        placeholder="0"
                                        className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                                    />
                                </div>

                            </div>

                            {/* Cash Input - Only for cash */}
                            {paymentMethod === "cash" && (
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                                        Jumlah Bayar (Rp)
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                                            Rp
                                        </span>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            value={cashInput}
                                            onChange={(e) =>
                                                setCashInput(
                                                    e.target.value.replace(
                                                        /[^\d]/g,
                                                        ""
                                                    )
                                                )
                                            }
                                            placeholder="0"
                                            className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-base font-semibold focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Summary & Submit - Fixed at bottom */}
                    <div className="flex-shrink-0 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 p-3">
                        {/* Summary Row */}
                        <div className="flex justify-between items-center mb-2 text-sm">
                            <span className="text-slate-500">Subtotal Dasar</span>
                            <span className="font-medium">
                                {formatPrice(baseSubtotal)}
                            </span>
                        </div>
                        {promoDiscount > 0 && (
                            <div className="flex justify-between items-center mb-2 text-sm">
                                <span className="text-slate-500">
                                    Promo Otomatis
                                </span>
                                <span className="text-emerald-600">
                                    -{formatPrice(promoDiscount)}
                                </span>
                            </div>
                        )}
                        {(pricingPreview?.applied_groups || []).length > 0 && (
                            <div className="mb-3 rounded-xl border border-slate-200 bg-white/70 p-2 dark:border-slate-700 dark:bg-slate-900/60">
                                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                    Grup Promo Aktif
                                </div>
                                <div className="space-y-1.5">
                                    {(pricingPreview?.applied_groups || []).map(
                                        (group) => (
                                            <div
                                                key={group.key}
                                                className="flex items-center justify-between text-xs"
                                            >
                                                <span className="truncate pr-3 text-slate-600 dark:text-slate-300">
                                                    {group.label}
                                                </span>
                                                <span className="font-medium text-emerald-600">
                                                    -{formatPrice(group.discount_total)}
                                                </span>
                                            </div>
                                        )
                                    )}
                                </div>
                            </div>
                        )}


                        {discount > 0 && (
                            <div className="flex justify-between items-center mb-2 text-sm">
                                <span className="text-slate-500">Diskon Manual</span>
                                <span className="text-danger-500">
                                    -{formatPrice(discount)}
                                </span>
                            </div>
                        )}
                        {shipping > 0 && (
                            <div className="flex justify-between items-center mb-2 text-sm">
                                <span className="text-slate-500">Ongkir</span>
                                <span className="font-medium">
                                    +{formatPrice(shipping)}
                                </span>
                            </div>
                        )}
                        {pricingPreview?.summary?.points_earned_preview > 0 && (
                            <div className="flex justify-between items-center mb-2 text-sm">
                                <span className="text-slate-500">Poin Diperoleh</span>
                                <span className="font-semibold text-primary-600 dark:text-primary-400">
                                    +{pricingPreview.summary.points_earned_preview} Poin
                                </span>
                            </div>
                        )}
                        <div className="flex justify-between items-center mb-3">
                            <span className="font-semibold text-slate-800 dark:text-white">
                                Total
                            </span>
                            <span className="text-xl font-bold text-primary-600 dark:text-primary-400">
                                {formatPrice(payable)}
                            </span>
                        </div>

                        {paymentMethod === "cash" &&
                            !payLater &&
                            cash >= payable &&
                            payable > 0 && (
                                <div className="flex justify-between items-center mb-3 p-2 rounded-lg bg-success-50 dark:bg-success-950/30">
                                    <span className="text-sm text-success-700 dark:text-success-400">
                                        Kembalian
                                    </span>
                                    <span className="font-bold text-success-600">
                                        {formatPrice(cash - payable)}
                                    </span>
                                </div>
                            )}

                        {/* Submit Button - Always visible */}
                        <button
                            onClick={handleSubmitTransaction}
                            disabled={
                                !carts.length ||
                                (payLater && !selectedCustomer) ||
                                (!payLater &&
                                    paymentMethod === "cash" &&
                                    cash < payable) ||
                                isLoadingPricing ||
                                isSubmitting
                            }
                            className={`w-full h-12 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                                carts.length &&
                                (!payLater || selectedCustomer) &&
                                (paymentMethod !== "cash" || cash >= payable)
                                    && !isLoadingPricing
                                    ? "bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white shadow-lg shadow-primary-500/30"
                                    : "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                            }`}
                        >
                            {isSubmitting || isLoadingPricing ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <IconReceipt size={18} />
                                    <span>
                                        {!carts.length
                                            ? "Keranjang Kosong"
                                            : payLater && !selectedCustomer
                                            ? "Pilih Pelanggan (Wajib)"
                                            : paymentMethod === "cash" &&
                                              cash < payable
                                            ? `Kurang ${formatPrice(
                                                  payable - cash
                                              )}`
                                            : isLoadingPricing
                                            ? "Menghitung Promo..."
                                            : "Selesaikan Transaksi"}
                                    </span>
                                </>
                            )}
                        </button>
                    </div>
                        </>
                    )}
                </div>
            </div>

            {/* Numpad Modal */}
            <NumpadModal
                isOpen={numpadOpen}
                onClose={() => setNumpadOpen(false)}
                onConfirm={handleNumpadConfirm}
                title="Jumlah Bayar"
                initialValue={Number(cashInput) || 0}
                isCurrency={true}
            />

            {/* Keyboard Shortcuts Help */}
            {showShortcuts && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-slate-900/60"
                        onClick={() => setShowShortcuts(false)}
                    />
                    <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-6 max-w-sm w-full">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                            <IconKeyboard size={24} />
                            Keyboard Shortcuts
                        </h3>
                        <div className="space-y-3">
                            {[
                                ["F1", "Buka Numpad"],
                                ["F2", "Selesaikan Transaksi"],
                                ["F3", "Toggle Produk/Keranjang"],
                                ["F4", "Tampilkan Bantuan"],
                                ["Esc", "Tutup Modal"],
                            ].map(([key, desc]) => (
                                <div
                                    key={key}
                                    className="flex items-center justify-between"
                                >
                                    <span className="text-slate-600 dark:text-slate-400">
                                        {desc}
                                    </span>
                                    <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-sm font-mono font-bold text-slate-700 dark:text-slate-300">
                                        {key}
                                    </kbd>
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={() => setShowShortcuts(false)}
                            className="mt-6 w-full py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-medium"
                        >
                            Tutup
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}

Index.layout = (page) => <POSLayout children={page} />;
