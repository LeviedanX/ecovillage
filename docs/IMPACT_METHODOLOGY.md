# Metodologi Estimasi Dampak Lingkungan

## Ruang lingkup dan nama klaim

Modul ini bernama **Estimasi Dampak Lingkungan**. Ia mengalikan berat sampah yang telah diverifikasi dengan faktor dampak terkonfigurasi. Modul ini **bukan Life Cycle Assessment (LCA) penuh**, tidak otomatis memenuhi ISO 14040/14044, dan tidak boleh dipakai sebagai klaim ilmiah, carbon credit, inventaris GRK resmi, atau laporan kepatuhan tanpa review metodologis independen.

Green Points dan Estimasi Dampak adalah dua sistem berbeda. Keduanya dapat memakai berat terverifikasi yang sama, tetapi formula, versi, ledger, tujuan, dan tampilan tidak dicampur.

## Unit observasi dan eligibility

Satu calculation terkait satu `collection_request` yang telah mencapai `verified`. Input per item:

- jenis dan kategori sampah final;
- berat terverifikasi dalam kilogram, bukan perkiraan warga;
- waktu verifikasi dan wilayah/cakupan;
- factor set aktif yang memenuhi tanggal berlaku dan cakupan;
- faktor yang cocok untuk jenis sampah dan `impact_kind`.

Request `submitted`, `assigned`, `picked_up`, atau `weighed` tidak menghasilkan dampak final. Request `rejected`/`cancelled` tidak menghasilkan dampak. Perubahan master jenis sampah setelah verifikasi tidak mengubah snapshot perhitungan lama.

## Model faktor

Satu factor set wajib memiliki:

| Atribut | Aturan |
|---|---|
| Nama dan versi | kombinasi unik; versi tidak ditimpa |
| Sumber | nama sumber wajib, URL/referensi bila tersedia |
| Tanggal berlaku | periode yang jelas; overlap dalam cakupan yang sama harus dicegah |
| Cakupan | wilayah/geografi dan skenario pengelolaan yang sesuai |
| Catatan metodologi | definisi baseline, boundary, asumsi, keterbatasan |
| Status | `draft`, `active`, atau `archived` |
| Flag demo | seed/nonvalidasi diberi tanda eksplisit |

Setiap faktor menyebut `waste_type`, `impact_kind`, nilai, dan unit. Unit harus kompatibel dengan formula, misalnya `kg CO2e/kg sampah`, `kg potensi daur ulang/kg sampah`, atau `kWh/kg sampah`. Contoh unit ini menjelaskan dimensi; **bukan nilai faktor**.

Schema menyimpan sumber, versi, tanggal, status, flag demo, faktor, unit, `region_id` opsional, dan `scope_notes`. Factor set berwilayah dipilih dari cakupan paling spesifik pada lineage permintaan (RT, lalu RW, lalu kelurahan); factor set global menjadi fallback. Seed demo dibatasi ke Lesanpuro RW 08.

## Formula

Untuk item terverifikasi `i` dan jenis dampak `k`:

```text
estimasi(i,k) = berat_terverifikasi_kg(i) × faktor(i,k)
total(k)      = Σ estimasi(i,k) untuk semua item eligible
```

Contoh `impact_kind` yang telah disiapkan schema agregat adalah:

- `carbon_kg_co2e`;
- `recyclable_kg`;
- `energy_kwh`.

Nama tersebut tidak menjamin semua sumber ilmiah menyediakan ketiganya. Jika faktor tidak ada atau unit tidak kompatibel, sistem tidak boleh mengasumsikan nol tanpa label. Hasil harus ditandai `not_calculated`/tidak tersedia pada level presentasi, atau verifikasi ditahan sesuai kebijakan operasional yang disetujui.

Komposisi organik/anorganik/kategori lain dihitung terpisah dari faktor dampak:

```text
berat_kategori(c) = Σ berat item terverifikasi pada kategori c
persentase(c)      = berat_kategori(c) / total_berat_terverifikasi × 100%
```

Jika total berat nol, persentase tidak dihitung; jangan membagi dengan nol atau menampilkan 0% seolah terdapat observasi.

## Pemilihan versi

Pada transition `weighed → verified`, service melakukan langkah berikut dalam satu transaction:

1. lock request dan pastikan belum pernah menghasilkan calculation;
2. pilih factor set `active` yang tanggal/cakupannya sesuai waktu verifikasi;
3. validasi tepat satu faktor yang cocok per kombinasi item dan jenis dampak yang diwajibkan;
4. hitung dengan decimal, bukan floating-point biner;
5. simpan `impact_calculations`, item, `methodology_snapshot`, dan `factor_snapshot`;
6. tulis status history dan audit log;
7. commit, lalu kirim notifikasi setelah commit.

