import { Suspense } from 'react';
import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? 'PCI Journal Portal';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="gov-hero text-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Link href="/articles" className="flex items-center gap-3 font-sans text-lg font-semibold">
            <span className="flex size-9 items-center justify-center rounded-md bg-[var(--saffron)] text-[oklch(0.2_0.05_258)]"><BookOpen className="size-5" /></span>
            {APP_NAME}
          </Link>
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="text-white hover:bg-white/10 hover:text-white"><Link href="/reviewer-apply">Become a reviewer</Link></Button>
            <Button asChild size="sm" className="bg-[var(--saffron)] text-[oklch(0.2_0.05_258)] hover:bg-[var(--saffron)]/90"><Link href="/login">Sign in</Link></Button>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 p-4 sm:p-6">
        <Suspense>{children}</Suspense>
      </main>
      <footer className="border-t bg-card">
        <div className="mx-auto max-w-5xl px-4 py-4 text-xs text-muted-foreground">
          {APP_NAME} · Double-blind peer-reviewed publication portal
        </div>
      </footer>
    </div>
  );
}
