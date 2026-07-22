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
    IconGift,
    IconDatabaseOff,
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
    // Point props
    pointPrizes = [],
    pointRedemptions = {},
    pointFilters = {},
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
        if (mode === "tukar_poin") return "tukar_poin";
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

    // Balance Modal States
    const [selectedBankForBalance, setSelectedBankForBalance] = useState(null);
    const [newBalanceValue, setNewBalanceValue] = useState("");
    const [isUpdatingBalance, setIsUpdatingBalance] = useState(false);

    const handleOpenBalanceModal = (bank) => {
        setSelectedBankForBalance(bank);
        setNewBalanceValue(String(bank.balance || 0));
    };

    const handleCloseBalanceModal = () => {
        setSelectedBankForBalance(null);
        setNewBalanceValue("");
    };

    const handleSaveBalance = (e) => {
        e.preventDefault();
        if (!selectedBankForBalance) return;
        setIsUpdatingBalance(true);
        router.patch(
            route("settings.bank-accounts.balance", selectedBankForBalance.id),
            { balance: parseInt(newBalanceValue) || 0 },
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success(`Saldo ${selectedBankForBalance.bank_name} berhasil diperbarui.`);
                    handleCloseBalanceModal();
                    setIsUpdatingBalance(false);
                },
                onError: (errors) => {
                    toast.error(errors?.balance || "Gagal memperbarui saldo.");
                    setIsUpdatingBalance(false);
                }
            }
        );
    };

    // Agent filters
    const [agentSearch, setAgentSearch] = useState(agentFilters?.search || "");
    const [agentStartDate, setAgentStartDate] = useState(agentFilters?.start_date || "");
    const [agentEndDate, setAgentEndDate] = useState(agentFilters?.end_date || "");
    const [agentTypeId, setAgentTypeId] = useState(agentFilters?.type_id || "");
    const [agentBankAccountId, setAgentBankAccountId] = useState(agentFilters?.bank_account_id || "");
    const [agentStatusFilter, setAgentStatusFilter] = useState(agentFilters?.status || "");

    // Point Redemption states
    const {
        data: pointData,
        setData: setPointData,
        post: postPoint,
        processing: pointProcessing,
        errors: pointErrors,
        reset: resetPoint,
        clearErrors: clearPointErrors,
    } = useForm({
        customer_id: "",
        items: [],
        notes: "",
    });

    const [selectedPrizeId, setSelectedPrizeId] = useState("");
    const [prizeQty, setPrizeQty] = useState(1);

    // Point Redemption filters
    const [pointSearch, setPointSearch] = useState(pointFilters?.search || "");
    const [pointStartDate, setPointStartDate] = useState(pointFilters?.start_date || "");
    const [pointEndDate, setPointEndDate] = useState(pointFilters?.end_date || "");

    const [searchQuery, setSearchQuery] = useState("");
    const [searchFocused, setSearchFocused] = useState(false);
    const dropdownRef = useRef(null);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [showAllProducts, setShowAllProducts] = useState(false);
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
    const [paymentReference, setPaymentReference] = useState("");
    const [payLater, setPayLater] = useState(false);
    const [dueDate, setDueDate] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [mobileView, setMobileView] = useState("products"); // 'products' | 'cart'
    const [numpadOpen, setNumpadOpen] = useState(false);
    const [showShortcuts, setShowShortcuts] = useState(false);
    const [selectedBankAccount, setSelectedBankAccount] = useState(null);
    const [openingCashInput, setOpeningCashInput] = useState("");
    const [agentOpeningCashInput, setAgentOpeningCashInput] = useState("");
    const [shiftNotesInput, setShiftNotesInput] = useState("");
    const [openingBankBalances, setOpeningBankBalances] = useState({});

    // Modal states for item selection (Qty, Satuan, Diskon)
    const [selectedItemForCart, setSelectedItemForCart] = useState(null);
    const [modalQty, setModalQty] = useState(1);
    const [modalUnitKey, setModalUnitKey] = useState("pcs");
    const [modalDiscount, setModalDiscount] = useState("0");

    const getAvailableUnitsForItem = (item) => {
        const units = [];
        if (!item) return units;
        
        if (item.is_service) {
            if (item.service_prices) {
                item.service_prices.forEach((sp) => {
                    units.push({
                        key: String(sp.unit_id),
                        label: sp.unit?.name || "Unit",
                        price: Number(sp.price || 0),
                    });
                });
            } else if (item.service?.service_prices) {
                item.service.service_prices.forEach((sp) => {
                    units.push({
                        key: String(sp.unit_id),
                        label: sp.unit?.name || "Unit",
                        price: Number(sp.price || 0),
                    });
                });
            }
            if (units.length === 0) {
                units.push({ key: "pcs", label: "Pcs", price: Number(item.sell_price || 0) });
            }
        } else {
            if (item.satuan_jual_pcs) {
                units.push({ key: "pcs", label: item.satuan_jual_pcs, price: Number(item.harga_jual_pcs || item.sell_price || 0) });
            } else {
                units.push({ key: "pcs", label: "Pcs", price: Number(item.sell_price || 0) });
            }
            if (item.isi_pcs_dalam_pack > 0) {
                units.push({ key: "pack", label: item.satuan_jual_pack || "Pak", price: Number(item.harga_jual_pack || 0) });
            }
            if (item.isi_pcs_dalam_dus > 0) {
                units.push({ key: "dus", label: item.satuan_jual_dus || "Dus", price: Number(item.harga_jual_dus || 0) });
            }
        }
        return units;
    };

    const openCartModal = (item) => {
        setSelectedItemForCart(item);
        setModalQty(1);
        const units = getAvailableUnitsForItem(item);
        setModalUnitKey(units.length > 0 ? units[0].key : "pcs");
        setModalDiscount("0");
    };

    const modalQtyInputRef = useRef(null);
    const modalDiscountInputRef = useRef(null);
    const modalUnitSelectRef = useRef(null);

    useEffect(() => {
        if (selectedItemForCart) {
            // Wait for modal to render before focusing
            setTimeout(() => {
                if (modalQtyInputRef.current) {
                    modalQtyInputRef.current.focus();
                    modalQtyInputRef.current.select();
                }
            }, 50);
        }
    }, [selectedItemForCart]);

    useEffect(() => {
        if (bankAccounts && bankAccounts.length > 0) {
            const initial = {};
            bankAccounts.forEach(bank => {
                initial[bank.id] = bank.balance || 0;
            });
            setOpeningBankBalances(initial);
        }
    }, [bankAccounts]);

    useEffect(() => {
        setShowAllProducts(false);
        setSearchQuery("");
        setSearchFocused(false);
    }, [transactionMode]);


    const normalizedSelectedCategory =
        selectedCategory === null ? null : Number(selectedCategory);
    const pricingItemsByCartId = useMemo(() => {
        const items = pricingPreview?.items || [];

        return items.reduce((accumulator, item) => {
            accumulator[item.cart_id] = item;

            return accumulator;
        }, {});
    }, [pricingPreview]);

    // Refs for various form inputs to enable keyboard shortcut focus
    const searchInputRef = useRef(null);
    const discountInputRef = useRef(null);
    const cashInputRef = useRef(null);
    const customerSelectRef = useRef(null);
    const agentNominalInputRef = useRef(null);
    const agentNotesInputRef = useRef(null);
    const pointPrizeSelectRef = useRef(null);
    const pointPrizeQtyRef = useRef(null);
    const pointNotesRef = useRef(null);
    const submitButtonRef = useRef(null);

    // States for keyboard navigation
    const [activeProductIndex, setActiveProductIndex] = useState(-1);
    const [isResumePanelOpen, setIsResumePanelOpen] = useState(false);

    useEffect(() => {
        if (activeProductIndex >= 0 && dropdownRef.current) {
            const activeRow = dropdownRef.current.querySelector(`[data-product-index="${activeProductIndex}"]`);
            if (activeRow) {
                activeRow.scrollIntoView({
                    behavior: "smooth",
                    block: "nearest",
                });
            }
        }
    }, [activeProductIndex]);

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
                    openCartModal(product);
                    toast.success(`${product.title} terpilih (barcode)`);
                } else {
                    toast.error(`${product.title} stok habis`);
                }
            } else {
                toast.error(`Produk tidak ditemukan: ${barcode}`);
            }
        },
        [products, openCartModal]
    );

    const { isScanning } = useBarcodeScanner(handleBarcodeScan, {
        enabled: true,
        minLength: 3,
    });

    const LowStockAlerts = () => null;

    const discount = useMemo(
        () => Math.max(0, Number(discountInput) || 0),
        [discountInput]
    );
    const manualDiscountTotal = useMemo(
        () => Number(pricingPreview?.summary?.manual_discount_total ?? 0),
        [pricingPreview]
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
                shipping_cost: 0,
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
            agent_opening_cash: Number(agentOpeningCashInput || 0),
            notes: shiftNotesInput,
            balances: openingBankBalances,
            redirect_to: "transactions",
        });
    };

    // Handle add product to cart
    const handleAddToCart = async (item, qty = 1, satuanKey = "pcs", discount = 0) => {
        if (!item?.id) return;

        setAddingProductId(item.id);

        const payload = item.is_service
            ? { service_id: item.id, qty, satuan_key: satuanKey, discount }
            : { product_id: item.id, sell_price: item.sell_price, qty, satuan_key: satuanKey, discount };

        router.post(
            route("transactions.addToCart"),
            payload,
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success(`${item.title} ditambahkan`);
                    setAddingProductId(null);
                    setSelectedItemForCart(null);
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

    const handleRemoveFromCart = (cartId) => {
        setRemovingItemId(cartId);

        router.delete(route("transactions.destroyCart", cartId), {
            preserveScroll: true,
            onSuccess: () => {
                setRemovingItemId(null);
            },
            onError: (errors) => {
                toast.error(errors?.message || "Gagal menghapus item");
                setRemovingItemId(null);
            },
        });
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

    // Handle clear entire cart
    const handleClearCart = () => {
        if (confirm("Kosongkan semua item di keranjang belanja?")) {
            router.post(route("transactions.clear"), {}, {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success("Keranjang belanja dikosongkan");
                },
                onError: () => {
                    toast.error("Gagal mengosongkan keranjang");
                }
            });
        }
    };

    // Filter products or services based on mode
    const displayItems = useMemo(() => {
        if (!searchQuery && !showAllProducts) {
            return [];
        }

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
    }, [products, services, transactionMode, normalizedSelectedCategory, searchQuery, showAllProducts]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            const isInputActive = e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA";

            // 1. Escape key is global, blurs input if active
            if (e.key === "Escape") {
                if (isInputActive) e.target.blur();
                setNumpadOpen(false);
                setShowShortcuts(false);
                setIsResumePanelOpen(false);
                setSearchQuery("");
                return;
            }

            // 2. Navigating the search input with Arrow keys & Enter
            if (isInputActive && e.target === searchInputRef.current) {
                if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setActiveProductIndex((prev) =>
                        prev < displayItems.length - 1 ? prev + 1 : prev
                    );
                    return;
                } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setActiveProductIndex((prev) =>
                        prev > 0 ? prev - 1 : 0
                    );
                    return;
                } else if (e.key === "Enter") {
                    if (activeProductIndex >= 0 && activeProductIndex < displayItems.length) {
                        e.preventDefault();
                        const selectedProduct = displayItems[activeProductIndex];
                        if (selectedProduct) {
                            if (selectedProduct.stock > 0) {
                                openCartModal(selectedProduct);
                                setSearchQuery("");
                            } else {
                                toast.error(`${selectedProduct.title} stok habis`);
                            }
                        }
                        return;
                    }
                }
            }

            // 3. Enter key in Point Redemption fields to add prize to grid
            if (transactionMode === "tukar_poin" && isInputActive) {
                if (e.target === pointPrizeSelectRef.current || e.target === pointPrizeQtyRef.current) {
                    if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddPrizeToGrid();
                        return;
                    }
                }
            }

            // 4. If typing normal characters in an input (except Alt combos & F-keys), let the browser handle it!
            if (isInputActive && !e.altKey && !e.key.startsWith("F")) {
                return;
            }

            // 5. Global Hotkeys (Runs whether input is active or not, because e.altKey or F-key is pressed)
            if (e.key === "/" || e.key === "F5") {
                // Only focus search with '/' if not already focused on an input
                if (e.key === "/" && isInputActive) return;

                e.preventDefault();
                if (searchInputRef.current) {
                    searchInputRef.current.focus();
                    searchInputRef.current.select();
                }
            } else if (e.key === "F1") {
                e.preventDefault();
                setNumpadOpen(true);
            } else if (e.key === "F2") {
                e.preventDefault();
                if (transactionMode === "produk" || transactionMode === "jasa") {
                    if (carts.length > 0) {
                        handleSubmitTransaction();
                    } else {
                        toast.error("Keranjang masih kosong");
                    }
                } else if (transactionMode === "agen_link") {
                    handleAgentSubmit(e);
                } else if (transactionMode === "tukar_poin") {
                    handleSavePointRedemption(e);
                }
            } else if (e.key === "F3") {
                e.preventDefault();
                setMobileView((prev) => (prev === "products" ? "cart" : "products"));
            } else if (e.key === "F4") {
                e.preventDefault();
                setShowShortcuts((prev) => !prev);
            } else if (e.key === "F6" || (e.altKey && e.key === "1")) {
                e.preventDefault();
                setTransactionMode("produk");
                toast.success("Mode POS Kasir Aktif");
            } else if (e.key === "F7" || (e.altKey && e.key === "2")) {
                e.preventDefault();
                setTransactionMode("jasa");
                toast.success("Mode Jasa Aktif");
            } else if (e.key === "F8" || (e.altKey && e.key === "3")) {
                e.preventDefault();
                setTransactionMode("agen_link");
                toast.success("Mode Agen Link Aktif");
            } else if (e.key === "F9" || (e.altKey && e.key === "4")) {
                e.preventDefault();
                setTransactionMode("tukar_poin");
                toast.success("Mode Tukar Poin Aktif");
            } else if (e.altKey && e.key.toLowerCase() === "s") {
                e.preventDefault();
                if (customerSelectRef.current) {
                    customerSelectRef.current.focus();
                }
            } else if (e.altKey && e.key.toLowerCase() === "h") {
                e.preventDefault();
                if (transactionMode === "produk" || transactionMode === "jasa") {
                    if (carts.length > 0) {
                        handleHoldCart();
                    } else {
                        toast.error("Keranjang kosong");
                    }
                } else if (transactionMode === "tukar_poin") {
                    if (pointPrizeSelectRef.current) {
                        pointPrizeSelectRef.current.focus();
                    }
                }
            } else if (e.altKey && e.key.toLowerCase() === "r") {
                e.preventDefault();
                if (heldCarts.length > 0) {
                    setIsResumePanelOpen((prev) => !prev);
                } else {
                    toast.error("Tidak ada transaksi ditahan");
                }
            } else if (e.altKey && e.key.toLowerCase() === "c") {
                e.preventDefault();
                if (carts.length > 0) {
                    handleClearCart();
                } else {
                    toast.error("Keranjang memang kosong");
                }
            } else if (e.altKey && e.key.toLowerCase() === "d") {
                e.preventDefault();
                if (selectedItemForCart && modalDiscountInputRef.current) {
                    modalDiscountInputRef.current.focus();
                    modalDiscountInputRef.current.select();
                } else if (discountInputRef.current) {
                    discountInputRef.current.focus();
                    discountInputRef.current.select();
                }
            } else if (e.altKey && e.key.toLowerCase() === "b") {
                e.preventDefault();
                if (cashInputRef.current) {
                    cashInputRef.current.focus();
                    cashInputRef.current.select();
                }
            } else if (e.altKey && e.key.toLowerCase() === "p") {
                e.preventDefault();
                if (!payLater) {
                    setPaymentMethod((prev) => (prev === "cash" ? "bank_transfer" : "cash"));
                    toast.success(`Metode pembayaran diubah ke: ${paymentMethod === "cash" ? "Transfer Bank" : "Tunai"}`);
                }
            } else if (e.altKey && e.key === "ArrowUp") {
                e.preventDefault();
                if (carts.length > 0) {
                    const lastItem = carts[carts.length - 1];
                    handleUpdateQty(lastItem.id, Number(lastItem.qty) + 1);
                    toast.success(`Qty ${lastItem.product?.title || lastItem.service?.name} ditambah`);
                }
            } else if (e.altKey && e.key === "ArrowDown") {
                e.preventDefault();
                if (carts.length > 0) {
                    const lastItem = carts[carts.length - 1];
                    if (Number(lastItem.qty) > 1) {
                        handleUpdateQty(lastItem.id, Number(lastItem.qty) - 1);
                        toast.success(`Qty ${lastItem.product?.title || lastItem.service?.name} dikurang`);
                    }
                }
            } else if (transactionMode === "agen_link") {
                if (e.altKey && e.key.toLowerCase() === "n") {
                    e.preventDefault();
                    if (agentNominalInputRef.current) {
                        agentNominalInputRef.current.focus();
                        agentNominalInputRef.current.select();
                    }
                } else if (e.altKey && e.key.toLowerCase() === "k") {
                    e.preventDefault();
                    if (agentNotesInputRef.current) {
                        agentNotesInputRef.current.focus();
                    }
                }
            } else if (transactionMode === "tukar_poin") {
                if (e.altKey && e.key.toLowerCase() === "q") {
                    e.preventDefault();
                    if (pointPrizeQtyRef.current) {
                        pointPrizeQtyRef.current.focus();
                        pointPrizeQtyRef.current.select();
                    }
                } else if (e.altKey && e.key.toLowerCase() === "a") {
                    e.preventDefault();
                    handleAddPrizeToGrid();
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [transactionMode, carts, displayItems, activeProductIndex, searchInputRef, customerSelectRef, discountInputRef, cashInputRef, agentNominalInputRef, agentNotesInputRef, pointPrizeSelectRef, pointPrizeQtyRef, selectedCustomer, heldCarts, payLater, paymentMethod, selectedItemForCart, modalDiscountInputRef]);

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
                shipping_cost: 0,
                grand_total: payable,
                cash: isCashPayment ? cash : payable,
                change: isCashPayment ? Math.max(cash - payable, 0) : 0,
                payment_gateway: payLater ? null : isCashPayment ? null : paymentMethod,
                bank_account_id: isBankTransfer
                    ? selectedBankAccount?.id
                    : null,
                payment_reference: paymentReference || null,
                pay_later: payLater,
                due_date: dueDate,
            },
            {
                onSuccess: () => {
                    setDiscountInput("");
                    setRedeemPointsInput("");
                    setCashInput("");
                    setShippingInput("");
                    setPaymentReference("");
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

    // Point Redemption Handlers
    useEffect(() => {
        setPointData("customer_id", selectedCustomer?.id || "");
    }, [selectedCustomer]);

    const handlePointFilterSubmit = (e) => {
        e.preventDefault();
        router.get(
            route("transactions.index"),
            {
                mode: "tukar_poin",
                point_search: pointSearch,
                point_start_date: pointStartDate,
                point_end_date: pointEndDate,
            },
            { preserveState: true }
        );
    };

    const handlePointResetFilters = () => {
        setPointSearch("");
        setPointStartDate("");
        setPointEndDate("");
        router.get(
            route("transactions.index"),
            { mode: "tukar_poin" },
            { preserveState: true }
        );
    };

    const handleAddPrizeToGrid = () => {
        if (!selectedPrizeId) {
            toast.error("Silakan pilih hadiah terlebih dahulu");
            return;
        }
        const prize = pointPrizes.find(p => p.id === parseInt(selectedPrizeId));
        if (!prize) return;

        const qty = parseInt(prizeQty) || 1;
        const prizeStock = prize.product?.stock || 0;
        const prizeName = prize.product?.title || "Produk";
        const prizeCode = prize.product?.barcode || prize.product?.sku || "-";

        if (prizeStock < qty) {
            toast.error(`Stok hadiah '${prizeName}' tidak mencukupi (Stok: ${prizeStock})`);
            return;
        }

        const existingItemIdx = pointData.items.findIndex(item => item.point_prize_id === prize.id);
        let newItems = [...pointData.items];

        if (existingItemIdx > -1) {
            const newQty = newItems[existingItemIdx].quantity + qty;
            if (prizeStock < newQty) {
                toast.error(`Stok hadiah '${prizeName}' tidak mencukupi untuk total quantity ${newQty}`);
                return;
            }
            newItems[existingItemIdx].quantity = newQty;
        } else {
            newItems.push({
                point_prize_id: prize.id,
                code: prizeCode,
                name: prizeName,
                points_required: prize.points_required,
                quantity: qty,
            });
        }

        setPointData("items", newItems);
        setSelectedPrizeId("");
        setPrizeQty(1);
    };

    const handleRemovePrizeFromGrid = (prizeId) => {
        const newItems = pointData.items.filter(item => item.point_prize_id !== prizeId);
        setPointData("items", newItems);
    };

    // Calculate points balance info
    const saldoAwalPoint = selectedCustomer ? (selectedCustomer.loyalty_points || 0) : 0;
    const totalBarangPoint = pointData.items.reduce((sum, item) => sum + (item.points_required * item.quantity), 0);
    const saldoAkhirPoint = saldoAwalPoint - totalBarangPoint;

    const handleSavePointRedemption = (e) => {
        e.preventDefault();
        if (!selectedCustomer) {
            toast.error("Silakan pilih pelanggan terlebih dahulu");
            return;
        }
        if (pointData.items.length === 0) {
            toast.error("Silakan tambahkan hadiah ke grid terlebih dahulu");
            return;
        }
        if (saldoAkhirPoint < 0) {
            toast.error("Poin pelanggan tidak mencukupi untuk penukaran ini!");
            return;
        }

        postPoint(route("point-redemptions.store"), {
            onSuccess: () => {
                toast.success("Penukaran poin berhasil disimpan");
                resetPoint();
                setSelectedCustomer(null);
                setSelectedPrizeId("");
                setPrizeQty(1);
            },
            onError: (err) => {
                if (err.customer_id) {
                    toast.error(err.customer_id);
                } else if (err.items) {
                    toast.error(err.items);
                } else {
                    toast.error("Gagal memproses penukaran poin");
                }
            }
        });
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

    // Reset highlighted product index when filtered displayItems changes
    useEffect(() => {
        setActiveProductIndex(displayItems.length > 0 ? 0 : -1);
    }, [searchQuery, transactionMode, selectedCategory, displayItems]);


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

                        <div className="mt-6 grid gap-4 sm:grid-cols-3">
                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Modal Awal POS Kasir (Toko)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={openingCashInput === 0 || openingCashInput === "0" ? "" : openingCashInput}
                                    onChange={(event) => {
                                        const val = event.target.value;
                                        setOpeningCashInput(val === "" ? "" : String(parseInt(val, 10) || 0));
                                    }}
                                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-800 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                    placeholder="0"
                                />
                                {errors?.opening_cash && (
                                    <p className="mt-2 text-xs text-rose-500">{errors.opening_cash}</p>
                                )}
                            </div>
                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Modal Awal Cash Agen
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={agentOpeningCashInput === 0 || agentOpeningCashInput === "0" ? "" : agentOpeningCashInput}
                                    onChange={(event) => {
                                        const val = event.target.value;
                                        setAgentOpeningCashInput(val === "" ? "" : String(parseInt(val, 10) || 0));
                                    }}
                                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-800 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                    placeholder="0"
                                />
                                {errors?.agent_opening_cash && (
                                    <p className="mt-2 text-xs text-rose-500">{errors.agent_opening_cash}</p>
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

                        {/* Saldo Rekening Bank (EDC) section */}
                        {bankAccounts && bankAccounts.length > 0 && (
                            <div className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-6">
                                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-1.5">
                                    <IconBuildingBank size={18} className="text-primary-500" />
                                    Saldo Awal Rekening Bank (EDC)
                                </h3>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    {bankAccounts.map((bank) => (
                                        <div key={bank.id}>
                                            <label className="mb-2 block text-xs font-semibold text-slate-500 dark:text-slate-400">
                                                {bank.bank_name} - {bank.account_name} ({bank.account_number})
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={openingBankBalances[bank.id] === 0 ? "" : (openingBankBalances[bank.id] ?? "")}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    const numVal = val === "" ? 0 : (parseInt(val, 10) || 0);
                                                    setOpeningBankBalances(prev => ({
                                                        ...prev,
                                                        [bank.id]: numVal
                                                    }));
                                                }}
                                                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-800 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                                placeholder="0"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

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
                {(transactionMode === "tukar_poin" || transactionMode === "agen_link") && (
                    <div className="lg:hidden flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                        <button
                            onClick={() => setMobileView("products")}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                                mobileView === "products"
                                    ? "text-primary-600 border-b-2 border-primary-500"
                                    : "text-slate-500"
                            }`}
                        >
                            <IconSearch size={18} />
                            <span>Cari Produk</span>
                        </button>
                        <button
                            onClick={() => setMobileView("cart")}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors relative ${
                                mobileView === "cart"
                                    ? "text-primary-600 border-b-2 border-primary-500"
                                    : "text-slate-500"
                            }`}
                        >
                            <IconShoppingCart size={18} />
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
                )}

                {/* Left Panel - Cart & Payments (Standard POS) or Agent Link History */}
                <div
                    className={`flex-1 bg-slate-100 dark:bg-slate-950 overflow-hidden ${
                        (transactionMode === "produk" || transactionMode === "jasa")
                            ? "flex flex-col"
                            : mobileView !== "cart"
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
                                <span>POS Kasir</span>
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
                            <button
                                type="button"
                                onClick={() => setTransactionMode("tukar_poin")}
                                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                    transactionMode === "tukar_poin"
                                        ? "bg-white dark:bg-slate-950/20 dark:bg-slate-900 text-primary-600 dark:text-primary-400 shadow-sm"
                                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                                }`}
                            >
                                <IconGift size={16} />
                                <span>Tukar Poin</span>
                            </button>
                        </div>
                        <div className="flex items-center gap-2 self-start sm:self-auto ml-auto">
                            {(transactionMode === "produk" || transactionMode === "jasa") && (
                                <div className="relative w-full sm:w-80 md:w-96">
                                    <div className="relative">
                                        <input
                                            ref={searchInputRef}
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            onFocus={() => setSearchFocused(true)}
                                            onBlur={() => setSearchFocused(false)}
                                            placeholder={
                                                transactionMode === "produk"
                                                    ? "Cari produk atau scan barcode... (tekan / untuk fokus)"
                                                    : "Cari jasa / layanan... (tekan / untuk fokus)"
                                            }
                                            className="w-full h-10 pl-3 pr-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-550 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-xs"
                                        />
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                            {isSearching ? (
                                                <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                                <IconSearch size={16} className="text-slate-400" />
                                            )}
                                        </div>
                                    </div>

                                    {/* Floating Search Results Dropdown */}
                                    {searchFocused && searchQuery.length > 0 && (
                                        <div 
                                            ref={dropdownRef}
                                            onMouseDown={(e) => e.preventDefault()}
                                            className="absolute top-full right-0 z-50 mt-1 w-full sm:w-[480px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden max-h-[360px] overflow-y-auto"
                                        >
                                            {displayItems.length > 0 ? (
                                                <div className="p-2 space-y-1">
                                                    {displayItems.map((product, index) => {
                                                        const hasStock = product.stock > 0;
                                                        const lowStock = product.stock > 0 && product.stock <= 5;
                                                        const promoBadge = product.pricing_badge;
                                                        const promoPrice = Number(promoBadge?.promo_price || 0);
                                                        const basePrice = Number(promoBadge?.base_price || product.sell_price || 0);
                                                        const showPromo = promoBadge && promoPrice > 0 && promoPrice < basePrice;
                                                        const isHighlighted = index === activeProductIndex;

                                                        return (
                                                            <div
                                                                key={product.id}
                                                                data-product-index={index}
                                                                onClick={() => {
                                                                    if (hasStock) {
                                                                        openCartModal(product);
                                                                        setSearchQuery("");
                                                                    }
                                                                }}
                                                                className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer group ${
                                                                    isHighlighted
                                                                        ? "border-primary-500 ring-2 ring-primary-500/20 bg-primary-50/10 dark:bg-primary-955/10"
                                                                        : "border-slate-50 dark:border-slate-900/50 bg-slate-50/30 dark:bg-slate-900/10 hover:border-primary-300 dark:hover:border-primary-700 hover:bg-white dark:hover:bg-slate-850"
                                                                } ${!hasStock ? "opacity-60 cursor-not-allowed" : ""}`}
                                                            >
                                                                <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-700 overflow-hidden flex-shrink-0">
                                                                    {product.image ? (
                                                                        <img src={getProductImageUrl(product.image)} className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400">
                                                                            {product.is_service ? <IconTools size={14} /> : <IconShoppingCart size={14} />}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs truncate">
                                                                        {product.title}
                                                                    </div>
                                                                    <div className="text-[10px] text-slate-400 dark:text-slate-550 flex items-center gap-1.5 mt-0.5">
                                                                        {product.is_service ? (
                                                                            <span className="text-primary-600 font-medium">Jasa</span>
                                                                        ) : (
                                                                            <>
                                                                                <span className={lowStock ? "text-warning-600 font-medium" : ""}>
                                                                                    Stok: {product.stock_breakdown || `${product.stock} Pcs`}
                                                                                </span>
                                                                                {product.barcode && <span className="truncate">| {product.barcode}</span>}
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="text-right flex-shrink-0 flex flex-col items-end">
                                                                    <div className="font-bold text-primary-600 dark:text-primary-400 text-xs">
                                                                        {formatPrice(showPromo ? promoPrice : product.sell_price)}
                                                                    </div>
                                                                    {showPromo && (
                                                                        <div className="text-[9px] text-slate-400 line-through">
                                                                            {formatPrice(basePrice)}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <div className="p-6 text-center text-slate-400 dark:text-slate-600 text-xs">
                                                    <IconShoppingCart size={32} className="mx-auto mb-2 opacity-50" />
                                                    <p>Produk tidak ditemukan</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={() => setShowShortcuts(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/30 border border-primary-200 dark:border-primary-800 rounded-xl hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors"
                            >
                                <IconKeyboard size={16} />
                                <span>Pintasan</span>
                                <kbd className="hidden sm:inline-block px-1 bg-white dark:bg-slate-900 border border-primary-300 dark:border-primary-800 rounded font-mono text-[9px] font-bold">F4</kbd>
                            </button>
                        </div>
                    </div>

                    {transactionMode === "tukar_poin" ? (
                        /* Point Redemption History List */
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                            {/* Search & Date Filters */}
                            <form onSubmit={handlePointFilterSubmit} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 shadow-sm">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="relative col-span-1 sm:col-span-3">
                                        <input
                                            type="text"
                                            value={pointSearch}
                                            onChange={(e) => setPointSearch(e.target.value)}
                                            placeholder="Cari kode penukaran, nama, kode member..."
                                            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        />
                                        <IconSearch size={16} className="absolute left-3 top-2.5 text-slate-400" />
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-bold uppercase text-slate-400 mb-1">Mulai Tanggal</label>
                                        <input
                                            type="date"
                                            value={pointStartDate}
                                            onChange={(e) => setPointStartDate(e.target.value)}
                                            className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-bold uppercase text-slate-400 mb-1">Sampai Tanggal</label>
                                        <input
                                            type="date"
                                            value={pointEndDate}
                                            onChange={(e) => setPointEndDate(e.target.value)}
                                            className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        />
                                    </div>
                                    <div className="flex items-end gap-2">
                                        <button
                                            type="submit"
                                            className="flex-1 py-1.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-xs font-semibold transition-colors"
                                        >
                                            Filter
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handlePointResetFilters}
                                            className="px-2 py-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 transition-colors"
                                        >
                                            Reset
                                        </button>
                                    </div>
                                </div>
                            </form>

                            {/* List Table Card */}
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                                {pointRedemptions.data && pointRedemptions.data.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse text-xs">
                                            <thead>
                                                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                                                    <th className="px-3 py-3 text-slate-400 font-bold uppercase">No. Ref / Pelanggan</th>
                                                    <th className="px-3 py-3 text-slate-400 font-bold uppercase">Waktu</th>
                                                    <th className="px-3 py-3 text-slate-400 font-bold uppercase text-right">Poin</th>
                                                    <th className="px-3 py-3 text-slate-400 font-bold uppercase text-right">Aksi</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                {pointRedemptions.data.map((tx) => (
                                                    <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20 transition-colors">
                                                        <td className="px-3 py-3">
                                                            <p className="font-bold text-slate-850 dark:text-white font-mono">{tx.redemption_code}</p>
                                                            <p className="text-[10px] text-slate-500 mt-0.5">
                                                                {tx.customer?.name} ({tx.customer?.member_code})
                                                            </p>
                                                        </td>
                                                        <td className="px-3 py-3 text-slate-600 dark:text-slate-400">
                                                            {new Date(tx.created_at).toLocaleString("id-ID", {
                                                                dateStyle: "short",
                                                                timeStyle: "short"
                                                            })}
                                                        </td>
                                                        <td className="px-3 py-3 text-right font-bold text-red-650 font-mono">
                                                            -{tx.total_points} P
                                                        </td>
                                                        <td className="px-3 py-3 text-right">
                                                            <a
                                                                href={route("point-redemptions.print", tx.id)}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-semibold hover:text-slate-900 transition-colors text-[10px]"
                                                                title="Cetak Struk"
                                                            >
                                                                <IconPrinter size={14} />
                                                                <span>Cetak</span>
                                                            </a>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center p-8 text-center">
                                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3 text-slate-400">
                                            <IconDatabaseOff size={20} />
                                        </div>
                                        <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300">Belum Ada Histori</h3>
                                        <p className="text-[10px] text-slate-500 max-w-[200px] mt-0.5">
                                            Tidak ditemukan data penukaran poin.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {pointRedemptions.data && pointRedemptions.data.length > 0 && (
                                <div className="mt-2">
                                    <Pagination links={pointRedemptions.links} />
                                </div>
                            )}
                        </div>
                    ) : transactionMode === "agen_link" ? (
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

                            {/* Bank Accounts Balance Grid */}
                            {((bankAccounts && bankAccounts.length > 0) || activeCashierShift) && (
                                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                                    <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                        <IconBuildingBank size={15} className="text-primary-500" />
                                        Saldo Rekening Bank (EDC) & Kas Agen
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                                        {/* Kas Fisik Agen Card */}
                                        {activeCashierShift && (
                                            <div className="p-3 rounded-xl border border-emerald-100 dark:border-emerald-950/40 bg-emerald-50/20 dark:bg-emerald-950/10 flex items-center justify-between group">
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-450 truncate">Kas Fisik Agen (Cash)</p>
                                                    <p className="text-[9px] text-slate-450 font-mono truncate">Kas Fisik Terpisah Toko</p>
                                                    <p className="text-xs font-bold text-slate-850 dark:text-white mt-1">
                                                        {formatPrice(activeCashierShift?.agent_expected_cash || 0)}
                                                    </p>
                                                </div>
                                                <div className="p-1.5 text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg flex-shrink-0">
                                                    <IconWallet size={16} />
                                                </div>
                                            </div>
                                        )}

                                        {bankAccounts && bankAccounts.map((bank) => (
                                            <div key={bank.id} className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 flex items-center justify-between group">
                                                <div className="min-w-0">
                                                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-350 truncate">{bank.bank_name}</p>
                                                    <p className="text-[9px] text-slate-400 font-mono truncate">{bank.account_number} • {bank.account_name}</p>
                                                    <p className="text-xs font-bold text-slate-850 dark:text-white mt-1">
                                                        {formatPrice(bank.balance || 0)}
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenBalanceModal(bank)}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-950/20 transition-colors opacity-80 group-hover:opacity-100 flex-shrink-0"
                                                    title="Set Saldo"
                                                >
                                                    <IconPencil size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

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
                    ) : transactionMode === "tukar_poin" ? (
                        /* Tukar Poin Left Panel */
                        <div className="flex-1 flex items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl m-4 text-slate-400">
                            <div className="text-center">
                                <IconGift size={48} className="mx-auto mb-2 text-slate-350 dark:text-slate-700 animate-pulse" />
                                <p className="text-sm">Silakan lakukan penukaran poin pada panel kanan.</p>
                            </div>
                        </div>
                    ) : (
                        /* Standard POS Cart & Payments side-by-side */
                        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0 bg-slate-100 dark:bg-slate-955 p-4 gap-4">
                            {/* Cart Column */}
                            <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col overflow-hidden min-h-0 shadow-sm">
                                <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
                                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                        <IconShoppingCart size={18} />
                                        <span>Keranjang Belanja</span>
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        {carts.length > 0 && (
                                            <span className="px-2.5 py-0.5 text-xs font-bold bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300 rounded-full">
                                                {cartCount} item
                                            </span>
                                        )}
                                        {carts.length > 0 && (
                                            <HoldButton
                                                hasItems={carts.length > 0}
                                                onHold={handleHoldCart}
                                                isHolding={isHolding}
                                            />
                                        )}
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin">
                                    {carts.length > 0 ? (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse text-xs sm:text-sm">
                                                <thead>
                                                    <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-850/20 text-slate-500">
                                                        <th className="px-3 py-2 font-bold uppercase tracking-wider">Produk</th>
                                                        <th className="px-3 py-2 font-bold uppercase tracking-wider">Satuan</th>
                                                        <th className="px-3 py-2 font-bold uppercase tracking-wider text-center">Qty</th>
                                                        <th className="px-3 py-2 font-bold uppercase tracking-wider text-right">Harga</th>
                                                        <th className="px-3 py-2 font-bold uppercase tracking-wider text-right">Diskon</th>
                                                        <th className="px-3 py-2 font-bold uppercase tracking-wider text-right">Total</th>
                                                        <th className="px-3 py-2 font-bold uppercase tracking-wider text-right"></th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                    {carts.map((item) => {
                                                        const pricingItem = pricingItemsByCartId[item.id];
                                                        const effectiveLineTotal = Number(pricingItem?.line_total ?? item.price ?? 0);
                                                        const pricingRule = pricingItem?.pricing_rule;

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
                                                        } else if (item.is_service && item.service?.service_prices) {
                                                            item.service.service_prices.forEach((sp) => {
                                                                availableUnits.push({
                                                                    key: String(sp.unit_id),
                                                                    label: sp.unit?.name || "Unit",
                                                                    price: Number(sp.price || 0),
                                                                });
                                                            });
                                                        }

                                                        const selectedUnit = availableUnits.find(u => u.key === item.satuan_key) || availableUnits[0];
                                                        const baseUnitPrice = selectedUnit ? Number(selectedUnit.price) : Number(item.product?.sell_price || 0);

                                                        return (
                                                            <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/10">
                                                                <td className="px-3 py-3">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700 overflow-hidden flex-shrink-0">
                                                                            {item.product?.image ? (
                                                                                <img src={getProductImageUrl(item.product.image)} alt={item.product.title} className="w-full h-full object-cover" />
                                                                            ) : (
                                                                                <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400">
                                                                                    {item.is_service ? <IconTools size={14} /> : <IconShoppingCart size={14} />}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        <div className="min-w-0">
                                                                            <h4 className="font-semibold text-slate-855 dark:text-slate-200 text-xs sm:text-sm truncate max-w-[150px] sm:max-w-[200px]" title={item.product?.title || item.service?.name}>
                                                                                {item.product?.title || item.service?.name}
                                                                            </h4>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-3 py-3">
                                                                    {availableUnits.length > 1 ? (
                                                                        <select
                                                                            value={item.satuan_key || "pcs"}
                                                                            onChange={(e) => handleUpdateUnit(item.id, e.target.value)}
                                                                            disabled={updatingCartId === item.id}
                                                                            className="px-1.5 py-0.5 rounded text-[11px] font-medium border border-slate-205 dark:border-slate-750 bg-white dark:bg-slate-900 text-slate-650 dark:text-slate-350 focus:outline-none"
                                                                        >
                                                                            {availableUnits.map((u) => (
                                                                                <option key={u.key} value={u.key}>
                                                                                    {u.label}
                                                                                </option>
                                                                            ))}
                                                                        </select>
                                                                    ) : (
                                                                        <span className="text-[11px] text-slate-550 font-medium bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                                                            {item.satuan_key || "pcs"}
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td className="px-3 py-3">
                                                                    <div className="flex items-center justify-center gap-1.5">
                                                                        <button
                                                                            onClick={() => handleUpdateQty(item.id, Number(item.qty) - 1)}
                                                                            disabled={Number(item.qty) <= 1 || updatingCartId === item.id}
                                                                            className="w-5 h-5 flex items-center justify-center bg-slate-105 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-md font-bold disabled:opacity-30 transition-colors cursor-pointer"
                                                                        >
                                                                            -
                                                                        </button>
                                                                        <span className="w-6 text-center font-bold text-slate-855 dark:text-slate-200">{item.qty}</span>
                                                                        <button
                                                                            onClick={() => handleUpdateQty(item.id, Number(item.qty) + 1)}
                                                                            disabled={updatingCartId === item.id}
                                                                            className="w-5 h-5 flex items-center justify-center bg-slate-105 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-md font-bold transition-colors cursor-pointer"
                                                                        >
                                                                            +
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                                <td className="px-3 py-3 text-right text-slate-655 dark:text-slate-300 font-mono font-medium">
                                                                    {formatPrice(baseUnitPrice)}
                                                                </td>
                                                                <td className="px-3 py-3 text-right text-rose-600 dark:text-rose-400 font-mono font-medium">
                                                                    {Number(item.discount) > 0 ? `-${formatPrice(Number(item.discount))}` : "-"}
                                                                </td>
                                                                <td className="px-3 py-3 text-right text-slate-855 dark:text-slate-200 font-mono font-bold">
                                                                    {formatPrice(effectiveLineTotal)}
                                                                    {pricingRule && (
                                                                        <div className="text-[9px] text-emerald-600 font-medium">
                                                                            Promo
                                                                        </div>
                                                                    )}
                                                                </td>
                                                                <td className="px-3 py-3 text-right">
                                                                    <button
                                                                        onClick={() => handleRemoveFromCart(item.id)}
                                                                        disabled={removingItemId === item.id}
                                                                        className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-955/20 rounded transition-colors cursor-pointer"
                                                                        title="Hapus"
                                                                    >
                                                                        <IconTrash size={14} />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-600">
                                            <IconShoppingCart size={48} className="text-slate-300 dark:text-slate-700 mb-2 animate-bounce" />
                                            <p className="text-sm font-medium">Keranjang belanja kosong</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Payment Column */}
                            <div className="w-full lg:w-[360px] xl:w-[400px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col overflow-hidden min-h-0 shadow-sm">
                                {/* Customer Select - Fixed */}
                                <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
                                    <CustomerSelect
                                        ref={customerSelectRef}
                                        customers={customers}
                                        selected={selectedCustomer}
                                        onSelect={setSelectedCustomer}
                                        placeholder="Pilih pelanggan..."
                                        error={errors?.customer_id}
                                        label={
                                            <span className="flex justify-between items-center w-full">
                                                <span>Pelanggan</span>
                                                <kbd className="bg-slate-100 dark:bg-slate-800 text-slate-500 rounded px-1.5 py-0.5 border border-slate-200 dark:border-slate-700 font-mono text-[9px] font-bold">Alt+S</kbd>
                                            </span>
                                        }
                                    />
                                </div>

                                {/* Held Transactions & Alerts */}
                                {heldCarts.length > 0 && (
                                    <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
                                        <HeldTransactions
                                            heldCarts={heldCarts}
                                            hasActiveCart={carts.length > 0}
                                            isExpanded={isResumePanelOpen}
                                            onToggleExpanded={setIsResumePanelOpen}
                                        />
                                    </div>
                                )}

                                {/* Payment Details Inputs - Scrollable */}
                                <div className="flex-1 overflow-y-auto p-3 space-y-4 min-h-0 scrollbar-thin">
                                    {/* Pay later toggle */}
                                    <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                                        <div>
                                            <p className="text-xs font-semibold text-slate-800 dark:text-white">
                                                Bayar Belakangan (Nota Barang)
                                            </p>
                                            <p className="text-[10px] text-slate-505">
                                                Catat sebagai piutang pelanggan.
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
                                            <span className={`w-9 h-5 flex items-center bg-slate-300 rounded-full p-0.5 transition ${payLater ? "bg-primary-500" : ""}`}>
                                                <span className={`bg-white w-4 h-4 rounded-full shadow transform transition ${payLater ? "translate-x-4" : ""}`} />
                                            </span>
                                        </label>
                                    </div>

                                    {payLater && (
                                        <div>
                                            <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-405 mb-1.5">
                                                Tanggal Jatuh Tempo
                                            </label>
                                            <input
                                                type="date"
                                                value={dueDate}
                                                onChange={(e) => setDueDate(e.target.value)}
                                                className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                                            />
                                        </div>
                                    )}

                                    {/* Payment Method Selection */}
                                    <div>
                                        <label className="block text-[11px] font-medium text-slate-605 dark:text-slate-400 mb-1.5">
                                            Metode Pembayaran
                                        </label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {paymentOptions.map((method) => (
                                                <button
                                                    key={method.value}
                                                    type="button"
                                                    onClick={() => !payLater && setPaymentMethod(method.value)}
                                                    disabled={payLater}
                                                    className={`p-2 rounded-xl border-2 transition-all flex items-center gap-2 cursor-pointer ${
                                                        paymentMethod === method.value && !payLater
                                                            ? "border-primary-500 bg-primary-50/50 dark:bg-primary-955/20"
                                                            : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/30 dark:bg-slate-909/10"
                                                    } ${payLater ? "opacity-50 cursor-not-allowed" : ""}`}
                                                >
                                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${paymentMethod === method.value && !payLater ? "bg-primary-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-550"}`}>
                                                        {method.value === "cash" ? (
                                                            <IconCash size={14} />
                                                        ) : method.value === "bank_transfer" ? (
                                                            <IconBuildingBank size={14} />
                                                        ) : (
                                                            <IconCreditCard size={14} />
                                                        )}
                                                    </div>
                                                    <span className={`text-xs font-semibold ${paymentMethod === method.value && !payLater ? "text-primary-700 dark:text-primary-300" : "text-slate-700 dark:text-slate-300"}`}>
                                                        {method.label}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Bank Selector - Only for bank_transfer */}
                                    {paymentMethod === "bank_transfer" && bankAccounts.length > 0 && !payLater && (
                                        <div>
                                            <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-405 mb-1.5">
                                                Rekening Tujuan
                                            </label>
                                            <div className="grid grid-cols-1 gap-1.5 max-h-[120px] overflow-y-auto pr-1">
                                                {bankAccounts.map((bank) => {
                                                    const isActive = selectedBankAccount?.id === bank.id;
                                                    return (
                                                        <button
                                                            key={bank.id}
                                                            type="button"
                                                            onClick={() => setSelectedBankAccount(bank)}
                                                            className={`p-2 rounded-xl border-2 transition-colors flex items-center gap-2 text-left cursor-pointer ${
                                                                isActive
                                                                    ? "border-primary-500 bg-primary-50/50 dark:bg-primary-955/20"
                                                                    : "border-slate-200 dark:border-slate-800 hover:border-primary-200 dark:hover:border-primary-800"
                                                            }`}
                                                        >
                                                            <div className="w-7 h-7 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                                                                {bank.logo_url ? (
                                                                    <img src={bank.logo_url} alt={bank.bank_name} className="max-w-full max-h-full object-contain" />
                                                                ) : (
                                                                    <IconBuildingBank size={14} className="text-slate-500" />
                                                                )}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">
                                                                    {bank.bank_name} - {bank.account_number}
                                                                </p>
                                                            </div>
                                                            {isActive && <span className="text-[10px] font-semibold text-primary-600">Dipilih</span>}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Payment Reference */}
                                    {!payLater && paymentMethod !== "cash" && (
                                        <div>
                                            <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-405 mb-1.5">
                                                Nomor Transaksi / Ref Pembayaran
                                            </label>
                                            <input
                                                type="text"
                                                value={paymentReference}
                                                onChange={(e) => setPaymentReference(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") {
                                                        e.preventDefault();
                                                        if (submitButtonRef.current) {
                                                            submitButtonRef.current.focus();
                                                        }
                                                    }
                                                }}
                                                placeholder="Kode Ref / Trace / ID Transaksi..."
                                                className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                                            />
                                        </div>
                                    )}

                                    {/* Discount Input */}
                                    {promoDiscount > 0 && (
                                        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-2.5 dark:border-emerald-900/30 dark:bg-emerald-950/20 text-xs flex justify-between items-center text-emerald-800 dark:text-emerald-350">
                                            <span>Promo otomatis aktif</span>
                                            <span className="font-bold">-{formatPrice(promoDiscount)}</span>
                                        </div>
                                    )}

                                    {/* Diskon Belanja Input */}
                                    <div>
                                        <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1 flex items-center justify-between">
                                            <span>Diskon Belanja (Rp)</span>
                                            <kbd className="bg-slate-100 dark:bg-slate-800 text-slate-500 rounded px-1 border border-slate-200 dark:border-slate-700 font-mono text-[8px] font-bold">Alt+D</kbd>
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">Rp</span>
                                            <input
                                                ref={discountInputRef}
                                                type="text"
                                                inputMode="numeric"
                                                value={discountInput}
                                                onChange={(e) => setDiscountInput(e.target.value.replace(/[^\d]/g, ""))}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") {
                                                        e.preventDefault();
                                                        if (paymentMethod === "cash" && cashInputRef.current) {
                                                            cashInputRef.current.focus();
                                                            cashInputRef.current.select();
                                                        } else if (submitButtonRef.current) {
                                                            submitButtonRef.current.focus();
                                                        }
                                                    }
                                                }}
                                                placeholder="0"
                                                className="w-full h-8 pl-8 pr-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold focus:ring-2 focus:ring-primary-500/20 outline-none"
                                            />
                                        </div>
                                    </div>

                                    {/* Cash Input - Only for cash */}
                                    {paymentMethod === "cash" && (
                                        <div>
                                            <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1 flex items-center justify-between">
                                                <span>Jumlah Bayar (Rp)</span>
                                                <kbd className="bg-slate-100 dark:bg-slate-800 text-slate-500 rounded px-1 border border-slate-200 dark:border-slate-700 font-mono text-[8px] font-bold">Alt+B</kbd>
                                            </label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">Rp</span>
                                                <input
                                                    ref={cashInputRef}
                                                    type="text"
                                                    inputMode="numeric"
                                                    value={cashInput}
                                                    onChange={(e) => setCashInput(e.target.value.replace(/[^\d]/g, ""))}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter") {
                                                            e.preventDefault();
                                                            if (submitButtonRef.current) {
                                                                submitButtonRef.current.focus();
                                                            }
                                                        }
                                                    }}
                                                    placeholder="0"
                                                    className="w-full h-8 pl-8 pr-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold focus:ring-2 focus:ring-primary-500/20"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Summary & Submit - Fixed at bottom */}
                                <div className="flex-shrink-0 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 p-3 text-xs">
                                    <div className="flex justify-between items-center mb-1 text-slate-500">
                                        <span>Subtotal Dasar</span>
                                        <span className="font-medium">{formatPrice(baseSubtotal)}</span>
                                    </div>
                                    {promoDiscount > 0 && (
                                        <div className="flex justify-between items-center mb-1 text-emerald-600">
                                            <span>Diskon Promo</span>
                                            <span>-{formatPrice(promoDiscount)}</span>
                                        </div>
                                    )}
                                    {manualDiscountTotal > 0 && (
                                        <div className="flex justify-between items-center mb-1 text-rose-600">
                                            <span>Diskon Belanja</span>
                                            <span>-{formatPrice(manualDiscountTotal)}</span>
                                        </div>
                                    )}
                                    {shipping > 0 && (
                                        <div className="flex justify-between items-center mb-1 text-slate-500">
                                            <span>Ongkir</span>
                                            <span className="font-medium">+{formatPrice(shipping)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center mb-2 font-bold text-slate-805 dark:text-white text-sm">
                                        <span>Total</span>
                                        <span className="text-primary-600 dark:text-primary-400">{formatPrice(payable)}</span>
                                    </div>

                                    {paymentMethod === "cash" && !payLater && cash >= payable && payable > 0 && (
                                        <div className="flex justify-between items-center mb-2 p-1.5 rounded-lg bg-success-50 dark:bg-success-950/20 text-success-700 font-semibold">
                                            <span>Kembalian</span>
                                            <span>{formatPrice(cash - payable)}</span>
                                        </div>
                                    )}

                                    <button
                                        ref={submitButtonRef}
                                        onClick={handleSubmitTransaction}
                                        disabled={
                                            !carts.length ||
                                            (payLater && !selectedCustomer) ||
                                            (!payLater && paymentMethod === "cash" && cash < payable) ||
                                            isLoadingPricing ||
                                            isSubmitting
                                        }
                                        className={`w-full h-10 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition-all text-xs cursor-pointer ${
                                            carts.length && (!payLater || selectedCustomer) && (paymentMethod !== "cash" || cash >= payable) && !isLoadingPricing
                                                ? "bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white shadow-md shadow-primary-500/20"
                                                : "bg-slate-205 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed"
                                        }`}
                                    >
                                        {isSubmitting || isLoadingPricing ? (
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <IconReceipt size={14} />
                                                <span>
                                                    {!carts.length
                                                        ? "Keranjang Kosong"
                                                        : payLater && !selectedCustomer
                                                        ? "Pilih Pelanggan (Wajib)"
                                                        : paymentMethod === "cash" && cash < payable
                                                        ? `Kurang ${formatPrice(payable - cash)}`
                                                        : "Selesaikan Transaksi"}
                                                </span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Panel - Product Search or Forms */}
                {(transactionMode === "tukar_poin" || transactionMode === "agen_link") && (
                    <div
                        className={`w-full lg:w-[420px] xl:w-[480px] flex flex-col bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 min-h-0 overflow-hidden ${
                            mobileView !== "products" ? "hidden lg:flex" : "flex"
                        }`}
                        style={{ height: "calc(100vh - 4rem)" }}
                    >
                    {transactionMode === "tukar_poin" ? (
                        /* Point Redemption Form Panel */
                        <div className="flex flex-col h-full overflow-hidden">
                            {/* Form Header */}
                            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between flex-shrink-0">
                                <h3 className="text-sm font-semibold text-slate-850 dark:text-white flex items-center gap-2">
                                    <IconGift size={18} className="text-primary-500" />
                                    Penukaran Poin (Tukar Point)
                                </h3>
                            </div>

                            {/* Form Body - Scrollable */}
                            <form onSubmit={handleSavePointRedemption} className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 flex flex-col">
                                {/* 1. Pelanggan Selection */}
                                <div className="p-4 bg-blue-50/50 dark:bg-slate-900 border border-blue-100 dark:border-slate-800 rounded-2xl space-y-3">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                                        <span>1. Pelanggan</span>
                                        <kbd className="bg-slate-100 dark:bg-slate-800 text-slate-500 rounded px-1.5 py-0.5 border border-slate-200 dark:border-slate-700 font-mono text-[9px] font-bold">Alt+S</kbd>
                                    </h4>
                                    <CustomerSelect
                                        ref={customerSelectRef}
                                        customers={customers}
                                        selected={selectedCustomer}
                                        onSelect={setSelectedCustomer}
                                        placeholder="Cari pelanggan..."
                                        error={pointErrors.customer_id}
                                    />
                                    {selectedCustomer && (
                                        <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-blue-100/50 dark:border-slate-850">
                                            <div>
                                                <span className="text-slate-400 block">Nama</span>
                                                <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedCustomer.name}</span>
                                            </div>
                                            <div>
                                                <span className="text-slate-400 block">Alamat</span>
                                                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block" title={selectedCustomer.address}>{selectedCustomer.address || "-"}</span>
                                            </div>
                                            <div className="col-span-2 pt-1.5 flex justify-between items-center bg-primary-50 dark:bg-primary-950/20 p-2 rounded-lg">
                                                <span className="text-primary-750 dark:text-primary-300 font-medium">Saldo Poin</span>
                                                <span className="font-bold text-primary-600 dark:text-primary-400 text-sm">{selectedCustomer.loyalty_points || 0} Poin</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* 2. Hadiah Poin Selection */}
                                <div className="p-4 bg-blue-50/50 dark:bg-slate-900 border border-blue-100 dark:border-slate-800 rounded-2xl space-y-3">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                                        <span>2. Hadiah Poin</span>
                                        <kbd className="bg-slate-100 dark:bg-slate-800 text-slate-500 rounded px-1.5 py-0.5 border border-slate-200 dark:border-slate-700 font-mono text-[9px] font-bold">Alt+H</kbd>
                                    </h4>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="col-span-2">
                                            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Pilih Hadiah</label>
                                            <select
                                                ref={pointPrizeSelectRef}
                                                value={selectedPrizeId}
                                                onChange={(e) => setSelectedPrizeId(e.target.value)}
                                                className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-955 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                            >
                                                <option value="">-- Pilih Hadiah --</option>
                                                {pointPrizes.map((p) => (
                                                    <option key={p.id} value={p.id} disabled={(p.product?.stock || 0) <= 0}>
                                                        {p.product?.title || "Produk"} ({p.points_required} P) [Stok: {p.product?.stock || 0}]
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center justify-between">
                                                <span>Qty</span>
                                                <kbd className="bg-slate-100 dark:bg-slate-800 text-slate-500 rounded px-1 py-0.2 border border-slate-200 dark:border-slate-750 font-mono text-[8px] font-bold">Alt+Q</kbd>
                                            </label>
                                            <input
                                                ref={pointPrizeQtyRef}
                                                type="number"
                                                min="1"
                                                value={prizeQty}
                                                onChange={(e) => setPrizeQty(Math.max(1, parseInt(e.target.value) || 1))}
                                                className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                            />
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleAddPrizeToGrid}
                                        className="w-full inline-flex items-center justify-center gap-1.5 py-2 bg-slate-850 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold transition-colors"
                                    >
                                        <IconPlus size={14} />
                                        <span>Masuk Grid</span>
                                        <kbd className="bg-slate-700 text-slate-300 rounded px-1 border border-slate-600 font-mono text-[8px] font-bold">Alt+A</kbd>
                                    </button>
                                </div>

                                {/* 3. Grid Table */}
                                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm bg-white dark:bg-slate-900 flex-1 flex flex-col min-h-[150px]">
                                    <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 uppercase tracking-wider flex-shrink-0">
                                        Daftar Penukaran (Grid)
                                    </div>
                                    <div className="flex-1 overflow-y-auto min-h-0">
                                        {pointData.items.length > 0 ? (
                                            <table className="w-full text-left border-collapse text-xs">
                                                <thead>
                                                    <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30">
                                                        <th className="px-3 py-2 text-slate-400 font-bold uppercase">Nama</th>
                                                        <th className="px-3 py-2 text-slate-400 font-bold uppercase text-center">Poin</th>
                                                        <th className="px-3 py-2 text-slate-400 font-bold uppercase text-center">Qty</th>
                                                        <th className="px-3 py-2 text-slate-400 font-bold uppercase text-right">Total</th>
                                                        <th className="px-3 py-2 text-slate-400 font-bold uppercase text-right"></th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                    {pointData.items.map((item) => (
                                                        <tr key={item.point_prize_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/10">
                                                            <td className="px-3 py-2 font-semibold text-slate-800 dark:text-slate-200">{item.name}</td>
                                                            <td className="px-3 py-2 text-center text-slate-500">{item.points_required} P</td>
                                                            <td className="px-3 py-2 text-center text-slate-800 dark:text-slate-200 font-mono font-bold">{item.quantity}</td>
                                                            <td className="px-3 py-2 text-right text-slate-800 dark:text-slate-200 font-mono font-bold">{item.points_required * item.quantity}</td>
                                                            <td className="px-3 py-2 text-right">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRemovePrizeFromGrid(item.point_prize_id)}
                                                                    className="p-1 rounded bg-red-50 hover:bg-red-100 dark:bg-red-950/20 text-red-650 hover:text-red-700 transition-colors"
                                                                >
                                                                    <IconX size={12} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center p-6 text-center h-full text-slate-400">
                                                <IconGift size={24} className="opacity-45 mb-1" />
                                                <p className="text-[11px]">Belum ada hadiah yang ditambahkan.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* 4. Summary & Notes */}
                                <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl grid grid-cols-3 gap-2 text-xs flex-shrink-0">
                                    <div className="text-center p-1.5 bg-white dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-850">
                                        <span className="text-[10px] text-slate-400 block mb-0.5">Saldo Awal Poin</span>
                                        <span className="font-bold text-slate-700 dark:text-slate-350">{saldoAwalPoint}</span>
                                    </div>
                                    <div className="text-center p-1.5 bg-red-50/50 dark:bg-red-950/10 rounded-xl border border-red-100 dark:border-red-950/20">
                                        <span className="text-[10px] text-red-500 block mb-0.5">Total Poin</span>
                                        <span className="font-bold text-red-650">{totalBarangPoint}</span>
                                    </div>
                                    <div className="text-center p-1.5 bg-success-50/50 dark:bg-success-950/10 rounded-xl border border-success-100 dark:border-success-950/20">
                                        <span className="text-[10px] text-success-500 block mb-0.5">Saldo Akhir Poin</span>
                                        <span className={`font-bold ${saldoAkhirPoint < 0 ? "text-danger-600" : "text-success-650"}`}>{saldoAkhirPoint}</span>
                                    </div>
                                    <div className="col-span-3">
                                        <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1">Catatan</label>
                                        <textarea
                                            ref={pointNotesRef}
                                            value={pointData.notes}
                                            onChange={(e) => setPointData("notes", e.target.value)}
                                            placeholder="Masukkan catatan penukaran (opsional)..."
                                            rows="2"
                                            className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        />
                                    </div>
                                </div>

                                {/* Form Action Buttons */}
                                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex gap-2 flex-shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            resetPoint();
                                            setSelectedCustomer(null);
                                            setSelectedPrizeId("");
                                            setPrizeQty(1);
                                        }}
                                        className="flex-1 py-3 px-4 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors text-center text-xs"
                                    >
                                        Keluar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={pointProcessing}
                                        className="flex-1 py-3 px-4 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 text-center text-xs flex items-center justify-center gap-1.5"
                                    >
                                        <span>{pointProcessing ? "Menyimpan..." : "Simpan"}</span>
                                        {!pointProcessing && <kbd className="bg-primary-650 text-white rounded px-1.5 py-0.5 border border-primary-400 font-mono text-[9px] font-bold">F2</kbd>}
                                    </button>
                                </div>
                            </form>
                        </div>
                    ) : (
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
                                {/* Bank Account */}
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center justify-between">
                                        <span>EDC / Sumber Rekening Agen</span>
                                        <kbd className="bg-slate-100 dark:bg-slate-800 text-slate-500 rounded px-1.5 py-0.5 border border-slate-200 dark:border-slate-700 font-mono text-[9px] font-bold">Alt+S</kbd>
                                    </label>
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
                                    {agentData.bank_account_id && (() => {
                                        const selectedBank = bankAccounts.find(b => b.id === parseInt(agentData.bank_account_id));
                                        if (!selectedBank) return null;
                                        return (
                                            <p className="text-xs text-slate-505 dark:text-slate-400 mt-1 flex justify-between">
                                                <span>Saldo: <span className="font-semibold text-slate-700 dark:text-slate-200">{formatPrice(selectedBank.balance || 0)}</span></span>
                                            </p>
                                        );
                                    })()}
                                    {agentErrors.bank_account_id && <p className="text-xs text-rose-500 mt-1">{agentErrors.bank_account_id}</p>}
                                </div>

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

                                {/* Nominal */}
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center justify-between">
                                        <span>Nominal Transaksi (Rp) *</span>
                                        <kbd className="bg-slate-100 dark:bg-slate-800 text-slate-500 rounded px-1.5 py-0.5 border border-slate-200 dark:border-slate-700 font-mono text-[9px] font-bold">Alt+N</kbd>
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">Rp</span>
                                        <input
                                            ref={agentNominalInputRef}
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

                                {/* Admin Payment Method */}
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

                                {/* Notes */}
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center justify-between">
                                        <span>Catatan Tambahan</span>
                                        <kbd className="bg-slate-100 dark:bg-slate-800 text-slate-500 rounded px-1.5 py-0.5 border border-slate-200 dark:border-slate-700 font-mono text-[9px] font-bold">Alt+K</kbd>
                                    </label>
                                    <textarea
                                        ref={agentNotesInputRef}
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
                                            <kbd className="bg-primary-650 text-white rounded px-1.5 py-0.5 border border-primary-400 font-mono text-[9px] font-bold">F2</kbd>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
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

            {/* Item Selection Modal (Qty, Satuan, Diskon) */}
            {selectedItemForCart && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-slate-900/60"
                        onClick={() => setSelectedItemForCart(null)}
                    />
                    <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-6 max-w-md w-full border border-slate-100 dark:border-slate-800">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2 flex-shrink-0">
                            <IconShoppingCart size={24} className="text-primary-500" />
                            Tambah ke Keranjang
                        </h3>
                        <div className="mb-4">
                            <div className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold">Nama Barang</div>
                            <div className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                                {selectedItemForCart.title}
                            </div>
                            {!selectedItemForCart.is_service && (
                                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    Stok Tersedia: {selectedItemForCart.stock_breakdown || `${selectedItemForCart.stock} Pcs`}
                                </div>
                            )}
                        </div>
                        <div className="space-y-4">
                            {/* Quantity Input */}
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1.5">
                                    Jumlah (Qty)
                                </label>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setModalQty(prev => Math.max(1, prev - 1))}
                                        className="w-10 h-10 flex items-center justify-center bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl font-bold transition-all border border-slate-200 dark:border-slate-850 cursor-pointer"
                                    >
                                        -
                                    </button>
                                    <input
                                        ref={modalQtyInputRef}
                                        type="number"
                                        min="1"
                                        value={modalQty}
                                        onChange={(e) => setModalQty(Math.max(1, parseInt(e.target.value) || 1))}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                if (modalUnitSelectRef.current) {
                                                    modalUnitSelectRef.current.focus();
                                                }
                                            }
                                        }}
                                        className="flex-1 h-10 text-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-bold focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setModalQty(prev => prev + 1)}
                                        className="w-10 h-10 flex items-center justify-center bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl font-bold transition-all border border-slate-200 dark:border-slate-855 cursor-pointer"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>

                            {/* Unit (Satuan) Select */}
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1.5">
                                    Satuan
                                </label>
                                <select
                                    ref={modalUnitSelectRef}
                                    value={modalUnitKey}
                                    onChange={(e) => setModalUnitKey(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            if (modalDiscountInputRef.current) {
                                                modalDiscountInputRef.current.focus();
                                                modalDiscountInputRef.current.select();
                                            }
                                        }
                                    }}
                                    className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                                >
                                    {getAvailableUnitsForItem(selectedItemForCart).map((unit) => (
                                        <option key={unit.key} value={unit.key}>
                                            {unit.label} ({formatPrice(unit.price)})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Discount Input */}
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1.5">
                                    Diskon Manual (Rp per Unit)
                                </label>
                                <input
                                    ref={modalDiscountInputRef}
                                    type="text"
                                    value={modalDiscount}
                                    onChange={(e) => setModalDiscount(e.target.value.replace(/[^\d]/g, ""))}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            handleAddToCart(
                                                selectedItemForCart,
                                                modalQty,
                                                modalUnitKey,
                                                Number(modalDiscount) || 0
                                            );
                                        }
                                    }}
                                    className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none text-right font-mono font-semibold"
                                    placeholder="0"
                                />
                            </div>

                            {/* Pricing Preview inside Modal */}
                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-850 space-y-1.5 text-xs">
                                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                                    <span>Harga Satuan:</span>
                                    <span className="font-mono font-medium">
                                        {formatPrice(
                                            getAvailableUnitsForItem(selectedItemForCart).find(u => u.key === modalUnitKey)?.price || 0
                                        )}
                                    </span>
                                </div>
                                {Number(modalDiscount) > 0 && (
                                    <div className="flex justify-between text-rose-600 dark:text-rose-400">
                                        <span>Diskon per Unit:</span>
                                        <span className="font-mono font-medium">
                                            -{formatPrice(Number(modalDiscount))}
                                        </span>
                                    </div>
                                )}
                                <div className="flex justify-between font-bold text-slate-800 dark:text-slate-200 border-t border-slate-200/50 dark:border-slate-800/50 pt-1.5 mt-1.5">
                                    <span>Subtotal Item:</span>
                                    <span className="font-mono text-primary-600 dark:text-primary-400">
                                        {formatPrice(
                                            Math.max(
                                                0,
                                                ((getAvailableUnitsForItem(selectedItemForCart).find(u => u.key === modalUnitKey)?.price || 0) - Number(modalDiscount)) * modalQty
                                            )
                                        )}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800 pt-4">
                            <button
                                type="button"
                                onClick={() => setSelectedItemForCart(null)}
                                className="px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                disabled={addingProductId !== null}
                                onClick={() => {
                                    handleAddToCart(
                                        selectedItemForCart,
                                        modalQty,
                                        modalUnitKey,
                                        Number(modalDiscount) || 0
                                    );
                                }}
                                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 shadow-md shadow-primary-500/20 rounded-xl transition-all disabled:opacity-50 cursor-pointer"
                            >
                                {addingProductId !== null ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <IconShoppingCart size={16} />
                                        <span>Tambah ke Keranjang</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Keyboard Shortcuts Help */}
            {showShortcuts && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-slate-900/60"
                        onClick={() => setShowShortcuts(false)}
                    />
                    <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-6 max-w-md w-full">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2 flex-shrink-0">
                            <IconKeyboard size={24} className="text-primary-500" />
                            Panduan Pintasan Keyboard
                        </h3>
                        <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1 flex-1 scrollbar-thin">
                            <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-primary-500 mb-1.5">Navigasi & Pencarian</h4>
                                <div className="space-y-1.5">
                                    {[
                                        ["/", "Fokus kolom pencarian"],
                                        ["↑ / ↓", "Navigasi daftar produk"],
                                        ["Enter", "Tambah produk ke keranjang"],
                                        ["Esc", "Tutup modal / batal fokus"],
                                    ].map(([key, desc]) => (
                                        <div key={key} className="flex items-center justify-between text-xs">
                                            <span className="text-slate-600 dark:text-slate-400">{desc}</span>
                                            <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono font-bold text-slate-700 dark:text-slate-300">{key}</kbd>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-primary-500 mb-1.5">Pilihan Mode</h4>
                                <div className="space-y-1.5">
                                    {[
                                        ["F6 / Alt+1", "Mode POS Kasir"],
                                        ["F7 / Alt+2", "Mode Jasa"],
                                        ["F8 / Alt+3", "Mode Agen Link"],
                                        ["F9 / Alt+4", "Mode Tukar Poin"],
                                    ].map(([key, desc]) => (
                                        <div key={key} className="flex items-center justify-between text-xs">
                                            <span className="text-slate-600 dark:text-slate-400">{desc}</span>
                                            <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono font-bold text-slate-700 dark:text-slate-300">{key}</kbd>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-primary-500 mb-1.5">Fokus Form & Input</h4>
                                <div className="space-y-1.5">
                                    {[
                                        ["Alt+S", "Pilih Pelanggan / Rekening Bank"],
                                        ["Alt+D", "Fokus Diskon Manual"],
                                        ["Alt+B", "Fokus Jumlah Tunai (Bayar)"],
                                        ["Alt+N", "Fokus Nominal (Agen)"],
                                        ["Alt+K", "Fokus Catatan (Agen)"],
                                        ["Alt+H", "Fokus Pilihan Hadiah (Poin)"],
                                        ["Alt+Q", "Fokus Qty Hadiah (Poin)"],
                                    ].map(([key, desc]) => (
                                        <div key={key} className="flex items-center justify-between text-xs">
                                            <span className="text-slate-600 dark:text-slate-400">{desc}</span>
                                            <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono font-bold text-slate-700 dark:text-slate-300">{key}</kbd>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-primary-500 mb-1.5">Keranjang & Pembayaran</h4>
                                <div className="space-y-1.5">
                                    {[
                                        ["Alt+H", "Tahan Transaksi (Hold)"],
                                        ["Alt+R", "Buka Transaksi Ditahan (Resume)"],
                                        ["Alt+C", "Kosongkan Keranjang"],
                                        ["Alt+P", "Ganti Metode Tunai/Transfer"],
                                        ["Alt+↑ / ↓", "Ubah Qty Terakhir (+ / -)"],
                                        ["F1", "Buka Numpad Bayar"],
                                        ["F2", "Simpan / Selesaikan Transaksi"],
                                        ["F3", "Toggle Tab (Mobile)"],
                                        ["F4", "Panduan Shortcut ini"],
                                    ].map(([key, desc]) => (
                                        <div key={key} className="flex items-center justify-between text-xs">
                                            <span className="text-slate-600 dark:text-slate-400">{desc}</span>
                                            <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono font-bold text-slate-700 dark:text-slate-300 text-right">{key}</kbd>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowShortcuts(false)}
                            className="mt-6 w-full py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-medium flex-shrink-0"
                        >
                            Tutup
                        </button>
                    </div>
                </div>
            )}

            {/* Set Balance Modal */}
            {selectedBankForBalance && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-slate-900/60"
                        onClick={handleCloseBalanceModal}
                    />
                    <form
                        onSubmit={handleSaveBalance}
                        className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-6 max-w-md w-full space-y-4"
                    >
                        <h3 className="text-lg font-bold text-slate-850 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                            <IconBuildingBank size={22} className="text-primary-500" />
                            Set Saldo Rekening - {selectedBankForBalance.bank_name}
                        </h3>
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                                Atas Nama / No. Rekening
                            </label>
                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-350">
                                {selectedBankForBalance.account_name} ({selectedBankForBalance.account_number})
                            </p>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                                Saldo Rekening Baru (Rp)
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">Rp</span>
                                <input
                                    type="number"
                                    value={newBalanceValue === 0 || newBalanceValue === "0" ? "" : newBalanceValue}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setNewBalanceValue(val === "" ? "" : String(parseInt(val, 10) || 0));
                                    }}
                                    placeholder="0"
                                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    min="0"
                                    required
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button
                                type="submit"
                                disabled={isUpdatingBalance}
                                className="flex-1 py-2.5 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white rounded-xl font-medium"
                            >
                                {isUpdatingBalance ? "Menyimpan..." : "Simpan Saldo"}
                            </button>
                            <button
                                type="button"
                                onClick={handleCloseBalanceModal}
                                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-xl font-medium"
                            >
                                Batal
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </>
    );
}

Index.layout = (page) => <POSLayout children={page} />;
