import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export function Logo({
  className,
  href = "/",
  width = 120,
  height = 30
}: {
  className?: string;
  href?: string;
  width?: number;
  height?: number;
}) {
  return (
    <Link
      href={href}
      className={cn('flex items-center gap-2', className)}
      aria-label="LEBAREF Home"
    >
      <Image
        src="https://res.cloudinary.com/ddbgqzdpj/image/upload/v1771958796/logo-Photoroom_klbk3u.png"
        alt="LEBAREF Logo"
        width={width}
        height={height}
        priority
      />
    </Link>
  );
}
