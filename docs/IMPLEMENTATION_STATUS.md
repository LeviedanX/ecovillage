# Status Implementasi EcoVillage.id

**Snapshot:** 6 Agustus 2026, checkout lokal `C:\Users\WINDOWS 11\Desktop\grenawa`.

Dokumen ini membedakan keberadaan source, validasi otomatis, dan QA browser. Tanda selesai hanya dipakai bila bukti pada tabel validasi tersedia.

| Status | Arti |
|---|---|
| ✅ Tervalidasi | source tersedia dan cek yang disebut lulus |
| 🟡 Parsial | source utama ada, tetapi use case/UI/coverage/QA masih terbatas |
| ⛔ Belum selesai | deliverable inti atau quality gate belum terpenuhi |
| ⚪ Terblokir | cek memerlukan tool/infrastruktur eksternal yang tidak tersedia |

## Ringkasan eksekutif

- ✅ Fondasi modern monolith, dependency/lockfile, schema domain, role/permission, seed sintetis berpagar, environment, Docker source, dan seluruh dokumen wajib tersedia.
- ✅ Migration + role/demo seed berhasil dari nol pada MySQL 8.4, engine yang sama dengan production.
- ✅ Backend warga dan operasional tersedia untuk pengumpulan, penimbangan, B3 guard, verifikasi atomik, Green Points/Estimasi Dampak, program, forum, dan marketplace. Seluruh 178 test lulus pada MySQL (1120 assertion).
- ✅ Kalkulasi dampak authoritative menggunakan `Brick\Math\BigDecimal` dengan scale/rounding eksplisit; golden decimal, mismatch weight, dan idempotency diuji.
- ✅ PWA production build menghasilkan manifest dan `public/build/sw.js`; service worker memakai `NetworkOnly` untuk route sensitif dan hanya cache edukasi anonim yang ditandai server.
- ✅ Setiap endpoint aplikasi memiliki jalur UI. Diverifikasi dengan membandingkan `route:list` terhadap bundle produksi; dua pengecualian sah adalah discovery passkey yang dipanggil peramban dan foto pengumpulan yang diakses lewat signed URL.
- ✅ Quality gate bersih: PHPUnit (178/178), Playwright (27/27), TypeScript, ESLint, Prettier, Pint, dan PHPStan seluruhnya lulus.
- ✅ Pemulihan kata sandi, terjemahan pesan bahasa Indonesia, trusted proxy, dan konsistensi batas unggahan ditambahkan pada audit 6 Agustus 2026; rinciannya ada pada tabel temuan di bawah.
- ✅ Lima gap go-live ditutup pada hari yang sama: kemandirian alur dari layanan email, gerbang konfigurasi production, CSP ber-nonce, registrasi anti-enumerasi, serta validasi konfigurasi deployment dan QA aksesibilitas terotomasi.
- ⚪ Eksekusi Docker/Nginx pada engine sungguhan, uji pembaca layar, staging, dan hosting live belum diverifikasi.

## Fase 0 — Pemeriksaan sumber

- [x] Brief teks diaudit untuk identitas, stack, domain, privasi, QA, dan dokumentasi.
- [x] `projectan.pdf` ditemukan pada host, diperiksa lengkap (58 halaman), dan checksum serta batas buktinya dicatat pada `SOURCE_AUDIT.md`.
- [ ] Foto sketsa tidak ditemukan di workspace; hubungan blok dan detail hierarki visual belum dapat diverifikasi.
- [x] Identitas final konsisten: Eco Village, EcoVillage.id, EcoPore, EcoCycle, Green Points, dan Estimasi Dampak. `Kita.hijau` hanya diperlakukan sebagai prototype lama.

Tidak ada faktor ilmiah, alamat warga nyata, atau detail sketsa yang dikarang untuk menutup gap artefak. Angka PDF yang tidak konsisten juga tidak dijadikan klaim atau seed.

## Fase 1 — Fondasi

