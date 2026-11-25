import React from 'react';
import * as RadixTabs from '@radix-ui/react-tabs';
import { cn } from '@/utils/cn';

export interface TabItem {
  value: string;
  label: string;
  icon?: React.ReactNode;
  content: React.ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  variant?: 'underline' | 'filled';
  className?: string;
}

export function Tabs({
  items,
  defaultValue,
  value,
  onValueChange,
  variant = 'underline',
  className,
}: TabsProps) {
  return (
    <RadixTabs.Root
      defaultValue={defaultValue || items[0]?.value}
      value={value}
      onValueChange={onValueChange}
      className={cn('w-full', className)}
    >
      <RadixTabs.List
        className={cn(
          'flex items-center gap-1',
          variant === 'underline'
            ? 'border-b border-slate-200'
            : 'rounded-lg bg-slate-100 p-1'
        )}
      >
        {items.map((item) => (
          <RadixTabs.Trigger
            key={item.value}
            value={item.value}
            className={cn(
              'inline-flex items-center gap-1.5 text-xs font-medium transition-colors outline-none',
              variant === 'underline'
                ? 'border-b-2 border-transparent px-3 py-2 text-slate-600 hover:text-slate-900 data-[state=active]:border-primary data-[state=active]:text-primary'
                : 'rounded-md px-3 py-1.5 text-slate-600 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm'
            )}
          >
            {item.icon}
            {item.label}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>
      {items.map((item) => (
        <RadixTabs.Content key={item.value} value={item.value} className="pt-4 outline-none">
          {item.content}
        </RadixTabs.Content>
      ))}
    </RadixTabs.Root>
  );
}

