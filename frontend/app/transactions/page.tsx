'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Plus,
  Trash2,
  Wallet,
} from 'lucide-react';

import { api } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';
import {
  ACCOUNT_TYPE_LABELS,
  type Account,
  type Transaction,
  type TransactionType,
} from '@/lib/types';

import { Nav } from '@/components/nav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ---------- Form schema ----------
const txnSchema = z.object({
  account_id: z.coerce.number().int().positive('Please select an account'),
  type: z.enum(['income', 'expense']),
  amount: z.coerce
    .number({ message: 'Please enter a valid number' })
    .positive('Amount must be greater than 0'),
  occurred_on: z.string().min(1, 'Please pick a date'),
  note: z.string().max(255).optional(),
});

type TxnFormData = z.infer<typeof txnSchema>;

// ---------- Page ----------
export default function TransactionsPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Month filter: 'all' or 'YYYY-MM'
  const [monthFilter, setMonthFilter] = useState<string>('all');

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
      return;
    }
    loadData();
  }, [router]);

  async function loadData() {
    try {
      setLoading(true);
      const [txnRes, acctRes] = await Promise.all([
        api.get<Transaction[]>('/api/transactions', { params: { limit: 500 } }),
        api.get<Account[]>('/api/accounts'),
      ]);
      setTransactions(txnRes.data);
      setAccounts(acctRes.data);
      setError(null);
    } catch (err) {
      setError('Failed to load transactions.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(txnId: number) {
    if (!confirm('Delete this transaction? Account balance will be restored.')) {
      return;
    }
    try {
      await api.delete(`/api/transactions/${txnId}`);
      setTransactions((prev) => prev.filter((t) => t.id !== txnId));
      // Reload accounts so balances reflect the deletion.
      const acctRes = await api.get<Account[]>('/api/accounts');
      setAccounts(acctRes.data);
    } catch (err) {
      alert('Failed to delete transaction.');
      console.error(err);
    }
  }

  // ---- Derived data ----
  const accountById = useMemo(
    () => new Map(accounts.map((a) => [a.id, a] as const)),
    [accounts],
  );

  // Build a sorted list of months available in the data, for the filter dropdown.
  const months = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((t) => set.add(t.occurred_on.slice(0, 7)));
    return Array.from(set).sort().reverse();
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    if (monthFilter === 'all') return transactions;
    return transactions.filter((t) => t.occurred_on.startsWith(monthFilter));
  }, [transactions, monthFilter]);

  // Sum income and expense for the current view.
  const summary = useMemo(() => {
    let income = 0;
    let expense = 0;
    filteredTransactions.forEach((t) => {
      const n = Number(t.amount);
      if (t.type === 'income') income += n;
      else expense += n;
    });
    return { income, expense, net: income - expense };
  }, [filteredTransactions]);

  // ---- Render ----
  return (
    <div className="flex flex-1 flex-col">
      <Nav />

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Transactions</h1>
            <p className="text-muted-foreground">
              Track every penny in and out.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Month filter */}
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All months</SelectItem>
                {months.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button disabled={accounts.length === 0}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add transaction
                </Button>
              </DialogTrigger>
              <AddTransactionDialog
                accounts={accounts}
                onSuccess={(newTxn, updatedAccount) => {
                  setTransactions((prev) => [newTxn, ...prev]);
                  setAccounts((prev) =>
                    prev.map((a) =>
                      a.id === updatedAccount.id ? updatedAccount : a,
                    ),
                  );
                  setDialogOpen(false);
                }}
              />
            </Dialog>
          </div>
        </div>

        {/* Summary cards */}
        {!loading && filteredTransactions.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SummaryCard
              title="Income"
              value={summary.income}
              tone="positive"
            />
            <SummaryCard
              title="Expense"
              value={summary.expense}
              tone="negative"
            />
            <SummaryCard
              title="Net"
              value={summary.net}
              tone={summary.net >= 0 ? 'positive' : 'negative'}
            />
          </div>
        )}

        {/* Empty / loading / error states */}
        {loading && (
          <p className="text-muted-foreground">Loading transactions…</p>
        )}

        {error && !loading && <p className="text-destructive">{error}</p>}

        {!loading && !error && accounts.length === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>No accounts yet</CardTitle>
              <CardDescription>
                You need to create an account before you can record
                transactions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/accounts">
                  <Wallet className="h-4 w-4 mr-2" />
                  Add an account
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {!loading &&
          accounts.length > 0 &&
          filteredTransactions.length === 0 && (
            <Card>
              <CardHeader>
                <CardTitle>No transactions yet</CardTitle>
                <CardDescription>
                  Click &ldquo;Add transaction&rdquo; to record your first one.
                </CardDescription>
              </CardHeader>
            </Card>
          )}

        {/* Transactions list */}
        {!loading && filteredTransactions.length > 0 && (
          <Card>
            <CardContent className="p-0">
              <ul className="divide-y">
                {filteredTransactions.map((txn) => {
                  const account = accountById.get(txn.account_id);
                  const isIncome = txn.type === 'income';
                  return (
                    <li
                      key={txn.id}
                      className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {isIncome ? (
                          <ArrowUpCircle className="h-5 w-5 text-emerald-600 shrink-0" />
                        ) : (
                          <ArrowDownCircle className="h-5 w-5 text-rose-600 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="font-medium truncate">
                            {txn.note || (isIncome ? 'Income' : 'Expense')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {txn.occurred_on}
                            {account && (
                              <>
                                {' · '}
                                {account.name}{' '}
                                <span className="text-muted-foreground/70">
                                  ({ACCOUNT_TYPE_LABELS[account.type]})
                                </span>
                              </>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={`font-semibold tabular-nums ${
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
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(txn.id)}
                          aria-label="Delete transaction"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

// ---------- Summary card ----------
function SummaryCard({
  title,
  value,
  tone,
}: {
  title: string;
  value: number;
  tone: 'positive' | 'negative';
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle
          className={`text-2xl ${
            tone === 'positive' ? 'text-emerald-600' : 'text-rose-600'
          }`}
        >
          {value.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </CardTitle>
      </CardHeader>
    </Card>
  );
}

// ---------- Add Transaction Dialog ----------
function AddTransactionDialog({
  accounts,
  onSuccess,
}: {
  accounts: Account[];
  onSuccess: (txn: Transaction, updatedAccount: Account) => void;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TxnFormData>({
    resolver: zodResolver(txnSchema),
    defaultValues: {
      account_id: accounts[0]?.id ?? 0,
      type: 'expense',
      amount: 0,
      occurred_on: today,
      note: '',
    },
  });

  const typeValue = watch('type');
  const accountIdValue = watch('account_id');

  const onSubmit = async (data: TxnFormData) => {
    setServerError(null);
    try {
      const res = await api.post<Transaction>('/api/transactions', data);

      // Re-fetch the affected account to get the new balance.
      const acctRes = await api.get<Account>(
        `/api/accounts/${data.account_id}`,
      );

      reset({ ...data, amount: 0, note: '' });
      onSuccess(res.data, acctRes.data);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? 'Failed to record transaction.';
      setServerError(String(message));
    }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Record a transaction</DialogTitle>
        <DialogDescription>
          Pick an account, choose income or expense, and enter the amount.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Type */}
        <div className="space-y-2">
          <Label>Type</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={typeValue === 'expense' ? 'default' : 'outline'}
              onClick={() => setValue('type', 'expense' as TransactionType)}
              className={
                typeValue === 'expense'
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : ''
              }
            >
              <ArrowDownCircle className="h-4 w-4 mr-2" />
              Expense
            </Button>
            <Button
              type="button"
              variant={typeValue === 'income' ? 'default' : 'outline'}
              onClick={() => setValue('type', 'income' as TransactionType)}
              className={
                typeValue === 'income'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : ''
              }
            >
              <ArrowUpCircle className="h-4 w-4 mr-2" />
              Income
            </Button>
          </div>
        </div>

        {/* Account */}
        <div className="space-y-2">
          <Label htmlFor="account_id">Account</Label>
          <Select
            value={String(accountIdValue)}
            onValueChange={(v) => setValue('account_id', Number(v))}
          >
            <SelectTrigger id="account_id">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={String(a.id)}>
                  {a.name} ({ACCOUNT_TYPE_LABELS[a.type]})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.account_id && (
            <p className="text-sm text-destructive">
              {errors.account_id.message}
            </p>
          )}
        </div>

        {/* Amount */}
        <div className="space-y-2">
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            {...register('amount')}
          />
          {errors.amount && (
            <p className="text-sm text-destructive">{errors.amount.message}</p>
          )}
        </div>

        {/* Date */}
        <div className="space-y-2">
          <Label htmlFor="occurred_on">Date</Label>
          <Input
            id="occurred_on"
            type="date"
            max={today}
            {...register('occurred_on')}
          />
          {errors.occurred_on && (
            <p className="text-sm text-destructive">
              {errors.occurred_on.message}
            </p>
          )}
        </div>

        {/* Note */}
        <div className="space-y-2">
          <Label htmlFor="note">Note (optional)</Label>
          <Input
            id="note"
            type="text"
            placeholder="e.g. Groceries at Whole Foods"
            {...register('note')}
          />
        </div>

        {serverError && (
          <p className="text-sm text-destructive">{serverError}</p>
        )}

        <DialogFooter>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save transaction'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
