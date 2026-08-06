import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';
import { primaryRoleLabel, userRoles } from '@/lib/ecovillage';
import { cn } from '@/lib/utils';
import type { User } from '@/types';

export function UserInfo({
    user,
    showEmail = false,
    showRole = false,
    className,
}: {
    user: User;
    showEmail?: boolean;
    showRole?: boolean;
    className?: string;
}) {
    const getInitials = useInitials();
    const subtitle = showEmail
        ? user.email
        : showRole
          ? primaryRoleLabel(userRoles(user))
          : null;

    return (
        <>
            <Avatar
                className={cn(
                    'size-8 shrink-0 rounded-full ring-1 ring-sidebar-border/70',
                    className,
                )}
            >
                <AvatarImage src={user.avatar ?? undefined} alt={user.name} />
                <AvatarFallback className="rounded-full bg-primary/12 text-xs font-semibold text-primary">
                    {getInitials(user.name)}
                </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                {subtitle !== null && (
                    <span className="truncate text-xs text-muted-foreground">
                        {subtitle}
                    </span>
                )}
            </div>
        </>
    );
}
