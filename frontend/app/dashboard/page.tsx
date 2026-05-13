'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Wallet } from 'lucide-react';

import { api } from '@/lib/api';
import { clearToken, isAuthenticated } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface Account {
  id: number;
  name: string;
  type: string;
  balance: string;
  currency: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
      return;
    }
    api
      .get<Account[]>('/api/accounts')
      .then((res) => setAccounts(res.data))
      .catch((err) => setError(err?.message ?? 'Failed to load accounts'))
      .finally(() => setLoading(false));
  }, [router]);

  const handleLogout = () => {
    clearToken();
    router.replace('/login');
  };

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <header className="border-b bg-background">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            <h1 className="font-semibold">Finance Tracker</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Log out
          </Button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8 space-y-6">
        <div>
          <h2 className="text-2xl font-semibold">Welcome back 👋</h2>
          <p className="text-muted-foreground">
            Here&apos;s your financial overview.
          </p>
        </div>

        {loading && (
          <p className="text-muted-foreground">Loading your accounts…</p>
        )}

        {error && !loading && (
          <Card>
            <CardHeader>
              <CardTitle className="text-destructive">
                Something went wrong
              </CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
          </Card>
        )}

        {!loading && !error && accounts.length === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>No accounts yet</CardTitle>
              <CardDescription>
                Coming up: add accounts and transactions. We&apos;ll build the
                UI for it in the next step.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {!loading && accounts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((account) => (
              <Card key={account.id}>
                <CardHeader>
                  <CardDescription className="capitalize">
                    {account.type.replace('_', ' ')}
                  </CardDescription>
                  <CardTitle>{account.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold">
                    {account.currency}{' '}
                    {Number(account.balance).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
