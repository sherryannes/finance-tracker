'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Tag, Trash2 } from 'lucide-react';

import { api } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';
import { type Category, type TransactionType } from '@/lib/types';

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

const categorySchema = z.object({
  name: z.string().min(1, 'Please enter a name').max(60),
  type: z.enum(['income', 'expense']),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Pick a color')
    .optional()
    .or(z.literal('')),
});

type CategoryFormData = z.infer<typeof categorySchema>;

export default function CategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
      return;
    }
    load();
  }, [router]);

  async function load() {
    try {
      setLoading(true);
      const res = await api.get<Category[]>('/api/categories');
      setCategories(res.data);
      setError(null);
    } catch (err) {
      setError('Failed to load categories.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this category? Transactions will keep their amount but lose the tag.')) {
      return;
    }
    try {
      await api.delete(`/api/categories/${id}`);
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      alert('Failed to delete category.');
      console.error(err);
    }
  }

  const incomeCats = categories.filter((c) => c.type === 'income');
  const expenseCats = categories.filter((c) => c.type === 'expense');

  return (
    <div className="flex flex-1 flex-col">
      <Nav />
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Categories</h1>
            <p className="text-muted-foreground">
              Tag your transactions to see where your money really goes.
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add category
              </Button>
            </DialogTrigger>
            <AddCategoryDialog
              onSuccess={(newCat) => {
                setCategories((prev) => [...prev, newCat]);
                setDialogOpen(false);
              }}
            />
          </Dialog>
        </div>

        {loading && <p className="text-muted-foreground">Loading…</p>}
        {error && !loading && <p className="text-destructive">{error}</p>}

        {!loading && !error && categories.length === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>No categories yet</CardTitle>
              <CardDescription>
                Add categories like &ldquo;Groceries&rdquo;, &ldquo;Salary&rdquo;,
                &ldquo;Rent&rdquo; to organize your transactions.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {!loading && categories.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <CategoryColumn
              title="Expense"
              tone="negative"
              categories={expenseCats}
              onDelete={handleDelete}
            />
            <CategoryColumn
              title="Income"
              tone="positive"
              categories={incomeCats}
              onDelete={handleDelete}
            />
          </div>
        )}
      </main>
    </div>
  );
}

function CategoryColumn({
  title,
  tone,
  categories,
  onDelete,
}: {
  title: string;
  tone: 'positive' | 'negative';
  categories: Category[];
  onDelete: (id: number) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle
          className={
            tone === 'positive' ? 'text-emerald-600' : 'text-rose-600'
          }
        >
          {title}
        </CardTitle>
        <CardDescription>
          {categories.length}{' '}
          {categories.length === 1 ? 'category' : 'categories'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground">None yet.</p>
        ) : (
          <ul className="space-y-2">
            {categories.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-md border bg-muted/30 group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ backgroundColor: c.color ?? '#94a3b8' }}
                  />
                  <span className="font-medium truncate">{c.name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                  onClick={() => onDelete(c.id)}
                  aria-label="Delete category"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function AddCategoryDialog({
  onSuccess,
}: {
  onSuccess: (cat: Category) => void;
}) {
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: '', type: 'expense', color: PRESET_COLORS[0] },
  });

  const typeValue = watch('type');
  const colorValue = watch('color');

  const onSubmit = async (data: CategoryFormData) => {
    setServerError(null);
    try {
      const res = await api.post<Category>('/api/categories', {
        name: data.name,
        type: data.type,
        color: data.color || null,
      });
      reset();
      onSuccess(res.data);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? 'Failed to create category.';
      setServerError(String(message));
    }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Add a category</DialogTitle>
        <DialogDescription>
          Categories help you analyze where your money goes.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            placeholder="e.g. Groceries"
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
            onValueChange={(v) => setValue('type', v as TransactionType)}
          >
            <SelectTrigger id="type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="expense">Expense</SelectItem>
              <SelectItem value="income">Income</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Color</Label>
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setValue('color', c)}
                className={`h-8 w-8 rounded-full border-2 transition-all ${
                  colorValue === c
                    ? 'border-foreground scale-110'
                    : 'border-transparent'
                }`}
                style={{ backgroundColor: c }}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>
        </div>

        {serverError && (
          <p className="text-sm text-destructive">{serverError}</p>
        )}

        <DialogFooter>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating…' : 'Create category'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
