<?php

namespace App\Services\Collections;

use App\Enums\CollectionStatus;
use App\Enums\PointTransactionType;
use App\Models\AuditLog;
use App\Models\CollectionItem;
use App\Models\CollectionRequest;
use App\Models\EnvironmentalFactor;
use App\Models\EnvironmentalFactorSet;
use App\Models\ImpactCalculation;
use App\Models\PointAccount;
use App\Models\PointRule;
use App\Models\PointTransaction;
use App\Models\User;
use App\Notifications\SystemNotification;
use Brick\Math\BigDecimal;
use Brick\Math\Exception\MathException;
use Brick\Math\RoundingMode;
use DomainException;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class VerifyCollectionRequest
{
    /**
     * @param  array<int, int|float|string>  $verifiedWeights  collection_item_id => kilogram
     */
    public function handle(
        CollectionRequest $request,
        User $actor,
        array $verifiedWeights = [],
    ): CollectionRequest {
        Gate::forUser($actor)->authorize('verify', $request);

        return DB::transaction(function () use ($request, $actor, $verifiedWeights): CollectionRequest {
            $lockedRequest = CollectionRequest::query()
                ->whereKey($request->getKey())
                ->lockForUpdate()
                ->firstOrFail();

            $idempotencyKey = 'collection-verification:'.$lockedRequest->getKey();
            $existingTransaction = PointTransaction::query()
                ->where('idempotency_key', $idempotencyKey)
                ->first();

            if ($lockedRequest->status === CollectionStatus::Completed) {
                if ($lockedRequest->impactCalculation()->exists()) {
                    return $lockedRequest->load(['items', 'impactCalculation.items', 'pointTransactions']);
                }

                throw new DomainException('Permintaan selesai tanpa snapshot dampak yang valid.');
            }

            if ($existingTransaction !== null) {
                throw new DomainException('Transaksi poin sudah ada tetapi status permintaan belum konsisten.');
            }

            if ($lockedRequest->status !== CollectionStatus::Weighed) {
                throw new DomainException('Verifikasi hanya dapat dilakukan setelah kader mencatat penimbangan.');
            }

            $items = $lockedRequest->items()
                ->with('wasteType.category')
                ->lockForUpdate()
                ->get();

            if ($items->isEmpty()) {
                throw new DomainException('Permintaan tidak memiliki item sampah.');
            }

            $resolvedWeights = $this->resolveWeights($items, $verifiedWeights);

            if ($items->contains(fn ($item): bool => $item->wasteType->category->is_hazardous)
                && ! $actor->hasPermissionTo('collections.verify-hazardous')) {
                throw new AuthorizationException('Verifikasi B3 memerlukan petugas berwenang.');
            }

            $now = now();
            $regionLineage = $lockedRequest->region()->firstOrFail()->lineageIds();
            $factorSetCandidates = EnvironmentalFactorSet::query()
                ->with('region:id,name')
                ->activeAt($now)
                ->where(function (Builder $builder) use ($regionLineage): void {
                    $builder->whereNull('region_id')->orWhereIn('region_id', $regionLineage);
                })
                ->orderByDesc('version')
                ->lockForUpdate()
                ->get();
            $factorSet = null;

            // Cakupan paling spesifik menang: RT -> RW -> kelurahan -> global.
            foreach ($regionLineage as $regionId) {
                $candidate = $factorSetCandidates->first(
                    fn (EnvironmentalFactorSet $set): bool => (int) $set->region_id === (int) $regionId,
                );
                if ($candidate !== null) {
                    $factorSet = $candidate;
                    break;
                }
            }
            $factorSet ??= $factorSetCandidates->first(
                fn (EnvironmentalFactorSet $set): bool => $set->region_id === null,
            );

            if ($factorSet === null) {
                throw new DomainException('Tidak ada factor set dampak aktif.');
            }

            $wasteTypeIds = $items->pluck('waste_type_id')->unique()->values();
            $factors = EnvironmentalFactor::query()
                ->where('environmental_factor_set_id', $factorSet->id)
                ->whereIn('waste_type_id', $wasteTypeIds)
                ->get();
            $pointRules = PointRule::query()
                ->effectiveAt($now)
                ->whereIn('waste_type_id', $wasteTypeIds)
                ->orderByDesc('version')
                ->get()
                ->groupBy('waste_type_id')
                ->map(fn (Collection $rules) => $rules->first());

            $itemResults = [];
            $totalWeight = BigDecimal::zero();
            $totalCarbon = BigDecimal::zero();
            $totalRecyclable = BigDecimal::zero();
            $totalEnergy = BigDecimal::zero();
            $totalPointsDecimal = BigDecimal::zero();

            foreach ($items as $item) {
                $weight = $resolvedWeights[$item->id];
                $itemFactors = $factors
                    ->where('waste_type_id', $item->waste_type_id)
                    ->values();
                $carbonFactor = $this->factorValue($itemFactors, EnvironmentalFactor::CARBON, $item->wasteType->name);
                $recyclableFactor = $this->factorValue($itemFactors, EnvironmentalFactor::RECYCLABLE, $item->wasteType->name);
                $energyFactor = $this->factorValue($itemFactors, EnvironmentalFactor::ENERGY, $item->wasteType->name);
                $pointRule = $pointRules->get($item->waste_type_id);

                if (! $pointRule instanceof PointRule) {
                    throw new DomainException("Aturan poin belum tersedia untuk {$item->wasteType->name}.");
                }

                $pointsPerKg = $this->decimalAtScale(
                    $pointRule->points_per_kg,
                    4,
                    'Nilai aturan poin tidak sesuai presisi basis data.',
                );
                $carbon = $weight->multipliedBy($carbonFactor)->toScale(6, RoundingMode::HalfUp);
                $recyclable = $weight->multipliedBy($recyclableFactor)->toScale(6, RoundingMode::HalfUp);
                $energy = $weight->multipliedBy($energyFactor)->toScale(6, RoundingMode::HalfUp);
                $points = $weight->multipliedBy($pointsPerKg)->toScale(0, RoundingMode::HalfUp);

                if (! $points->isPositive()) {
                    $points = BigDecimal::zero();
                }

                $itemResults[] = [
                    'collection_item_id' => $item->id,
                    'waste_type_id' => $item->waste_type_id,
                    'verified_weight' => $weight->toString(),
                    'carbon_kg_co2e' => $carbon->toString(),
                    'recyclable_kg' => $recyclable->toString(),
                    'energy_kwh' => $energy->toString(),
                    'factor_snapshot' => [
                        'carbon_kg_co2e' => $carbonFactor->toString(),
                        'recyclable_kg' => $recyclableFactor->toString(),
                        'energy_kwh' => $energyFactor->toString(),
                        'point_rule_version' => $pointRule->version,
                        'points_per_kg' => $pointsPerKg->toString(),
                    ],
                ];

                $totalWeight = $totalWeight->plus($weight);
                $totalCarbon = $totalCarbon->plus($carbon);
                $totalRecyclable = $totalRecyclable->plus($recyclable);
                $totalEnergy = $totalEnergy->plus($energy);
                $totalPointsDecimal = $totalPointsDecimal->plus($points);
            }

            $totalPoints = $this->safeInteger($totalPointsDecimal, 'Total poin melampaui batas bilangan yang didukung.');

            $calculation = ImpactCalculation::query()->create([
                'collection_request_id' => $lockedRequest->id,
                'environmental_factor_set_id' => $factorSet->id,
                'total_verified_weight' => $totalWeight->toScale(3)->toString(),
                'total_carbon_kg_co2e' => $totalCarbon->toScale(6)->toString(),
                'total_recyclable_kg' => $totalRecyclable->toScale(6)->toString(),
                'total_energy_kwh' => $totalEnergy->toScale(6)->toString(),
                'methodology_snapshot' => [
                    'factor_set' => $factorSet->name,
                    'version' => $factorSet->version,
                    'source_name' => $factorSet->source_name,
                    'source_url' => $factorSet->source_url,
                    'is_demo' => $factorSet->is_demo,
                    'notes' => $factorSet->methodology_notes,
                    'scope' => [
                        'type' => $factorSet->region_id === null ? 'global' : 'region',
                        'region_id' => $factorSet->region_id,
                        'region_name' => $factorSet->region?->name,
                        'notes' => $factorSet->scope_notes,
                    ],
                ],
                'calculated_at' => $now,
            ]);
            $calculation->items()->createMany($itemResults);

            $account = PointAccount::query()->firstOrCreate(
                ['user_id' => $lockedRequest->requester_id],
                ['balance' => 0],
            );
            $account = PointAccount::query()->whereKey($account->id)->lockForUpdate()->firstOrFail();
            $balanceBefore = $account->balance;
            $balanceAfter = $this->safeInteger(
                BigDecimal::of($balanceBefore)->plus($totalPointsDecimal),
                'Saldo poin melampaui batas bilangan yang didukung.',
            );

            if ($totalPoints > 0) {
                $account->update(['balance' => $balanceAfter]);
                PointTransaction::query()->create([
                    'point_account_id' => $account->id,
                    'user_id' => $lockedRequest->requester_id,
                    'type' => PointTransactionType::Earn,
                    'amount' => $totalPoints,
                    'balance_before' => $balanceBefore,
                    'balance_after' => $balanceAfter,
                    'reference_type' => $lockedRequest->getMorphClass(),
                    'reference_id' => $lockedRequest->id,
                    'idempotency_key' => $idempotencyKey,
                    'reason' => 'Poin dari sampah terverifikasi '.$lockedRequest->request_number,
                    'actor_id' => $actor->id,
                    'occurred_at' => $now,
                ]);
            }

            $this->recordStatus($lockedRequest, CollectionStatus::Verified, $actor);
            $this->recordStatus($lockedRequest, CollectionStatus::Completed, $actor);
            $lockedRequest->update([
                'completed_at' => $now,
                'hazardous_handling_status' => $lockedRequest->contains_hazardous ? 'completed' : null,
            ]);
            $lockedRequest->assignments()->where('is_active', true)->update([
                'is_active' => false,
                'completed_at' => $now,
                'updated_at' => $now,
            ]);

            AuditLog::record(
                actor: $actor,
                event: 'collection.verified',
                auditable: $lockedRequest,
                before: ['status' => $request->status->value],
                after: [
                    'status' => CollectionStatus::Completed->value,
                    'verified_weight' => $totalWeight->toScale(3)->toString(),
                    'points_earned' => $totalPoints,
                    'impact_calculation_id' => $calculation->id,
                ],
                metadata: ['factor_set_id' => $factorSet->id, 'factor_set_version' => $factorSet->version],
            );

            DB::afterCommit(function () use ($lockedRequest, $totalPoints): void {
                $requester = User::query()->find($lockedRequest->requester_id);
                $requester?->notify(new SystemNotification(
                    title: 'Pengumpulan selesai diverifikasi',
                    message: "{$lockedRequest->request_number} selesai. {$totalPoints} Green Points telah dicatat.",
                    href: "/pengumpulan/{$lockedRequest->id}",
                    kind: 'collection-completed',
                ));
            });

            return $lockedRequest->fresh(['items', 'impactCalculation.items', 'pointTransactions']);
        }, 3);
    }

    /**
     * @param  Collection<int, CollectionItem>  $items
     * @param  array<int, int|float|string>  $verifiedWeights
     * @return array<int, BigDecimal>
     */
    private function resolveWeights(Collection $items, array $verifiedWeights): array
    {
        $expectedIds = $items->pluck('id')->map(fn (mixed $id): int => (int) $id)->sort()->values()->all();
        $resolved = [];

        if ($verifiedWeights !== []) {
            $providedIds = collect(array_keys($verifiedWeights))->map(fn (mixed $id): int => (int) $id)->sort()->values()->all();

            if ($expectedIds !== $providedIds) {
                throw new DomainException('Payload verifikasi wajib memuat tepat satu berat untuk setiap item.');
            }
        }

        foreach ($items as $item) {
            if ($item->verified_weight === null || $item->verified_by === null || $item->verified_at === null) {
                throw new DomainException('Setiap item harus ditimbang oleh kader sebelum diverifikasi.');
            }

            $storedWeight = $this->decimalAtScale(
                $item->verified_weight,
                3,
                'Hasil penimbangan tidak sesuai presisi basis data.',
            );

            if (! $storedWeight->isPositive()) {
                throw new DomainException('Setiap item harus memiliki berat hasil penimbangan lebih dari nol.');
            }

            if ($verifiedWeights !== []) {
                $payloadWeight = $verifiedWeights[$item->id] ?? null;
                $normalizedPayloadWeight = $this->decimalAtScale(
                    $payloadWeight,
                    3,
                    'Payload verifikasi berbeda dari hasil penimbangan kader.',
                );

                if ($normalizedPayloadWeight->compareTo($storedWeight) !== 0) {
                    throw new DomainException('Payload verifikasi berbeda dari hasil penimbangan kader.');
                }
            }

            $resolved[$item->id] = $storedWeight;
        }

        return $resolved;
    }

    /**
     * @param  Collection<int, EnvironmentalFactor>  $factors
     */
    private function factorValue(Collection $factors, string $kind, string $wasteTypeName): BigDecimal
    {
        $factor = $factors->firstWhere('impact_kind', $kind);

        if (! $factor instanceof EnvironmentalFactor) {
            throw new DomainException("Faktor {$kind} belum tersedia untuk {$wasteTypeName}.");
        }

        return $this->decimalAtScale(
            $factor->factor_value,
            8,
            "Faktor {$kind} tidak sesuai presisi basis data.",
        );
    }

    /** @param non-negative-int $scale */
    private function decimalAtScale(mixed $value, int $scale, string $errorMessage): BigDecimal
    {
        try {
            $decimal = match (true) {
                is_int($value), is_string($value) => BigDecimal::of($value),
                is_float($value) => BigDecimal::fromFloatShortest($value),
                default => throw new DomainException($errorMessage),
            };

            return $decimal->toScale($scale, RoundingMode::Unnecessary);
        } catch (MathException) {
            throw new DomainException($errorMessage);
        }
    }

    private function safeInteger(BigDecimal $value, string $errorMessage): int
    {
        try {
            return $value->toInt();
        } catch (MathException) {
            throw new DomainException($errorMessage);
        }
    }

    private function recordStatus(
        CollectionRequest $request,
        CollectionStatus $next,
        User $actor,
    ): void {
        $current = $request->status;

        if (! $current->canTransitionTo($next)) {
            throw new DomainException("Transisi {$current->value} ke {$next->value} tidak diizinkan.");
        }

        $request->statusHistories()->create([
            'from_status' => $current,
            'to_status' => $next,
            'actor_id' => $actor->id,
        ]);
        $request->update(['status' => $next]);
        $request->refresh();
    }
}
