<?php

namespace Database\Seeders;

use App\Enums\CollectionMethod;
use App\Enums\CollectionStatus;
use App\Enums\ContentStatus;
use App\Enums\FactorSetStatus;
use App\Enums\InventoryMovementType;
use App\Enums\PointTransactionType;
use App\Enums\ProgramStatus;
use App\Enums\ProgramType;
use App\Enums\RegionLevel;
use App\Enums\RoleName;
use App\Models\Address;
use App\Models\CollectionAssignment;
use App\Models\CollectionRequest;
use App\Models\EducationCategory;
use App\Models\EducationContent;
use App\Models\EnvironmentalFactor;
use App\Models\EnvironmentalFactorSet;
use App\Models\ForumSpace;
use App\Models\InventoryMovement;
use App\Models\PointAccount;
use App\Models\PointRule;
use App\Models\PointTransaction;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\Program;
use App\Models\Region;
use App\Models\RegionUserAssignment;
use App\Models\SiteSetting;
use App\Models\User;
use App\Models\UserProfile;
use App\Models\WasteCategory;
use App\Models\WasteType;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use LogicException;

class DemoDataSeeder extends Seeder
{
    public function run(): void
    {
        if (app()->environment('production')) {
            throw new LogicException('DemoDataSeeder dilarang berjalan di production.');
        }

        if (! app()->environment(['local', 'testing']) || ! config('ecovillage.demo_accounts_enabled')) {
            throw new LogicException('Aktifkan DEMO_ACCOUNTS_ENABLED hanya pada environment local/testing.');
        }

        DB::transaction(function (): void {
            $password = Hash::make((string) config('ecovillage.demo_password'));

            $users = [
                RoleName::SuperAdmin->value => User::factory()->create([
                    'name' => 'Admin EcoVillage Demo',
                    'email' => 'admin@gmail.com',
                    'password' => $password,
                ]),
                RoleName::ProgramManager->value => User::factory()->create([
                    'name' => 'Pengelola Lesanpuro Demo',
                    'email' => 'pengelola@gmail.com',
                    'password' => $password,
                ]),
                RoleName::Officer->value => User::factory()->create([
                    'name' => 'Kader',
                    'email' => 'kader@gmail.com',
                    'password' => $password,
                ]),
                RoleName::Citizen->value => User::factory()->create([
                    'name' => 'Warga',
                    'email' => 'warga@gmail.com',
                    'password' => $password,
                ]),
            ];

            $users[RoleName::SuperAdmin->value]->assignRole(RoleName::SuperAdmin->value);
            $users[RoleName::ProgramManager->value]->assignRole(RoleName::ProgramManager->value);
            $users[RoleName::Officer->value]->assignRole(RoleName::Officer->value);
            $users[RoleName::Citizen->value]->assignRole(RoleName::Citizen->value);

            $lesanpuro = Region::query()->create([
                'level' => RegionLevel::Village,
                'code' => 'LESANPURO',
                'name' => 'Kelurahan Lesanpuro',
                'slug' => 'lesanpuro',
                'centroid_latitude' => -7.9815000,
                'centroid_longitude' => 112.6720000,
            ]);
            $rw08 = Region::query()->create([
                'parent_id' => $lesanpuro->id,
                'level' => RegionLevel::Rw,
                'code' => 'RW08',
                'name' => 'RW 08',
                'slug' => 'rw-08',
            ]);
            $rt01 = Region::query()->create([
                'parent_id' => $rw08->id,
                'level' => RegionLevel::Rt,
                'code' => 'RT01',
                'name' => 'RT 01',
                'slug' => 'rt-01',
            ]);
            $rt02 = Region::query()->create([
                'parent_id' => $rw08->id,
                'level' => RegionLevel::Rt,
                'code' => 'RT02',
                'name' => 'RT 02',
                'slug' => 'rt-02',
            ]);

            Region::query()->create([
                'level' => RegionLevel::Village,
                'code' => 'WILAYAH-DEMO-LAIN',
                'name' => 'Kelurahan Demo Lain',
                'slug' => 'kelurahan-demo-lain',
            ]);

            foreach ($users as $key => $user) {
                $primaryRegion = $key === RoleName::Citizen->value ? $rt01 : $rw08;

                UserProfile::query()->create([
                    'user_id' => $user->id,
                    'primary_region_id' => $primaryRegion->id,
                    'preferred_locale' => 'id',
                ]);
                PointAccount::query()->create(['user_id' => $user->id, 'balance' => 0]);
            }

            foreach ([
                [$users[RoleName::ProgramManager->value], RoleName::ProgramManager->value],
                [$users[RoleName::Officer->value], RoleName::Officer->value],
            ] as [$user, $assignmentType]) {
                RegionUserAssignment::query()->create([
                    'user_id' => $user->id,
                    'region_id' => $rw08->id,
                    'assignment_type' => $assignmentType,
                ]);
            }

            $citizenAddress = Address::query()->create([
                'user_id' => $users[RoleName::Citizen->value]->id,
                'region_id' => $rt01->id,
                'label' => 'Rumah',
                'address_line' => 'Jalan Demo Hijau No. 1',
                'postal_code' => '65138',
                'latitude' => -7.9817000,
                'longitude' => 112.6718000,
                'location_consent_at' => now(),
                'is_primary' => true,
            ]);
            $secondaryCitizenAddress = Address::query()->create([
                'user_id' => $users[RoleName::Citizen->value]->id,
                'region_id' => $rt02->id,
                'label' => 'Rumah',
                'address_line' => 'Jalan Demo Lestari No. 2',
                'postal_code' => '65138',
                'latitude' => -7.9821000,
                'longitude' => 112.6722000,
                'location_consent_at' => now(),
                'is_primary' => false,
            ]);

            $organic = WasteCategory::query()->create([
                'name' => 'Organik', 'slug' => 'organik', 'description' => 'Sampah mudah terurai.', 'sort_order' => 1,
            ]);
            $inorganic = WasteCategory::query()->create([
                'name' => 'Anorganik', 'slug' => 'anorganik', 'description' => 'Sampah yang dapat dipilah untuk daur ulang.', 'sort_order' => 2,
            ]);
            $hazardous = WasteCategory::query()->create([
                'name' => 'B3 Rumah Tangga', 'slug' => 'b3-rumah-tangga',
                'description' => 'Memerlukan rujukan petugas berwenang.', 'is_hazardous' => true, 'sort_order' => 3,
            ]);

            $leaves = WasteType::query()->create([
                'waste_category_id' => $organic->id, 'name' => 'Daun dan Sisa Kebun',
                'slug' => 'daun-dan-sisa-kebun', 'description' => 'Bahan organik untuk program EcoPore.',
            ]);
            $pet = WasteType::query()->create([
                'waste_category_id' => $inorganic->id, 'name' => 'Botol Plastik PET',
                'slug' => 'botol-plastik-pet', 'description' => 'Botol PET yang bersih dan kering.',
            ]);
            $battery = WasteType::query()->create([
                'waste_category_id' => $hazardous->id, 'name' => 'Baterai Bekas',
                'slug' => 'baterai-bekas', 'handling_notes' => 'Hubungi pengelola untuk rujukan mitra resmi.',
            ]);

            foreach ([[$leaves, 10], [$pet, 25], [$battery, 0]] as [$wasteType, $points]) {
                PointRule::query()->create([
                    'waste_type_id' => $wasteType->id,
                    'version' => 1,
                    'points_per_kg' => $points,
                    'effective_from' => now()->startOfYear(),
                    'is_active' => true,
                ]);
            }

            $factorSet = EnvironmentalFactorSet::query()->create([
                'region_id' => $rw08->id,
                'name' => 'DEMO - TIDAK UNTUK KLAIM ILMIAH',
                'version' => 1,
                'source_name' => 'Data sintetis pengembangan',
                'effective_from' => now()->startOfYear(),
                'methodology_notes' => 'Faktor hanya untuk menguji alur perangkat lunak.',
                'scope_notes' => 'Seed sintetis khusus pilot Lesanpuro RW 08.',
                'status' => FactorSetStatus::Active,
                'is_demo' => true,
            ]);

            foreach ([
                [$leaves, 0.20, 0.00, 0.10],
                [$pet, 0.45, 0.80, 1.20],
                [$battery, 0.00, 0.00, 0.00],
            ] as [$wasteType, $carbon, $recyclable, $energy]) {
                foreach ([
                    [EnvironmentalFactor::CARBON, $carbon, 'kg CO2e/kg'],
                    [EnvironmentalFactor::RECYCLABLE, $recyclable, 'kg/kg'],
                    [EnvironmentalFactor::ENERGY, $energy, 'kWh/kg'],
                ] as [$kind, $value, $unit]) {
                    EnvironmentalFactor::query()->create([
                        'environmental_factor_set_id' => $factorSet->id,
                        'waste_type_id' => $wasteType->id,
                        'impact_kind' => $kind,
                        'factor_value' => $value,
                        'unit' => $unit,
                        'notes' => 'DEMO - bukan faktor ilmiah tervalidasi.',
                    ]);
                }
            }

            $firstRequest = CollectionRequest::query()->create([
                'requester_id' => $users[RoleName::Citizen->value]->id,
                'region_id' => $rt01->id,
                'address_id' => $citizenAddress->id,
                'request_number' => 'EV-20260803-0001',
                'address_snapshot' => ['label' => 'Rumah', 'address_line' => 'Jalan Demo Hijau No. 1'],
                'method' => CollectionMethod::Pickup,
                'status' => CollectionStatus::Submitted,
                'desired_at' => now()->addDays(2),
                'submitted_at' => now(),
            ]);
            $firstRequest->items()->createMany([
                ['waste_type_id' => $leaves->id, 'estimated_weight' => 5.5],
                ['waste_type_id' => $pet->id, 'estimated_weight' => 2.0],
            ]);
            $firstRequest->statusHistories()->create([
                'from_status' => null,
                'to_status' => CollectionStatus::Submitted,
                'actor_id' => $users[RoleName::Citizen->value]->id,
            ]);

            $assignedRequest = CollectionRequest::query()->create([
                'requester_id' => $users[RoleName::Citizen->value]->id,
                'region_id' => $rt02->id,
                'address_id' => $secondaryCitizenAddress->id,
                'request_number' => 'EV-20260803-0002',
                'address_snapshot' => ['label' => 'Rumah', 'address_line' => 'Jalan Demo Lestari No. 2'],
                'method' => CollectionMethod::Pickup,
                'status' => CollectionStatus::Assigned,
                'desired_at' => now()->addDay(),
                'submitted_at' => now()->subHour(),
            ]);
            $assignedRequest->items()->create(['waste_type_id' => $pet->id, 'estimated_weight' => 3.0]);
            CollectionAssignment::query()->create([
                'collection_request_id' => $assignedRequest->id,
                'assignee_id' => $users[RoleName::Officer->value]->id,
                'assigned_by' => $users[RoleName::ProgramManager->value]->id,
                'assigned_at' => now(),
            ]);

            $educationCategory = EducationCategory::query()->create([
                'name' => 'Pemilahan Sampah', 'slug' => 'pemilahan-sampah',
            ]);
            EducationContent::query()->create([
                'education_category_id' => $educationCategory->id,
                'author_id' => $users[RoleName::ProgramManager->value]->id,
                'region_id' => $rw08->id,
                'title' => 'Panduan Dasar Pemilahan Sampah',
                'slug' => 'panduan-dasar-pemilahan-sampah',
                'excerpt' => 'Materi demo untuk membedakan kategori sampah.',
                'body' => 'Pisahkan sampah sesuai kategori dan ikuti arahan keselamatan yang ditetapkan pengelola.',
                'status' => ContentStatus::Published,
                'published_at' => now(),
            ]);

            $ecoPore = Program::query()->create([
                'region_id' => $rw08->id,
                'manager_id' => $users[RoleName::ProgramManager->value]->id,
                'type' => ProgramType::EcoPore,
                'title' => 'Pelatihan EcoPore RW 08',
                'slug' => 'pelatihan-ecopore-rw-08',
                'description' => 'Pelatihan sintetis pengolahan organik berbasis biopori.',
                'capacity' => 30,
                'registration_starts_at' => now()->subDay(),
                'registration_ends_at' => now()->addWeek(),
                'starts_at' => now()->addWeeks(2),
                'status' => ProgramStatus::RegistrationOpen,
            ]);
            $ecoCycle = Program::query()->create([
                'region_id' => $rw08->id,
                'manager_id' => $users[RoleName::ProgramManager->value]->id,
                'type' => ProgramType::EcoCycle,
                'title' => 'Lokakarya EcoCycle RW 08',
                'slug' => 'lokakarya-ecocycle-rw-08',
                'description' => 'Lokakarya sintetis pemanfaatan anorganik.',
                'capacity' => 25,
                'starts_at' => now()->addWeeks(3),
                'status' => ProgramStatus::Published,
            ]);

            $productCategory = ProductCategory::query()->create([
                'name' => 'Produk Program', 'slug' => 'produk-program',
            ]);
            $compost = Product::query()->create([
                'product_category_id' => $productCategory->id,
                'program_id' => $ecoPore->id,
                'name' => 'Kompos EcoPore Demo',
                'slug' => 'kompos-ecopore-demo',
                'description' => 'Produk demo untuk pengujian penukaran poin.',
                'point_price' => 250,
                'stock' => 20,
            ]);
            Product::query()->create([
                'product_category_id' => $productCategory->id,
                'program_id' => $ecoCycle->id,
                'name' => 'Tas Daur Ulang Demo',
                'slug' => 'tas-daur-ulang-demo',
                'description' => 'Produk demo EcoCycle.',
                'point_price' => 400,
                'stock' => 10,
            ]);
            InventoryMovement::query()->create([
                'product_id' => $compost->id,
                'type' => InventoryMovementType::Initial,
                'quantity' => 20,
                'stock_before' => 0,
                'stock_after' => 20,
                'actor_id' => $users[RoleName::ProgramManager->value]->id,
                'reason' => 'Stok awal data demo.',
                'occurred_at' => now(),
            ]);

            $citizenAccount = PointAccount::query()
                ->where('user_id', $users[RoleName::Citizen->value]->id)
                ->lockForUpdate()
                ->firstOrFail();
            $citizenAccount->update(['balance' => 1000]);
            PointTransaction::query()->create([
                'point_account_id' => $citizenAccount->id,
                'user_id' => $citizenAccount->user_id,
                'type' => PointTransactionType::Adjustment,
                'amount' => 1000,
                'balance_before' => 0,
                'balance_after' => 1000,
                'idempotency_key' => 'demo-opening-balance-'.$citizenAccount->user_id,
                'reason' => 'Saldo sintetis untuk demonstrasi lokal.',
                'actor_id' => $users[RoleName::SuperAdmin->value]->id,
                'occurred_at' => now(),
            ]);

            ForumSpace::query()->create([
                'region_id' => $rw08->id,
                'name' => 'Komunitas RW 08',
                'slug' => 'komunitas-rw-08',
                'description' => 'Ruang diskusi demo bagi warga RW 08.',
                'visibility' => 'region',
            ]);

            // SiteContentSeeder sudah menanam key katalog ini lebih dulu, jadi
            // demo hanya menimpa nilainya. `create()` di sini akan melanggar
            // unique index `site_settings.key` dan menggagalkan seluruh seed.
            SiteSetting::query()->updateOrCreate(
                ['key' => 'impact_disclaimer'],
                [
                    'value' => ['id' => 'Estimasi dampak bukan LCA penuh dan tidak untuk klaim ilmiah.'],
                    'type' => 'localized_text',
                    'group' => 'impact',
                    'is_public' => true,
                    'updated_by' => $users[RoleName::SuperAdmin->value]->id,
                ],
            );

            foreach ([
                'landing_hero_lead' => 'Aksi lingkungan warga,',
                'landing_hero_highlight' => 'tercatat dan bertumbuh',
                'landing_hero_suffix' => 'bersama.',
                'landing_hero_subtitle' => 'Kelola pengumpulan sampah, pantau Green Points, ikuti EcoPore dan EcoCycle, serta pahami estimasi dampak dalam satu platform komunitas.',
            ] as $key => $value) {
                SiteSetting::query()->updateOrCreate(
                    ['key' => $key],
                    [
                        'value' => ['id' => $value],
                        'type' => 'localized_text',
                        'group' => 'landing',
                        'is_public' => true,
                        'updated_by' => $users[RoleName::SuperAdmin->value]->id,
                    ],
                );
            }

        });
    }
}
