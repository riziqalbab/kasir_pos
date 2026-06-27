@php
    $formatPrice = fn($v) => 'Rp ' . number_format($v ?? 0, 0, ',', '.');
@endphp
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <style>
        @page { margin: 0; }
        body { font-family: 'DejaVu Sans Mono','Courier',monospace; width: 58mm; margin: 0; padding: 6px; font-size: 10px; line-height: 1.4; }
        .center { text-align: center; }
        .bold { font-weight: 700; }
        .barcode img { height: 24px; }
        .section { margin: 5px 0; }
        .hr { border-top: 1px solid #000; margin: 3px 0; }
        .hr-dash { border-top: 1px dashed #000; margin: 3px 0; }
        table.row { width: 100%; border-collapse: collapse; }
        table.row td { padding: 0; vertical-align: top; }
        td.r { text-align: right; }
        .item-name { font-weight: 600; }
        .muted { font-size: 9px; color: #64748b; }
    </style>
</head>
<body>
    <div class="center section" style="margin-top:0;">
        <div class="bold" style="margin-bottom:2px;">{{ $store['name'] }}</div>
        @if($store['address'])<div>{{ $store['address'] }}</div>@endif
        @if($store['phone'])<div>Telp: {{ $store['phone'] }}</div>@endif
        @if($store['email'])<div>Email: {{ $store['email'] }}</div>@endif
        @if($store['website'])<div>{{ $store['website'] }}</div>@endif
    </div>

    <div class="hr"></div>

    <div class="section">
        <table class="row"><tr><td>No:</td><td class="r">{{ $transaction->invoice }}</td></tr></table>
        <table class="row"><tr><td>Tgl:</td><td class="r">{{ \Carbon\Carbon::parse($transaction->created_at)->format('d/m/Y H:i') }}</td></tr></table>
        <table class="row"><tr><td>Kasir:</td><td class="r">{{ $transaction->cashier->name ?? '-' }}</td></tr></table>
        <table class="row"><tr><td>Pelanggan:</td><td class="r">{{ $transaction->customer->name ?? 'Umum' }}</td></tr></table>
    </div>

    <div class="hr"></div>

    <div class="section">
        @foreach($transaction->details as $item)
            @php
                $qty = max(1, $item->qty);
                $total = $item->price;
                $unit = $item->unit_price ?: ($qty ? $total / $qty : $total);
            @endphp
            <div class="item-name">{{ $item->product ? $item->product->title : ($item->service ? $item->service->name : 'Item') }}</div>
            @if($item->discount_total > 0 && ($item->pricing_group_label || $item->pricing_rule_name))
                <table class="row muted"><tr><td>Promo: {{ $item->pricing_group_label ?: $item->pricing_rule_name }}</td><td class="r">{{ $formatPrice($item->base_unit_price) }}</td></tr></table>
            @endif
            <table class="row"><tr><td>{{ $qty }}x @ {{ $formatPrice($unit) }}</td><td class="r">{{ $formatPrice($total) }}</td></tr></table>
        @endforeach
    </div>

    <div class="hr-dash"></div>

    @php
        $promoDiscount = $transaction->details->sum('discount_total');
        $voucherDiscount = $transaction->customer_voucher_discount ?? 0;
        $loyaltyDiscount = $transaction->loyalty_discount_total ?? 0;
        $subtotal = ($transaction->grand_total ?? 0) + ($transaction->discount ?? 0) - ($transaction->shipping_cost ?? 0) + $promoDiscount + $voucherDiscount + $loyaltyDiscount;
        $discount = $transaction->discount ?? 0;
        $total = $transaction->grand_total ?? 0;
        $shipping = $transaction->shipping_cost ?? 0;
        $cash = $transaction->cash ?? 0;
        $change = $transaction->change ?? 0;
        $paymentMethod = strtoupper($transaction->payment_method ?? 'TUNAI');
    @endphp

    <div class="section">
        <table class="row"><tr><td>Subtotal</td><td class="r">{{ $formatPrice($subtotal) }}</td></tr></table>
        @if($promoDiscount > 0)
            <table class="row"><tr><td>Promo</td><td class="r">-{{ $formatPrice($promoDiscount) }}</td></tr></table>
        @endif
        @if($discount > 0)
            <table class="row"><tr><td>Diskon Manual</td><td class="r">-{{ $formatPrice($discount) }}</td></tr></table>
        @endif
        @if($voucherDiscount > 0)
            <table class="row"><tr><td>Voucher</td><td class="r">-{{ $formatPrice($voucherDiscount) }}</td></tr></table>
        @endif
        @if($loyaltyDiscount > 0)
            <table class="row"><tr><td>Redeem Poin</td><td class="r">-{{ $formatPrice($loyaltyDiscount) }}</td></tr></table>
        @endif
        @if($shipping > 0)
            <table class="row"><tr><td>Ongkir</td><td class="r">{{ $formatPrice($shipping) }}</td></tr></table>
        @endif
        <table class="row bold" style="font-size:12px;"><tr><td>TOTAL</td><td class="r">{{ $formatPrice($total) }}</td></tr></table>
    </div>

    <div class="hr-dash"></div>

    <div class="section">
        <table class="row"><tr><td>Bayar ({{ $paymentMethod }})</td><td class="r">{{ $formatPrice($cash) }}</td></tr></table>
        @if($change > 0)
            <table class="row bold"><tr><td>Kembali</td><td class="r">{{ $formatPrice($change) }}</td></tr></table>
        @endif
    </div>

    <div class="hr"></div>

    <div class="center section" style="margin-bottom:0;">
        <div class="barcode">
            <img src="{{ $barcode }}" alt="barcode">
        </div>
        <div style="font-size:10px;">{{ $transaction->invoice }}</div>
        <div>Terima kasih!</div>
    </div>
</body>
</html>
