import type { ImgHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type AppLogoIconProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'>;

export default function AppLogoIcon({
    alt = '',
    className,
    ...props
}: AppLogoIconProps) {
    return (
        <img
            {...props}
            src="/icon/logo.png"
            alt={alt}
            aria-hidden={props['aria-hidden'] ?? (alt ? undefined : true)}
            draggable={props.draggable ?? false}
            className={cn('scale-[1.35] object-contain select-none', className)}
        />
    );
}
