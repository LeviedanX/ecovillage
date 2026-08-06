import AppLogoIcon from '@/components/app-logo-icon';

export default function AppLogo() {
    return (
        <>
            <div className="eco-logo-mark flex aspect-square size-9 items-center justify-center">
                <AppLogoIcon className="size-8" />
            </div>
            <div className="ml-1 grid flex-1 text-left text-sm">
                <span className="truncate leading-tight font-bold tracking-tight">
                    EcoVillage<span className="text-primary">.id</span>
                </span>
                <span className="truncate text-[10px] leading-tight text-muted-foreground">
                    Bertumbuh bersama alam
                </span>
            </div>
        </>
    );
}
