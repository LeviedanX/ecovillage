<?php

use App\Http\Controllers\AdminAccessController;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\AdminMasterDataController;
use App\Http\Controllers\AdminOperationsController;
use App\Http\Controllers\AdminSiteContentController;
use App\Http\Controllers\Auth\RegistrationController;
use App\Http\Controllers\CollectionController;
use App\Http\Controllers\CollectionOperationsController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ForumController;
use App\Http\Controllers\MarketplaceController;
use App\Http\Controllers\PointsImpactController;
use App\Http\Controllers\ProgramController;
use App\Http\Controllers\PublicSiteController;
use App\Http\Controllers\SitemapController;
use App\Http\Controllers\UserUtilityController;
use App\Http\Middleware\MarkPublicCacheable;
use App\Http\Middleware\RequireTwoFactorForPrivilegedRoles;
use Illuminate\Support\Facades\Route;

/*
 * Pendaftaran menggantikan route bawaan Fortify. Lihat RegistrationController
 * untuk alasannya: aturan `unique` pada email membuat halaman daftar dapat
 * dipakai memetakan akun warga yang benar-benar ada.
 */
Route::middleware('guest')->group(function (): void {
    Route::get('/register', [RegistrationController::class, 'create'])->name('register');
    Route::post('/register', [RegistrationController::class, 'store'])
        ->middleware('throttle:5,1')
        ->name('register.store');
    Route::get('/register/pending', [RegistrationController::class, 'pending'])->name('register.pending');
});

Route::get('/', [PublicSiteController::class, 'home'])->name('home');

// Dilayani aplikasi, bukan berkas statis, agar daftar URL selalu mengikuti
// konten yang benar-benar terbit.
Route::get('/sitemap.xml', [SitemapController::class, 'index'])->name('sitemap');
Route::get('/robots.txt', [SitemapController::class, 'robots'])->name('robots');

Route::get('/tentang', [PublicSiteController::class, 'page'])->defaults('page', 'tentang')->name('about');
Route::get('/masalah-dan-solusi', [PublicSiteController::class, 'page'])->defaults('page', 'masalah-solusi')->name('problem-solution');
Route::get('/platform', [PublicSiteController::class, 'page'])->defaults('page', 'platform')->name('platform');
Route::get('/ecopore', [PublicSiteController::class, 'page'])->defaults('page', 'ecopore')->name('ecopore');
Route::get('/ecocycle', [PublicSiteController::class, 'page'])->defaults('page', 'ecocycle')->name('ecocycle');
Route::get('/faq', [PublicSiteController::class, 'page'])->defaults('page', 'faq')->name('faq');
Route::get('/kontak', [PublicSiteController::class, 'page'])->defaults('page', 'kontak')->name('contact');
Route::get('/kebijakan-privasi', [PublicSiteController::class, 'page'])->defaults('page', 'kebijakan-privasi')->name('privacy');

Route::middleware(MarkPublicCacheable::class)->group(function (): void {
    Route::get('/edukasi', [PublicSiteController::class, 'education'])->name('education.index');
    Route::get('/edukasi/{educationContent:slug}', [PublicSiteController::class, 'educationShow'])->name('education.show');
});
Route::get('/program', [PublicSiteController::class, 'programs'])->name('public.programs.index');
Route::get('/program/{program:slug}', [PublicSiteController::class, 'programShow'])->name('public.programs.show');
Route::get('/katalog', [PublicSiteController::class, 'catalog'])->name('catalog');
Route::get('/peta', [PublicSiteController::class, 'publicMap'])->name('public.map');
Route::get('/metodologi-dampak', [PublicSiteController::class, 'methodology'])->name('impact.methodology');

