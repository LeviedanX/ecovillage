import { ArrowUpRight } from 'lucide-react';
import type { ComponentPropsWithoutRef } from 'react';
import {
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { cn, toUrl } from '@/lib/utils';
import type { NavItem } from '@/types';

export function NavFooter({
    items,
    className,
    ...props
}: ComponentPropsWithoutRef<typeof SidebarGroup> & {
    items: NavItem[];
}) {
    return (
        <SidebarGroup
            {...props}
            className={cn('p-0 group-data-[collapsible=icon]:p-0', className)}
        >
            <SidebarGroupContent>
                <SidebarMenu className="gap-0.5">
                    {items.map((item) => (
                        <SidebarMenuItem key={toUrl(item.href)}>
                            <SidebarMenuButton
                                asChild
                                tooltip={{ children: item.title }}
                                className="h-8 rounded-lg text-sidebar-foreground/70 hover:text-sidebar-accent-foreground"
                            >
                                <a
                                    href={toUrl(item.href)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {item.icon && (
                                        <item.icon className="size-4" />
                                    )}
                                    <span className="text-xs">
                                        {item.title}
                                    </span>
                                    <ArrowUpRight className="ml-auto size-3 opacity-60 group-data-[collapsible=icon]:hidden" />
                                </a>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    );
}
