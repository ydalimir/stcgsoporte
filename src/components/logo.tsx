
import Link from 'next/link';
import { cn } from '@/lib/utils';

export function Logo({className}: {className?: string}) {
  return (
    <Link
      href="/"
      className={cn('flex items-center gap-2', className)}
      aria-label="TECHFLOW CRM Home"
    >
      <span className="font-bold text-xl font-headline">TECHFLOW CRM</span>
    </Link>
  );
}
