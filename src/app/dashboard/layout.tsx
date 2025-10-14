'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  BookOpen,
  BarChart3,
  Trophy,
  Shield,
  Settings,
  LogOut,
  BrainCircuit,
  PlusCircle,
  Users,
} from 'lucide-react';
import {
  Sidebar,
  SidebarProvider,
  SidebarTrigger,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarInset,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import Logo from '@/components/logo';
import { type User, getCurrentUser } from '@/lib/auth';
import { useAuth, useUser } from '@/firebase';
import { signOut } from 'firebase/auth';

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  roles: ('student' | 'admin' | 'creator')[];
  exact?: boolean;
};

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['student', 'admin', 'creator'], exact: true },
  { href: '/dashboard', label: 'Courses', icon: BookOpen, roles: ['student'] },
  { href: '/dashboard/performance', label: 'Performance', icon: BarChart3, roles: ['student'] },
  { href: '/dashboard/leaderboard', label: 'Leaderboard', icon: Trophy, roles: ['student'] },
  { href: '/dashboard/admin', label: 'Admin', icon: Shield, roles: ['admin', 'creator'] },
  { href: '/dashboard/admin/users', label: 'Users', icon: Users, roles: ['admin'] },
  { href: '/dashboard/admin/new', label: 'Create Course', icon: PlusCircle, roles: ['admin', 'creator'] },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user: firebaseUser, isUserLoading } = useUser();
  const auth = useAuth();
  const [user, setUser] = React.useState<User | null>(null);

  React.useEffect(() => {
    if (!isUserLoading) {
      if (firebaseUser) {
        getCurrentUser(firebaseUser).then(setUser);
      } else {
        router.push('/auth');
      }
    }
  }, [firebaseUser, isUserLoading, router]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/auth');
  };

  const filteredNavItems = navItems.filter(item => user && item.roles.includes(user.role));

  if (isUserLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Loading user data...</p>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar variant="inset" collapsible="icon">
        <SidebarContent>
          <SidebarHeader>
            <Logo />
          </SidebarHeader>
          <SidebarMenu>
            {filteredNavItems.map((item) => (
              <SidebarMenuItem key={item.label}>
                <SidebarMenuButton
                  asChild
                  isActive={item.exact ? pathname === item.href : pathname.startsWith(item.href) && item.href !== '/dashboard'}
                  tooltip={item.label}
                >
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
          <SidebarFooter>
             <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Settings" isActive={pathname === '/dashboard/settings'}>
                    <Link href="/dashboard/settings">
                      <Settings />
                      <span>Settings</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
             </SidebarMenu>
          </SidebarFooter>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-16 items-center justify-between gap-4 border-b px-6">
          <div className='flex items-center gap-2'>
            <SidebarTrigger className="md:hidden" />
            <h1 className="text-lg font-semibold">{navItems.find(item => pathname.startsWith(item.href))?.label || 'Dashboard'}</h1>
          </div>
          <UserNav user={user} onLogout={handleLogout} />
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}

function UserNav({ user, onLogout }: { user: User | null, onLogout: () => void }) {
    if (!user) {
        return <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />;
    }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.avatarUrl} alt={user.name} />
            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
            <Link href="/dashboard/settings">
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
