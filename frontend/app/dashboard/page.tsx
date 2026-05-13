'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Plus,
  TrendingUp,
  Wallet,
} from 'lucide-react';

import { api } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';
import {
  ACCOUNT_TYPE_LABELS,
  type Account,
  type Transaction,
} from '@/lib/types';

import { Nav } from '@/components/nav';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

// Pie-chart palette (lifted from Tailwind's color scale).
const PIE_COLORS = [
  '#0ea5e9', // sky-500
  '#f97316', // orange-500
  '#a855f7', // purple-500
  '#22c55e', // green-500
  '#ec4899', // pink-500
  '#eab308', // yellow-500
  '#06b6d4', // cyan-500
  '#ef4444', // red-500
];

export default function DashboardPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
      return;
    }
    Promise.all([
      api.get<Account[]>('/api/accounts'),
      api.get<Transaction[]>('/api/transactions', { params: { limit: 500 } }),
    ])
      .then(([acctRes, txnRes]) => {
        setAccounts(acctRes.data);
        setTransactions(txnRes.data);
      })
      .catch((err) =>
        setError(err?.message ?? 'Failed to load dashboard data'),
      )
      .finally(() => setLoading(false));
  }, [router]);

  // ---------- Derived data ----------
  const accountById = useMemo(
    () => new Map(accounts.map((a) => [a.id, a] as const)),
    [accounts],
  );

  const primaryCurrency = accounts[0]?.currency ?? '';

  const totalBalance = useMemo(
    () => accounts.reduce((sum, a) => sum + Number(a.balance || 0), 0),
    [accounts],
  );

  // Current month in YYYY-MM
  const currentMonth = new Date().toISOString().slice(0, 7);

  const thisMonthStats = useMemo(() => {
    let income = 0;
    let expense = 0;
    transactions.forEach((t) => {
      if (!t.occurred_on.startsWith(currentMonth)) return;
      const n = Number(t.amount);
      if (t.type === 'income') income += n;
      else expense += n;
    });
    return { income, expense, net: income - expense };
  }, [transactions, currentMonth]);

  // Last 6 months — for the bar chart.
  const monthlyChartData = useMemo(() => {
    const months: { key: string; label: string }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString(undefined, {
        month: 'short',
        year: '2-digit',
      });
      months.push({ key, label });
    }
    return months.map(({ key, label }) => {
      let income = 0;
      let expense = 0;
      transactions.forEach((t) => {
        if (!t.occurred_on.startsWith(key)) return;
        const n = Number(t.amount);
        if (t.type === 'income') income += n;
        else expense += n;
      });
      return { month: label, Income: income, Expense: expense };
    });
  }, [transactions]);

  // Spending breakdown by account — for the pie chart (current month only).
  const spendingByAccount = useMemo(() => {
    const map = new Map<number, number>();
    transactions.forEach((t) => {
      if (t.type !== 'expense') return;
      if (!t.occurred_on.startsWith(currentMonth)) return;
      map.set(t.account_id, (map.get(t.account_id) ?? 0) + Number(t.amount));
    });
    return Array.from(map.entries()).map(([accountId, total]) => ({
      name: accountById.get(accountId)?.name ?? `Account #${accountId}`,
      value: total,
    }));
  }, [transactions, currentMonth, accountById]);

  // Recent 5 transactions.
  const recentTransactions = useMemo(
    () => transactions.slice(0, 5),
    [transactions],
  );

  // ---------- Render ----------
  return (
    <div className="flex flex-1 flex-col">
      <Nav />

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8 space-y-6">
        <div>
          <h2 className="text-2xl font-semibold">Welcome back 👋</h2>
          <p className="text-muted-foreground">
            Here&apos;s your financial overview for{' '}
            {new Date().toLocaleDateString(undefined, {
              month: 'long',
              year: 'numeric',
            })}
            .
          </p>
        </div>

        {loading && <p className="text-muted-foreground">Loading…</p>}

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

        {/* Empty state */}
        {!loading && !error && accounts.length === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Get started</CardTitle>
              <CardDescription>
                Create your first account, then start recording transactions.
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

        {/* Stats row */}
        {!loading && accounts.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total balance"
              value={totalBalance}
              currency={primaryCurrency}
              icon={Wallet}
            />
            <StatCard
              label="This month — Income"
              value={thisMonthStats.income}
              currency={primaryCurrency}
              icon={ArrowUpCircle}
              tone="positive"
            />
            <StatCard
              label="This month — Expense"
              value={thisMonthStats.expense}
              currency={primaryCurrency}
              icon={ArrowDownCircle}
              tone="negative"
            />
            <StatCard
              label="This month — Net"
              value={thisMonthStats.net}
              currency={primaryCurrency}
              icon={TrendingUp}
              tone={thisMonthStats.net >= 0 ? 'positive' : 'negative'}
            />
          </div>
        )}

        {/* Monthly bar chart */}
        {!loading && transactions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Income vs Expense — last 6 months</CardTitle>
              <CardDescription>
                Compare what came in against what went out.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={monthlyChartData}
                    margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                      opacity={0.5}
                    />
                    <XAxis
                      dataKey="month"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickFormatter={(v) =>
                        Number(v).toLocaleString(undefined, {
                          maximumFractionDigits: 0,
                        })
                      }
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 6,
                      }}
                      formatter={(value: number) =>
                        value.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })
                      }
                    />
                    <Legend />
                    <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar
                      dataKey="Expense"
                      fill="#f43f5e"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bottom row: pie chart + recent transactions */}
        {!loading && transactions.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie chart */}
            <Card>
              <CardHeader>
                <CardTitle>Where your money went this month</CardTitle>
                <CardDescription>
                  Spending breakdown by account.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {spendingByAccount.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No expenses recorded this month yet.
                  </p>
                ) : (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={spendingByAccount}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={(entry) => entry.name}
                        >
                          {spendingByAccount.map((_, idx) => (
                            <Cell
                              key={idx}
                              fill={PIE_COLORS[idx % PIE_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) =>
                            value.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })
                          }
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent transactions */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>Recent transactions</CardTitle>
                  <CardDescription>Your latest 5 entries.</CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/transactions">View all</Link>
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {recentTransactions.length === 0 ? (
                  <p className="text-muted-foreground text-sm px-6 pb-6">
                    No transactions yet.
                  </p>
                ) : (
                  <ul className="divide-y">
                    {recentTransactions.map((txn) => {
                      const account = accountById.get(txn.account_id);
                      const isIncome = txn.type === 'income';
                      return (
                        <li
                          key={txn.id}
                          className="flex items-center justify-between gap-3 px-5 py-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {isIncome ? (
                              <ArrowUpCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                            ) : (
                              <ArrowDownCircle className="h-4 w-4 text-rose-600 shrink-0" />
                            )}
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">
                                {txn.note ||
                                  (isIncome ? 'Income' : 'Expense')}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {txn.occurred_on}
                              </p>
                            </div>
                          </div>
                          <span
                            className={`text-sm font-semibold tabular-nums ${
                              isIncome ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {isIncome ? '+' : '−'}
                            {account?.currency ?? ''}{' '}
                            {Number(txn.amount).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Account cards */}
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

// ---------- StatCard ----------
function StatCard({
  label,
  value,
  currency,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  currency: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: 'positive' | 'negative';
}) {
  const colorClass =
    tone === 'positive'
      ? 'text-emerald-600'
      : tone === 'negative'
        ? 'text-rose-600'
        : '';
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardDescription className="text-xs">{label}</CardDescription>
        <Icon className={`h-4 w-4 ${colorClass || 'text-muted-foreground'}`} />
      </CardHeader>
      <CardContent>
        <p className={`text-2xl font-semibold ${colorClass}`}>
          {currency && `${currency} `}
          {value.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </p>
      </CardContent>
    </Card>
  );
}
