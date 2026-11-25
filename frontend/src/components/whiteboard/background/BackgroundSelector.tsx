import { Modal } from '@/components/ui/Modal';
import { useWhiteboardStore } from '@/store';
import type { BackgroundType } from '@/types';
import { cn } from '@/utils/cn';

interface BackgroundSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const BACKGROUNDS: Array<{ type: BackgroundType; label: string; previewClass: string }> = [
  { type: 'white', label: 'Plain Whiteboard', previewClass: 'bg-white' },
  { type: 'blackboard', label: 'Blackboard', previewClass: 'bg-[#202020]' },
  { type: 'chalkboard', label: 'Green Chalkboard', previewClass: 'bg-[#173F35]' },
  { type: 'cornell', label: 'Ruled Paper', previewClass: 'bg-ruled' },
  { type: 'grid', label: 'Math Graph Grid', previewClass: 'bg-graph' },
  { type: 'dots', label: 'Dotted Paper', previewClass: 'bg-dotted' },
];

export function BackgroundSelector({ open, onOpenChange }: BackgroundSelectorProps) {
  const { background, setBackground } = useWhiteboardStore();

  const handleSelect = (type: BackgroundType) => {
    setBackground({ type });
    onOpenChange(false);
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Page Background"
      description="Switch the current page background without losing your drawings."
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {BACKGROUNDS.map((bg) => (
          <button
            key={bg.type}
            type="button"
            onClick={() => handleSelect(bg.type)}
            className={cn(
              'flex flex-col overflow-hidden rounded-lg border-2 text-left transition-all',
              background.type === bg.type
                ? 'border-primary ring-2 ring-primary/20'
                : 'border-slate-200 hover:border-slate-300'
            )}
          >
            <div className={cn('h-20 w-full border-b border-slate-100', bg.previewClass)} />
            <div className="px-2.5 py-2 text-xs font-medium text-slate-800">{bg.label}</div>
          </button>
        ))}
      </div>
    </Modal>
  );
}

