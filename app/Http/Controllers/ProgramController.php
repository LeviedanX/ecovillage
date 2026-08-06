<?php

namespace App\Http\Controllers;

use App\Enums\ProgramStatus;
use App\Enums\RegistrationStatus;
use App\Models\AuditLog;
use App\Models\Program;
use App\Models\ProgramRegistration;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ProgramController extends Controller
{
    public function index(Request $request): Response
    {
        $type = trim((string) $request->string('type'));

        return Inertia::render('programs/index', [
            'programs' => Program::query()
                ->with(['region:id,name,level', 'registrations' => fn ($query) => $query->where('user_id', $request->user()->id)])
                ->whereIn('status', [
                    ProgramStatus::Published,
                    ProgramStatus::RegistrationOpen,
                    ProgramStatus::RegistrationClosed,
                    ProgramStatus::Completed,
                ])
                ->when($type !== '', fn (Builder $query) => $query->where('type', $type))
                ->latest('starts_at')
                ->paginate(12)
                ->withQueryString(),
            'type' => $type,
        ]);
    }

    public function show(Request $request, Program $program): Response
    {
        $this->ensureVisible($request->user(), $program);

        return Inertia::render('programs/show', [
            'program' => $program->load(['region:id,name,level', 'manager:id,name']),
            'sessions' => $program->sessions()->orderBy('starts_at')->get(),
            'registration' => $program->registrations()->where('user_id', $request->user()->id)->first(),
        ]);
    }

    public function register(Request $request, Program $program): RedirectResponse
    {
        $request->validate(['notes' => ['nullable', 'string', 'max:500']]);

        DB::transaction(function () use ($request, $program): void {
            $locked = Program::query()->lockForUpdate()->findOrFail($program->id);
            $this->ensureVisible($request->user(), $locked);

            if ($locked->status !== ProgramStatus::RegistrationOpen
                || ($locked->registration_starts_at !== null && now()->isBefore($locked->registration_starts_at))
                || ($locked->registration_ends_at !== null && now()->isAfter($locked->registration_ends_at))) {
                throw ValidationException::withMessages(['program' => 'Pendaftaran kegiatan sedang tidak dibuka.']);
            }

            $registration = ProgramRegistration::query()
                ->where('program_id', $locked->id)
                ->where('user_id', $request->user()->id)
                ->lockForUpdate()
                ->first();

            if ($registration !== null && $registration->status !== RegistrationStatus::Cancelled) {
                throw ValidationException::withMessages(['program' => 'Anda sudah terdaftar pada kegiatan ini.']);
            }

            $confirmed = ProgramRegistration::query()
                ->where('program_id', $locked->id)
                ->whereIn('status', [RegistrationStatus::Pending, RegistrationStatus::Confirmed, RegistrationStatus::Attended])
                ->count();
            if ($locked->capacity !== null && $confirmed >= $locked->capacity) {
                throw ValidationException::withMessages(['program' => 'Kuota kegiatan sudah penuh.']);
            }

            if ($registration === null) {
                $registration = ProgramRegistration::query()->create([
                    'program_id' => $locked->id,
                    'user_id' => $request->user()->id,
                    'status' => RegistrationStatus::Confirmed,
                    'registered_at' => now(),
                    'notes' => $request->string('notes')->toString() ?: null,
                ]);
            } else {
                $registration->update([
                    'status' => RegistrationStatus::Confirmed,
                    'registered_at' => now(),
                    'cancelled_at' => null,
                    'notes' => $request->string('notes')->toString() ?: null,
                ]);
            }

            AuditLog::record(
                actor: $request->user(),
                event: 'program.registration.created',
                auditable: $registration,
                after: ['program_id' => $locked->id, 'status' => RegistrationStatus::Confirmed->value],
                request: $request,
            );
        });

        return back()->with('success', 'Pendaftaran kegiatan berhasil.');
    }

    public function cancel(Request $request, Program $program): RedirectResponse
    {
        $request->validate(['reason' => ['required', 'string', 'max:500']]);

        DB::transaction(function () use ($request, $program): void {
            $registration = ProgramRegistration::query()
                ->where('program_id', $program->id)
                ->where('user_id', $request->user()->id)
                ->lockForUpdate()
                ->firstOrFail();

            if (($program->registration_ends_at !== null && now()->isAfter($program->registration_ends_at))
                || ($program->starts_at !== null && now()->isAfter($program->starts_at))) {
                throw ValidationException::withMessages(['program' => 'Batas waktu pembatalan sudah lewat.']);
            }

            $before = $registration->status;
            $registration->update([
                'status' => RegistrationStatus::Cancelled,
                'cancelled_at' => now(),
                'notes' => $request->string('reason')->toString(),
            ]);

            AuditLog::record(
                actor: $request->user(),
                event: 'program.registration.cancelled',
                auditable: $registration,
                before: ['status' => $before->value],
                after: ['status' => RegistrationStatus::Cancelled->value],
                request: $request,
            );
        });

        return back()->with('success', 'Pendaftaran kegiatan dibatalkan.');
    }

    private function ensureVisible(User $user, Program $program): void
    {
        abort_unless(in_array($program->status, [
            ProgramStatus::Published,
            ProgramStatus::RegistrationOpen,
            ProgramStatus::RegistrationClosed,
            ProgramStatus::Completed,
        ], true), 404);

        if ($program->region !== null) {
            abort_unless($user->canAccessRegion($program->region), 403);
        }
    }
}
