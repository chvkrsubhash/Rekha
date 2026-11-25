import { useState } from 'react';
import { HexColorPicker } from 'react-colorful';
import * as Popover from '@radix-ui/react-popover';
import { cn } from '@/utils/cn';

const TEACHING_PRESET_COLORS = [
  '#1F2937', // Charcoal Black
  '#FFFFFF', // Chalk White
  '#DC2626', // Crimson Red
  '#2563EB', // Royal Blue
  '#16A34A', // Forest Green
  '#EAB308', // Chalk Yellow
  '#EA580C', // Orange
  '#7C3AED', // Purple
  '#0D9488', // Rekha Teal
  '#78350F', // Brown
];

export interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  label?: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
}

export function ColorPicker({ color, onChange, label, side = 'right' }: ColorPickerProps) {
  const [hexInput, setHexInput] = useState(color);

  const handleHexChange = (val: string) => {
    setHexInput(val);
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
      onChange(val);
    }
  };

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          title={label || 'Choose color'}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white p-1 hover:border-primary"
        >
          <span
            className="h-5 w-5 rounded-full border border-slate-300"
            style={{ backgroundColor: color }}
          />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side={side}
          sideOffset={8}
          className="z-[200] w-56 rounded-xl border border-slate-200 bg-white p-3 shadow-dropdown"
        >
          {label && <p className="mb-2 text-xs font-semibold text-slate-700">{label}</p>}
          <HexColorPicker
            color={color}
            onChange={(c) => {
              setHexInput(c);
              onChange(c);
            }}
            className="!w-full !h-36"
          />
          <div className="mt-3 grid grid-cols-5 gap-1.5">
            {TEACHING_PRESET_COLORS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setHexInput(preset);
                  onChange(preset);
                }}
                className={cn(
                  'h-6 w-6 rounded-full border border-slate-300 transition-transform hover:scale-110',
                  color.toLowerCase() === preset.toLowerCase() && 'ring-2 ring-primary ring-offset-1'
                )}
                style={{ backgroundColor: preset }}
                aria-label={`Select color ${preset}`}
              />
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Hex</span>
            <input
              type="text"
              value={hexInput}
              onChange={(e) => handleHexChange(e.target.value)}
              className="h-7 w-full rounded border border-slate-200 px-2 font-mono text-xs text-slate-800 focus:border-primary focus:outline-none"
            />
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

