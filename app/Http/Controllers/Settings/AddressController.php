<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\SaveAddressRequest;
use App\Models\Address;
use App\Models\AuditLog;
use App\Models\CollectionRequest;
use App\Models\Region;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class AddressController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('settings/addresses', [
            'addresses' => $request->user()->addresses()->with('region:id,name,level')->latest('is_primary')->get(),
            'regions' => Region::query()->where('is_active', true)->orderBy('code')->get(['id', 'parent_id', 'level', 'name', 'code']),
            'mapStyleUrl' => config('ecovillage.map.style_url'),
        ]);
    }

    public function store(SaveAddressRequest $request): RedirectResponse
    {
        $address = DB::transaction(function () use ($request): Address {
            User::query()->whereKey($request->user()->id)->lockForUpdate()->firstOrFail();
            $data = $request->safe()->except('location_consent');
            $data['location_consent_at'] = $request->filled('latitude') && $request->filled('longitude')
                ? now()
                : null;
            $makePrimary = (bool) ($data['is_primary'] ?? false) || ! $request->user()->addresses()->exists();
            if ($makePrimary) {
                $request->user()->addresses()->lockForUpdate()->update(['is_primary' => false]);
            }
            $data['is_primary'] = $makePrimary;
            $address = $request->user()->addresses()->create($data);

            if ($request->user()->profile?->primary_region_id === null || $makePrimary) {
                $request->user()->profile()->updateOrCreate([], ['primary_region_id' => $address->region_id]);
            }

            AuditLog::record(
                actor: $request->user(),
                event: 'address.created',
                auditable: $address,
                after: ['region_id' => $address->region_id, 'location_consent' => $address->location_consent_at !== null],
                request: $request,
            );

            return $address;
        });

        return back()->with('success', 'Alamat berhasil ditambahkan.');
    }

    public function update(SaveAddressRequest $request, Address $address): RedirectResponse
    {
        abort_unless($address->user_id === $request->user()->id, 403);

        DB::transaction(function () use ($request, $address): void {
            User::query()->whereKey($request->user()->id)->lockForUpdate()->firstOrFail();
            $locked = Address::query()
                ->where('user_id', $request->user()->id)
                ->lockForUpdate()
                ->findOrFail($address->id);
            $before = $locked->only(['region_id', 'label', 'is_primary', 'location_consent_at']);
            $data = $request->safe()->except('location_consent');
            if ($request->hasAny(['latitude', 'longitude'])) {
                $data['location_consent_at'] = $request->filled('latitude') && $request->filled('longitude')
                    ? now()
                    : null;
            }

            if ($locked->is_primary && array_key_exists('is_primary', $data) && ! (bool) $data['is_primary']) {
                throw ValidationException::withMessages([
                    'is_primary' => 'Pilih alamat lain sebagai alamat utama sebelum menonaktifkan alamat ini.',
                ]);
            }

            if ((bool) ($data['is_primary'] ?? false)) {
                $request->user()->addresses()->whereKeyNot($locked->id)->lockForUpdate()->update(['is_primary' => false]);
            }
            $locked->update($data);

            if ($locked->is_primary) {
                $request->user()->profile()->updateOrCreate([], ['primary_region_id' => $locked->region_id]);
            }

            AuditLog::record(
                actor: $request->user(),
                event: 'address.updated',
                auditable: $locked,
                before: $before,
                after: $locked->only(['region_id', 'label', 'is_primary', 'location_consent_at']),
                request: $request,
            );
        });

        return back()->with('success', 'Alamat berhasil diperbarui.');
    }

    public function destroy(Request $request, Address $address): RedirectResponse
    {
        abort_unless($address->user_id === $request->user()->id, 403);
        DB::transaction(function () use ($request, $address): void {
            User::query()->whereKey($request->user()->id)->lockForUpdate()->firstOrFail();
            $locked = Address::query()
                ->where('user_id', $request->user()->id)
                ->lockForUpdate()
                ->findOrFail($address->id);
            abort_if(CollectionRequest::query()->where('address_id', $locked->id)->exists(), 422, 'Alamat yang sudah menjadi referensi transaksi tidak dapat dihapus.');

            $wasPrimary = $locked->is_primary;
            $deletedAddressId = $locked->id;
            $locked->delete();

            $replacement = null;
            if ($wasPrimary) {
                $replacement = $request->user()->addresses()->lockForUpdate()->oldest('id')->first();
                if ($replacement !== null) {
                    $replacement->update(['is_primary' => true]);
                }
                $request->user()->profile()->updateOrCreate([], [
                    'primary_region_id' => $replacement?->region_id,
                ]);
            }

            AuditLog::record(
                actor: $request->user(),
                event: 'address.deleted',
                metadata: [
                    'address_id' => $deletedAddressId,
                    'replacement_address_id' => $replacement?->id,
                ],
                request: $request,
            );
        });

        return back()->with('success', 'Alamat dihapus.');
    }
}
