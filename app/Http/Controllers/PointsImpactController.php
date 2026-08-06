<?php

namespace App\Http\Controllers;

use App\Models\ImpactCalculation;
use App\Models\PointAccount;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class PointsImpactController extends Controller
{
    public function points(Request $request): Response
    {
        $account = PointAccount::query()->firstOrCreate(
            ['user_id' => $request->user()->id],
            ['balance' => 0],
        );

        return Inertia::render('points/index', [
            'balance' => $account->balance,
            'transactions' => $account->transactions()
                ->with('actor:id,name')
                ->latest('occurred_at')
                ->paginate(20),
        ]);
    }

    public function impact(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);
        $calculations = ImpactCalculation::query()
            ->with([
                'factorSet:id,name,version,source_name,source_url,methodology_notes,is_demo',
                'collectionRequest:id,request_number,requester_id,completed_at',
                'items.wasteType.category:id,name,slug',
            ])
            ->whereHas('collectionRequest', fn ($query) => $query->where('requester_id', $user->id))
            ->latest('calculated_at')
            ->get();

        $composition = [];
        foreach ($calculations->flatMap->items as $item) {
            $category = $item->wasteType->category->name;
            $composition[$category] = ($composition[$category] ?? 0) + (float) $item->verified_weight;
        }

        $trend = $calculations
            ->groupBy(fn (ImpactCalculation $calculation) => Carbon::parse($calculation->calculated_at)->format('Y-m'))
            ->map(fn ($items, string $month): array => [
                'month' => $month,
                'weight_kg' => round((float) $items->sum('total_verified_weight'), 3),
                'carbon_kg_co2e' => round((float) $items->sum('total_carbon_kg_co2e'), 6),
                'recyclable_kg' => round((float) $items->sum('total_recyclable_kg'), 6),
            ])
            ->values();

        $latestFactorSet = $calculations->first()?->factorSet;

        return Inertia::render('impact/index', [
            'summary' => [
                'verified_weight_kg' => round((float) $calculations->sum('total_verified_weight'), 3),
                'carbon_kg_co2e' => round((float) $calculations->sum('total_carbon_kg_co2e'), 6),
                'recyclable_kg' => round((float) $calculations->sum('total_recyclable_kg'), 6),
                'energy_kwh' => round((float) $calculations->sum('total_energy_kwh'), 6),
            ],
            'composition' => collect($composition)
                ->map(fn (float $weight, string $category): array => ['category' => $category, 'weight_kg' => round($weight, 3)])
                ->values(),
            'trend' => $trend,
            'factorSet' => $latestFactorSet === null ? null : [
                ...$latestFactorSet->toArray(),
                'label' => "{$latestFactorSet->name} v{$latestFactorSet->version}",
                'disclaimer' => $latestFactorSet->is_demo
                    ? 'DEMO - TIDAK UNTUK KLAIM ILMIAH. Nilai hanya untuk pengujian alur sistem.'
                    : 'Hasil merupakan estimasi berbasis faktor terpublikasi, bukan LCA penuh.',
            ],
        ]);
    }
}