- [x] Laravel/Inertia/React/TypeScript berada dalam satu modern monolith tanpa React Router/microservices.
- [x] Dependency utama dan lockfile tersedia; Composer schema valid.
- [x] `.env` (pengembangan) dan `.env.production` (final untuk hosting) memuat MySQL/Redis, storage, map/privacy, B3, demo guard, mail, dan port; keduanya tidak ikut ke repositori.
- [x] `APP_TIMEZONE` dibaca `config/app.php` dengan baseline `Asia/Jakarta`; locale default environment adalah `id`.
- [x] Migration region hierarkis, profile/address, assignment wilayah, dan role/permission tersedia di source. Koordinat memakai kolom desimal, tanpa tipe spasial.
- [x] Enum empat role, `RolePermissionSeeder`, policy resource utama, dan test isolasi manager lintas wilayah/descendant tersedia.
- [x] `DatabaseSeeder` hanya memanggil demo ketika `local/testing` dan flag aktif; `DemoDataSeeder` juga menolak production secara internal.
- [x] Migration dan seed role+demo lulus pada MySQL 8.4.
- [x] Dockerfile/Compose/Nginx/PHP config tersedia; YAML dan kontrak statis lulus.
- [ ] Compose expansion/image build/Nginx healthcheck belum diuji karena Docker/Nginx tidak tersedia pada host.
- [x] MySQL 8.4 migration/seed/query telah dijalankan dan lulus.
- [x] README dan delapan dokumen wajib tersedia serta link/fence-nya valid.

## Fase 2 — Pengumpulan sampah

- [x] Schema request/item/foto/assignment/status history, enum delapan status, dan transition guard tersedia.
- [x] UI warga tersedia untuk daftar, pembuatan multi-item, alamat/titik manual+consent, foto, detail/timeline, signed photo, dan pembatalan sebelum pickup.
- [x] Backend operasional tersedia untuk list/scoped map, assignment, `picked_up`, weighing+bukti, verification, dan rejection.
- [x] Guard B3 menolak pickup umum tanpa mitra; pickup/verifikasi B3 memerlukan permission khusus dan kontak resmi berasal dari config.
- [x] Verifikasi menjalankan transaction, lock, exact weight matching, factor/rule selection, impact snapshot, point ledger, two-step history (`verified` lalu `completed`), assignment close, dan audit.
- [x] Test submission ownership, B3 rejection, verifikasi idempotent, decimal golden values, invalid payload, dan regional authorization lulus pada MySQL.
- [x] Halaman detail pengumpulan menyediakan kontrol penugasan, `picked_up`, penimbangan, verifikasi, penolakan, dan pembatalan sesuai kewenangan serta status. Alur petugas end-to-end dijalankan Playwright pada `core-flow.spec.ts`.
- [ ] Seluruh edge state machine, upload adversarial, duplicate request number, database deadlock/race, dan MySQL row locking belum diuji.
- [ ] Browser QA form/map/timeline/upload/operational flow desktop-mobile belum dijalankan.

## Fase 3 — Green Points dan Estimasi Dampak

- [x] Schema point rule/account/immutable transaction, factor set/factor, calculation/item, snapshot, dan unique idempotency tersedia.
- [x] Page saldo/riwayat poin dan rincian Estimasi Dampak tersedia.
- [x] Verifikasi menghasilkan point earn dan impact calculation dari berat terverifikasi dalam satu transaction; retry tidak menggandakan ledger/calculation.
- [x] `BigDecimal` menegakkan scale berat 3, faktor 8, point rule 4, hasil 6, dan rounding `HalfUp`; golden test lulus.
- [x] Admin endpoint adjustment dan reversal memakai ledger service, reason, idempotency, scope wilayah, dan audit.
- [x] Demo factor set berlabel `DEMO - TIDAK UNTUK KLAIM ILMIAH`; dokumen metodologi tidak mengarang koefisien production.
- [ ] Adjustment/reversal belum memiliki coverage otomatis memadai; concurrent account update belum diuji di bawah beban paralel.
- [ ] Factor set belum memiliki field cakupan/geografi eksplisit dan belum ada constraint untuk overlap periode aktif pada scope sama.
- [ ] Source/factor production belum direview ilmiah; seed demo tidak boleh menjadi klaim dampak.

## Fase 4 — Peta dan edukasi

