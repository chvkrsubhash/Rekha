import { useState } from 'react';
import { GripHorizontal, X } from 'lucide-react';
import { useUIStore } from '@/store';

export function CurtainTool() {
  const { curtainProgress, setCurtainProgress } = useUIStore();
  const [dragging, setDragging] = useState(false);

  if (curtainProgress <= 0) return null;

  const heightPercent = Math.round(curtainProgress * 100);

  return (
    <div
      className="fixed inset-0 z-[150] pointer-events-none"
      onPointerMove={(e) => {
        if (!dragging) return;
        const pct = Math.min(1, Math.max(0.05, e.clientY / window.innerHeight));
        setCurtainProgress(pct);
      }}
      onPointerUp={() => setDragging(false)}
    >
      <div
        className="pointer-events-auto relative w-full bg-slate-900 shadow-xl transition-[height] duration-75"
        style={{ height: `${heightPercent}%` }}
      >
        <div className="flex h-full items-center justify-center text-slate-400 text-xs select-none">
          Screen Curtain — Drag bottom bar to reveal content
        </div>

        {/* Bottom Drag Handle */}
        <div
          onPointerDown={() => setDragging(true)}
          className="absolute bottom-0 left-0 right-0 flex h-7 cursor-ns-resize items-center justify-center gap-3 bg-primary text-white"
        >
          <GripHorizontal className="h-4 w-4" />
          <span className="text-[11px] font-medium">Drag to reveal ({100 - heightPercent}% visible)</span>
          <button
            type="button"
            onClick={() => setCurtainProgress(0)}
            className="ml-4 rounded p-0.5 hover:bg-white/20"
            title="Close curtain"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

