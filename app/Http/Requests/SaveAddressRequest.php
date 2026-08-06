<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveAddressRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'region_id' => ['required', 'integer', 'exists:regions,id'],
            'label' => ['required', 'string', 'max:50'],
            'address_line' => ['required', 'string', 'min:10', 'max:1000'],
            'postal_code' => ['nullable', 'string', 'regex:/^[0-9]{5}$/'],
            'latitude' => ['nullable', 'required_with:longitude', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'required_with:latitude', 'numeric', 'between:-180,180'],
            'location_consent' => [Rule::when(
                $this->filled('latitude') || $this->filled('longitude'),
                ['required', 'accepted'],
                ['exclude'],
            )],
            'is_primary' => ['sometimes', 'boolean'],
        ];
    }
}
