<?php

namespace App\Services;

use App\Models\Cart;
use App\Models\Customer;
use App\Models\Product;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;

class PricingService
{
    public function getActiveRules(?CarbonInterface $at = null): Collection
    {
        return collect();
    }

    public function previewCart(iterable $carts, ?Customer $customer = null, ?CarbonInterface $at = null): array
    {
        $cartCollection = collect($carts)
            ->filter(fn ($cart) => $cart instanceof Cart && ($cart->product || $cart->service))
            ->values();
        $rules = $this->getActiveRules($at);

        return $this->buildPreview($cartCollection, $customer, $rules);
    }

    public function previewCartWithRules(iterable $carts, ?Customer $customer, Collection $rules): array
    {
        $cartCollection = collect($carts)
            ->filter(fn ($cart) => $cart instanceof Cart && ($cart->product || $cart->service))
            ->values();

        return $this->buildPreview($cartCollection, $customer, $rules->values());
    }

    public function previewProducts(iterable $products, ?Customer $customer = null, ?CarbonInterface $at = null): Collection
    {
        $rules = $this->getActiveRules($at);

        return collect($products)
            ->filter(fn ($product) => $product instanceof Product)
            ->mapWithKeys(function (Product $product) use ($customer, $rules) {
                return [$product->id => $this->calculateProductPrice($product, 1, $customer, $rules)];
            });
    }

    public function calculateProductPrice(
        Product $product,
        int $qty = 1,
        ?Customer $customer = null,
        ?Collection $rules = null
    ): array {
        $quantity = max(1, $qty);

        return [
            'base_unit_price' => (int) $product->sell_price,
            'effective_unit_price' => (int) $product->sell_price,
            'quantity' => $quantity,
            'line_base_total' => (int) $product->sell_price * $quantity,
            'line_total' => (int) $product->sell_price * $quantity,
            'line_discount_total' => 0,
            'pricing_rule' => null,
        ];
    }

    private function buildPreview(Collection $carts, ?Customer $customer, Collection $rules): array
    {
        $items = $carts->map(function (Cart $cart) {
            if ($cart->service_id) {
                $servicePrice = \App\Models\ServicePrice::where('service_id', $cart->service_id)
                    ->where('unit_id', $cart->satuan_key)
                    ->first();
                $baseUnitPrice = $servicePrice ? (int) $servicePrice->price : 0;

                return [
                    'cart_id' => $cart->id,
                    'product_id' => null,
                    'service_id' => $cart->service_id,
                    'product_title' => $cart->service?->name,
                    'qty' => (int) $cart->qty,
                    'base_unit_price' => $baseUnitPrice,
                    'effective_unit_price' => $baseUnitPrice,
                    'line_base_total' => $baseUnitPrice * (int) $cart->qty,
                    'line_total' => $baseUnitPrice * (int) $cart->qty,
                    'line_discount_total' => 0,
                    'pricing_rule' => null,
                    'pricing_group_key' => null,
                    'pricing_group_label' => null,
                    'applied_rules' => [],
                ];
            }

            $baseUnitPrice = (int) $cart->product->getSellPriceForUnit($cart->satuan_key);

            return [
                'cart_id' => $cart->id,
                'product_id' => $cart->product_id,
                'product_title' => $cart->product?->title,
                'qty' => (int) $cart->qty,
                'base_unit_price' => $baseUnitPrice,
                'effective_unit_price' => $baseUnitPrice,
                'line_base_total' => $baseUnitPrice * (int) $cart->qty,
                'line_total' => $baseUnitPrice * (int) $cart->qty,
                'line_discount_total' => 0,
                'pricing_rule' => null,
                'pricing_group_key' => null,
                'pricing_group_label' => null,
                'applied_rules' => [],
            ];
        })->keyBy('cart_id');

        $baseSubtotal = $items->sum('line_base_total');

        return [
            'items' => $items->values()->all(),
            'applied_groups' => [],
            'consumed_quantities' => [],
            'unmatched_items' => [],
            'summary' => [
                'base_subtotal' => $baseSubtotal,
                'promo_discount_total' => 0,
                'subtotal_after_promo' => $baseSubtotal,
            ],
        ];
    }
}