- [x] Public edukasi/detail, katalog, program, methodology, dan peta MapLibre tersedia.
- [x] Public map hanya memakai request `completed`, threshold minimum, filter periode/wilayah/kategori yang ikut memengaruhi suppression, centroid non-null, dan configurable rounding maksimal dua desimal.
- [x] Internal map mengirim titik tepat hanya untuk request aktif dan dibatasi permission assignment/wilayah.
- [x] Kolom koordinat desimal EPSG:4326 tersedia pada migration MySQL.
- [ ] Privacy response test belum membuktikan tidak ada titik/identifier mentah pada seluruh kombinasi filter/export; differencing dan threshold masih perlu review data nyata.
- [x] CMS materi edukasi tersedia pada panel master data, termasuk kategori, pembuatan, penyuntingan, dan status publikasi.
- [ ] Query plan, N+1, agregasi peta, dan performa data besar belum diuji.

## Fase 5 — Program dan marketplace

- [x] Schema program/sesi/registration/attendance serta product/image/inventory/redemption tersedia.
- [x] UI warga list/detail/daftar/batal program dan katalog/keranjang/riwayat redemption tersedia.
- [x] Redemption backend melakukan authorization, row lock saldo+produk, debit ledger, snapshot item, stock movement, audit, dan idempotency dalam satu transaction.
- [x] Test redemption sukses/idempotent serta rollback saldo-stok-ledger lulus pada MySQL.
- [x] Endpoint pengelola dapat memproses `pending → processing → ready → completed`.
- [ ] CRUD pengelola untuk program/sesi/materi/dokumentasi/kehadiran serta produk/image/stok belum tersedia sebagai UI end-to-end.
- [x] Pembatalan redemption mengembalikan poin lewat reversal ledger dan memulihkan stok dalam satu transaction, bersifat idempotent, dan tercatat pada audit log. Dipakai dari panel master data melalui status `cancelled`; diuji `RedemptionServiceTest`.
- [ ] Race redemption dan deadlock retry belum diuji di bawah beban paralel.

## Fase 6 — Forum dan administrasi

- [x] Schema forum, report, notification, audit log, dan site setting tersedia.
- [x] UI forum dapat membaca, membuat thread, membalas, dan melapor sesuai visibility wilayah/program.
- [x] Backend admin menyediakan moderasi thread/post, penyelesaian report, point adjust/reversal, role assignment, site setting update, dan CSV export scoped+formula-injection guard.
- [x] Dashboard berbasis role, statistik database, tren, low stock, moderation count, dan recent audit tersedia.
- [x] Seluruh endpoint aplikasi kini memiliki jalur UI. Diverifikasi dengan membandingkan `route:list` terhadap bundle produksi: hanya dua route yang tidak muncul, yaitu discovery passkey yang dipanggil peramban dan route foto pengumpulan yang diakses lewat signed URL dari props.
- [x] Panel manajemen akses (`/admin/akses`) mengekspos role pengguna, penugasan wilayah, dan permission per role; ketiga endpoint `AdminAccessController` sebelumnya hanya dapat dipanggil dengan merakit request sendiri.
- [ ] Coverage policy/audit/export/admin action masih terbatas; PHPStan juga mendeteksi masalah typing pada AdminController yang harus ditriase.
- [ ] Notification delivery, retention/anonymization audit, dan larangan delete ledger/audit belum diuji menyeluruh.

## Fase 7 — PWA dan final QA

- [x] `vite-plugin-pwa` inject-manifest, web app manifest, icon source, offline fallback, update prompt, dan offline indicator tersedia.
- [x] Service worker memisahkan sensitive `NetworkOnly` dari edukasi anonim dengan `X-EcoVillage-Public`; tidak ada background geolocation/offline queue transaksi.
- [x] Production Vite/PWA build lulus dan menghasilkan 112 precache entries, manifest, serta `public/build/sw.js`.
- [ ] Build masih memberi warning deprecated `inlineDynamicImports` dan chunk MapLibre sekitar 970 kB; bukan build failure tetapi perlu performance/tooling review.
- [x] TypeScript strict check lulus tanpa error.
- [x] ESLint, Prettier, Pint, dan PHPStan seluruhnya lulus pada audit 6 Agustus 2026.
- [x] Playwright memeriksa alur inti lintas role, lima viewport publik, panel admin lintas viewport, tema, dan ketersediaan manifest/service worker.
- [x] Responsive/console/overflow QA otomatis dijalankan pada 360, 390, 768, 1280, dan 1440 piksel untuk halaman publik dan panel admin: tidak ada overflow horizontal, `pageerror`, maupun console error.
- [x] Keyboard, keterlihatan fokus, kontras WCAG AA, landmark, hierarki heading, label formulir, dan nama kontrol diuji otomatis pada halaman publik dan terotentikasi.
- [ ] Installability dan inspeksi cache lewat DevTools, logout-cache, perilaku offline, serta uji dengan pembaca layar sungguhan belum dijalankan.