Route::middleware(['auth', 'verified'])->group(function (): void {
    Route::get('/dashboard', DashboardController::class)->name('dashboard');
    Route::get('/pencarian', [UserUtilityController::class, 'search'])->name('search');
    Route::get('/notifikasi', [UserUtilityController::class, 'notifications'])->name('notifications.index');
    Route::patch('/notifikasi/baca-semua', [UserUtilityController::class, 'readAllNotifications'])
        ->middleware('throttle:20,1')
        ->name('notifications.read-all');
    Route::patch('/notifikasi/{notification}/baca', [UserUtilityController::class, 'readNotification'])
        ->middleware('throttle:30,1')
        ->name('notifications.read');

    Route::prefix('pengumpulan')->name('collections.')->group(function (): void {
        Route::get('/', [CollectionController::class, 'index'])->name('index');
        Route::get('/buat', [CollectionController::class, 'create'])->name('create');
        Route::post('/', [CollectionController::class, 'store'])->middleware('throttle:10,1')->name('store');
        Route::get('/foto/{photo}', [CollectionController::class, 'photo'])->middleware('signed')->name('photos.show');
        Route::get('/{collection}', [CollectionController::class, 'show'])->name('show');
        Route::patch('/{collection}/batal', [CollectionController::class, 'cancel'])->name('cancel');
    });

    Route::get('/poin', [PointsImpactController::class, 'points'])->name('points.index');
    Route::get('/dampak', [PointsImpactController::class, 'impact'])->name('impact.index');

    Route::prefix('operasional')->name('operations.')
        ->middleware(RequireTwoFactorForPrivilegedRoles::class)
        ->group(function (): void {
            Route::get('/pengumpulan', [CollectionOperationsController::class, 'index'])
                ->middleware('permission:collections.view-assigned|collections.view-region')
                ->name('collections.index');
            Route::get('/peta', [CollectionOperationsController::class, 'map'])
                ->middleware('permission:map.view-exact-assigned|map.view-exact-region')
                ->name('map');
            Route::post('/pengumpulan/{collection}/penugasan', [CollectionOperationsController::class, 'assign'])->name('collections.assign');
            Route::patch('/pengumpulan/{collection}/diambil', [CollectionOperationsController::class, 'pickedUp'])->name('collections.picked-up');
            Route::patch('/pengumpulan/{collection}/timbang', [CollectionOperationsController::class, 'weigh'])->name('collections.weigh');
            Route::post('/pengumpulan/{collection}/verifikasi', [CollectionOperationsController::class, 'verify'])->middleware('throttle:10,1')->name('collections.verify');
            Route::patch('/pengumpulan/{collection}/tolak', [CollectionOperationsController::class, 'reject'])->name('collections.reject');
        });

    Route::prefix('kegiatan')->name('programs.')->group(function (): void {
        Route::get('/', [ProgramController::class, 'index'])->name('index');
        Route::get('/{program:slug}', [ProgramController::class, 'show'])->name('show');
        Route::post('/{program:slug}/daftar', [ProgramController::class, 'register'])->middleware('throttle:10,1')->name('register');
        Route::patch('/{program:slug}/batal', [ProgramController::class, 'cancel'])->name('cancel');
    });

    Route::prefix('forum')->name('forum.')->middleware('permission:forum.access')->group(function (): void {
        Route::get('/', [ForumController::class, 'index'])->name('index');
        Route::post('/', [ForumController::class, 'store'])->middleware('throttle:10,1')->name('store');
        Route::post('/laporkan', [ForumController::class, 'report'])->middleware('throttle:10,1')->name('report');
        Route::get('/{thread}', [ForumController::class, 'show'])->name('show');
        Route::post('/{thread}/balasan', [ForumController::class, 'reply'])->middleware('throttle:20,1')->name('reply');
    });

    Route::prefix('marketplace')->name('marketplace.')->middleware('permission:products.view')->group(function (): void {
        Route::get('/', [MarketplaceController::class, 'index'])->name('index');
        Route::get('/cart', [MarketplaceController::class, 'cart'])->name('cart');
        Route::post('/cart/items', [MarketplaceController::class, 'add'])->middleware('throttle:30,1')->name('cart.add');
        Route::put('/cart/items/{product}', [MarketplaceController::class, 'updateCart'])->name('cart.update');
        Route::delete('/cart/items/{product}', [MarketplaceController::class, 'remove'])->name('cart.remove');
        Route::post('/redeem', [MarketplaceController::class, 'redeem'])->middleware('throttle:6,1')->name('redeem');
        Route::patch('/redemptions/{redemption}/status', [MarketplaceController::class, 'process'])->middleware('permission:redemptions.process')->name('redemptions.process');
    });

    /*
     * Jalur pengelolaan menuntut autentikasi dua faktor bagi pemegangnya.
     * Lihat RequireTwoFactorForPrivilegedRoles untuk alasannya.
     */
    Route::prefix('admin')->name('admin.')
        ->middleware(RequireTwoFactorForPrivilegedRoles::class)
        ->group(function (): void {
            Route::get('/', DashboardController::class)->middleware('permission:reports.view')->name('dashboard');
            Route::get('/operations', AdminOperationsController::class)->middleware('permission:reports.view')->name('operations');
            Route::get('/master-data', [AdminMasterDataController::class, 'index'])->name('master-data.index');
            Route::prefix('master-data')->name('master-data.')->middleware('throttle:60,1')->group(function (): void {
                Route::post('/regions', [AdminMasterDataController::class, 'storeRegion'])->name('regions.store');
                Route::patch('/regions/{region}', [AdminMasterDataController::class, 'updateRegion'])->name('regions.update');
                Route::post('/waste-categories', [AdminMasterDataController::class, 'storeWasteCategory'])->name('waste-categories.store');
                Route::patch('/waste-categories/{wasteCategory}', [AdminMasterDataController::class, 'updateWasteCategory'])->name('waste-categories.update');
                Route::post('/waste-types', [AdminMasterDataController::class, 'storeWasteType'])->name('waste-types.store');
                Route::patch('/waste-types/{wasteType}', [AdminMasterDataController::class, 'updateWasteType'])->name('waste-types.update');
                Route::post('/point-rules', [AdminMasterDataController::class, 'storePointRule'])->name('point-rules.store');
                Route::post('/factor-sets', [AdminMasterDataController::class, 'storeFactorSet'])->name('factor-sets.store');
                Route::patch('/factor-sets/{factorSet}', [AdminMasterDataController::class, 'updateFactorSet'])->name('factor-sets.update');
                Route::post('/environmental-factors', [AdminMasterDataController::class, 'storeEnvironmentalFactor'])->name('environmental-factors.store');
                Route::patch('/environmental-factors/{environmentalFactor}', [AdminMasterDataController::class, 'updateEnvironmentalFactor'])->name('environmental-factors.update');
                Route::post('/education-categories', [AdminMasterDataController::class, 'storeEducationCategory'])->name('education-categories.store');
                Route::patch('/education-categories/{educationCategory}', [AdminMasterDataController::class, 'updateEducationCategory'])->name('education-categories.update');
                Route::post('/education', [AdminMasterDataController::class, 'storeEducation'])->name('education.store');
                Route::patch('/education/{education}', [AdminMasterDataController::class, 'updateEducation'])->name('education.update');
                Route::post('/programs', [AdminMasterDataController::class, 'storeProgram'])->name('programs.store');
                Route::patch('/programs/{program}', [AdminMasterDataController::class, 'updateProgram'])->name('programs.update');
                Route::post('/program-sessions', [AdminMasterDataController::class, 'storeProgramSession'])->name('program-sessions.store');
                Route::patch('/program-sessions/{programSession}', [AdminMasterDataController::class, 'updateProgramSession'])->name('program-sessions.update');
                Route::post('/program-attendances', [AdminMasterDataController::class, 'storeProgramAttendance'])->name('program-attendances.store');
                Route::patch('/program-attendances/{programAttendance}', [AdminMasterDataController::class, 'updateProgramAttendance'])->name('program-attendances.update');
                Route::post('/product-categories', [AdminMasterDataController::class, 'storeProductCategory'])->name('product-categories.store');
                Route::patch('/product-categories/{productCategory}', [AdminMasterDataController::class, 'updateProductCategory'])->name('product-categories.update');
                Route::post('/products', [AdminMasterDataController::class, 'storeProduct'])->name('products.store');
                Route::patch('/products/{product}', [AdminMasterDataController::class, 'updateProduct'])->name('products.update');
                Route::post('/inventory', [AdminMasterDataController::class, 'adjustInventory'])->name('inventory.adjust');
            });
            // Konten halaman publik: teks, gambar, dan background. Dikunci pada
            // settings.manage sehingga hanya super admin yang dapat mengubah
            // tampilan yang dilihat pengunjung anonim.
            Route::prefix('konten-situs')->name('site-content.')->middleware('permission:settings.manage')->group(function (): void {
                Route::get('/', [AdminSiteContentController::class, 'index'])->name('index');
                Route::patch('/pengaturan', [AdminSiteContentController::class, 'updateSettings'])
                    ->middleware('throttle:30,1')
                    ->name('settings.update');
                Route::patch('/halaman/{page}', [AdminSiteContentController::class, 'updatePage'])
                    ->middleware('throttle:30,1')
                    ->name('pages.update');
                Route::post('/media', [AdminSiteContentController::class, 'storeMedia'])
                    ->middleware('throttle:20,1')
                    ->name('media.store');
                Route::delete('/media/{media}', [AdminSiteContentController::class, 'destroyMedia'])
                    ->middleware('throttle:20,1')
                    ->name('media.destroy');
            });

            Route::get('/exports/collections.csv', [AdminController::class, 'exportCollections'])->name('exports.collections');
            Route::post('/users/{user}/points/adjust', [AdminController::class, 'adjustPoints'])->middleware('throttle:10,1')->name('points.adjust');
            Route::post('/point-transactions/{transaction}/reverse', [AdminController::class, 'reversePoints'])->middleware('throttle:10,1')->name('points.reverse');
            Route::patch('/forum/moderate', [AdminController::class, 'moderate'])->name('forum.moderate');
            Route::patch('/content-reports/{report}', [AdminController::class, 'resolveReport'])->name('reports.resolve');
            Route::patch('/site-settings/{setting}', [AdminController::class, 'updateSetting'])->name('settings.update');
            Route::patch('/users/{user}/role', [AdminController::class, 'assignRole'])->name('users.role');
            Route::get('/akses', [AdminAccessController::class, 'index'])
                ->middleware('permission:users.manage|roles.manage')
                ->name('access.index');
            Route::post('/users/{user}/region-assignments', [AdminAccessController::class, 'storeRegionAssignment'])
                ->middleware(['role:super-admin', 'permission:users.manage', 'permission:regions.manage', 'throttle:20,1'])
                ->name('users.region-assignments.store');
            Route::patch('/region-assignments/{assignment}', [AdminAccessController::class, 'updateRegionAssignment'])
                ->middleware(['role:super-admin', 'permission:users.manage', 'permission:regions.manage', 'throttle:20,1'])
                ->name('region-assignments.update');
            Route::patch('/roles/{role}/permissions', [AdminAccessController::class, 'updateRolePermissions'])
                ->middleware(['permission:roles.manage', 'throttle:10,1'])
                ->name('roles.permissions.update');
        });
});

require __DIR__.'/settings.php';
