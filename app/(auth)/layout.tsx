import { Suspense } from 'react';
import Link from 'next/link';
import { BookOpen, FileCheck2, ShieldCheck, Users } from 'lucide-react';

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? 'PCI Journal Portal';

const HIGHLIGHTS = [
  { icon: FileCheck2, text: 'Online manuscript submission and tracking' },
  { icon: ShieldCheck, text: 'Double-blind peer review with full audit trail' },
  { icon: Users, text: 'Editors, reviewers and production on one platform' },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <div className="tricolor-bar" aria-hidden />
      <div className="grid flex-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <aside className="gov-hero hidden flex-col justify-between p-10 text-white lg:flex">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-md bg-[var(--saffron)] text-[oklch(0.2_0.05_258)]">
              <BookOpen className="size-6" />
            </span>
            <span className="font-serif text-xl font-semibold">{APP_NAME}</span>
          </Link>
          <div className="space-y-8">
            <div className="space-y-3">
              <h2 className="font-serif text-4xl font-semibold leading-tight">Scholarly publishing, managed with integrity.</h2>
              <p className="max-w-md text-white/75">A secure, transparent portal for article submission, peer review, production and publication.</p>
            </div>
            <ul className="space-y-4">
              {HIGHLIGHTS.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-sm text-white/90">
                  <span className="flex size-9 items-center justify-center rounded-full bg-white/10"><Icon className="size-4 text-[var(--saffron)]" /></span>
                  {text}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-white/60">Authorised use only. Activity on this portal is logged.</p>
        </aside>
        <div className="flex flex-col items-center justify-center bg-background p-4 sm:p-8">
          <Link href="/" className="mb-6 flex items-center gap-2 font-serif text-lg font-semibold text-primary lg:hidden">
            <span className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground"><BookOpen className="size-5" /></span>
            {APP_NAME}
          </Link>
          <div className="w-full max-w-md">
            <Suspense>{children}</Suspense>
          </div>
          <p className="mt-6 text-xs text-muted-foreground">
            <Link href="/articles" className="hover:underline">Browse published articles</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