## Bukti validasi terakhir

Dijalankan ulang seluruhnya pada 6 Agustus 2026, PHP 8.4.10 dan Node 22.17.0, terhadap MySQL 8.4 lokal.

| Perintah/cek | Hasil | Batas bukti |
|---|---|---|
| `composer validate --strict` | ✅ PASS | Composer schema/lock konsisten pada saat cek |
| `php artisan route:list` | ✅ PASS | Laravel bootstrap dan route registration; bukan request/browser QA |
| `php artisan migrate:fresh --seed --force` | ✅ PASS | seluruh migration + role/site-content/demo seed pada MySQL 8.4 |
| Full PHPUnit | ✅ PASS, 178 test / 1120 assertion | seluruh suite pada MySQL 8.4; bukan uji concurrency |
| `npm run build` | ✅ PASS | Vite + PWA production assets; ada warning nonfatal yang dicatat di Fase 7 |
| `npm run types:check` | ✅ PASS | TypeScript `tsc --noEmit`; bukan browser/runtime QA |
| `npm run lint:check` | ✅ PASS | ESLint tanpa error |
| `npm run format:check` | ✅ PASS | seluruh berkas `resources/` sesuai Prettier |
| `composer run lint:check` | ✅ PASS | Pint preset Laravel |
| `phpstan analyse --memory-limit=1G` | ✅ PASS, 0 error | level 7 pada app/bootstrap/config/database/routes |
| Playwright e2e | ✅ PASS, 27 test | alur lintas role, responsivitas lima viewport termasuk panel akses, CSP dan MapLibre, aksesibilitas, tema, manifest/service worker, serta HTML hasil SSR tanpa JavaScript via Chromium |
| Perbandingan `route:list` dengan bundle produksi | ✅ PASS | setiap endpoint memiliki jalur UI; dua pengecualian sah dicatat pada Fase 6 |
| `php artisan ecovillage:check-deploy-config` | ✅ PASS, 18 pemeriksaan | konsistensi Nginx/php.ini/Dockerfile/compose dan batas unggahan; bukan eksekusi engine |
| `php artisan ecovillage:check-production` | ⚙️ Berjalan, GAGAL sesuai harapan pada host lokal | gerbang rilis; menolak APP_ENV=local, APP_DEBUG=true, dan akun demo aktif seperti seharusnya |
| Parse `docker/nginx/default.conf` dengan crossplane | ✅ PASS, 48 direktif | parser resmi Nginx melalui Python; satu-satunya galat adalah `include fastcgi_params` yang memang hanya ada di dalam image |
| `docker compose config` / Docker build / Nginx `-t` | ⚪ TIDAK TERSEDIA | Docker Engine dan Nginx tidak terpasang pada host audit |

## Temuan audit 6 Agustus 2026 dan penanganannya

