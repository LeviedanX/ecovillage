# ERD EcoVillage.id

Dokumen ini menggambarkan **baseline schema domain pada migration `2026_08_03_000100` sampai `000500`**. Relasi polymorphic ditulis sebagai pasangan `*_type`/`*_id`. Tabel framework seperti cache, jobs, sessions, passkeys, dan password reset sengaja tidak digambar agar ERD domain tetap terbaca.

Keberadaan tabel tidak membuktikan bahwa model, policy, use case, UI, seed, dan test telah lengkap. Lihat [status implementasi](IMPLEMENTATION_STATUS.md).

## Identitas, wilayah, dan pengumpulan

```mermaid
erDiagram
    USERS {
        bigint id PK
        string name
        string email UK
        timestamp email_verified_at
    }
    USER_PROFILES {
        bigint id PK
        bigint user_id FK,UK
        bigint primary_region_id FK
        string phone
        timestamp location_consent_at
    }
    REGIONS {
        bigint id PK
        bigint parent_id FK
        string level
        string code
        string name
        decimal centroid_latitude
        decimal centroid_longitude
    }
    ADDRESSES {
        bigint id PK
        bigint user_id FK
        bigint region_id FK
        text address_line
        decimal latitude
        decimal longitude
        timestamp location_consent_at
    }
    REGION_USER_ASSIGNMENTS {
        bigint id PK
        bigint user_id FK
        bigint region_id FK
        string assignment_type
        boolean is_active
    }
    ROLES {
        bigint id PK
        string name
        string guard_name
    }
    PERMISSIONS {
        bigint id PK
        string name
        string guard_name
    }
    MODEL_HAS_ROLES {
        bigint role_id FK
        string model_type
        bigint model_id
    }
    MODEL_HAS_PERMISSIONS {
        bigint permission_id FK
        string model_type
        bigint model_id
    }
    ROLE_HAS_PERMISSIONS {
        bigint role_id FK
        bigint permission_id FK
    }
    WASTE_CATEGORIES {
        bigint id PK
        string name
        string slug UK
        boolean is_hazardous
        boolean is_active
    }
    WASTE_TYPES {
        bigint id PK
        bigint waste_category_id FK
        string name
        string unit
        boolean is_active
    }
    COLLECTION_REQUESTS {
        bigint id PK
        bigint requester_id FK
        bigint region_id FK
        bigint address_id FK
        string request_number UK
        json address_snapshot
        decimal latitude
        decimal longitude
        string method
        string status
        string idempotency_key UK
    }
    COLLECTION_ITEMS {
        bigint id PK
        bigint collection_request_id FK
        bigint waste_type_id FK
        decimal estimated_weight
        decimal verified_weight
        bigint verified_by FK
    }
    COLLECTION_PHOTOS {
        bigint id PK
        bigint collection_request_id FK
        bigint uploaded_by FK
        string kind
        string disk
        string path
    }
    COLLECTION_ASSIGNMENTS {
        bigint id PK
        bigint collection_request_id FK
        bigint assignee_id FK
        bigint assigned_by FK
        boolean is_active
    }
    COLLECTION_STATUS_HISTORIES {
        bigint id PK
        bigint collection_request_id FK
        string from_status
        string to_status
        bigint actor_id FK
        timestamp created_at
    }

    USERS ||--o| USER_PROFILES : memiliki
    REGIONS ||--o{ REGIONS : parent_dari
    REGIONS ||--o{ USER_PROFILES : wilayah_utama
    USERS ||--o{ ADDRESSES : memiliki
    REGIONS ||--o{ ADDRESSES : mencakup
    USERS ||--o{ REGION_USER_ASSIGNMENTS : ditugaskan
    REGIONS ||--o{ REGION_USER_ASSIGNMENTS : yurisdiksi
    ROLES ||--o{ MODEL_HAS_ROLES : diberikan
    PERMISSIONS ||--o{ MODEL_HAS_PERMISSIONS : diberikan
    ROLES ||--o{ ROLE_HAS_PERMISSIONS : memiliki
    PERMISSIONS ||--o{ ROLE_HAS_PERMISSIONS : termasuk
    WASTE_CATEGORIES ||--o{ WASTE_TYPES : mengelompokkan
    USERS ||--o{ COLLECTION_REQUESTS : meminta
    REGIONS ||--o{ COLLECTION_REQUESTS : lokasi_wilayah
    ADDRESSES o|--o{ COLLECTION_REQUESTS : sumber_snapshot
    COLLECTION_REQUESTS ||--|{ COLLECTION_ITEMS : berisi
    WASTE_TYPES ||--o{ COLLECTION_ITEMS : bertipe
    USERS o|--o{ COLLECTION_ITEMS : memverifikasi
    COLLECTION_REQUESTS ||--o{ COLLECTION_PHOTOS : memiliki
    USERS ||--o{ COLLECTION_PHOTOS : mengunggah
    COLLECTION_REQUESTS ||--o{ COLLECTION_ASSIGNMENTS : ditugaskan
    USERS ||--o{ COLLECTION_ASSIGNMENTS : petugas
    COLLECTION_REQUESTS ||--o{ COLLECTION_STATUS_HISTORIES : riwayat
    USERS o|--o{ COLLECTION_STATUS_HISTORIES : aktor
```

