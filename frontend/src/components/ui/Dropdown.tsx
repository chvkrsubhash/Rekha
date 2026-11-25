import React from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Check } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface DropdownItem {
  label: string;
  onSelect: () => void;
  icon?: React.ReactNode;
  selected?: boolean;
  danger?: boolean;
  disabled?: boolean;
  separator?: boolean;
}

export interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'right' | 'bottom' | 'left';
}

export function Dropdown({ trigger, items, align = 'end', side = 'bottom' }: DropdownProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align={align}
          side={side}
          sideOffset={6}
          className="z-[150] min-w-[180px] rounded-lg border border-slate-200 bg-white p-1 shadow-dropdown animate-fade-in"
        >
          {items.map((item, idx) =>
            item.separator ? (
              <DropdownMenu.Separator key={`sep-${idx}`} className="my-1 h-px bg-slate-100" />
            ) : (
              <DropdownMenu.Item
                key={item.label}
                disabled={item.disabled}
                onSelect={item.onSelect}
                className={cn(
                  'flex cursor-pointer items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
                  item.danger
                    ? 'text-red-600 focus:bg-red-50'
                    : 'text-slate-700 focus:bg-slate-100 focus:text-slate-900'
                )}
              >
                <span className="flex items-center gap-2">
                  {item.icon && <span className="text-slate-400">{item.icon}</span>}
                  {item.label}
                </span>
                {item.selected && <Check className="h-3.5 w-3.5 text-primary" />}
              </DropdownMenu.Item>
            )
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

