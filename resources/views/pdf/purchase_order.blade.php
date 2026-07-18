<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Purchase Order - {{ $order->document_number }}</title>
    <style>
        @page { margin: 10mm; }
        body { font-family: 'Helvetica', 'Arial', sans-serif; margin:0; background:#ffffff; color:#0f172a; font-size:12px; }
        .sheet { max-width: 900px; margin: 0 auto; background:white; padding:10px; }
        .header { display: table; width: 100%; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px; }
        .store-logo-cell { display: table-cell; width: 65px; vertical-align: middle; }
        .store-info-cell { display: table-cell; vertical-align: middle; }
        .doc-info-cell { display: table-cell; text-align: right; vertical-align: middle; }
        .logo { width: 55px; height: 55px; line-height: 55px; background: #f1f5f9; text-align: center; border-radius: 8px; font-weight: bold; font-size: 20px; color: #475569; }
        .logo img { max-width: 100%; max-height: 100%; object-fit: contain; vertical-align: middle; }
        .store-name { font-weight: bold; font-size: 16px; margin: 0 0 3px 0; }
        .muted { color: #475569; font-size: 11px; margin: 0; }
        .doc-title { font-size: 18px; font-weight: 800; color: #0f172a; margin: 0 0 5px 0; text-transform: uppercase; }
        .badge { display: inline-block; padding: 3px 8px; border-radius: 999px; font-size: 10px; font-weight: bold; text-transform: uppercase; }
        .badge-draft { background-color: #fef3c7; color: #d97706; }
        .badge-ordered { background-color: #dbeafe; color: #2563eb; }
        .badge-partial_received { background-color: #fae8ff; color: #d946ef; }
        .badge-completed { background-color: #dcfce7; color: #16a34a; }
        .badge-cancelled { background-color: #fee2e2; color: #dc2626; }
        
        .section-table { width: 100%; display: table; margin-bottom: 20px; }
        .section-cell { display: table-cell; width: 50%; vertical-align: top; }
        .card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-right: 5px; background-color: #f8fafc; }
        .card-last { margin-right: 0; margin-left: 5px; }
        .card-title { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: bold; margin-bottom: 6px; letter-spacing: 0.5px; }
        .card-content { font-size: 12px; line-height: 1.5; }
        .font-bold { font-weight: bold; }

        table.items-table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 20px; }
        table.items-table th { background: #f1f5f9; color: #475569; font-weight: bold; font-size: 10px; text-transform: uppercase; border: 1px solid #e2e8f0; padding: 8px 10px; text-align: left; }
        table.items-table td { border: 1px solid #e2e8f0; padding: 8px 10px; vertical-align: middle; }
        table.items-table tr:nth-child(even) { background-color: #f8fafc; }
        
        .text-right { text-align: right !important; }
        .text-center { text-align: center !important; }
        
        .total-box { float: right; width: 280px; margin-top: 10px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; background-color: #f8fafc; }
        .total-row { display: table; width: 100%; margin-bottom: 4px; }
        .total-label { display: table-cell; font-size: 11px; color: #64748b; }
        .total-val { display: table-cell; text-align: right; font-size: 13px; font-weight: bold; color: #0f172a; }
        
        .notes-section { margin-top: 20px; width: 60%; float: left; }
        .notes-title { font-weight: bold; font-size: 11px; color: #475569; margin-bottom: 5px; }
        .notes-body { font-size: 11px; color: #64748b; line-height: 1.4; }

        .footer { clear: both; margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 15px; }
        .footer-table { width: 100%; display: table; }
        .footer-left { display: table-cell; vertical-align: middle; color: #64748b; font-size: 10px; }
        .footer-right { display: table-cell; text-align: right; vertical-align: middle; }
        .barcode img { height: 35px; margin-bottom: 4px; }
    </style>
</head>
<body>
    <div class="sheet">
        <!-- Header -->
        <div class="header">
            <div class="store-logo-cell">
                <div class="logo">
                    @if($store['logo_data'])
                        <img src="{{ $store['logo_data'] }}" alt="{{ $store['name'] }}">
                    @else
                        {{ substr($store['name'], 0, 2) }}
                    @endif
                </div>
            </div>
            <div class="store-info-cell">
                <h1 class="store-name">{{ $store['name'] }}</h1>
                @if($store['address'])
                    <p class="muted">{{ $store['address'] }}</p>
                @endif
                <p class="muted">
                    {{ $store['phone'] ? 'Telp: '.$store['phone'].' • ' : '' }}{{ $store['email'] }}
                </p>
            </div>
            <div class="doc-info-cell">
                <h2 class="doc-title">Purchase Order</h2>
                <div style="margin-bottom: 8px;">
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
            </div>
        </div>

        <!-- Supplier & PO Details -->
        <div class="section-table">
            <div class="section-cell">
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
            </div>
            <div class="section-cell">
                <div class="card card-last">
                    <div class="card-title">Informasi Pesanan</div>
                    <div class="card-content">
                        <div>Dibuat Oleh: <span class="font-bold">{{ $order->creator->name ?? '-' }}</span></div>
                        @if($order->ordered_at)
                            <div class="muted">Tanggal Dipesan: {{ \Carbon\Carbon::parse($order->ordered_at)->format('d M Y H:i') }}</div>
                        @endif
                    </div>
                </div>
            </div>
        </div>

        <!-- Items Table -->
        <table class="items-table">
            <thead>
                <tr>
                    <th style="width: 5%">No</th>
                    <th style="width: 45%">Nama Produk</th>
                    <th style="width: 15%" class="text-center">Qty Dipesan</th>
                    <th style="width: 15%" class="text-right">Harga Satuan</th>
                    <th style="width: 20%" class="text-right">Subtotal</th>
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
        <div>
            @if($order->notes)
                <div class="notes-section">
                    <div class="notes-title">Keterangan / Catatan:</div>
                    <div class="notes-body">{{ $order->notes }}</div>
                </div>
            @endif

            <div class="total-box">
                <div class="total-row">
                    <div class="total-label">Total Item:</div>
                    <div class="total-val text-right">{{ $order->items->sum('qty_ordered') }}</div>
                </div>
                <div class="total-row" style="border-top: 1px solid #e2e8f0; padding-top: 4px; margin-top: 4px;">
                    <div class="total-label" style="font-size: 12px; font-weight: bold; color: #0f172a;">Total Nilai PO:</div>
                    <div class="total-val text-right" style="font-size: 14px; color: #2563eb;">Rp {{ number_format($grandTotal, 0, ',', '.') }}</div>
                </div>
            </div>
        </div>

        <!-- Footer -->
        <div class="footer">
            <div class="footer-table">
                <div class="footer-left">
                    Dicetak secara otomatis pada {{ now()->format('d M Y H:i:s') }}
                </div>
                <div class="footer-right">
                    <div class="barcode">
                        <img src="{{ $barcode }}" alt="barcode">
                    </div>
                    <div style="font-size: 9px; color: #64748b; font-family: monospace;">{{ $order->document_number }}</div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
