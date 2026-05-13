'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Send the user to the right page based on whether they're logged in.
    router.replace(isAuthenticated() ? '/dashboard' : '/login');
  }, [router]);

  return (
    <div className="flex flex-1 items-center justify-center">
      <p className="text-muted-foreground">Loading…</p>
    </div>
  );
}
