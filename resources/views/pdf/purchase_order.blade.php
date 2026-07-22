<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Purchase Order - {{ $order->document_number }}</title>
    <style>
        @page {
            margin: 12mm 12mm;
        }
        * {
            box-sizing: border-box;
        }
        body {
            font-family: 'Helvetica', 'Arial', sans-serif;
            margin: 0;
            padding: 0;
            background: #ffffff;
            color: #0f172a;
            font-size: 11px;
            line-height: 1.4;
        }
        .header-table {
            width: 100%;
            border-collapse: collapse;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 12px;
            margin-bottom: 16px;
        }
        .header-table td {
            vertical-align: top;
        }
        .logo {
            width: 52px;
            height: 52px;
            line-height: 52px;
            background: #f1f5f9;
            text-align: center;
            border-radius: 8px;
            font-weight: bold;
            font-size: 18px;
            color: #475569;
        }
        .logo img {
            max-width: 100%;
            max-height: 100%;
            vertical-align: middle;
        }
        .store-name {
            font-weight: bold;
            font-size: 15px;
            margin: 0 0 2px 0;
            color: #0f172a;
        }
        .muted {
            color: #475569;
            font-size: 10px;
            margin: 0;
        }
        .doc-title {
            font-size: 16px;
            font-weight: bold;
            color: #0f172a;
            margin: 0 0 4px 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 999px;
            font-size: 9px;
            font-weight: bold;
            text-transform: uppercase;
        }
        .badge-draft { background-color: #fef3c7; color: #d97706; }
        .badge-ordered { background-color: #dbeafe; color: #2563eb; }
        .badge-partial_received { background-color: #fae8ff; color: #d946ef; }
        .badge-completed { background-color: #dcfce7; color: #16a34a; }
        .badge-cancelled { background-color: #fee2e2; color: #dc2626; }

        .info-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 8px 0;
            margin-left: -8px;
            margin-right: -8px;
            margin-bottom: 16px;
        }
        .info-table td {
            vertical-align: top;
            width: 50%;
        }
        .card {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 10px 12px;
            background-color: #f8fafc;
        }
        .card-title {
            font-size: 9px;
            text-transform: uppercase;
            color: #64748b;
            font-weight: bold;
            margin-bottom: 4px;
            letter-spacing: 0.5px;
        }
        .card-content {
            font-size: 11px;
            line-height: 1.4;
        }
        .font-bold {
            font-weight: bold;
        }

        table.items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 16px;
        }
        table.items-table th {
            background: #f1f5f9;
            color: #475569;
            font-weight: bold;
            font-size: 9px;
            text-transform: uppercase;
            border: 1px solid #e2e8f0;
            padding: 7px 9px;
            text-align: left;
        }
        table.items-table td {
            border: 1px solid #e2e8f0;
            padding: 7px 9px;
            vertical-align: middle;
            font-size: 10.5px;
        }
        table.items-table tr:nth-child(even) {
            background-color: #f8fafc;
        }
        
        .text-right { text-align: right !important; }
        .text-center { text-align: center !important; }
        
        .totals-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 16px;
        }
        .notes-box {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 8px 10px;
            background-color: #f8fafc;
            font-size: 10px;
        }
        .notes-title {
            font-weight: bold;
            color: #475569;
            margin-bottom: 3px;
        }
        .notes-body {
            color: #64748b;
        }
        .total-card {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 8px 12px;
            background-color: #f8fafc;
        }
        .total-row-table {
            width: 100%;
            border-collapse: collapse;
        }
        .total-row-table td {
            padding: 2px 0;
        }

        .footer-table {
            width: 100%;
            border-collapse: collapse;
            border-top: 1px solid #e2e8f0;
            padding-top: 10px;
            margin-top: 20px;
        }
        .footer-table td {
            vertical-align: middle;
        }
        .barcode img {
            height: 32px;
            margin-bottom: 2px;
        }
    </style>
</head>
<body>
    <!-- Header -->
    <table class="header-table">
        <tr>
            <td style="width: 58px;">
                <div class="logo">
                    @if(!empty($store['logo_data']))
                        <img src="{{ $store['logo_data'] }}" alt="{{ $store['name'] }}">
                    @else
                        {{ substr($store['name'], 0, 2) }}
                    @endif
                </div>
            </td>
            <td>
                <h1 class="store-name">{{ $store['name'] }}</h1>
                @if(!empty($store['address']))
                    <p class="muted">{{ $store['address'] }}</p>
                @endif
                <p class="muted">
                    {{ !empty($store['phone']) ? 'Telp: '.$store['phone'].' • ' : '' }}{{ $store['email'] ?? '' }}
                </p>
            </td>
            <td style="width: 220px;" class="text-right">
                <h2 class="doc-title">PURCHASE ORDER</h2>
                <div style="margin-bottom: 4px;">
                    @php
                        $statusClass = 'badge-draft';
                        if ($order->status === 'ordered') $statusClass = 'badge-ordered';
                        if ($order->status === 'partial_received') $statusClass = 'badge-partial_received';
                        if ($order->status === 'completed') $statusClass = 'badge-completed';
                        if ($order->status === 'cancelled') $statusClass = 'badge-cancelled';
                        
                        $statusLabels = [
                            'draft' => 'Draft',
                            'ordered' => 'Dipesan',
                            'partial_received' => 'Sebagian Diterima',
                            'completed' => 'Selesai',
                            'cancelled' => 'Dibatalkan',
                        ];
                    @endphp
                    <span class="badge {{ $statusClass }}">{{ $statusLabels[$order->status] ?? $order->status }}</span>
                </div>
                <p class="muted">No: <span class="font-bold">{{ $order->document_number }}</span></p>
                <p class="muted">Tanggal: {{ \Carbon\Carbon::parse($order->created_at)->format('d M Y') }}</p>
            </td>
        </tr>
    </table>

    <!-- Supplier & Order Details -->
    <table class="info-table">
        <tr>
            <td>
                <div class="card">
                    <div class="card-title">Supplier</div>
                    <div class="card-content">
                        @if($order->supplier)
                            <div class="font-bold">{{ $order->supplier->name }}</div>
                            @if($order->supplier->address)
                                <div class="muted">{{ $order->supplier->address }}</div>
                            @endif
                            @if($order->supplier->phone)
                                <div class="muted">Telp: {{ $order->supplier->phone }}</div>
                            @endif
                            @if($order->supplier->email)
                                <div class="muted">Email: {{ $order->supplier->email }}</div>
                            @endif
                        @else
                            <div class="muted">Tidak ada supplier</div>
                        @endif
                    </div>
                </div>
            </td>
            <td>
                <div class="card">
                    <div class="card-title">Informasi Pesanan</div>
                    <div class="card-content">
                        <div>Dibuat Oleh: <span class="font-bold">{{ $order->creator->name ?? '-' }}</span></div>
                        @if($order->ordered_at)
                            <div class="muted">Tanggal Dipesan: {{ \Carbon\Carbon::parse($order->ordered_at)->format('d M Y H:i') }}</div>
                        @endif
                    </div>
                </div>
            </td>
        </tr>
    </table>

    <!-- Items Table -->
    <table class="items-table">
        <thead>
            <tr>
                <th style="width: 6%" class="text-center">NO</th>
                <th style="width: 44%">NAMA PRODUK</th>
                <th style="width: 15%" class="text-center">QTY DIPESAN</th>
                <th style="width: 15%" class="text-right">HARGA SATUAN</th>
                <th style="width: 20%" class="text-right">SUBTOTAL</th>
            </tr>
        </thead>
        <tbody>
            @php $grandTotal = 0; @endphp
            @foreach($order->items as $index => $item)
                @php
                    $itemSubtotal = $item->qty_ordered * $item->unit_price;
                    $grandTotal += $itemSubtotal;
                @endphp
                <tr>
                    <td class="text-center">{{ $index + 1 }}</td>
                    <td>
                        <div class="font-bold">{{ $item->product->title ?? '-' }}</div>
                        <div class="muted">{{ $item->product->sku ?? '-' }}</div>
                    </td>
                    <td class="text-center">{{ $item->qty_ordered }} {{ $item->satuan ?? 'Pcs' }}</td>
                    <td class="text-right">{{ number_format($item->unit_price, 0, ',', '.') }}</td>
                    <td class="text-right font-bold">{{ number_format($itemSubtotal, 0, ',', '.') }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <!-- Totals & Notes -->
    <table class="totals-table">
        <tr>
            <td style="vertical-align: top; width: 55%; padding-right: 10px;">
                @if($order->notes)
                    <div class="notes-box">
                        <div class="notes-title">Keterangan / Catatan:</div>
                        <div class="notes-body">{{ $order->notes }}</div>
                    </div>
                @endif
            </td>
            <td style="vertical-align: top; width: 45%;">
                <div class="total-card">
                    <table class="total-row-table">
                        <tr>
                            <td class="muted">Total Item:</td>
                            <td class="text-right font-bold" style="font-size: 11px;">{{ $order->items->sum('qty_ordered') }}</td>
                        </tr>
                        <tr style="border-top: 1px solid #e2e8f0;">
                            <td style="font-size: 11px; font-weight: bold; color: #0f172a; padding-top: 4px;">Total Nilai PO:</td>
                            <td class="text-right font-bold" style="font-size: 13px; color: #2563eb; padding-top: 4px;">Rp {{ number_format($grandTotal, 0, ',', '.') }}</td>
                        </tr>
                    </table>
                </div>
            </td>
        </tr>
    </table>

    <!-- Footer -->
    <table class="footer-table">
        <tr>
            <td style="color: #64748b; font-size: 9px;">
                Dicetak secara otomatis pada {{ now()->format('d M Y H:i:s') }}
            </td>
            <td class="text-right" style="width: 180px;">
                <div class="barcode">
                    <img src="{{ $barcode }}" alt="barcode">
                </div>
                <div style="font-size: 8px; color: #64748b; font-family: monospace;">{{ $order->document_number }}</div>
            </td>
        </tr>
    </table>
</body>
</html>
