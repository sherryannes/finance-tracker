'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Wallet } from 'lucide-react';

import { api } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';
import { ACCOUNT_TYPE_LABELS, type Account } from '@/lib/types';

import { Nav } from '@/components/nav';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

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

  // Sum balances across accounts. (Simple sum; doesn't handle multi-currency.)
  const totalBalance = accounts.reduce(
    (sum, a) => sum + Number(a.balance || 0),
    0,
  );
  const primaryCurrency = accounts[0]?.currency ?? '';

  return (
    <div className="flex flex-1 flex-col">
      <Nav />

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8 space-y-6">
        <div>
          <h2 className="text-2xl font-semibold">Welcome back 👋</h2>
          <p className="text-muted-foreground">
            Here&apos;s your financial overview.
          </p>
        </div>

        {/* Summary card */}
        {!loading && !error && accounts.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total balance across all accounts</CardDescription>
              <CardTitle className="text-3xl">
                {primaryCurrency}{' '}
                {totalBalance.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {accounts.length}{' '}
                {accounts.length === 1 ? 'account' : 'accounts'}
              </p>
            </CardContent>
          </Card>
        )}

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
                Add your first account to start tracking your finances.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/accounts">
                  <Plus className="h-4 w-4 mr-2" />
                  Add an account
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {!loading && accounts.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Your accounts</h3>
              <Button variant="outline" size="sm" asChild>
                <Link href="/accounts">
                  <Wallet className="h-4 w-4 mr-2" />
                  Manage
                </Link>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {accounts.map((account) => (
                <Card key={account.id}>
                  <CardHeader>
                    <CardDescription>
                      {ACCOUNT_TYPE_LABELS[account.type]}
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
          </div>
        )}
      </main>
    </div>
  );
}
