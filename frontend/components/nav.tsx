'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, LogOut, Wallet, Receipt, Tag } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { clearToken } from '@/lib/auth';

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/accounts', label: 'Accounts', icon: Wallet },
  { href: '/transactions', label: 'Transactions', icon: Receipt },
  { href: '/categories', label: 'Categories', icon: Tag },
];

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    clearToken();
    router.replace('/login');
  };

  return (
    <header className="border-b bg-background">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-3">
        {/* Brand */}
        <Link href="/dashboard" className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          <span className="font-semibold">Finance Tracker</span>
        </Link>

        {/* Nav links */}
        <nav className="hidden sm:flex items-center gap-1">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-secondary text-secondary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" />
          Log out
        </Button>
      </div>
    </header>
  );
}
