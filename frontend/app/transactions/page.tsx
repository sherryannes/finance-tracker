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
  Download,
  Paperclip,
  Pencil,
  Plus,
  Trash2,
  Upload,
  Wallet,
  X,
} from 'lucide-react';

import { api, receiptHref } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';
import {
  ACCOUNT_TYPE_LABELS,
  type Account,
  type Category,
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

// Shared color palette for quick category creation.
const PRESET_COLORS = [
  '#0ea5e9',
  '#f97316',
  '#a855f7',
  '#22c55e',
  '#ec4899',
  '#eab308',
  '#06b6d4',
  '#ef4444',
  '#64748b',
];

// ---------- Form schema ----------
const NO_CATEGORY = '__none__';

const txnSchema = z.object({
  account_id: z.coerce.number().int().positive('Please select an account'),
  category_id: z.string().optional(),
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
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [monthFilter, setMonthFilter] = useState<string>('all');

  // Dialog state: null = closed, 'new' = create mode, Transaction = edit mode
  const [dialogState, setDialogState] = useState<null | 'new' | Transaction>(
    null,
  );

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
      const [txnRes, acctRes, catRes] = await Promise.all([
        api.get<Transaction[]>('/api/transactions', { params: { limit: 500 } }),
        api.get<Account[]>('/api/accounts'),
        api.get<Category[]>('/api/categories'),
      ]);
      setTransactions(txnRes.data);
      setAccounts(acctRes.data);
      setCategories(catRes.data);
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
      const acctRes = await api.get<Account[]>('/api/accounts');
      setAccounts(acctRes.data);
    } catch (err) {
      alert('Failed to delete transaction.');
      console.error(err);
    }
  }

  const accountById = useMemo(
    () => new Map(accounts.map((a) => [a.id, a] as const)),
    [accounts],
  );
  const categoryById = useMemo(
    () => new Map(categories.map((c) => [c.id, c] as const)),
    [categories],
  );

  const months = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((t) => set.add(t.occurred_on.slice(0, 7)));
    return Array.from(set).sort().reverse();
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    if (monthFilter === 'all') return transactions;
    return transactions.filter((t) => t.occurred_on.startsWith(monthFilter));
  }, [transactions, monthFilter]);

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

  // ---------- CSV export ----------
  function handleExportCSV() {
    const headers = [
      'date',
      'type',
      'amount',
      'currency',
      'account',
      'category',
      'note',
    ];
    const rows = filteredTransactions.map((t) => {
      const account = accountById.get(t.account_id);
      const category = t.category_id ? categoryById.get(t.category_id) : null;
      return [
        t.occurred_on,
        t.type,
        t.amount,
        account?.currency ?? '',
        account?.name ?? '',
        category?.name ?? '',
        t.note ?? '',
      ];
    });

    const escape = (val: string | number) => {
      const s = String(val);
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };

    const csv = [headers, ...rows]
      .map((row) => row.map(escape).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const filename =
      monthFilter === 'all'
        ? 'transactions-all.csv'
        : `transactions-${monthFilter}.csv`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // ---------- Render ----------
  return (
    <div className="flex flex-1 flex-col">
      <Nav />

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Transactions</h1>
            <p className="text-muted-foreground">
              Track every penny in and out.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger className="w-[160px]">
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

            <Button
              variant="outline"
              onClick={handleExportCSV}
              disabled={filteredTransactions.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>

            <Button
              onClick={() => setDialogState('new')}
              disabled={accounts.length === 0}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add transaction
            </Button>
          </div>
        </div>

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

        {!loading && filteredTransactions.length > 0 && (
          <Card>
            <CardContent className="p-0">
              <ul className="divide-y">
                {filteredTransactions.map((txn) => {
                  const account = accountById.get(txn.account_id);
                  const category = txn.category_id
                    ? categoryById.get(txn.category_id)
                    : null;
                  const isIncome = txn.type === 'income';
                  return (
                    <li
                      key={txn.id}
                      className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-muted/40 transition-colors group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {isIncome ? (
                          <ArrowUpCircle className="h-5 w-5 text-emerald-600 shrink-0" />
                        ) : (
                          <ArrowDownCircle className="h-5 w-5 text-rose-600 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium truncate">
                              {txn.note || (isIncome ? 'Income' : 'Expense')}
                            </p>
                            {category && (
                              <span
                                className="text-xs px-2 py-0.5 rounded-full font-medium"
                                style={{
                                  backgroundColor:
                                    (category.color ?? '#94a3b8') + '20',
                                  color: category.color ?? '#475569',
                                }}
                              >
                                {category.name}
                              </span>
                            )}
                            {txn.receipt_url && (
                              <a
                                href={receiptHref(txn.receipt_url) ?? '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-muted hover:bg-muted/70 text-muted-foreground hover:text-foreground"
                                title="View receipt"
                              >
                                <Paperclip className="h-3 w-3" />
                                Receipt
                              </a>
                            )}
                          </div>
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

                      <div className="flex items-center gap-2">
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
                        <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => setDialogState(txn)}
                            aria-label="Edit transaction"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
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
                      </div>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* The dialog — controlled by dialogState. */}
        <Dialog
          open={dialogState !== null}
          onOpenChange={(open) => !open && setDialogState(null)}
        >
          {dialogState !== null && (
            <TransactionFormDialog
              accounts={accounts}
              categories={categories}
              transaction={dialogState === 'new' ? null : dialogState}
              onCategoryCreated={(newCat) =>
                setCategories((prev) => [...prev, newCat])
              }
              onSuccess={async (savedTxn) => {
                // Reload transactions + accounts to keep everything consistent.
                const [txnRes, acctRes] = await Promise.all([
                  api.get<Transaction[]>('/api/transactions', {
                    params: { limit: 500 },
                  }),
                  api.get<Account[]>('/api/accounts'),
                ]);
                setTransactions(txnRes.data);
                setAccounts(acctRes.data);
                setDialogState(null);
                void savedTxn;
              }}
            />
          )}
        </Dialog>
      </main>
    </div>
  );
}

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

// ---------- Transaction Form Dialog (create + edit) ----------
function TransactionFormDialog({
  accounts,
  categories,
  transaction,
  onSuccess,
  onCategoryCreated,
}: {
  accounts: Account[];
  categories: Category[];
  transaction: Transaction | null; // null = create, Transaction = edit
  onSuccess: (txn: Transaction) => void;
  onCategoryCreated: (cat: Category) => void;
}) {
  const isEdit = transaction !== null;
  const [serverError, setServerError] = useState<string | null>(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [pendingReceiptFile, setPendingReceiptFile] = useState<File | null>(
    null,
  );
  // Bumped when the existing receipt is removed, so the UI re-renders.
  const [, setReceiptVersion] = useState(0);
  const today = new Date().toISOString().slice(0, 10);

  const defaultValues: TxnFormData = transaction
    ? {
        account_id: transaction.account_id,
        category_id: transaction.category_id
          ? String(transaction.category_id)
          : NO_CATEGORY,
        type: transaction.type,
        amount: Number(transaction.amount),
        occurred_on: transaction.occurred_on,
        note: transaction.note ?? '',
      }
    : {
        account_id: accounts[0]?.id ?? 0,
        category_id: NO_CATEGORY,
        type: 'expense',
        amount: 0,
        occurred_on: today,
        note: '',
      };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<TxnFormData>({
    resolver: zodResolver(txnSchema),
    defaultValues,
  });

  const typeValue = watch('type');
  const accountIdValue = watch('account_id');
  const categoryIdValue = watch('category_id') ?? NO_CATEGORY;

  const matchingCategories = useMemo(
    () => categories.filter((c) => c.type === typeValue),
    [categories, typeValue],
  );

  const onSubmit = async (data: TxnFormData) => {
    setServerError(null);
    try {
      const payload = {
        account_id: data.account_id,
        type: data.type,
        amount: data.amount,
        occurred_on: data.occurred_on,
        note: data.note || null,
        category_id:
          data.category_id && data.category_id !== NO_CATEGORY
            ? Number(data.category_id)
            : null,
      };

      let saved: Transaction;
      if (isEdit && transaction) {
        const res = await api.patch<Transaction>(
          `/api/transactions/${transaction.id}`,
          payload,
        );
        saved = res.data;
      } else {
        const res = await api.post<Transaction>('/api/transactions', payload);
        saved = res.data;
      }

      // If the user picked a new receipt file, upload it now (as a second step).
      if (pendingReceiptFile) {
        const formData = new FormData();
        formData.append('file', pendingReceiptFile);
        const uploadRes = await api.post<Transaction>(
          `/api/transactions/${saved.id}/receipt`,
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } },
        );
        saved = uploadRes.data;
      }

      onSuccess(saved);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? `Failed to ${isEdit ? 'update' : 'record'} transaction.`;
      setServerError(String(message));
    }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>
          {isEdit ? 'Edit transaction' : 'Record a transaction'}
        </DialogTitle>
        <DialogDescription>
          {isEdit
            ? 'Update the transaction below. Account balance will adjust automatically.'
            : 'Pick an account, choose income or expense, and enter the amount.'}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label>Type</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={typeValue === 'expense' ? 'default' : 'outline'}
              onClick={() => {
                setValue('type', 'expense' as TransactionType);
                setValue('category_id', NO_CATEGORY);
              }}
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
              onClick={() => {
                setValue('type', 'income' as TransactionType);
                setValue('category_id', NO_CATEGORY);
              }}
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

        <div className="space-y-2">
          <Label htmlFor="category_id">Category (optional)</Label>
          <div className="flex gap-2">
            <Select
              value={categoryIdValue}
              onValueChange={(v) => setValue('category_id', v)}
            >
              <SelectTrigger id="category_id" className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_CATEGORY}>No category</SelectItem>
                {matchingCategories.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: c.color ?? '#94a3b8' }}
                      />
                      {c.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Inline "+ create new category" */}
            <Dialog open={quickAddOpen} onOpenChange={setQuickAddOpen}>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Create new category"
                  title="Create new category"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <InlineCreateCategoryDialog
                defaultType={typeValue}
                onCreated={(newCat) => {
                  onCategoryCreated(newCat);
                  setValue('category_id', String(newCat.id));
                  setQuickAddOpen(false);
                }}
              />
            </Dialog>
          </div>
          <p className="text-xs text-muted-foreground">
            Need a new tag? Click <Plus className="inline h-3 w-3" /> to create
            one without leaving this dialog.
          </p>
        </div>

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

        <div className="space-y-2">
          <Label htmlFor="note">Note (optional)</Label>
          <Input
            id="note"
            type="text"
            placeholder="e.g. Groceries at Whole Foods"
            {...register('note')}
          />
        </div>

        {/* Receipt section */}
        <ReceiptField
          transaction={transaction}
          pendingFile={pendingReceiptFile}
          onSelectFile={setPendingReceiptFile}
          onRemoveExisting={async () => {
            if (!transaction) return;
            try {
              await api.delete(`/api/transactions/${transaction.id}/receipt`);
              // Mutate locally so the UI updates without a full reload.
              (transaction as Transaction).receipt_url = null;
              // Force a re-render by toggling a state.
              setReceiptVersion((v) => v + 1);
            } catch (err) {
              console.error(err);
              alert('Failed to remove receipt.');
            }
          }}
        />

        {serverError && (
          <p className="text-sm text-destructive">{serverError}</p>
        )}

        <DialogFooter>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? isEdit
                ? 'Saving…'
                : 'Recording…'
              : isEdit
                ? 'Save changes'
                : 'Save transaction'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

// ---------- Inline "Quick Add Category" dialog ----------
// Lives inside the Transaction dialog. Lets you create a category without
// navigating away from the form you're filling out.
function InlineCreateCategoryDialog({
  defaultType,
  onCreated,
}: {
  defaultType: TransactionType;
  onCreated: (cat: Category) => void;
}) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please enter a name');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await api.post<Category>('/api/categories', {
        name: trimmed,
        type: defaultType,
        color,
      });
      // Reset for the next time the form opens.
      setName('');
      setColor(PRESET_COLORS[0]);
      onCreated(res.data);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? 'Failed to create category';
      setError(String(message));
    } finally {
      setSaving(false);
    }
  }

  return (
    <DialogContent className="max-w-sm">
      <DialogHeader>
        <DialogTitle>Quick add category</DialogTitle>
        <DialogDescription>
          New{' '}
          <span
            className={
              defaultType === 'income' ? 'text-emerald-600' : 'text-rose-600'
            }
          >
            {defaultType}
          </span>{' '}
          category — it&apos;ll be auto-selected once created.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="quick-cat-name">Name</Label>
          <Input
            id="quick-cat-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Groceries"
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label>Color</Label>
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setColor(c)}
                className={`h-7 w-7 rounded-full border-2 transition-all ${
                  color === c
                    ? 'border-foreground scale-110'
                    : 'border-transparent'
                }`}
                style={{ backgroundColor: c }}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button type="submit" disabled={saving}>
            {saving ? 'Creating…' : 'Create category'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

// ---------- Receipt field inside the transaction form ----------
function ReceiptField({
  transaction,
  pendingFile,
  onSelectFile,
  onRemoveExisting,
}: {
  transaction: Transaction | null;
  pendingFile: File | null;
  onSelectFile: (file: File | null) => void;
  onRemoveExisting: () => void;
}) {
  // Build a preview URL for the freshly picked file, then clean it up.
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!pendingFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(pendingFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingFile]);

  const existingHref = transaction?.receipt_url
    ? receiptHref(transaction.receipt_url)
    : null;

  return (
    <div className="space-y-2">
      <Label>Receipt (optional)</Label>

      {/* Existing receipt — shown only when editing and not replaced. */}
      {existingHref && !pendingFile && (
        <div className="flex items-center gap-3 border rounded-md p-2 bg-muted/30">
          <a
            href={existingHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm hover:underline"
          >
            <Paperclip className="h-4 w-4" />
            View current receipt
          </a>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-auto text-muted-foreground hover:text-destructive"
            onClick={onRemoveExisting}
          >
            <X className="h-4 w-4 mr-1" />
            Remove
          </Button>
        </div>
      )}

      {/* Preview of a newly picked file before save */}
      {pendingFile && (
        <div className="flex items-center gap-3 border rounded-md p-2 bg-muted/30">
          {previewUrl && pendingFile.type.startsWith('image/') ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Preview"
              className="h-16 w-16 object-cover rounded"
            />
          ) : (
            <Paperclip className="h-8 w-8 text-muted-foreground" />
          )}
          <div className="min-w-0 text-sm">
            <p className="font-medium truncate">{pendingFile.name}</p>
            <p className="text-xs text-muted-foreground">
              {(pendingFile.size / 1024).toFixed(0)} KB — will upload on save
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-auto text-muted-foreground hover:text-destructive"
            onClick={() => onSelectFile(null)}
          >
            <X className="h-4 w-4 mr-1" />
            Remove
          </Button>
        </div>
      )}

      {/* File picker */}
      {!pendingFile && (
        <label className="flex items-center justify-center gap-2 border-2 border-dashed rounded-md py-3 px-4 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 cursor-pointer transition-colors">
          <Upload className="h-4 w-4" />
          {existingHref ? 'Replace receipt' : 'Upload a receipt'}
          <input
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onSelectFile(file);
              e.target.value = '';
            }}
          />
        </label>
      )}
      <p className="text-xs text-muted-foreground">
        Image (JPEG/PNG/WebP/HEIC) or PDF, up to 5 MB.
      </p>
    </div>
  );
}
