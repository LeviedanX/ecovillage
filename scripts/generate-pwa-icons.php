<?php

declare(strict_types=1);

if (! extension_loaded('gd')) {
    fwrite(STDERR, "Ekstensi GD diperlukan untuk menghasilkan ikon aplikasi.\n");
    exit(1);
}

/** @return array{x:int,y:int,width:int,height:int} */
function visibleBounds(GdImage $image): array
{
    $width = imagesx($image);
    $height = imagesy($image);
    $left = $width;
    $top = $height;
    $right = -1;
    $bottom = -1;

    for ($y = 0; $y < $height; $y++) {
        for ($x = 0; $x < $width; $x++) {
            $alpha = (imagecolorat($image, $x, $y) >> 24) & 0x7F;

            if ($alpha >= 125) {
                continue;
            }

            $left = min($left, $x);
            $top = min($top, $y);
            $right = max($right, $x);
            $bottom = max($bottom, $y);
        }
    }

    if ($right < $left || $bottom < $top) {
        throw new RuntimeException('logo.png tidak memiliki piksel yang terlihat.');
    }

    return [
        'x' => $left,
        'y' => $top,
        'width' => $right - $left + 1,
        'height' => $bottom - $top + 1,
    ];
}

/**
 * @param  array{x:int,y:int,width:int,height:int}  $bounds
 * @param  null|array{0:int,1:int,2:int}  $background
 */
function renderIcon(
    GdImage $source,
    array $bounds,
    int $size,
    float $padding,
    ?array $background = null,
): GdImage {
    $icon = imagecreatetruecolor($size, $size);

    if ($background === null) {
        imagealphablending($icon, false);
        imagesavealpha($icon, true);
        $transparent = imagecolorallocatealpha($icon, 0, 0, 0, 127);
        imagefill($icon, 0, 0, $transparent);
    } else {
        $color = imagecolorallocate(
            $icon,
            $background[0],
            $background[1],
            $background[2],
        );
        imagefill($icon, 0, 0, $color);
    }

    imagealphablending($icon, true);
    $available = $size * (1 - (2 * $padding));
    $scale = min(
        $available / $bounds['width'],
        $available / $bounds['height'],
    );
    $targetWidth = max(1, (int) round($bounds['width'] * $scale));
    $targetHeight = max(1, (int) round($bounds['height'] * $scale));
    $targetX = intdiv($size - $targetWidth, 2);
    $targetY = intdiv($size - $targetHeight, 2);

    imagecopyresampled(
        $icon,
        $source,
        $targetX,
        $targetY,
        $bounds['x'],
        $bounds['y'],
        $targetWidth,
        $targetHeight,
        $bounds['width'],
        $bounds['height'],
    );

    return $icon;
}

/** @param array{x:int,y:int,width:int,height:int} $bounds */
function writePng(
    GdImage $source,
    array $bounds,
    string $path,
    int $size,
    float $padding = 0.05,
    ?array $background = null,
): void {
    $icon = renderIcon($source, $bounds, $size, $padding, $background);

    if (! imagepng($icon, $path, 9)) {
        imagedestroy($icon);
        throw new RuntimeException("Gagal menulis {$path}");
    }

    imagedestroy($icon);
}

/** @param array{x:int,y:int,width:int,height:int} $bounds */
function writeIco(
    GdImage $source,
    array $bounds,
    string $path,
): void {
    $pngImages = [];

    foreach ([16, 32, 48] as $size) {
        $icon = renderIcon($source, $bounds, $size, 0.06);
        ob_start();
        imagepng($icon, null, 9);
        $png = ob_get_clean();
        imagedestroy($icon);

        if (! is_string($png)) {
            throw new RuntimeException("Gagal merender favicon ukuran {$size}px.");
        }

        $pngImages[$size] = $png;
    }

    $header = pack('vvv', 0, 1, count($pngImages));
    $directory = '';
    $payload = '';
    $offset = 6 + (16 * count($pngImages));

    foreach ($pngImages as $size => $png) {
        $length = strlen($png);
        $directory .= pack(
            'CCCCvvVV',
            $size,
            $size,
            0,
            0,
            1,
            32,
            $length,
            $offset,
        );
        $payload .= $png;
        $offset += $length;
    }

    if (file_put_contents($path, $header.$directory.$payload) === false) {
        throw new RuntimeException("Gagal menulis {$path}");
    }
}

$public = dirname(__DIR__).DIRECTORY_SEPARATOR.'public'.DIRECTORY_SEPARATOR;
$sourcePath = $public.'icon'.DIRECTORY_SEPARATOR.'logo.png';
$source = imagecreatefrompng($sourcePath);

if (! $source instanceof GdImage) {
    throw new RuntimeException("Gagal membaca {$sourcePath}");
}

$bounds = visibleBounds($source);
$surface = [247, 248, 241];

writePng($source, $bounds, $public.'pwa-192.png', 192);
writePng($source, $bounds, $public.'pwa-512.png', 512);
writePng($source, $bounds, $public.'pwa-maskable.png', 512, 0.14, $surface);
writePng($source, $bounds, $public.'apple-touch-icon.png', 180, 0.09, $surface);
writeIco($source, $bounds, $public.'favicon.ico');

imagedestroy($source);

fwrite(
    STDOUT,
    "Favicon dan ikon PWA berhasil dibuat dari public/icon/logo.png.\n",
);
