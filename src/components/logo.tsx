
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export function Logo({className}: {className?: string}) {
  return (
    <Link
      href="/"
      className={cn('flex items-center gap-2', className)}
      aria-label="sticgsa Home"
    >
      <Image
        src="https://www.sticgsa.com/assets/img/logosticgsa.png"
        alt="sticgsa Logo"
        width={100}
        height={40}
        className="object-contain"
      />
    </Link>
  );
}