Lokasi disimpan sebagai pasangan kolom desimal (WGS84/EPSG:4326): `regions.centroid_latitude`/`centroid_longitude`, `addresses.latitude`/`longitude`, dan `collection_requests.latitude`/`longitude`. Hanya ada satu representasi koordinat, sehingga tidak ada risiko desinkronisasi antar-representasi.

## Green Points, Estimasi Dampak, dan marketplace

```mermaid
erDiagram
    USERS {
        bigint id PK
    }
    WASTE_TYPES {
        bigint id PK
    }
    COLLECTION_REQUESTS {
        bigint id PK
    }
    COLLECTION_ITEMS {
        bigint id PK
        bigint collection_request_id FK
        bigint waste_type_id FK
        decimal verified_weight
    }
    POINT_RULES {
        bigint id PK
        bigint waste_type_id FK
        integer version
        decimal points_per_kg
        timestamp effective_from
        timestamp effective_to
    }
    POINT_ACCOUNTS {
        bigint id PK
        bigint user_id FK,UK
        bigint balance
    }
    POINT_TRANSACTIONS {
        bigint id PK
        bigint point_account_id FK
        bigint user_id FK
        string type
        bigint amount
        bigint balance_before
        bigint balance_after
        string reference_type
        bigint reference_id
        string idempotency_key UK
        bigint actor_id FK
    }
    ENVIRONMENTAL_FACTOR_SETS {
        bigint id PK
        string name
        integer version
        string source_name
        string source_url
        string status
        boolean is_demo
    }
    ENVIRONMENTAL_FACTORS {
        bigint id PK
        bigint environmental_factor_set_id FK
        bigint waste_type_id FK
        string impact_kind
        decimal factor_value
        string unit
    }
    IMPACT_CALCULATIONS {
        bigint id PK
        bigint collection_request_id FK,UK
        bigint environmental_factor_set_id FK
        decimal total_verified_weight
        decimal total_carbon_kg_co2e
        decimal total_recyclable_kg
        decimal total_energy_kwh
        json methodology_snapshot
    }
    IMPACT_CALCULATION_ITEMS {
        bigint id PK
        bigint impact_calculation_id FK
        bigint collection_item_id FK
        bigint waste_type_id FK
        decimal verified_weight
        json factor_snapshot
    }
    PRODUCT_CATEGORIES {
        bigint id PK
        string name
        string slug UK
    }
    PRODUCTS {
        bigint id PK
        bigint product_category_id FK
        bigint program_id FK
        string name
        bigint point_price
        integer stock
        boolean is_active
    }
    PRODUCT_IMAGES {
        bigint id PK
        bigint product_id FK
        string disk
        string path
    }
    REDEMPTIONS {
        bigint id PK
        bigint user_id FK
        bigint region_id FK
        string number UK
        bigint total_points
        string status
        string idempotency_key UK
        bigint point_transaction_id FK,UK
        bigint processed_by FK
    }
    REDEMPTION_ITEMS {
        bigint id PK
        bigint redemption_id FK
        bigint product_id FK
        string product_name
        bigint point_price
        integer quantity
        bigint subtotal_points
    }
    INVENTORY_MOVEMENTS {
        bigint id PK
        bigint product_id FK
        string type
        integer quantity
        integer stock_before
        integer stock_after
        string reference_type
        bigint reference_id
        bigint actor_id FK
    }

    WASTE_TYPES ||--o{ POINT_RULES : formula_poin
    USERS ||--|| POINT_ACCOUNTS : memiliki
    POINT_ACCOUNTS ||--o{ POINT_TRANSACTIONS : ledger
    USERS ||--o{ POINT_TRANSACTIONS : pemilik
    ENVIRONMENTAL_FACTOR_SETS ||--|{ ENVIRONMENTAL_FACTORS : berisi
    WASTE_TYPES ||--o{ ENVIRONMENTAL_FACTORS : memiliki_faktor
    COLLECTION_REQUESTS ||--o| IMPACT_CALCULATIONS : menghasilkan
    ENVIRONMENTAL_FACTOR_SETS ||--o{ IMPACT_CALCULATIONS : dipakai
    IMPACT_CALCULATIONS ||--|{ IMPACT_CALCULATION_ITEMS : merinci
    COLLECTION_ITEMS ||--o| IMPACT_CALCULATION_ITEMS : dihitung
    WASTE_TYPES ||--o{ IMPACT_CALCULATION_ITEMS : snapshot_jenis
    PRODUCT_CATEGORIES ||--o{ PRODUCTS : mengelompokkan
    PRODUCTS ||--o{ PRODUCT_IMAGES : memiliki
    USERS ||--o{ REDEMPTIONS : menukar
    REDEMPTIONS ||--|{ REDEMPTION_ITEMS : berisi
    PRODUCTS ||--o{ REDEMPTION_ITEMS : snapshot_produk
    POINT_TRANSACTIONS o|--o| REDEMPTIONS : mendebit
    PRODUCTS ||--o{ INVENTORY_MOVEMENTS : ledger_stok
```

