import * as RadixAvatar from '@radix-ui/react-avatar';
import { cn } from '@/utils/cn';

export interface AvatarProps {
  src?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap: Record<NonNullable<AvatarProps['size']>, string> = {
  sm: 'h-7 w-7 text-xs',
  md: 'h-9 w-9 text-sm',
  lg: 'h-11 w-11 text-base',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
}

export function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  return (
    <RadixAvatar.Root
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-primary-100 font-semibold text-primary-800',
        sizeMap[size],
        className
      )}
    >
      {src && (
        <RadixAvatar.Image src={src} alt={name} className="h-full w-full object-cover" />
      )}
      <RadixAvatar.Fallback delayMs={200}>{getInitials(name || 'R')}</RadixAvatar.Fallback>
    </RadixAvatar.Root>
  );
}