Snapshot minimum memuat factor set ID/nama/versi, sumber, URL/referensi, periode, cakupan, unit, nilai faktor, asumsi, flag demo, waktu kalkulasi, dan versi kode/metodologi bila tersedia. Perubahan factor set aktif tidak melakukan bulk update terhadap hasil historis.

## Presisi dan pembulatan

Implementasi authoritative di `VerifyCollectionRequest` menggunakan `Brick\Math\BigDecimal`, bukan floating-point biner. Kontrak presisinya:

| Nilai | Scale | Aturan |
|---|---:|---|
| Berat terverifikasi | 3 desimal kg | harus tepat pada scale 3; input berpresisi lebih panjang ditolak |
| Faktor dampak | 8 desimal | harus tepat pada scale schema; nilai tidak valid ditolak |
| Aturan poin per kg | 4 desimal | harus tepat pada scale schema |
| Hasil dampak per item | 6 desimal | `berat × faktor`, dibulatkan `HalfUp` |
| Poin per item | bilangan bulat | `berat × points_per_kg`, dibulatkan `HalfUp`; nilai negatif dinormalkan menjadi nol |
| Total dampak | 6 desimal | menjumlahkan hasil item enam desimal secara decimal |
| Total berat | 3 desimal | menjumlahkan berat item secara decimal |

Nilai decimal diserahkan ke Eloquent sebagai string agar tidak kembali menjadi float sebelum disimpan. Overflow saldo/total poin ke integer ditolak. Rule ini harus dipertahankan oleh golden test; perubahan mode rounding adalah perubahan metodologi dan tidak dilakukan diam-diam.

UI boleh menampilkan digit lebih sedikit, tetapi harus menyebut unit dan tidak menghitung ulang hasil authoritative di JavaScript. Export/metodologi memakai nilai tersimpan sesuai scale di atas.

## Factor set demo

Faktor seed hanya boleh digunakan untuk demonstrasi dan wajib menampilkan label persis:

> **DEMO - TIDAK UNTUK KLAIM ILMIAH**

Nilai demo tidak boleh disamarkan sebagai angka rujukan, dibawa otomatis ke production, atau ditampilkan tanpa banner/disclaimer. Dokumen ini sengaja tidak memberikan koefisien karena belum ada sumber tervalidasi yang tersedia di workspace.

## Tampilan dan disclosure

Setiap hasil warga/admin minimal menampilkan:

- total sampah terverifikasi dan komposisi kategori;
- estimasi kg CO2e, potensi daur ulang, dan/atau energi hanya jika faktor valid tersedia;
- rincian per kategori/item;
- factor set, versi, sumber, periode/cakupan, dan flag demo;
- waktu kalkulasi;
- tautan ke metodologi dan disclaimer.

Bahasa yang tepat: “estimasi”, “berdasarkan faktor versi …”, dan “dapat berubah jika metodologi diperbarui untuk transaksi baru”. Hindari “menghilangkan emisi”, “carbon neutral”, “LCA tersertifikasi”, atau klaim kausal lain yang tidak dibuktikan.

## Koreksi dan recalculation

- Kesalahan berat/jenis setelah verifikasi memerlukan workflow koreksi berizin dan audit; calculation lama dipertahankan atau di-supersede, bukan diedit tanpa jejak.
- Perubahan metodologi hanya berlaku untuk transaksi baru. Recalculation historis, bila diwajibkan untuk analisis, disimpan sebagai versi terpisah dengan alasan dan tidak mengganti angka yang diterima pengguna saat transaksi.
- Dampak tidak dikoreksi melalui point adjustment; dua domain memiliki audit trail masing-masing.

## Quality gates sebelum factor set production aktif

- sumber primer/otoritatif tersedia dan dapat ditelusuri;
- definisi boundary, baseline, geografi, periode, dan unit direview pihak kompeten;
- mapping jenis sampah lokal ke kategori sumber terdokumentasi;
- konversi unit dan tanda positif/negatif diuji;
- tidak ada overlap factor set aktif dalam cakupan sama;
- golden test memakai contoh perhitungan yang direview manual;
- retry/race tidak menggandakan calculation;
- tampilan factor set/disclaimer diuji desktop dan mobile;
- reviewer menyetujui istilah klaim publik.

## Keterbatasan sumber saat ini

`projectan.pdf` telah diperiksa, tetapi proposal tersebut tidak menyediakan factor set yang cukup konsisten dan tervalidasi untuk klaim ilmiah. Karena itu, tidak ada asumsi, boundary, atau koefisien dari PDF yang dimasukkan. Metodologi ini mendefinisikan pagar teknis; factor set production tetap membutuhkan sumber dan validasi substantif di luar implementasi software.
