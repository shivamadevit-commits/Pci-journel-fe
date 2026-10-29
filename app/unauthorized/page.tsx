'use client';

import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ROLE_HOME } from '@/lib/constants/roles';
import { useMe } from '@/hooks/use-auth';

export default function UnauthorizedPage() {
  const me = useMe();
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <ShieldAlert className="size-12 text-destructive" aria-hidden />
      <h1 className="text-2xl font-semibold">You don’t have access to this page</h1>
      <p className="max-w-md text-sm text-muted-foreground">Your account’s role does not permit this area. If you think this is a mistake, contact the journal office.</p>
      <div className="flex gap-2">
        <Button asChild><Link href={me.data ? ROLE_HOME[me.data.role] : '/login'}>{me.data ? 'Go to my dashboard' : 'Sign in'}</Link></Button>
      </div>
    </div>
  );
}
