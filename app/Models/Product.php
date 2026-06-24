<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    use HasFactory;

    protected $casts = [
        'id' => 'integer',
        'category_id' => 'integer',
        'buy_price' => 'integer',
        'sell_price' => 'integer',
        'stock' => 'integer',
        'isi_pcs_dalam_pack' => 'integer',
        'isi_pack_dalam_dus' => 'integer',
        'isi_pcs_dalam_dus' => 'integer',
        'harga_beli_dus' => 'integer',
        'harga_jual_dus' => 'integer',
        'stok_dus' => 'integer',
        'harga_beli_pack' => 'integer',
        'harga_jual_pack' => 'integer',
        'stok_pack' => 'integer',
        'harga_beli_pcs' => 'integer',
        'harga_jual_pcs' => 'integer',
        'stok_pcs' => 'integer',
    ];

    /**
     * fillable
     *
     * @var array
     */
    protected $fillable = [
        'image',
        'barcode',
        'sku',
        'title',
        'description',
        'buy_price',
        'sell_price',
        'category_id',
        'stock',
        'satuan_beli',
        'isi_pcs_dalam_pack',
        'isi_pack_dalam_dus',
        'isi_pcs_dalam_dus',
        'satuan_jual_dus',
        'harga_beli_dus',
        'harga_jual_dus',
        'stok_dus',
        'satuan_jual_pack',
        'harga_beli_pack',
        'harga_jual_pack',
        'stok_pack',
        'satuan_jual_pcs',
        'harga_beli_pcs',
        'harga_jual_pcs',
        'stok_pcs',
    ];

    protected $appends = [
        'stock_breakdown',
    ];

    public function getSellPriceForUnit(?string $unitKey): int
    {
        if ($unitKey === 'dus') {
            return (int) ($this->harga_jual_dus ?: $this->sell_price);
        }
        if ($unitKey === 'pack') {
            return (int) ($this->harga_jual_pack ?: $this->sell_price);
        }

        return (int) ($this->harga_jual_pcs ?: $this->sell_price);
    }

    public function getBuyPriceForUnit(?string $unitKey): int
    {
        if ($unitKey === 'dus') {
            return (int) ($this->harga_beli_dus ?: $this->buy_price);
        }
        if ($unitKey === 'pack') {
            return (int) ($this->harga_beli_pack ?: $this->buy_price);
        }

        return (int) ($this->harga_beli_pcs ?: $this->buy_price);
    }

    public function getUnitNameForKey(?string $unitKey): string
    {
        if ($unitKey === 'dus') {
            return $this->satuan_jual_dus ?: 'Dus';
        }
        if ($unitKey === 'pack') {
            return $this->satuan_jual_pack ?: 'Pak';
        }

        return $this->satuan_jual_pcs ?: 'Pcs';
    }

    public function getStockForUnit(?string $unitKey): int
    {
        $stock = $this->stock;
        $pcsInDus = $this->isi_pcs_dalam_dus ?: (($this->isi_pcs_dalam_pack ?: 1) * ($this->isi_pack_dalam_dus ?: 1));
        $pcsInPack = $this->isi_pcs_dalam_pack ?: 0;

        if ($unitKey === 'dus' && $pcsInDus > 0) {
            return (int) floor($stock / $pcsInDus);
        }
        if ($unitKey === 'pack' && $pcsInPack > 0) {
            return (int) floor($stock / $pcsInPack);
        }

        return $stock;
    }

    public function getStockBreakdownAttribute(): string
    {
        $stock = $this->stock;
        $parts = [];

        $pcsInDus = $this->isi_pcs_dalam_dus ?: (($this->isi_pcs_dalam_pack ?: 1) * ($this->isi_pack_dalam_dus ?: 1));
        $pcsInPack = $this->isi_pcs_dalam_pack ?: 0;

        if ($pcsInDus > 0 && $this->satuan_jual_dus) {
            $dus = floor($stock / $pcsInDus);
            if ($dus > 0) {
                $parts[] = "{$dus} {$this->satuan_jual_dus}";
                $stock %= $pcsInDus;
            }
        }

        if ($pcsInPack > 0 && $this->satuan_jual_pack) {
            $pack = floor($stock / $pcsInPack);
            if ($pack > 0) {
                $parts[] = "{$pack} {$this->satuan_jual_pack}";
                $stock %= $pcsInPack;
            }
        }

        if ($stock > 0 || empty($parts)) {
            $pcsUnit = $this->satuan_jual_pcs ?: 'Pcs';
            $parts[] = "{$stock} {$pcsUnit}";
        }

        return implode(', ', $parts);
    }

    /**
     * category
     *
     * @return void
     */
    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function stockOpnameItems()
    {
        return $this->hasMany(StockOpnameItem::class);
    }

    public function stockMutations()
    {
        return $this->hasMany(StockMutation::class);
    }

    public function salesReturnItems()
    {
        return $this->hasMany(SalesReturnItem::class);
    }

    /**
     * image
     */
    protected function image(): Attribute
    {
        return Attribute::make(
            get: fn ($value) => $value ? asset('/storage/products/'.$value) : null,
        );
    }
}