`point_accounts.balance` dan `products.stock` adalah proyeksi cepat yang hanya boleh berubah bersama ledger dalam transaction dan row lock. Point transaction serta inventory movement tidak dihapus/diedit untuk menulis ulang sejarah.

## Edukasi dan program

```mermaid
erDiagram
    USERS {
        bigint id PK
    }
    REGIONS {
        bigint id PK
    }
    EDUCATION_CATEGORIES {
        bigint id PK
        string name
        string slug UK
    }
    EDUCATION_CONTENTS {
        bigint id PK
        bigint education_category_id FK
        bigint author_id FK
        bigint region_id FK
        string title
        string slug UK
        string status
        timestamp published_at
    }
    PROGRAMS {
        bigint id PK
        bigint region_id FK
        bigint manager_id FK
        string type
        string title
        string slug UK
        string status
        integer capacity
    }
    PROGRAM_SESSIONS {
        bigint id PK
        bigint program_id FK
        string title
        timestamp starts_at
        timestamp ends_at
    }
    PROGRAM_REGISTRATIONS {
        bigint id PK
        bigint program_id FK
        bigint user_id FK
        string status
        timestamp registered_at
    }
    PROGRAM_ATTENDANCES {
        bigint id PK
        bigint program_registration_id FK
        bigint program_session_id FK
        bigint recorded_by FK
        boolean is_present
    }
    PRODUCTS {
        bigint id PK
        bigint program_id FK
    }

    EDUCATION_CATEGORIES ||--o{ EDUCATION_CONTENTS : mengelompokkan
    USERS ||--o{ EDUCATION_CONTENTS : menulis
    REGIONS o|--o{ EDUCATION_CONTENTS : menargetkan
    REGIONS o|--o{ PROGRAMS : menaungi
    USERS o|--o{ PROGRAMS : mengelola
    PROGRAMS ||--o{ PROGRAM_SESSIONS : memiliki
    PROGRAMS ||--o{ PROGRAM_REGISTRATIONS : menerima
    USERS ||--o{ PROGRAM_REGISTRATIONS : mendaftar
    PROGRAM_REGISTRATIONS ||--o{ PROGRAM_ATTENDANCES : kehadiran
    PROGRAM_SESSIONS ||--o{ PROGRAM_ATTENDANCES : dicatat_pada
    USERS o|--o{ PROGRAM_ATTENDANCES : mencatat
    PROGRAMS o|--o{ PRODUCTS : menghasilkan
```

