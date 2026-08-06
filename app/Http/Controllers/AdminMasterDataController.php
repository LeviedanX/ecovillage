<?php

namespace App\Http\Controllers;

use App\Enums\ContentStatus;
use App\Enums\FactorSetStatus;
use App\Enums\InventoryMovementType;
use App\Enums\ProgramStatus;
use App\Enums\ProgramType;
use App\Enums\RegionLevel;
use App\Enums\RoleName;
use App\Models\AuditLog;
use App\Models\EducationCategory;
use App\Models\EducationContent;
use App\Models\EnvironmentalFactor;
use App\Models\EnvironmentalFactorSet;
use App\Models\InventoryMovement;
use App\Models\PointRule;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\Program;
use App\Models\ProgramAttendance;
use App\Models\ProgramRegistration;
use App\Models\ProgramSession;
use App\Models\Redemption;
use App\Models\Region;
use App\Models\User;
use App\Models\WasteCategory;
use App\Models\WasteType;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class AdminMasterDataController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $abilities = [
            'regionsManage' => $user->can('regions.manage'),
            'wasteManage' => $user->can('waste.manage'),
            'factorsManage' => $user->can('factors.manage'),
            'educationManage' => $user->can('education.manage'),
            'programsManage' => $user->can('programs.manage'),
            'productsManage' => $user->can('products.manage'),
            'redemptionsProcess' => $user->can('redemptions.process'),
            'auditView' => $user->can('audit.view'),
        ];
        if (array_filter($abilities, static fn (bool $allowed): bool => $allowed) === []) {
            abort(403);
        }

        $isSuperAdmin = $user->hasRole(RoleName::SuperAdmin->value);
        $regionIds = $isSuperAdmin ? null : $user->accessibleRegionIds();
        $regions = Region::query()
            ->when($regionIds !== null, fn (Builder $query) => $query->whereIn('id', $regionIds))
            ->orderByRaw("CASE level WHEN 'village' THEN 1 WHEN 'rw' THEN 2 ELSE 3 END")
            ->orderBy('name')
            ->get();

        $educationContents = EducationContent::query()
            ->with(['category:id,name', 'author:id,name', 'region:id,name'])
            ->when(! $isSuperAdmin, fn (Builder $query) => $query->whereIn('region_id', $regionIds ?? []))
            ->latest()
            ->limit(100)
            ->get();
        $programs = Program::query()
            ->with([
                'region:id,name',
                'manager:id,name',
                'sessions' => fn ($query) => $query->orderBy('starts_at'),
                'registrations.user:id,name',
                'registrations.attendances',
            ])
            ->when(! $isSuperAdmin, fn (Builder $query) => $query->whereIn('region_id', $regionIds ?? []))
            ->latest('starts_at')
            ->limit(100)
            ->get();
        $products = Product::query()
            ->with(['category:id,name', 'program:id,title,region_id'])
            ->when(! $isSuperAdmin, fn (Builder $query) => $query
                ->whereHas('program', fn (Builder $program) => $program->whereIn('region_id', $regionIds ?? [])))
            ->orderBy('name')
            ->limit(100)
            ->get();
        $redemptions = Redemption::query()
            ->with(['user:id,name', 'items:id,redemption_id,product_name,point_price,quantity,subtotal_points'])
            ->when(! $isSuperAdmin, fn (Builder $query) => $query->whereIn('region_id', $regionIds ?? []))
            ->latest()
            ->limit(100)
            ->get();

        return Inertia::render('admin/master-data', [
            'abilities' => $abilities,
            'regions' => $regions,
            'staffUsers' => User::query()
                ->select(['users.id', 'users.name'])
                ->whereHas('roles', fn (Builder $role) => $role->whereIn('name', [
                    RoleName::ProgramManager->value,
                    RoleName::SuperAdmin->value,
                ]))
                ->when(! $isSuperAdmin, fn (Builder $query) => $query->whereHas(
                    'assignedRegions',
                    fn (Builder $assignment) => $assignment->whereIn('regions.id', $regionIds ?? []),
                ))
                ->orderBy('name')
                ->get(),
            'wasteCategories' => $abilities['wasteManage']
                ? WasteCategory::query()->with('wasteTypes')->orderBy('sort_order')->orderBy('name')->get()
                : [],
            'wasteTypes' => $abilities['wasteManage'] || $abilities['factorsManage']
                ? WasteType::query()->with('category:id,name')->orderBy('name')->get()
                : [],
            'pointRules' => $abilities['factorsManage']
                ? PointRule::query()->with('wasteType:id,name')->latest('effective_from')->limit(100)->get()
                : [],
            'factorSets' => $abilities['factorsManage']
                ? EnvironmentalFactorSet::query()
                    ->with(['region:id,name', 'factors.wasteType:id,name'])
                    ->latest('effective_from')
                    ->limit(100)
                    ->get()
                : [],
            'educationCategories' => $abilities['educationManage']
                ? EducationCategory::query()->orderBy('name')->get()
                : [],
            'educationContents' => $abilities['educationManage'] ? $educationContents : [],
            'programs' => $abilities['programsManage'] ? $programs : [],
            'productCategories' => $abilities['productsManage']
                ? ProductCategory::query()->orderBy('name')->get()
                : [],
            'products' => $abilities['productsManage'] ? $products : [],
            'redemptions' => $abilities['redemptionsProcess'] ? $redemptions : [],
            'auditLogs' => $abilities['auditView']
                ? AuditLog::query()->with('actor:id,name')->latest('id')->limit(100)->get()
                : [],
        ]);
    }

    public function storeRegion(Request $request): RedirectResponse
    {
        $this->requirePermission($request, 'regions.manage');
        $data = $this->validateRegion($request);
        $region = Region::query()->create($data);
        $this->recordMutation($request, 'region.created', $region, [], $region->only(array_keys($data)));

        return back()->with('success', 'Wilayah berhasil dibuat.');
    }

    public function updateRegion(Request $request, Region $region): RedirectResponse
    {
        $this->requirePermission($request, 'regions.manage');
        $data = $this->validateRegion($request, $region);
        $before = $region->only(array_keys($data));
        $region->update($data);
        $this->recordMutation($request, 'region.updated', $region, $before, $region->only(array_keys($data)));

        return back()->with('success', 'Wilayah berhasil diperbarui.');
    }

    public function storeWasteCategory(Request $request): RedirectResponse
    {
        $this->requirePermission($request, 'waste.manage');
        $data = $this->validateWasteCategory($request);
        $category = WasteCategory::query()->create($data);
        $this->recordMutation($request, 'waste-category.created', $category, [], $data);

        return back()->with('success', 'Kategori sampah dibuat.');
    }

    public function updateWasteCategory(Request $request, WasteCategory $wasteCategory): RedirectResponse
    {
        $this->requirePermission($request, 'waste.manage');
        $data = $this->validateWasteCategory($request, $wasteCategory);
        $before = $wasteCategory->only(array_keys($data));
        $wasteCategory->update($data);
        $this->recordMutation($request, 'waste-category.updated', $wasteCategory, $before, $data);

        return back()->with('success', 'Kategori sampah diperbarui.');
    }

    public function storeWasteType(Request $request): RedirectResponse
    {
        $this->requirePermission($request, 'waste.manage');
        $data = $this->validateWasteType($request);
        $wasteType = WasteType::query()->create($data);
        $this->recordMutation($request, 'waste-type.created', $wasteType, [], $data);

        return back()->with('success', 'Jenis sampah dibuat.');
    }

    public function updateWasteType(Request $request, WasteType $wasteType): RedirectResponse
    {
        $this->requirePermission($request, 'waste.manage');
        $data = $this->validateWasteType($request, $wasteType);
        $before = $wasteType->only(array_keys($data));
        $wasteType->update($data);
        $this->recordMutation($request, 'waste-type.updated', $wasteType, $before, $data);

        return back()->with('success', 'Jenis sampah diperbarui.');
    }

    public function storePointRule(Request $request): RedirectResponse
    {
        $this->requirePermission($request, 'factors.manage');
        $data = $request->validate([
            'waste_type_id' => ['required', 'integer', 'exists:waste_types,id'],
            'version' => ['required', 'integer', 'min:1', 'max:100000', Rule::unique('point_rules')->where(
                fn ($query) => $query->where('waste_type_id', $request->integer('waste_type_id')),
            )],
            'points_per_kg' => ['required', 'decimal:0,4', 'min:0', 'max:1000000'],
            'effective_from' => ['required', 'date'],
            'effective_to' => ['nullable', 'date', 'after:effective_from'],
            'is_active' => ['sometimes', 'boolean'],
        ]);
        $data['is_active'] = $request->boolean('is_active', true);
        $this->preventPointRuleOverlap($data);
        $rule = PointRule::query()->create($data);
        $this->recordMutation($request, 'point-rule.created', $rule, [], $data);

        return back()->with('success', 'Versi aturan Green Points dibuat tanpa mengubah histori lama.');
    }

    public function storeFactorSet(Request $request): RedirectResponse
    {
        $this->requirePermission($request, 'factors.manage');
        $data = $this->validateFactorSet($request);
        if ($data['status'] !== FactorSetStatus::Draft->value) {
            throw ValidationException::withMessages(['status' => 'Factor set baru harus disimpan sebagai draft sebelum faktor dilengkapi.']);
        }
        $set = EnvironmentalFactorSet::query()->create($data);
        $this->recordMutation($request, 'factor-set.created', $set, [], $data);

        return back()->with('success', 'Draft factor set dibuat. Lengkapi seluruh faktor sebelum aktivasi.');
    }

    public function updateFactorSet(Request $request, EnvironmentalFactorSet $factorSet): RedirectResponse
    {
        $this->requirePermission($request, 'factors.manage');
        $data = $this->validateFactorSet($request, $factorSet);
        $nextStatus = FactorSetStatus::from($data['status']);
        if ($factorSet->status === FactorSetStatus::Active && $nextStatus === FactorSetStatus::Draft) {
            throw ValidationException::withMessages(['status' => 'Factor set aktif hanya dapat diarsipkan, bukan dikembalikan menjadi draft.']);
        }
        if ($nextStatus === FactorSetStatus::Active) {
            $this->ensureFactorSetComplete($factorSet);
            $this->preventFactorSetOverlap($factorSet, $data);
        }
        $before = $factorSet->only(array_keys($data));
        $factorSet->update($data);
        $this->recordMutation($request, 'factor-set.updated', $factorSet, $before, $data);

        return back()->with('success', 'Factor set diperbarui.');
    }

    public function storeEnvironmentalFactor(Request $request): RedirectResponse
    {
        $this->requirePermission($request, 'factors.manage');
        $data = $this->validateEnvironmentalFactor($request);
        $set = EnvironmentalFactorSet::query()
            ->whereKey((int) $data['environmental_factor_set_id'])
            ->firstOrFail();
        $this->ensureDraftFactorSet($set);
        $factor = EnvironmentalFactor::query()->create($data);
        $this->recordMutation($request, 'environmental-factor.created', $factor, [], $data);

        return back()->with('success', 'Faktor dampak ditambahkan ke draft.');
    }

    public function updateEnvironmentalFactor(Request $request, EnvironmentalFactor $environmentalFactor): RedirectResponse
    {
        $this->requirePermission($request, 'factors.manage');
        $this->ensureDraftFactorSet($environmentalFactor->factorSet);
        $data = $this->validateEnvironmentalFactor($request, $environmentalFactor);
        abort_unless((int) $data['environmental_factor_set_id'] === $environmentalFactor->environmental_factor_set_id, 422);
        $before = $environmentalFactor->only(array_keys($data));
        $environmentalFactor->update($data);
        $this->recordMutation($request, 'environmental-factor.updated', $environmentalFactor, $before, $data);

        return back()->with('success', 'Faktor dampak draft diperbarui.');
    }

    public function storeEducationCategory(Request $request): RedirectResponse
    {
        $this->requirePermission($request, 'education.manage');
        $data = $this->validateNamedCategory($request, 'education_categories');
        $category = EducationCategory::query()->create($data);
        $this->recordMutation($request, 'education-category.created', $category, [], $data);

        return back()->with('success', 'Kategori edukasi dibuat.');
    }

    public function updateEducationCategory(Request $request, EducationCategory $educationCategory): RedirectResponse
    {
        $this->requirePermission($request, 'education.manage');
        $data = $this->validateNamedCategory($request, 'education_categories', $educationCategory->id);
        $before = $educationCategory->only(array_keys($data));
        $educationCategory->update($data);
        $this->recordMutation($request, 'education-category.updated', $educationCategory, $before, $data);

        return back()->with('success', 'Kategori edukasi diperbarui.');
    }

    public function storeEducation(Request $request): RedirectResponse
    {
        $this->requirePermission($request, 'education.manage');
        $data = $this->validateEducation($request);
        $this->ensureRegionScope($request->user(), $data['region_id']);
        $data['author_id'] = $request->user()->id;
        $content = EducationContent::query()->create($data);
        $this->recordMutation($request, 'education-content.created', $content, [], $data);

        return back()->with('success', 'Materi edukasi dibuat.');
    }

    public function updateEducation(Request $request, EducationContent $education): RedirectResponse
    {
        $this->requirePermission($request, 'education.manage');
        $this->ensureRegionScope($request->user(), $education->region_id);
        $data = $this->validateEducation($request, $education);
        $this->ensureRegionScope($request->user(), $data['region_id']);
        $before = $education->only(array_keys($data));
        $education->update($data);
        $this->recordMutation($request, 'education-content.updated', $education, $before, $data);

        return back()->with('success', 'Materi edukasi diperbarui.');
    }

    public function storeProgram(Request $request): RedirectResponse
    {
        $this->requirePermission($request, 'programs.manage');
        $data = $this->validateProgram($request);
        $this->ensureRegionScope($request->user(), $data['region_id']);
        $program = Program::query()->create($data);
        $this->recordMutation($request, 'program.created', $program, [], $data);

        return back()->with('success', 'Program berhasil dibuat.');
    }

    public function updateProgram(Request $request, Program $program): RedirectResponse
    {
        $this->requirePermission($request, 'programs.manage');
        $this->ensureRegionScope($request->user(), $program->region_id);
        $data = $this->validateProgram($request, $program);
        $this->ensureRegionScope($request->user(), $data['region_id']);
        $before = $program->only(array_keys($data));
        $program->update($data);
        $this->recordMutation($request, 'program.updated', $program, $before, $data);

        return back()->with('success', 'Program diperbarui.');
    }

    public function storeProgramSession(Request $request): RedirectResponse
    {
        $this->requirePermission($request, 'programs.manage');
        $data = $this->validateProgramSession($request);
        $program = Program::query()
            ->with('region')
            ->whereKey((int) $data['program_id'])
            ->firstOrFail();
        $this->ensureRegionScope($request->user(), $program->region_id);
        $session = ProgramSession::query()->create($data);
        $this->recordMutation($request, 'program-session.created', $session, [], $data);

        return back()->with('success', 'Sesi program dibuat.');
    }

    public function updateProgramSession(Request $request, ProgramSession $programSession): RedirectResponse
    {
        $this->requirePermission($request, 'programs.manage');
        $this->ensureRegionScope($request->user(), $programSession->program->region_id);
        $data = $this->validateProgramSession($request, $programSession);
        abort_unless((int) $data['program_id'] === $programSession->program_id, 422);
        $before = $programSession->only(array_keys($data));
        $programSession->update($data);
        $this->recordMutation($request, 'program-session.updated', $programSession, $before, $data);

        return back()->with('success', 'Sesi program diperbarui.');
    }

    public function storeProgramAttendance(Request $request): RedirectResponse
    {
        $this->requirePermission($request, 'programs.manage');
        $data = $this->validateAttendance($request);
        $registration = ProgramRegistration::query()
            ->with('program.region')
            ->whereKey((int) $data['program_registration_id'])
            ->firstOrFail();
        $this->ensureRegionScope($request->user(), $registration->program->region_id);
        $this->ensureAttendanceProgramMatches($data);
        $data['recorded_by'] = $request->user()->id;
        $attendance = ProgramAttendance::query()->updateOrCreate(
            [
                'program_registration_id' => $data['program_registration_id'],
                'program_session_id' => $data['program_session_id'],
            ],
            $data,
        );
        $this->recordMutation($request, 'program-attendance.recorded', $attendance, [], $data);

        return back()->with('success', 'Kehadiran peserta dicatat.');
    }

    public function updateProgramAttendance(Request $request, ProgramAttendance $programAttendance): RedirectResponse
    {
        $this->requirePermission($request, 'programs.manage');
        $programAttendance->load('registration.program.region');
        $this->ensureRegionScope($request->user(), $programAttendance->registration->program->region_id);
        $data = $this->validateAttendance($request);
        $this->ensureAttendanceProgramMatches($data);
        abort_unless(
            (int) $data['program_registration_id'] === $programAttendance->program_registration_id
            && (int) $data['program_session_id'] === $programAttendance->program_session_id,
            422,
        );
        $data['recorded_by'] = $request->user()->id;
        $before = $programAttendance->only(array_keys($data));
        $programAttendance->update($data);
        $this->recordMutation($request, 'program-attendance.updated', $programAttendance, $before, $data);

        return back()->with('success', 'Kehadiran peserta diperbarui.');
    }

    public function storeProductCategory(Request $request): RedirectResponse
    {
        $this->requirePermission($request, 'products.manage');
        $data = $this->validateNamedCategory($request, 'product_categories');
        $category = ProductCategory::query()->create($data);
        $this->recordMutation($request, 'product-category.created', $category, [], $data);

        return back()->with('success', 'Kategori produk dibuat.');
    }

    public function updateProductCategory(Request $request, ProductCategory $productCategory): RedirectResponse
    {
        $this->requirePermission($request, 'products.manage');
        $data = $this->validateNamedCategory($request, 'product_categories', $productCategory->id);
        $before = $productCategory->only(array_keys($data));
        $productCategory->update($data);
        $this->recordMutation($request, 'product-category.updated', $productCategory, $before, $data);

        return back()->with('success', 'Kategori produk diperbarui.');
    }

    public function storeProduct(Request $request): RedirectResponse
    {
        $this->requirePermission($request, 'products.manage');
        $data = $this->validateProduct($request);
        $initialStock = $request->validate(['initial_stock' => ['required', 'integer', 'min:0', 'max:1000000']])['initial_stock'];
        $this->ensureProgramScope($request->user(), $data['program_id']);

        DB::transaction(function () use ($request, $data, $initialStock): void {
            $product = Product::query()->create([...$data, 'stock' => $initialStock]);
            if ((int) $initialStock > 0) {
                InventoryMovement::query()->create([
                    'product_id' => $product->id,
                    'type' => InventoryMovementType::Initial,
                    'quantity' => $initialStock,
                    'stock_before' => 0,
                    'stock_after' => $initialStock,
                    'actor_id' => $request->user()->id,
                    'reason' => 'Stok awal saat produk dibuat.',
                    'occurred_at' => now(),
                ]);
            }
            $this->recordMutation($request, 'product.created', $product, [], [...$data, 'stock' => $initialStock]);
        }, 3);

        return back()->with('success', 'Produk dan stok awal berhasil dibuat.');
    }

    public function updateProduct(Request $request, Product $product): RedirectResponse
    {
        $this->requirePermission($request, 'products.manage');
        $this->ensureProductScope($request->user(), $product);
        $data = $this->validateProduct($request, $product);
        $this->ensureProgramScope($request->user(), $data['program_id']);
        $before = $product->only(array_keys($data));
        $product->update($data);
        $this->recordMutation($request, 'product.updated', $product, $before, $data);

        return back()->with('success', 'Produk diperbarui. Stok tetap diubah melalui pergerakan inventori.');
    }

    public function adjustInventory(Request $request): RedirectResponse
    {
        $this->requirePermission($request, 'products.manage');
        $data = $request->validate([
            'product_id' => ['required', 'integer', 'exists:products,id'],
            'quantity' => ['required', 'integer', 'not_in:0', 'between:-1000000,1000000'],
            'reason' => ['required', 'string', 'min:10', 'max:1000'],
        ]);
        $product = Product::query()
            ->with('program.region')
            ->whereKey((int) $data['product_id'])
            ->firstOrFail();
        $this->ensureProductScope($request->user(), $product);

        DB::transaction(function () use ($request, $product, $data): void {
            $locked = Product::query()->lockForUpdate()->findOrFail($product->id);
            $stockBefore = $locked->stock;
            $stockAfter = $stockBefore + (int) $data['quantity'];
            if ($stockAfter < 0) {
                throw ValidationException::withMessages(['quantity' => 'Penyesuaian membuat stok menjadi negatif.']);
            }
            $locked->update(['stock' => $stockAfter]);
            $movement = InventoryMovement::query()->create([
                'product_id' => $locked->id,
                'type' => (int) $data['quantity'] > 0 ? InventoryMovementType::Restock : InventoryMovementType::Adjustment,
                'quantity' => $data['quantity'],
                'stock_before' => $stockBefore,
                'stock_after' => $stockAfter,
                'actor_id' => $request->user()->id,
                'reason' => trim((string) $data['reason']),
                'occurred_at' => now(),
            ]);
            $this->recordMutation(
                $request,
                'inventory.adjusted',
                $movement,
                ['stock' => $stockBefore],
                ['stock' => $stockAfter, 'quantity' => $data['quantity']],
            );
        }, 3);

        return back()->with('success', 'Stok diperbarui melalui ledger inventori.');
    }

    private function requirePermission(Request $request, string $permission): void
    {
        abort_unless($request->user()->can($permission), 403);
    }

    /**
     * @param  array<string, mixed>  $before
     * @param  array<string, mixed>  $after
     */
    private function recordMutation(
        Request $request,
        string $event,
        Model $model,
        array $before,
        array $after,
    ): void {
        AuditLog::record(
            actor: $request->user(),
            event: $event,
            auditable: $model,
            before: $before,
            after: $after,
            request: $request,
        );
    }

    /** @return array<string, mixed> */
    private function validateRegion(Request $request, ?Region $region = null): array
    {
        $data = $request->validate([
            'parent_id' => ['nullable', 'integer', 'exists:regions,id'],
            'level' => ['required', Rule::enum(RegionLevel::class)],
            'code' => ['required', 'string', 'max:40', 'regex:/^[A-Za-z0-9._-]+$/'],
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/'],
            'centroid_latitude' => ['nullable', 'numeric', 'between:-90,90', 'required_with:centroid_longitude'],
            'centroid_longitude' => ['nullable', 'numeric', 'between:-180,180', 'required_with:centroid_latitude'],
            'is_active' => ['sometimes', 'boolean'],
        ]);
        $level = RegionLevel::from((string) $data['level']);
        $parentId = isset($data['parent_id']) ? (int) $data['parent_id'] : null;
        $parent = $parentId === null ? null : Region::query()->findOrFail($parentId);

        if ($region !== null && $parentId === $region->id) {
            throw ValidationException::withMessages(['parent_id' => 'Wilayah tidak dapat menjadi induk bagi dirinya sendiri.']);
        }
        $validHierarchy = match ($level) {
            RegionLevel::Village => $parent === null,
            RegionLevel::Rw => $parent?->level === RegionLevel::Village,
            RegionLevel::Rt => $parent?->level === RegionLevel::Rw,
        };
        if (! $validHierarchy) {
            throw ValidationException::withMessages(['parent_id' => 'Hierarki wajib mengikuti kelurahan/desa → RW → RT.']);
        }

        $slug = isset($data['slug']) && $data['slug'] !== ''
            ? (string) $data['slug']
            : Str::slug((string) $data['name']);
        foreach (['code' => (string) $data['code'], 'slug' => $slug] as $column => $value) {
            $duplicate = Region::query()
                ->where('parent_id', $parentId)
                ->where($column, $value)
                ->when($region !== null, fn (Builder $query) => $query->whereKeyNot($region->id))
                ->exists();
            if ($duplicate) {
                throw ValidationException::withMessages([$column => "{$column} sudah digunakan pada induk wilayah yang sama."]);
            }
        }

        return [
            ...$data,
            'parent_id' => $parentId,
            'slug' => $slug,
            'is_active' => $request->boolean('is_active', true),
        ];
    }

    /** @return array<string, mixed> */
    private function validateWasteCategory(Request $request, ?WasteCategory $category = null): array
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/', Rule::unique('waste_categories')->ignore($category?->id)],
            'description' => ['nullable', 'string', 'max:2000'],
            'is_hazardous' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:65535'],
        ]);

        return [
            ...$data,
            'slug' => isset($data['slug']) && $data['slug'] !== '' ? $data['slug'] : Str::slug((string) $data['name']),
            'is_hazardous' => $request->boolean('is_hazardous'),
            'is_active' => $request->boolean('is_active', true),
            'sort_order' => (int) ($data['sort_order'] ?? 0),
        ];
    }

    /** @return array<string, mixed> */
    private function validateWasteType(Request $request, ?WasteType $wasteType = null): array
    {
        $data = $request->validate([
            'waste_category_id' => ['required', 'integer', 'exists:waste_categories,id'],
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/', Rule::unique('waste_types')->ignore($wasteType?->id)],
            'unit' => ['required', Rule::in(['kg'])],
            'description' => ['nullable', 'string', 'max:2000'],
            'handling_notes' => ['nullable', 'string', 'max:2000'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        return [
            ...$data,
            'slug' => isset($data['slug']) && $data['slug'] !== '' ? $data['slug'] : Str::slug((string) $data['name']),
            'is_active' => $request->boolean('is_active', true),
        ];
    }

    /** @param array<string, mixed> $data */
    private function preventPointRuleOverlap(array $data): void
    {
        if (! (bool) $data['is_active']) {
            return;
        }

        $query = PointRule::query()
            ->where('waste_type_id', $data['waste_type_id'])
            ->where('is_active', true)
            ->where(function (Builder $builder) use ($data): void {
                $builder->whereNull('effective_to')->orWhere('effective_to', '>=', $data['effective_from']);
            });
        if (isset($data['effective_to'])) {
            $query->where('effective_from', '<=', $data['effective_to']);
        }
        if ($query->exists()) {
            throw ValidationException::withMessages(['effective_from' => 'Periode aturan poin aktif bertumpang tindih untuk jenis sampah ini.']);
        }
    }

    /** @return array<string, mixed> */
    private function validateFactorSet(Request $request, ?EnvironmentalFactorSet $factorSet = null): array
    {
        $data = $request->validate([
            'region_id' => ['nullable', 'integer', 'exists:regions,id'],
            'name' => ['required', 'string', 'max:255'],
            'version' => [
                'required',
                'integer',
                'min:1',
                'max:100000',
                Rule::unique('environmental_factor_sets')->where(
                    fn ($query) => $query->where('name', $request->string('name')->trim()->toString()),
                )->ignore($factorSet?->id),
            ],
            'source_name' => ['required', 'string', 'min:3', 'max:255'],
            'source_url' => ['nullable', 'url:http,https', 'max:2048'],
            'effective_from' => ['nullable', 'date'],
            'effective_to' => ['nullable', 'date', 'after:effective_from'],
            'methodology_notes' => ['required', 'string', 'min:20', 'max:10000'],
            'scope_notes' => ['nullable', 'string', 'max:2000', 'required_with:region_id'],
            'status' => ['required', Rule::enum(FactorSetStatus::class)],
            'is_demo' => ['sometimes', 'boolean'],
        ]);

        return [
            ...$data,
            'region_id' => isset($data['region_id']) ? (int) $data['region_id'] : null,
            'is_demo' => $request->boolean('is_demo'),
        ];
    }

    private function ensureFactorSetComplete(EnvironmentalFactorSet $factorSet): void
    {
        $requiredKinds = collect([
            EnvironmentalFactor::CARBON,
            EnvironmentalFactor::RECYCLABLE,
            EnvironmentalFactor::ENERGY,
        ]);
        $activeTypes = WasteType::query()->where('is_active', true)->get(['id', 'name']);
        $factors = $factorSet->factors()->get()->groupBy('waste_type_id');
        $missing = $activeTypes->filter(function (WasteType $wasteType) use ($factors, $requiredKinds): bool {
            $kinds = $factors->get($wasteType->id, collect())->pluck('impact_kind');

            return $requiredKinds->diff($kinds)->isNotEmpty();
        });
        if ($activeTypes->isEmpty() || $missing->isNotEmpty()) {
            $names = $missing->pluck('name')->take(5)->implode(', ');
            throw ValidationException::withMessages([
                'status' => 'Factor set belum memiliki tiga faktor lengkap untuk seluruh jenis sampah aktif'.($names !== '' ? ": {$names}" : '.'),
            ]);
        }
    }

    /** @param array<string, mixed> $data */
    private function preventFactorSetOverlap(EnvironmentalFactorSet $factorSet, array $data): void
    {
        $query = EnvironmentalFactorSet::query()
            ->whereKeyNot($factorSet->id)
            ->where('status', FactorSetStatus::Active)
            ->where(function (Builder $builder) use ($data): void {
                isset($data['region_id'])
                    ? $builder->where('region_id', $data['region_id'])
                    : $builder->whereNull('region_id');
            })
            ->where(function (Builder $builder) use ($data): void {
                $builder->whereNull('effective_to')->orWhere('effective_to', '>=', $data['effective_from'] ?? now());
            });
        if (isset($data['effective_to'])) {
            $query->where(function (Builder $builder) use ($data): void {
                $builder->whereNull('effective_from')->orWhere('effective_from', '<=', $data['effective_to']);
            });
        }
        if ($query->exists()) {
            throw ValidationException::withMessages(['effective_from' => 'Periode factor set aktif bertumpang tindih pada cakupan yang sama.']);
        }
    }

    /** @return array<string, mixed> */
    private function validateEnvironmentalFactor(Request $request, ?EnvironmentalFactor $factor = null): array
    {
        $data = $request->validate([
            'environmental_factor_set_id' => ['required', 'integer', 'exists:environmental_factor_sets,id'],
            'waste_type_id' => ['required', 'integer', 'exists:waste_types,id'],
            'impact_kind' => ['required', Rule::in([
                EnvironmentalFactor::CARBON,
                EnvironmentalFactor::RECYCLABLE,
                EnvironmentalFactor::ENERGY,
            ])],
            'factor_value' => ['required', 'decimal:0,8', 'between:-1000000,1000000'],
            'unit' => ['required', 'string', 'max:50'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);
        $duplicate = EnvironmentalFactor::query()
            ->where('environmental_factor_set_id', $data['environmental_factor_set_id'])
            ->where('waste_type_id', $data['waste_type_id'])
            ->where('impact_kind', $data['impact_kind'])
            ->when($factor !== null, fn (Builder $query) => $query->whereKeyNot($factor->id))
            ->exists();
        if ($duplicate) {
            throw ValidationException::withMessages(['impact_kind' => 'Faktor untuk jenis sampah dan jenis dampak ini sudah ada.']);
        }

        return $data;
    }

    private function ensureDraftFactorSet(EnvironmentalFactorSet $factorSet): void
    {
        if ($factorSet->status !== FactorSetStatus::Draft) {
            throw ValidationException::withMessages(['factor_set' => 'Faktor hanya boleh diubah ketika factor set masih draft.']);
        }
    }

    /** @return array<string, mixed> */
    private function validateNamedCategory(Request $request, string $table, ?int $ignoreId = null): array
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => [
                'nullable',
                'string',
                'max:255',
                'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
                Rule::unique($table, 'slug')->ignore($ignoreId),
            ],
            'description' => ['nullable', 'string', 'max:2000'],
        ]);
        $data['slug'] = isset($data['slug']) && $data['slug'] !== ''
            ? $data['slug']
            : Str::slug((string) $data['name']);

        return $data;
    }

    /** @return array<string, mixed> */
    private function validateEducation(Request $request, ?EducationContent $content = null): array
    {
        $data = $request->validate([
            'education_category_id' => ['required', 'integer', 'exists:education_categories,id'],
            'region_id' => ['nullable', 'integer', 'exists:regions,id'],
            'title' => ['required', 'string', 'max:255'],
            'slug' => [
                'nullable',
                'string',
                'max:255',
                'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
                Rule::unique('education_contents')->ignore($content?->id),
            ],
            'excerpt' => ['nullable', 'string', 'max:500'],
            'body' => ['required', 'string', 'min:50', 'max:100000'],
            'external_url' => ['nullable', 'url:http,https', 'max:2048'],
            'status' => ['required', Rule::enum(ContentStatus::class)],
            'published_at' => ['nullable', 'date'],
        ]);
        $data['slug'] = isset($data['slug']) && $data['slug'] !== ''
            ? $data['slug']
            : Str::slug((string) $data['title']);
        if ($data['status'] === ContentStatus::Published->value && ! isset($data['published_at'])) {
            $data['published_at'] = $content === null ? now() : ($content->published_at ?? now());
        }
        $data['region_id'] = isset($data['region_id']) ? (int) $data['region_id'] : null;

        return $data;
    }

    /** @return array<string, mixed> */
    private function validateProgram(Request $request, ?Program $program = null): array
    {
        $data = $request->validate([
            'region_id' => ['nullable', 'integer', 'exists:regions,id'],
            'manager_id' => ['nullable', 'integer', 'exists:users,id'],
            'type' => ['required', Rule::enum(ProgramType::class)],
            'title' => ['required', 'string', 'max:255'],
            'slug' => [
                'nullable',
                'string',
                'max:255',
                'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
                Rule::unique('programs')->ignore($program?->id),
            ],
            'description' => ['required', 'string', 'min:30', 'max:100000'],
            'objectives' => ['nullable', 'string', 'max:10000'],
            'location_name' => ['nullable', 'string', 'max:255'],
            'capacity' => ['nullable', 'integer', 'min:1', 'max:100000'],
            'registration_starts_at' => ['nullable', 'date'],
            'registration_ends_at' => ['nullable', 'date', 'after_or_equal:registration_starts_at'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
            'status' => ['required', Rule::enum(ProgramStatus::class)],
            'materials' => ['nullable', 'array', 'max:100'],
            'materials.*' => ['string', 'max:2000'],
            'outcomes' => ['nullable', 'array', 'max:100'],
            'outcomes.*' => ['string', 'max:2000'],
        ]);
        $data['slug'] = isset($data['slug']) && $data['slug'] !== ''
            ? $data['slug']
            : Str::slug((string) $data['title']);
        $data['region_id'] = isset($data['region_id']) ? (int) $data['region_id'] : null;
        $data['manager_id'] = isset($data['manager_id']) ? (int) $data['manager_id'] : null;

        if (isset($data['manager_id'], $data['region_id'])) {
            $manager = User::query()
                ->with(['roles', 'assignedRegions'])
                ->whereKey((int) $data['manager_id'])
                ->firstOrFail();
            $region = Region::query()->whereKey((int) $data['region_id'])->firstOrFail();
            if (! $manager->hasAnyRole([RoleName::ProgramManager->value, RoleName::SuperAdmin->value])
                || ! $manager->canAccessRegion($region)) {
                throw ValidationException::withMessages(['manager_id' => 'Penanggung jawab tidak berwenang pada wilayah program.']);
            }
        }

        return $data;
    }

    /** @return array<string, mixed> */
    private function validateProgramSession(Request $request, ?ProgramSession $session = null): array
    {
        return $request->validate([
            'program_id' => ['required', 'integer', 'exists:programs,id'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'location_name' => ['nullable', 'string', 'max:255'],
            'starts_at' => ['required', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
        ]);
    }

    /** @return array<string, mixed> */
    private function validateAttendance(Request $request): array
    {
        $data = $request->validate([
            'program_registration_id' => ['required', 'integer', 'exists:program_registrations,id'],
            'program_session_id' => ['required', 'integer', 'exists:program_sessions,id'],
            'is_present' => ['required', 'boolean'],
            'checked_in_at' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);
        $data['is_present'] = $request->boolean('is_present');
        if ($data['is_present'] && ! isset($data['checked_in_at'])) {
            $data['checked_in_at'] = now();
        }

        return $data;
    }

    /** @param array<string, mixed> $data */
    private function ensureAttendanceProgramMatches(array $data): void
    {
        $registration = ProgramRegistration::query()
            ->whereKey((int) $data['program_registration_id'])
            ->firstOrFail();
        $session = ProgramSession::query()
            ->whereKey((int) $data['program_session_id'])
            ->firstOrFail();
        if ($registration->program_id !== $session->program_id) {
            throw ValidationException::withMessages(['program_session_id' => 'Sesi dan pendaftaran harus berasal dari program yang sama.']);
        }
    }

    /** @return array<string, mixed> */
    private function validateProduct(Request $request, ?Product $product = null): array
    {
        $data = $request->validate([
            'product_category_id' => ['required', 'integer', 'exists:product_categories,id'],
            'program_id' => ['nullable', 'integer', 'exists:programs,id'],
            'name' => ['required', 'string', 'max:255'],
            'slug' => [
                'nullable',
                'string',
                'max:255',
                'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
                Rule::unique('products')->ignore($product?->id),
            ],
            'description' => ['nullable', 'string', 'max:10000'],
            'point_price' => ['required', 'integer', 'min:1', 'max:1000000000'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        return [
            ...$data,
            'program_id' => isset($data['program_id']) ? (int) $data['program_id'] : null,
            'slug' => isset($data['slug']) && $data['slug'] !== '' ? $data['slug'] : Str::slug((string) $data['name']),
            'is_active' => $request->boolean('is_active', true),
        ];
    }

    private function ensureRegionScope(User $user, mixed $regionId): void
    {
        if ($user->hasRole(RoleName::SuperAdmin->value)) {
            return;
        }
        if (! is_int($regionId) && ! is_string($regionId)) {
            abort(403);
        }
        $region = Region::query()->findOrFail((int) $regionId);
        abort_unless($user->canAccessRegion($region), 403);
    }

    private function ensureProgramScope(User $user, mixed $programId): void
    {
        if ($user->hasRole(RoleName::SuperAdmin->value)) {
            return;
        }
        if (! is_int($programId) && ! is_string($programId)) {
            abort(403);
        }
        $program = Program::query()->with('region')->findOrFail((int) $programId);
        $this->ensureRegionScope($user, $program->region_id);
    }

    private function ensureProductScope(User $user, Product $product): void
    {
        if ($user->hasRole(RoleName::SuperAdmin->value)) {
            return;
        }
        $product->loadMissing('program.region');
        abort_unless($product->program !== null, 403);
        $this->ensureRegionScope($user, $product->program->region_id);
    }
}
