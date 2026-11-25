import * as RadixSlider from '@radix-ui/react-slider';
import { cn } from '@/utils/cn';

export interface SliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  unit?: string;
  className?: string;
}

export function Slider({
  value,
  onChange,
  min = 1,
  max = 20,
  step = 1,
  label,
  unit = '',
  className,
}: SliderProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-slate-600">{label}</span>
          <span className="font-mono text-slate-800">
            {value}
            {unit}
          </span>
        </div>
      )}
      <RadixSlider.Root
        className="relative flex h-5 w-full touch-none select-none items-center"
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => onChange(v)}
      >
        <RadixSlider.Track className="relative h-1.5 grow rounded-full bg-slate-200">
          <RadixSlider.Range className="absolute h-full rounded-full bg-primary" />
        </RadixSlider.Track>
        <RadixSlider.Thumb
          className="block h-4 w-4 rounded-full border-2 border-primary bg-white shadow focus:outline-none focus:ring-2 focus:ring-primary/30"
          aria-label={label || 'Slider'}
        />
      </RadixSlider.Root>
    </div>
  );
}

