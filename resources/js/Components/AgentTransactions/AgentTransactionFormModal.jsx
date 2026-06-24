import React, { useEffect } from "react";
import { useForm } from "@inertiajs/react";
import { IconX, IconDeviceFloppy } from "@tabler/icons-react";
import toast from "react-hot-toast";

export default function AgentTransactionFormModal({
    show,
    onClose,
    bankAccounts = [],
    transactionTypes = [],
    agentAdminBanks = [],
    agentAdminLokets = [],
    tx = null,
    onSuccess,
}) {
    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
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

    useEffect(() => {
        if (show) {
            clearErrors();
            if (tx) {
                setData({
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
            } else {
                reset();
            }
        }
    }, [show, tx]);

    const handleTypeChange = (id) => {
        setData("agent_transaction_type_id", id);
        const selectedType = transactionTypes.find((t) => t.id === parseInt(id));
        if (selectedType) {
            const matchingBank = agentAdminBanks.find((b) => b.amount === selectedType.default_admin_fee_bank);
            const matchingLoket = agentAdminLokets.find((l) => l.amount === selectedType.default_admin_fee_customer);

            setData((prevData) => ({
                ...prevData,
                agent_transaction_type_id: id,
                admin_fee_customer: selectedType.default_admin_fee_customer,
                admin_fee_bank: selectedType.default_admin_fee_bank,
                agent_admin_bank_id: matchingBank ? matchingBank.id : "",
                agent_admin_loket_id: matchingLoket ? matchingLoket.id : "",
            }));
        }
    };

    const handleAdminBankChange = (id) => {
        const selectedBank = agentAdminBanks.find((b) => b.id === parseInt(id));
        setData((prevData) => ({
            ...prevData,
            agent_admin_bank_id: id,
            admin_fee_bank: selectedBank ? selectedBank.amount : 0,
        }));
    };

    const handleAdminLoketChange = (id) => {
        const selectedLoket = agentAdminLokets.find((l) => l.id === parseInt(id));
        setData((prevData) => ({
            ...prevData,
            agent_admin_loket_id: id,
            admin_fee_customer: selectedLoket ? selectedLoket.amount : 0,
        }));
    };

    const selectedType = transactionTypes.find((t) => t.id === parseInt(data.agent_transaction_type_id));
    const modalTotal = selectedType && selectedType.type === 'debet'
        ? (parseInt(data.nominal) || 0) + (parseInt(data.admin_fee_customer) || 0)
        : (parseInt(data.nominal) || 0);

    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (tx) {
            put(route("agent-transactions.update", tx.id), {
                onSuccess: () => {
                    toast.success("Transaksi agen berhasil diperbarui");
                    onSuccess?.();
                    reset();
                    onClose();
                },
            });
        } else {
            post(route("agent-transactions.store"), {
                onSuccess: () => {
                    toast.success("Transaksi agen berhasil dicatat");
                    onSuccess?.();
                    reset();
                    onClose();
                },
            });
        }
    };

    const formatRp = (val) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val);

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                        {tx ? "Edit Transaksi Agen" : "Catat Transaksi Agen"}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <IconX size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                    {/* Transaction Type */}
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Jenis Layanan / Tipe Transaksi</label>
                        <select
                            value={data.agent_transaction_type_id}
                            onChange={(e) => handleTypeChange(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-55 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
                            required
                        >
                            <option value="">-- Pilih Tipe Transaksi --</option>
                            {transactionTypes.map((type) => (
                                <option key={type.id} value={type.id}>
                                    [{type.code}] {type.name} ({type.type === 'debet' ? 'Debet/Masuk' : 'Kredit/Keluar'})
                                </option>
                            ))}
                        </select>
                        {errors.agent_transaction_type_id && <p className="text-xs text-danger-500 mt-1">{errors.agent_transaction_type_id}</p>}
                    </div>

                    {/* Bank Account / EDC */}
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Bank / EDC Agen</label>
                        <select
                            value={data.bank_account_id}
                            onChange={(e) => setData("bank_account_id", e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-55 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
                        >
                            <option value="">-- Tanpa Bank (Kas Fisik) --</option>
                            {bankAccounts.map((bank) => (
                                <option key={bank.id} value={bank.id}>
                                    {bank.bank_name} - {bank.account_name} ({bank.account_number})
                                </option>
                            ))}
                        </select>
                        {errors.bank_account_id && <p className="text-xs text-danger-500 mt-1">{errors.bank_account_id}</p>}
                    </div>

                    {/* Nominal & Reference Number */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Nominal Transaksi (Rp)</label>
                            <input
                                type="number"
                                value={data.nominal}
                                onChange={(e) => setData("nominal", parseInt(e.target.value) || 0)}
                                placeholder="Nominal"
                                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-55 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                min="0"
                                required
                            />
                            {errors.nominal && <p className="text-xs text-danger-500 mt-1">{errors.nominal}</p>}
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">No. Referensi / Trace / Struk</label>
                            <input
                                type="text"
                                value={data.reference_number}
                                onChange={(e) => setData("reference_number", e.target.value)}
                                placeholder="Opsional"
                                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-55 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                            {errors.reference_number && <p className="text-xs text-danger-500 mt-1">{errors.reference_number}</p>}
                        </div>
                    </div>

                    {/* Fees */}
                    <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/20 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Admin Loket</label>
                            <select
                                value={data.agent_admin_loket_id}
                                onChange={(e) => handleAdminLoketChange(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                                required
                            >
                                <option value="">-- Pilih Admin Loket --</option>
                                {agentAdminLokets.map((loket) => (
                                    <option key={loket.id} value={loket.id}>
                                        [{loket.code}] {formatRp(loket.amount)} {loket.description ? `(${loket.description})` : ''}
                                    </option>
                                ))}
                            </select>
                            {errors.agent_admin_loket_id && <p className="text-xs text-danger-500 mt-1">{errors.agent_admin_loket_id}</p>}
                            <p className="text-[10px] text-slate-400 mt-1">Nominal: <span className="font-semibold text-slate-700 dark:text-slate-350">{formatRp(data.admin_fee_customer)}</span></p>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Admin Bank Link</label>
                            <select
                                value={data.agent_admin_bank_id}
                                onChange={(e) => handleAdminBankChange(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                                required
                            >
                                <option value="">-- Pilih Admin Bank --</option>
                                {agentAdminBanks.map((bank) => (
                                    <option key={bank.id} value={bank.id}>
                                        [{bank.code}] {formatRp(bank.amount)}
                                    </option>
                                ))}
                            </select>
                            {errors.agent_admin_bank_id && <p className="text-xs text-danger-500 mt-1">{errors.agent_admin_bank_id}</p>}
                            <p className="text-[10px] text-slate-400 mt-1">Nominal: <span className="font-semibold text-slate-700 dark:text-slate-350">{formatRp(data.admin_fee_bank)}</span></p>
                        </div>
                    </div>

                    {/* Total Pembayaran Block in Modal */}
                    {data.agent_transaction_type_id && (
                        <div className="p-4 rounded-xl bg-primary-50 dark:bg-primary-950/20 border border-primary-100 dark:border-primary-900/30 flex justify-between items-center animate-in fade-in slide-in-from-top-2 duration-200">
                            <div>
                                <span className="text-xs font-semibold text-primary-700 dark:text-primary-400 uppercase tracking-wider">Total Pembayaran</span>
                                <p className="text-xs text-slate-400 dark:text-slate-500">
                                    {selectedType?.type === 'debet' ? "Nominal + Admin Loket" : "Nominal (Tarik Tunai)"}
                                </p>
                            </div>
                            <span className="text-lg font-bold text-primary-650 dark:text-primary-400">
                                {formatRp(modalTotal)}
                            </span>
                        </div>
                    )}

                    {/* Payment Method & Status */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Biaya Admin Dibayar</label>
                            <select
                                value={data.admin_fee_payment_method}
                                onChange={(e) => setData("admin_fee_payment_method", e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-55 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
                                required
                            >
                                <option value="cash">Tunai (Masuk Laci Kas)</option>
                                <option value="bank">Non-Tunai / Bank (Saldo Bank)</option>
                            </select>
                            {errors.admin_fee_payment_method && <p className="text-xs text-danger-500 mt-1">{errors.admin_fee_payment_method}</p>}
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Status Transaksi</label>
                            <select
                                value={data.status}
                                onChange={(e) => setData("status", e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-55 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
                                required
                            >
                                <option value="success">Berhasil (Sukses)</option>
                                <option value="pending">Pending (Menggantung)</option>
                                <option value="failed">Gagal / Dibatalkan</option>
                            </select>
                            {errors.status && <p className="text-xs text-danger-500 mt-1">{errors.status}</p>}
                        </div>
                    </div>

                    {/* Customer Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Nama Pelanggan</label>
                            <input
                                type="text"
                                value={data.customer_name}
                                onChange={(e) => setData("customer_name", e.target.value)}
                                placeholder="Nama pelanggan"
                                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-55 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                            {errors.customer_name && <p className="text-xs text-danger-500 mt-1">{errors.customer_name}</p>}
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">No. HP Pelanggan</label>
                            <input
                                type="text"
                                value={data.customer_phone}
                                onChange={(e) => setData("customer_phone", e.target.value)}
                                placeholder="No. HP"
                                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-55 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                            {errors.customer_phone && <p className="text-xs text-danger-500 mt-1">{errors.customer_phone}</p>}
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Catatan Tambahan</label>
                        <textarea
                            value={data.notes}
                            onChange={(e) => setData("notes", e.target.value)}
                            placeholder="Catatan transaksi"
                            className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-55 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            rows="2"
                        />
                        {errors.notes && <p className="text-xs text-danger-500 mt-1">{errors.notes}</p>}
                    </div>

                    {/* Submit buttons */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-semibold transition-colors"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
                        >
                            <IconDeviceFloppy size={18} />
                            {processing ? "Menyimpan..." : "Simpan Transaksi"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
