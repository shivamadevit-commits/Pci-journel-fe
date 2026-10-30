'use client';

import { Suspense, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Bell, BookOpen, ChevronsUpDown, LogOut, UserCog } from 'lucide-react';
import { api } from '@/lib/api-client';
import { NAV, ROLE_HOME, ROLE_LABELS, type NavItem, type Role } from '@/lib/constants/roles';
import { useMe, useSignOut } from '@/hooks/use-auth';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarRail, SidebarTrigger } from '@/components/ui/sidebar';
import { PageSkeleton } from '@/components/shared/states';
import type { NotificationItem } from '@/types/domain';

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? 'PCI Journal Portal';

const AREA_ROLES: Record<string, Role[]> = {
  '/author': ['AUTHOR'],
  '/reviewer': ['REVIEWER'],
  '/production': ['PRODUCTION'],
  '/editor': ['EDITOR', 'CHIEF_EDITOR_ADMIN'],
  '/admin': ['CHIEF_EDITOR_ADMIN'],
};

const initials = (f: string, l: string) => `${f[0] ?? ''}${l[0] ?? ''}`.toUpperCase();

function isActive(pathname: string, item: NavItem) {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function NotificationBell() {
  const q = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => (await api.get<NotificationItem[]>('/notifications', { pageSize: 1, unreadOnly: 'true' })).meta?.unread ?? 0,
    refetchInterval: 60_000,
  });
  const n = q.data ?? 0;
  return (
    <Button asChild variant="ghost" size="icon" aria-label={n ? `Notifications, ${n} unread` : 'Notifications'} className="relative">
      <Link href="/notifications">
        <Bell className="size-4" />
        {n > 0 && <Badge className="absolute -right-1 -top-1 h-4 min-w-4 justify-center rounded-full px-1 text-[10px]">{n > 99 ? '99+' : n}</Badge>}
      </Link>
    </Button>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const me = useMe();
  const signOut = useSignOut();
  const user = me.data;

  useEffect(() => {
    if (!user) return;
    const area = Object.keys(AREA_ROLES).find((a) => pathname === a || pathname.startsWith(`${a}/`));
    if (area && !AREA_ROLES[area]!.includes(user.role)) router.replace('/unauthorized');
  }, [user, pathname, router]);

  if (me.isLoading || !user) {
    return (
      <div className="p-6">
        <PageSkeleton />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild tooltip={APP_NAME}>
                <Link href={ROLE_HOME[user.role]}>
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-[var(--saffron)] text-[oklch(0.2_0.05_258)] shadow-sm">
                    <BookOpen className="size-4" />
                  </span>
                  <span className="grid flex-1 text-left leading-tight">
                    <span className="truncate text-sm font-semibold">{APP_NAME}</span>
                    <span className="truncate text-xs text-sidebar-foreground/70">{ROLE_LABELS[user.role]}</span>
                  </span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          {NAV[user.role].map((group) => (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={isActive(pathname, item)} tooltip={item.label}>
                        <Link href={item.href}>
                          <item.icon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton size="lg" tooltip="Account">
                    <Avatar className="size-8">
                      <AvatarFallback>{initials(user.firstName, user.lastName)}</AvatarFallback>
                    </Avatar>
                    <span className="grid flex-1 text-left leading-tight">
                      <span className="truncate text-sm font-medium">{user.firstName} {user.lastName}</span>
                      <span className="truncate text-xs text-sidebar-foreground/70">{user.email}</span>
                    </span>
                    <ChevronsUpDown className="size-4" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" align="start" className="w-60">
                  <DropdownMenuLabel className="font-normal">
                    <p className="text-sm font-medium">{user.firstName} {user.lastName}</p>
                    <p className="text-xs text-muted-foreground">{ROLE_LABELS[user.role]}</p>
                    {user.reviewerProfile && <p className="mt-1 font-mono text-xs">Reviewer ID: {user.reviewerProfile.reviewerCode}</p>}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile">
                      <UserCog /> Profile & security
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => void signOut()}>
                    <LogOut /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-card/95 px-4 shadow-xs backdrop-blur">
          <SidebarTrigger aria-label="Toggle navigation" />
          <Separator orientation="vertical" className="mx-1 h-5" />
          <span className="hidden text-sm font-medium text-primary sm:block">{APP_NAME}</span>
          <div className="ml-auto flex items-center gap-1">
            <NotificationBell />
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6">
          <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
