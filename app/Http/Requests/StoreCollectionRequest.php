<?php

namespace App\Http\Requests;

use App\Enums\CollectionMethod;
use App\Models\Address;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\File;

class StoreCollectionRequest extends FormRequest
{
    public function authorize(): bool
    {
        $addressId = $this->integer('address_id');

        return $this->user() !== null
            && ($addressId === 0 || Address::query()->whereKey($addressId)->where('user_id', $this->user()->id)->exists());
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $maxKilobytes = (int) config('ecovillage.uploads.max_image_kilobytes', 5120);

        return [
            'address_id' => ['required', 'integer', 'exists:addresses,id'],
            'method' => ['required', Rule::enum(CollectionMethod::class)],
            'desired_at' => ['required', 'date', 'after:now', 'before_or_equal:'.now()->addMonths(3)->toDateTimeString()],
            'notes' => ['nullable', 'string', 'max:1000'],
            'latitude' => ['nullable', 'required_with:longitude', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'required_with:latitude', 'numeric', 'between:-180,180'],
            'location_consent' => [
                Rule::excludeIf(fn (): bool => ! $this->filled('latitude') && ! $this->filled('longitude')),
                'required',
                'accepted',
            ],
            'idempotency_key' => ['nullable', 'uuid', 'max:36'],
            'items' => ['required', 'array', 'min:1', 'max:20'],
            'items.*.waste_type_id' => ['required', 'integer', 'distinct', 'exists:waste_types,id'],
            'items.*.estimated_weight' => ['required', 'numeric', 'gt:0', 'max:10000', 'decimal:0,3'],
            'items.*.notes' => ['nullable', 'string', 'max:500'],
            'photos' => ['nullable', 'array', 'max:5'],
            'photos.*' => [
                File::image()->types(['jpg', 'jpeg', 'png', 'webp'])->max($maxKilobytes)->dimensions(
                    Rule::dimensions()->minWidth(320)->minHeight(240)->maxWidth(6000)->maxHeight(6000),
                ),
            ],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'location_consent.accepted' => 'Persetujuan lokasi wajib diberikan sebelum koordinat disimpan.',
            'items.*.waste_type_id.distinct' => 'Jenis sampah yang sama cukup ditambahkan satu kali.',
            'photos.*.mimes' => 'Foto harus berformat JPG, PNG, atau WebP.',
        ];
    }
}
