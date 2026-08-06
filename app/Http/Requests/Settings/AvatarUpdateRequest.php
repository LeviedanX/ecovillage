<?php

namespace App\Http\Requests\Settings;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\File;

class AvatarUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $maxKilobytes = (int) config('ecovillage.uploads.max_image_kilobytes', 5120);

        return [
            // `File::image()` memakai getimagesize sehingga berkas yang hanya
            // menyamar sebagai gambar lewat ekstensi tetap ditolak.
            'avatar' => [
                'required',
                File::image()
                    ->types(['jpg', 'jpeg', 'png', 'webp'])
                    ->max(min($maxKilobytes, 2048))
                    ->dimensions(
                        Rule::dimensions()->minWidth(96)->minHeight(96)->maxWidth(4000)->maxHeight(4000),
                    ),
            ],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'avatar.required' => 'Pilih berkas foto terlebih dahulu.',
            'avatar.image' => 'Berkas harus berupa gambar.',
            'avatar.mimes' => 'Foto harus berformat JPG, PNG, atau WebP.',
            'avatar.max' => 'Ukuran foto maksimal 2 MB.',
            'avatar.dimensions' => 'Resolusi foto minimal 96 x 96 piksel.',
        ];
    }
}
