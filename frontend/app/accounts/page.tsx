'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, Wallet, CreditCard, Landmark, TrendingUp, Coins } from 'lucide-react';

import { api } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';
import { ACCOUNT_TYPE_LABELS, type Account, type AccountType } from '@/lib/types';

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

const accountSchema = z.object({
  name: z.string().min(1, 'Please enter a name').max(80),
  type: z.enum(['cash', 'bank', 'credit_card', 'investment', 'other']),
  balance: z.coerce
    .number({ message: 'Please enter a number' })
    .min(-1_000_000_000)
    .max(1_000_000_000),
  currency: z
    .string()
    .length(3, 'Use a 3-letter currency code (e.g. USD)')
    .toUpperCase(),
});

type AccountFormData = z.infer<typeof accountSchema>;

// Pick an icon based on account type.
function iconFor(type: AccountType) {
  switch (type) {
    case 'cash':
      return Coins;
    case 'bank':
      return Landmark;
    case 'credit_card':
      return CreditCard;
    case 'investment':
      return TrendingUp;
    default:
      return Wallet;
  }
}

export default function AccountsPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Redirect unauthenticated users; otherwise load accounts.
  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
      return;
    }
    loadAccounts();
  }, [router]);

  async function loadAccounts() {
    try {
      setLoading(true);
      const res = await api.get<Account[]>('/api/accounts');
      setAccounts(res.data);
      setError(null);
    } catch (err) {
      setError('Failed to load accounts.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(accountId: number) {
    if (!confirm('Delete this account? All its transactions will also be deleted.')) {
      return;
    }
    try {
      await api.delete(`/api/accounts/${accountId}`);
      setAccounts((prev) => prev.filter((a) => a.id !== accountId));
    } catch (err) {
      alert('Failed to delete account.');
      console.error(err);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <Nav />

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Accounts</h1>
            <p className="text-muted-foreground">
              Manage where your money lives.
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add account
              </Button>
            </DialogTrigger>
            <AddAccountDialog
              onSuccess={(newAccount) => {
                setAccounts((prev) => [...prev, newAccount]);
                setDialogOpen(false);
              }}
            />
          </Dialog>
        </div>

        {/* Content */}
        {loading && (
          <p className="text-muted-foreground">Loading your accounts…</p>
        )}

        {error && !loading && <p className="text-destructive">{error}</p>}

        {!loading && !error && accounts.length === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>No accounts yet</CardTitle>
              <CardDescription>
                Click &ldquo;Add account&rdquo; above to create your first one.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {!loading && accounts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((account) => {
              const Icon = iconFor(account.type);
              return (
                <Card key={account.id} className="relative group">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="rounded-md bg-primary/10 p-2">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <CardDescription>
                        {ACCOUNT_TYPE_LABELS[account.type]}
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(account.id)}
                      aria-label="Delete account"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <CardTitle className="text-lg mb-1">
                      {account.name}
                    </CardTitle>
                    <p className="text-2xl font-semibold">
                      {account.currency}{' '}
                      {Number(account.balance).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

// ---------- Add Account Dialog ----------
function AddAccountDialog({
  onSuccess,
}: {
  onSuccess: (account: Account) => void;
}) {
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      name: '',
      type: 'cash',
      balance: 0,
      currency: 'USD',
    },
  });

  const typeValue = watch('type');

  const onSubmit = async (data: AccountFormData) => {
    setServerError(null);
    try {
      const res = await api.post<Account>('/api/accounts', data);
      reset();
      onSuccess(res.data);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? 'Failed to create account.';
      setServerError(String(message));
    }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Add a new account</DialogTitle>
        <DialogDescription>
          Cash, bank, credit card, investment — whatever holds your money.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Account name</Label>
          <Input
            id="name"
            placeholder="e.g. Chase Checking"
            {...register('name')}
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="type">Type</Label>
          <Select
            value={typeValue}
            onValueChange={(v) => setValue('type', v as AccountType)}
          >
            <SelectTrigger id="type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(ACCOUNT_TYPE_LABELS) as AccountType[]).map(
                (key) => (
                  <SelectItem key={key} value={key}>
                    {ACCOUNT_TYPE_LABELS[key]}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="balance">Initial balance</Label>
            <Input
              id="balance"
              type="number"
              step="0.01"
              {...register('balance')}
            />
            {errors.balance && (
              <p className="text-sm text-destructive">
                {errors.balance.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Input
              id="currency"
              maxLength={3}
              placeholder="USD"
              {...register('currency')}
            />
            {errors.currency && (
              <p className="text-sm text-destructive">
                {errors.currency.message}
              </p>
            )}
          </div>
        </div>

        {serverError && (
          <p className="text-sm text-destructive">{serverError}</p>
        )}

        <DialogFooter>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating…' : 'Create account'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