| Temuan | Dampak | Status |
|---|---|---|
| `DemoDataSeeder` memakai `create()` pada key `site_settings` yang sudah ditanam `SiteContentSeeder` | `migrate:fresh --seed` gagal dengan duplicate key; bootstrap lokal dan e2e mati total | ✅ Diperbaiki dengan `updateOrCreate` |
| Tidak ada berkas `lang/`, sedangkan locale dan fallback sama-sama `id` | Seluruh pesan framework tampil sebagai key mentah (`validation.required`, `auth.failed`) pada setiap formulir | ✅ Ditambahkan `lang/id/*` lengkap plus `lang/en` sebagai rujukan; dijaga `LocalizationTest` |
| Fitur pemulihan kata sandi dinonaktifkan | Warga yang lupa kata sandi terkunci permanen karena seluruh route memakai `verified` | ✅ `Features::resetPasswords()` aktif, `ResetUserPassword`, halaman lupa/setel ulang, tautan pada halaman masuk, `PasswordResetTest` |
| Permintaan tautan setel ulang membedakan email terdaftar dan tidak | Halaman lupa kata sandi dapat dipakai memetakan akun warga | ✅ Respons diseragamkan lewat binding `FailedPasswordResetLinkRequestResponse` |
| Trusted proxy tidak pernah dikonfigurasi | Di belakang Nginx/LB seluruh request dianggap HTTP: HSTS tidak terkirim dan audit log menyimpan IP proxy | ✅ `TRUSTED_PROXIES` melalui `config/ecovillage.php` dan `AppServiceProvider`; dijaga `TrustedProxyTest` |
| Nginx menambahkan `X-Frame-Options: SAMEORIGIN` dan `Permissions-Policy` berbeda dari middleware | Header ganda dengan nilai bertentangan melemahkan proteksi clickjacking | ✅ Header dinamis kini hanya berasal dari aplikasi |
| `post_max_size` 16M lebih kecil dari total lima foto 5 MB | Unggahan penuh ditolak PHP sebelum validasi dan muncul sebagai kegagalan CSRF 419 | ✅ `post_max_size` 32M, `client_max_body_size` 32m |
| Spec e2e dark mode menguji kelas `dark` yang tidak ada, dan lima test admin login berulang menabrak throttle | Suite gagal 6 test bukan karena cacat produk | ✅ Spec diselaraskan dengan tema tunggal dan satu kali login |
| `.q.php` dan `public/hot` tertinggal di working tree | `public/hot` membuat Vite menunjuk dev server bila ikut terkirim ke hosting | ✅ Dihapus |
| `docs/DEPLOYMENT.md` mencontohkan `pg_dump`/`pg_restore` | Runbook backup salah engine untuk database MySQL | ✅ Diganti `mysqldump`/`mysql` |

## Penutupan lima gap go-live

Dikerjakan pada tanggal yang sama, setelah tabel temuan di atas.

| Gap | Penanganan | Bukti |
|---|---|---|
| Alur pokok bergantung pada layanan email | `REQUIRE_EMAIL_VERIFICATION` mematikan kewajiban verifikasi; akun baru langsung ditandai terverifikasi, `verified` diganti middleware yang menghormati flag, dan kegagalan transport tidak lagi menjatuhkan pendaftaran | `RegistrationWithoutMailerTest` |
| Konfigurasi production hanya berupa anjuran dokumen | `ecovillage:check-production` menjadi gerbang rilis untuk env, cookie, debug, secret penanda, akun demo, mailer, storage, dan migration. `APP_DEBUG` juga dipaksa mati saat runtime production | `ProductionReadinessTest`, 8 test |
| CSP belum ditetapkan | Kebijakan penuh dengan nonce per request, tanpa `'unsafe-inline'` dan `'unsafe-eval'` pada `script-src`, `worker-src blob:` untuk MapLibre, serta origin peta dari environment | `ContentSecurityPolicyTest` 7 test, ditambah verifikasi peramban bahwa canvas MapLibre tetap tampil tanpa pelanggaran |
| Registrasi membocorkan keberadaan akun | Pendaftaran dipindahkan dari Fortify ke `RegistrationController`: email terdaftar dan belum terdaftar berakhir pada halaman, pesan, dan status sesi yang sama; pemilik akun diberi tahu lewat email | `RegistrationEnumerationTest` 7 test, ditambah perbandingan teks halaman lewat peramban pada `core-flow.spec.ts` |
| Runtime deployment dan aksesibilitas belum diperiksa | `ecovillage:check-deploy-config` menjaga konsistensi Nginx/php.ini/Dockerfile/compose; `accessibility.spec.ts` memeriksa landmark, hierarki heading, label, nama kontrol, navigasi keyboard, keterlihatan fokus, dan kontras WCAG AA | `DeployConfigTest`, 9 test Playwright aksesibilitas |

## Perbaikan SEO, performa, dan keamanan

Dikerjakan setelah audit keamanan dan performa; seluruhnya diverifikasi, bukan sekadar dikonfigurasi.

