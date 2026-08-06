<?php

namespace App\Http\Controllers;

use App\Enums\RedemptionStatus;
use App\Models\AuditLog;
use App\Models\PointAccount;
use App\Models\Product;
use App\Models\Redemption;
use App\Notifications\SystemNotification;
use App\Services\RedemptionService;
use DomainException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class MarketplaceController extends Controller
{
    public function index(Request $request): Response
    {
        $products = Product::query()
            ->with(['category:id,name,slug', 'images' => fn ($query) => $query->orderBy('sort_order')])
            ->where('is_active', true)
            ->latest()
            ->paginate(16)
            ->through(fn (Product $product): array => $this->productPayload($product));

        return Inertia::render('marketplace/index', [
            'products' => $products,
            'balance' => (int) (PointAccount::query()->where('user_id', $request->user()->id)->value('balance') ?? 0),
            'cartCount' => array_sum($this->cartQuantities($request)),
        ]);
    }

    public function cart(Request $request): Response
    {
        $quantities = $this->cartQuantities($request);
        $products = Product::query()
            ->with(['category:id,name,slug', 'images' => fn ($query) => $query->orderBy('sort_order')])
            ->whereIn('id', array_keys($quantities))
            ->get();

        $items = $products->map(function (Product $product) use ($quantities): array {
            $quantity = $quantities[$product->id];

            return [
                'product' => $this->productPayload($product),
                'quantity' => $quantity,
                'subtotal_points' => $product->point_price * $quantity,
            ];
        });

        return Inertia::render('marketplace/cart', [
            'cart' => $items,
            'totalPoints' => $items->sum('subtotal_points'),
            'balance' => (int) (PointAccount::query()->where('user_id', $request->user()->id)->value('balance') ?? 0),
            'redemptions' => Redemption::query()
                ->with('items')
                ->where('user_id', $request->user()->id)
                ->latest()
                ->limit(8)
                ->get(),
        ]);
    }

    public function add(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'product_id' => ['required', 'integer', 'exists:products,id'],
            'quantity' => ['required', 'integer', 'min:1', 'max:20'],
        ]);
        $product = Product::query()->whereKey($validated['product_id'])->where('is_active', true)->firstOrFail();
        if ($product->stock < 1) {
            throw ValidationException::withMessages(['product_id' => 'Produk sedang tidak memiliki stok.']);
        }

        $cart = $this->cartQuantities($request);
        $cart[$product->id] = min(20, ($cart[$product->id] ?? 0) + (int) $validated['quantity']);
        $request->session()->put('marketplace.cart', $cart);

        return back()->with('success', 'Produk ditambahkan ke keranjang.');
    }

    public function updateCart(Request $request, Product $product): RedirectResponse
    {
        $validated = $request->validate(['quantity' => ['required', 'integer', 'min:0', 'max:20']]);
        $cart = $this->cartQuantities($request);
        if ((int) $validated['quantity'] === 0) {
            unset($cart[$product->id]);
        } else {
            $cart[$product->id] = (int) $validated['quantity'];
        }
        $request->session()->put('marketplace.cart', $cart);

        return back()->with('success', 'Keranjang diperbarui.');
    }

    public function remove(Request $request, Product $product): RedirectResponse
    {
        $cart = $this->cartQuantities($request);
        unset($cart[$product->id]);
        $request->session()->put('marketplace.cart', $cart);

        return back()->with('success', 'Produk dihapus dari keranjang.');
    }

    public function redeem(Request $request, RedemptionService $redemptionService): RedirectResponse
    {
        $validated = $request->validate([
            'idempotency_key' => ['required', 'string', 'max:100'],
        ]);
        $quantities = $this->cartQuantities($request);
        $address = $request->user()->addresses()->where('is_primary', true)->first();
        $snapshot = $address === null ? null : $address->only(['label', 'address_line', 'postal_code', 'region_id']);

        try {
            $redemption = $redemptionService->redeem(
                $request->user(),
                $quantities,
                $validated['idempotency_key'],
                $snapshot,
            );
        } catch (DomainException $exception) {
            throw ValidationException::withMessages(['redemption' => $exception->getMessage()]);
        }

        $request->session()->forget('marketplace.cart');

        return to_route('marketplace.cart')->with('success', "Penukaran {$redemption->number} berhasil dibuat.");
    }

    public function process(
        Request $request,
        Redemption $redemption,
        RedemptionService $redemptionService,
    ): RedirectResponse {
        $this->authorize('process', $redemption);
        $validated = $request->validate([
            'status' => ['required', Rule::enum(RedemptionStatus::class)],
            'notes' => ['nullable', 'string', 'max:1000'],
            'idempotency_key' => ['nullable', 'string', 'max:100'],
        ]);
        $next = $request->enum('status', RedemptionStatus::class);
        if ($next === null) {
            throw ValidationException::withMessages(['status' => 'Status penukaran tidak valid.']);
        }
        if ($next === RedemptionStatus::Cancelled) {
            $request->validate([
                'notes' => ['required', 'string', 'min:10', 'max:1000'],
                'idempotency_key' => ['required', 'string', 'max:100'],
            ]);

            try {
                $redemptionService->cancel(
                    $redemption,
                    $request->user(),
                    $request->string('notes')->toString(),
                    $request->string('idempotency_key')->toString(),
                );
            } catch (DomainException $exception) {
                throw ValidationException::withMessages(['redemption' => $exception->getMessage()]);
            }

            return back()->with('success', 'Penukaran dibatalkan; poin dan stok dikembalikan melalui reversal.');
        }
        $allowed = match ($redemption->status) {
            RedemptionStatus::Pending => [RedemptionStatus::Processing],
            RedemptionStatus::Processing => [RedemptionStatus::Ready],
            RedemptionStatus::Ready => [RedemptionStatus::Completed],
            default => [],
        };
        if (! in_array($next, $allowed, true)) {
            throw ValidationException::withMessages(['status' => 'Transisi status penukaran tidak diizinkan.']);
        }

        $before = $redemption->status;
        $redemption->update([
            'status' => $next,
            'processed_by' => $request->user()->id,
            'processed_at' => now(),
            'notes' => $validated['notes'] ?? $redemption->notes,
        ]);
        AuditLog::record(
            actor: $request->user(),
            event: 'redemption.status.changed',
            auditable: $redemption,
            before: ['status' => $before->value],
            after: ['status' => $next->value],
            request: $request,
        );
        $redemption->user->notify(new SystemNotification(
            title: 'Status penukaran diperbarui',
            message: "Penukaran {$redemption->number} kini berstatus {$next->value}.",
            href: '/marketplace/cart',
            kind: 'redemption',
        ));

        return back()->with('success', 'Status penukaran diperbarui.');
    }

    /** @return array<int, int> */
    private function cartQuantities(Request $request): array
    {
        $stored = $request->session()->get('marketplace.cart', []);
        if (! is_array($stored)) {
            return [];
        }

        $quantities = [];
        foreach ($stored as $productId => $quantity) {
            if (! is_int($quantity) && ! is_string($quantity)) {
                continue;
            }

            $normalizedProductId = filter_var($productId, FILTER_VALIDATE_INT);
            $normalizedQuantity = filter_var($quantity, FILTER_VALIDATE_INT);
            if ($normalizedProductId === false || $normalizedProductId < 1
                || $normalizedQuantity === false || $normalizedQuantity < 1) {
                continue;
            }

            $quantities[$normalizedProductId] = min(20, $normalizedQuantity);
        }

        return $quantities;
    }

    /** @return array<string, mixed> */
    private function productPayload(Product $product): array
    {
        $image = $product->images->first();

        return [
            ...$product->only(['id', 'name', 'slug', 'description', 'point_price', 'stock', 'is_active']),
            'category' => $product->category?->name,
            'image_url' => $image === null ? null : Storage::disk($image->disk)->url($image->path),
        ];
    }
}
