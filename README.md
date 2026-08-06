# EcoVillage.id

EcoVillage.id adalah platform digital untuk program induk **Eco Village**. Produk menghubungkan pengumpulan sampah berbasis komunitas, **Green Points**, **Estimasi Dampak Lingkungan**, edukasi, program **EcoPore** dan **EcoCycle**, marketplace penukaran poin, serta forum warga dalam satu modern monolith Laravel.

Repositori ini sedang dibangun bertahap. Ketersediaan aktual setiap modul, bukti uji, dan gap yang masih terbuka dicatat di [Status Implementasi](docs/IMPLEMENTATION_STATUS.md). Jangan menyamakan keberadaan schema atau halaman dengan fitur yang telah selesai diuji.

Seluruh quality gate berstatus hijau, tetapi aplikasi **belum pernah dibangun sebagai image maupun dijalankan di server**. Langkah menuju hosting beserta batas buktinya ada di [Menuju hosting](#menuju-hosting).

## Stack

- Laravel 13, PHP 8.3+, Inertia.js 3, React 19, dan TypeScript strict.
- Tailwind CSS 4, komponen shadcn/ui berbasis Radix UI, Vite 8.
- MySQL 8.4, Redis untuk queue/cache/session.
- MapLibre GL JS, Recharts, dan `vite-plugin-pwa`.
- Spatie Laravel Permission, Laravel Filesystem, PHPUnit/Laravel test runner, dan Playwright.
- Nginx + PHP-FPM untuk container web.

## Persyaratan

Jalur Docker memerlukan Docker Engine/Desktop dengan Docker Compose v2. Jalur manual memerlukan:

- PHP 8.3 atau lebih baru beserta ekstensi `bcmath`, `ctype`, `dom`, `fileinfo`, `gd`, `intl`, `mbstring`, `openssl`, `pcntl` (Linux/queue), `pdo_mysql`, `tokenizer`, `xml`, dan `zip`;
- Composer 2;
- Node.js 20.19+ atau 22.12+ dan npm;
- MySQL 8.4 (atau MariaDB 11 yang kompatibel);
- Redis 7 atau layanan kompatibel.

## Instalasi dengan Docker

1. Salin konfigurasi contoh.

   PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

   Linux/macOS:

   ```bash
   cp .env.example .env
   ```

2. Ganti `DB_PASSWORD`, `DB_ROOT_PASSWORD`, dan `REDIS_PASSWORD` dengan tiga nilai acak yang berbeda. Nilai `CHANGE_ME...` hanya penanda, bukan kredensial siap pakai.
3. Bangun image pengembangan dan hidupkan dependency.

   ```bash
   docker compose build app
   docker compose up -d mysql redis
   ```

4. Buat application key, jalankan migration/seeder, dan buat symbolic link storage.

   ```bash
   docker compose run --rm app php artisan key:generate
   docker compose run --rm app php artisan migrate --seed
   docker compose run --rm app php artisan storage:link
   ```

5. Jalankan seluruh layanan.

   ```bash
   docker compose up -d
   ```

   Aplikasi tersedia di `http://localhost:8080`; Vite HMR di `127.0.0.1:5173`. Service `queue` dan `scheduler` ikut berjalan. Gunakan `docker compose logs -f app web queue` untuk memantau log.

MySQL dan Redis diekspos hanya ke loopback host. Jika port lokal sudah dipakai, ubah `DB_FORWARD_PORT`, `REDIS_FORWARD_PORT`, atau `APP_HTTP_PORT` di `.env`.

## Instalasi manual

Konfigurasi `.env.example` memakai hostname container (`mysql` dan `redis`). Untuk instalasi native Windows/Linux, salin file tersebut lalu ubah `DB_HOST=127.0.0.1` dan `REDIS_HOST=127.0.0.1`. Sesuaikan juga `DB_PORT` bila server MySQL Anda tidak memakai port baku `3306`. Pastikan database dan user sudah dibuat:

### Windows

1. Instal PHP 8.3+ x64, Composer, Node.js/npm, MySQL 8.4, dan Redis-compatible service. Redis tidak memiliki jalur native Windows resmi yang sama dengan Linux; gunakan service kompatibel yang dikelola organisasi atau Redis di WSL2.
2. Aktifkan extension PHP yang tercantum pada bagian Persyaratan—khususnya `pdo_mysql`—di `php.ini`, lalu tambahkan executable ke `PATH`.
3. Dari MySQL shell, buat database/user tanpa menaruh password pada command history:

   ```sql
   CREATE DATABASE ecovillage CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'ecovillage'@'localhost' IDENTIFIED BY '<password>';
   GRANT ALL PRIVILEGES ON ecovillage.* TO 'ecovillage'@'localhost';
   FLUSH PRIVILEGES;
   ```

4. Verifikasi `php -m`, `composer --version`, `node --version`, `npm --version`, `mysql --version`, dan koneksi Redis sebelum menjalankan command aplikasi.

### Linux

Instal PHP 8.3+ beserta ekstensi, Composer, Node/npm, MySQL 8.4, dan Redis dari repository vendor/distribusi yang dipercaya. Nama paket berbeda antar distro. Pada host berbasis systemd, hidupkan MySQL/Redis lalu provision database:

```bash
sudo systemctl enable --now mysql redis-server
sudo mysql --execute="CREATE DATABASE ecovillage CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
sudo mysql --execute="CREATE USER 'ecovillage'@'localhost' IDENTIFIED BY '<password>';"
sudo mysql --execute="GRANT ALL PRIVILEGES ON ecovillage.* TO 'ecovillage'@'localhost'; FLUSH PRIVILEGES;"
```

### Menjalankan aplikasi native

Jalankan:

```bash
composer install
npm ci
php artisan key:generate
php artisan migrate --seed
php artisan storage:link
composer run dev
```

`composer run dev` menjalankan server Laravel, queue, log viewer, dan Vite sesuai script repositori. Alternatifnya, jalankan proses berikut di terminal terpisah:

```bash
php artisan serve
php artisan queue:work redis --tries=3 --timeout=90
php artisan schedule:work
npm run dev
```

Pada Windows, gunakan executable `npm.cmd` jika asosiasi PowerShell untuk `npm` bermasalah.

## Konfigurasi penting

- Produksi wajib memakai `APP_ENV=production`, `APP_DEBUG=false`, `APP_URL=https://...`, `SESSION_SECURE_COOKIE=true`, serta secret unik dari secret manager/platform.
- `TRUSTED_PROXIES` wajib diisi bila TLS diterminasi di reverse proxy atau load balancer. Tanpa itu Laravel membaca skema dan IP dari koneksi proxy, sehingga HSTS tidak terkirim dan audit log menyimpan IP proxy, bukan IP pengguna.
- `MAIL_MAILER` menentukan apakah email benar-benar terkirim. Bila belum ada layanan email, setel `REQUIRE_EMAIL_VERIFICATION=false`: akun baru langsung aktif sehingga alur pokok tidak berhenti di halaman verifikasi. Dengan mailer tersedia, biarkan `true` dan pakai `failover` agar kegagalan transport tidak menjatuhkan pendaftaran.
- `NEUTRAL_REGISTRATION_RESPONSE=true` membuat halaman daftar menjawab sama untuk email yang sudah terdaftar maupun belum. Flag ini hanya berlaku ketika verifikasi email aktif, karena pemberitahuan ke pemilik akun dikirim lewat email.
- CSP aktif secara baku dan memakai nonce per request. `MAP_TILE_ORIGINS` diisi bila tile atau sprite peta dilayani host lain; peta akan kosong bila origin-nya tidak terdaftar. `CSP_REPORT_ONLY=true` dipakai saat menguji perubahan kebijakan pada traffic nyata. Kebijakan tidak ditegakkan selama server Vite berjalan, karena aset dev dilayani dari origin lain yang tidak selalu dapat dinyatakan CSP.
- `APP_TIMEZONE=Asia/Jakarta`, locale `id`, kilogram, Rupiah, dan koordinat WGS84/EPSG:4326 adalah baseline produk; `config/app.php` membaca timezone dari environment.
- Development memakai `FILESYSTEM_DISK=local`. Produksi dapat memakai `s3` dengan mengisi `AWS_*`; objek privat harus disajikan melalui signed URL.
- `PRIVATE_UPLOAD_DISK`, batas upload, konfigurasi mitra B3, serta agregasi/presisi peta publik berada di environment. Nilai peta contoh bukan jaminan anonimisasi; review [Kebijakan Privasi dan Peta](docs/PRIVACY_AND_MAP_POLICY.md) sebelum production.
- `VITE_MAP_STYLE_URL` harus menunjuk style MapLibre yang sah. Seluruh variabel `VITE_*` ikut ter-bundle dan dapat dibaca pengunjung; jangan menaruh API key atau tile token di sana.

Dua template environment tersedia dan keduanya bebas secret:

| Berkas | Untuk |
|---|---|
| `.env.example` | pengembangan lokal dan Docker Compose |
| `.env.production.example` | server hosting; sudah berbentuk production, tinggal mengisi nilai bertanda `ISI_` |

Jangan commit `.env`, dan jangan menyalin `.env` pengembangan ke server: nilainya memakai HTTP, database lokal, akun demo aktif, dan mailer yang tidak mengirim apa pun. Kelengkapan kedua template dijaga `EnvironmentTemplateTest`, sehingga variabel baru yang dibaca `config/` tidak dapat lolos tanpa didokumentasikan.

## Migration dan seed

```bash
php artisan migrate
php artisan db:seed
```

Reset database menghapus data dan hanya layak untuk environment disposable:

```bash
php artisan migrate:fresh --seed
```

Koordinat disimpan sebagai kolom `latitude`/`longitude` numerik biasa; tidak ada tipe atau index spasial khusus yang perlu divalidasi terpisah.

## Quality checks

```bash
composer validate --strict
composer run ci:check
npm run build
npx playwright test
```

Perintah individual:

```bash
composer run lint:check
composer run types:check
php artisan test
npm run lint:check
npm run format:check
npm run types:check
```

Pemeriksaan konfigurasi deployment ikut berjalan sebagai bagian dari suite, tetapi dapat dipanggil langsung:

```bash
php artisan ecovillage:check-deploy-config
```

Suite Playwright selalu menguji aset hasil build. Bila `npm run dev` sedang berjalan, penanda `public/hot` disingkirkan sementara lalu dikembalikan setelah suite selesai, sehingga sesi pengembangan tidak terganggu.

Hasil aktual, termasuk kegagalan atau cek yang belum dijalankan, harus dicatat di [Status Implementasi](docs/IMPLEMENTATION_STATUS.md).

## Build produksi

Build aset tanpa container:

```bash
npm ci
npm run build
composer install --no-dev --prefer-dist --optimize-autoloader --classmap-authoritative
php artisan optimize
```

Build image produksi:

```bash
docker build --target production -t ecovillage-id:local .
```

Image tidak menjalankan migration otomatis. Jalankan migration sebagai release task satu kali, kemudian jalankan web, queue worker, dan scheduler dengan revision image yang sama. Rincian ada di [Deployment](docs/DEPLOYMENT.md).

## Menuju hosting

### Status kesiapan

Kode aplikasi, keamanan, dan kualitas sudah terverifikasi otomatis: PHPUnit, Playwright lintas viewport, aksesibilitas, PHPStan, ESLint, Prettier, Pint, dan build produksi. Yang **belum pernah dijalankan** dan karena itu tidak boleh dianggap terbukti:

- image Docker belum pernah dibangun sekali pun;
- `nginx -t` dan `docker compose config` belum pernah dieksekusi;
- aplikasi belum pernah berjalan di server mana pun, sehingga TLS, cookie `secure`, queue worker, scheduler, signed URL S3, DNS, backup, dan restore drill masih nol verifikasi;
- uji concurrency pada verifikasi dan penukaran poin belum dilakukan.

Batas bukti per fase dicatat di [Status Implementasi](docs/IMPLEMENTATION_STATUS.md). Jangan menyamakan gate hijau dengan aplikasi yang sudah live.

### 1. Kunci revisi

Setiap deployment mengacu pada satu commit. Image aplikasi dan image web wajib berasal dari commit yang sama agar manifest aset sinkron.

```bash
git rev-parse --short HEAD
```

### 2. Siapkan environment tujuan

`.env.production.example` sudah berbentuk production: `APP_ENV=production`, `APP_DEBUG=false`, cookie `secure`, sesi terenkripsi, CSP aktif, akun demo mati, dan storage mengarah ke S3. Yang tersisa hanya mengisi nilai bertanda `ISI_`.

```bash
cp .env.production.example .env      # di server, bukan di repositori
php artisan key:generate --force
```

Jangan menyalin `.env` pengembangan ke server: nilainya memakai HTTP, database lokal, akun demo aktif, dan mailer `log`.

### 3. Lewati dua gerbang rilis

```bash
php artisan ecovillage:check-deploy-config   # konsistensi Nginx, php.ini, Dockerfile, compose
php artisan ecovillage:check-production      # env, cookie, secret, mailer, storage, migration
```

Keduanya keluar dengan kode selain nol bila ada baris `GAGAL`, sehingga dapat dipasang sebagai release task yang menghentikan pipeline. Jalankan `check-production` pada environment tujuan, bukan di mesin pengembangan.

### 4. Bangun dan verifikasi image

Langkah ini memerlukan host dengan Docker Engine.

```bash
docker build --target production -t registry.example/ecovillage/app:$(git rev-parse --short HEAD) .
docker build --target nginx-production -t registry.example/ecovillage/web:$(git rev-parse --short HEAD) .
docker compose config >/dev/null
docker run --rm -v "$PWD/docker/nginx/default.conf:/etc/nginx/conf.d/default.conf:ro" nginx:1.28-alpine nginx -t
```

### 5. Staging lalu production

Naikkan ke staging dengan secret staging, jalankan `php artisan migrate --force` sebagai release task satu kali, lalu jalankan smoke test: masuk, ajukan pengumpulan, verifikasi, penukaran poin, buka peta, dan keluar. Setelah staging bersih, ulangi pada production dengan revision image yang sama. Urutan lengkap, rollback, dan checklist go-live ada di [Deployment](docs/DEPLOYMENT.md).

## Akun demo

`DatabaseSeeder` hanya memanggil `DemoDataSeeder` pada environment `local` atau `testing`; production tidak membuat akun demo. Seeder mendefinisikan akun sintetis berikut:

| Role | Email |
|---|---|
| Super Admin | `admin@gmail.com` |
| Pengelola | `pengelola@gmail.com` |
| Kader | `kader@gmail.com` |
| Warga | `warga@gmail.com` |

Password seluruh akun adalah nilai `DEMO_USER_PASSWORD`; bila variabel itu benar-benar tidak didefinisikan, source seeder memakai `password`. Untuk mengaktifkan seed demo, set `DEMO_ACCOUNTS_ENABLED=true` dan ganti placeholder `DEMO_USER_PASSWORD` pada environment `local`/`testing`. Seeder menolak environment production. Migration, seed demo, dan login kredensial di atas telah tervalidasi pada MySQL 8.4 melalui suite PHPUnit dan Playwright; lihat [Status Implementasi](docs/IMPLEMENTATION_STATUS.md).

## Troubleshooting

- **Compose menolak konfigurasi:** isi `DB_PASSWORD`, `DB_ROOT_PASSWORD`, dan `REDIS_PASSWORD`; ketiganya diwajibkan oleh `compose.yaml`.
- **`could not find driver`:** aktifkan extension `pdo_mysql` di `php.ini`, lalu konfirmasi dengan `php -m`.
- **Nama index terlalu panjang:** MySQL membatasi identifier pada 64 karakter; beri nama eksplisit pada index gabungan saat menambah migration baru.
- **Permission storage/cache:** pastikan proses PHP dapat menulis `storage/` dan `bootstrap/cache/`.
- **Aset tidak muncul:** jalankan `npm ci && npm run build`, atau service `vite` untuk HMR.
- **Queue tidak memproses job:** periksa `QUEUE_CONNECTION=redis`, koneksi Redis, dan `docker compose logs queue`.
- **Cookie login tidak tersimpan di lokal:** `SESSION_SECURE_COOKIE` harus `false` untuk HTTP lokal dan `true` untuk HTTPS produksi.
- **Peta kosong:** isi `VITE_MAP_STYLE_URL`, build ulang aset, lalu cek kebijakan CORS penyedia tile/style.
- **Port bentrok:** ubah port host pada `.env`; jangan mengubah port internal service Compose.

## Dokumen teknis

- [Arsitektur](docs/ARCHITECTURE.md)
- [ERD](docs/ERD.md)
- [Matriks Role dan Permission](docs/ROLE_PERMISSION_MATRIX.md)
- [State Machine](docs/STATE_MACHINE.md)
- [Metodologi Estimasi Dampak](docs/IMPACT_METHODOLOGY.md)
- [Kebijakan Privasi dan Peta](docs/PRIVACY_AND_MAP_POLICY.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Status Implementasi](docs/IMPLEMENTATION_STATUS.md)

## Batas sumber desain

`projectan.pdf` (58 halaman; SHA-256 tercatat di `docs/SOURCE_AUDIT.md`) telah diperiksa lengkap. Dokumen tersebut diperlakukan sebagai proposal/prototype lama `Kita.hijau`, bukan bukti aplikasi live atau sumber faktor ilmiah. Foto sketsa Eco Village terpisah tidak ditemukan, sehingga relasi merek yang hanya ada pada brief diperlakukan sebagai keputusan produk terbaru. Data personal, foto wajah, alamat, dan angka yang tidak konsisten dalam PDF tidak disalin ke aplikasi.