| Temuan | Penanganan | Bukti |
|---|---|---|
| Halaman publik dikirim sebagai cangkang kosong; crawler dan pratinjau tautan tidak melihat apa pun | Render sisi server Inertia dihidupkan: entry `resources/js/ssr.tsx`, bundle mandiri, stage image `ssr-production`, service Compose, dan fallback otomatis ke render peramban bila prosesnya mati | `seo.spec.ts` memeriksa HTML mentah tanpa JavaScript: `<h1>` ada, teks di atas 500 karakter, judul unik per halaman |
| Judul seluruh halaman sama dan tanpa deskripsi | Komponen `Seo` menetapkan judul, deskripsi, Open Graph, Twitter card, dan JSON-LD per halaman; canonical serta `og:url` dirender layout dari APP_URL | `SeoTest` 6 test, `seo.spec.ts` 8 test |
| Tidak ada sitemap; `robots.txt` membuka area terautentikasi | `SitemapController` membangun sitemap dari konten terbit dan menutup seluruh jalur privat | `SeoTest` |
| Aset teks dikirim tanpa kompresi | gzip diaktifkan pada Nginx untuk HTML, JS, CSS, JSON, SVG, dan XML | `ecovillage:check-deploy-config` |
| Email dikirim di dalam request | Verifikasi dan setel ulang kata sandi memakai notifikasi ber-antrean | `PasswordResetTest`, `VerificationNotificationTest` |
| 27 route publik tanpa batas laju | Limiter `web` diterapkan pada seluruh lapisan web, dikunci per pengguna bila sudah masuk | limiter pada `FortifyServiceProvider` |
| 2FA opsional bagi pemegang data warga | Super admin dan pengelola wajib memasang 2FA sebelum membuka jalur pengelolaan; halaman keamanan tetap terbuka agar tidak ada yang terkunci | `PrivilegedTwoFactorTest` 7 test |
| Route `/storage/{path}` bawaan terdaftar tanpa dipakai | `serve` pada disk lokal dimatikan | konfigurasi `filesystems` |
| Kerentanan dependency hanya diperiksa manual | `composer audit` dan `npm audit` menjadi langkah CI | `.github/workflows/tests.yml` |

## Blocker dan risiko prioritas

1. Bangun image pada host ber-Docker lalu jalankan `nginx -t` dan `docker compose config`. Konsistensi antar berkas sudah dijaga `ecovillage:check-deploy-config`, tetapi engine belum pernah mengeksekusinya sekali pun; build pertama adalah risiko yang belum diukur.
2. Kirim `.env.production` ke server lewat jalur aman, salin menjadi `.env`, isi nilai bertanda `ISI_` (domain, dan SMTP bila email dipakai), lalu lewati `ecovillage:check-production` sampai hijau. Keputusan yang tersisa untuk pemilik produk: memakai mailer sungguhan, atau menerima `REQUIRE_EMAIL_VERIFICATION=false` beserta konsekuensinya.
3. Naikkan ke staging dan jalankan smoke test lintas role sebelum menyentuh production.
4. Lengkapi UI operasional/admin/CMS agar endpoint backend benar-benar dapat dipakai sesuai role tanpa request manual.
5. Jalankan uji concurrency pada MySQL: row-lock race, deadlock retry, dan review migration fresh/rollback beserta query plan.
6. Lengkapi factor set scope/geografi, governance versi aktif, serta review sumber ilmiah sebelum data non-demo.
7. QA aksesibilitas dengan pembaca layar sungguhan. Yang terotomasi baru struktur, keyboard, fokus, dan kontras; pengalaman NVDA/VoiceOver belum diuji.
8. Dapatkan foto sketsa Eco Village terpisah untuk audit visual traceable; jangan menebak detail yang hilang.
9. Verifikasi staging/live: TLS/cookie, queue/scheduler, S3 signed URL, backup-restore, monitoring, DNS, dan logout.

## Definition of done

Fase baru boleh ditandai selesai bila use case frontend-backend dapat dipakai; authorization dan invariant backend diterapkan; migration/seed MySQL lulus; test/lint/type/build lulus; browser QA desktop-mobile bersih; privasi lokasi/PWA dan accessibility diperiksa; serta limitation tersisa dinyatakan faktual.