## Forum dan platform

```mermaid
erDiagram
    USERS {
        bigint id PK
    }
    REGIONS {
        bigint id PK
    }
    PROGRAMS {
        bigint id PK
    }
    FORUM_SPACES {
        bigint id PK
        bigint region_id FK
        bigint program_id FK
        string name
        string visibility
    }
    FORUM_THREADS {
        bigint id PK
        bigint forum_space_id FK
        bigint user_id FK
        string title
        string status
        boolean is_locked
        bigint moderated_by FK
    }
    FORUM_POSTS {
        bigint id PK
        bigint forum_thread_id FK
        bigint user_id FK
        bigint parent_id FK
        string status
        bigint moderated_by FK
    }
    CONTENT_REPORTS {
        bigint id PK
        bigint reporter_id FK
        string reportable_type
        bigint reportable_id
        string reason
        string status
        bigint reviewed_by FK
    }
    NOTIFICATIONS {
        uuid id PK
        string notifiable_type
        bigint notifiable_id
        string type
        text data
        timestamp read_at
    }
    AUDIT_LOGS {
        bigint id PK
        bigint actor_id FK
        string event
        string auditable_type
        bigint auditable_id
        json before
        json after
        json metadata
        timestamp created_at
    }
    SITE_SETTINGS {
        bigint id PK
        string key UK
        json value
        string group
        boolean is_public
        bigint updated_by FK
    }

    REGIONS o|--o{ FORUM_SPACES : membatasi
    PROGRAMS o|--o{ FORUM_SPACES : membatasi
    FORUM_SPACES ||--o{ FORUM_THREADS : berisi
    USERS ||--o{ FORUM_THREADS : membuat
    FORUM_THREADS ||--o{ FORUM_POSTS : berisi
    FORUM_POSTS o|--o{ FORUM_POSTS : balasan
    USERS ||--o{ FORUM_POSTS : menulis
    USERS ||--o{ CONTENT_REPORTS : melaporkan
    USERS o|--o{ AUDIT_LOGS : bertindak
    USERS o|--o{ SITE_SETTINGS : memperbarui
```

`CONTENT_REPORTS`, `NOTIFICATIONS`, dan `AUDIT_LOGS` memakai relasi polymorphic sehingga garis ke setiap target potensial tidak digambar. Application policy wajib memvalidasi tipe target yang diizinkan; `*_type` dari input pengguna tidak boleh dipercaya langsung.

## Constraint penting dan gap schema

- Request, point transaction, dan redemption memiliki unique idempotency key; satu request hanya boleh memiliki satu `impact_calculation`.
- Historical snapshot tersedia pada alamat pengumpulan, faktor/metodologi, dan item redemption.
- Factor set menyimpan sumber, versi, tanggal berlaku, status, dan flag demo. Brief juga meminta cakupan/wilayah eksplisit; field itu belum tampak pada migration baseline dan harus diselesaikan sebelum klaim metodologi production.
- Status saat ini berupa string dan dipetakan ke PHP enum. Validitas transisi tetap harus ditegakkan di service/state machine; schema string saja tidak cukup.
- Tidak ada tipe atau index spasial pada schema; seluruh query lokasi memakai kolom desimal dan divalidasi pada MySQL yang sama dengan production.
