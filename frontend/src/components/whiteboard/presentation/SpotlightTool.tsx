import { useState } from 'react';
import { useUIStore } from '@/store';

export function SpotlightTool() {
  const { spotlight, setSpotlight } = useUIStore();
  const [pos, setPos] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 });

  if (!spotlight.active) return null;

  return (
    <div
      className="fixed inset-0 z-[150] cursor-crosshair"
      onMouseMove={(e) => setPos({ x: e.clientX, y: e.clientY })}
      onWheel={(e) => {
        const nextRadius = Math.min(360, Math.max(50, spotlight.radius + (e.deltaY < 0 ? 15 : -15)));
        setSpotlight({ radius: nextRadius });
      }}
      style={{
        background: `radial-gradient(circle ${spotlight.radius}px at ${pos.x}px ${pos.y}px, transparent 0%, rgba(15, 23, 42, 0.78) 100%)`,
      }}
    >
      <div className="fixed bottom-20 right-4 rounded-lg bg-slate-900/90 px-3 py-1.5 text-xs text-white shadow">
        Spotlight active · Scroll to resize · Click Spotlight button to exit
      </div>
    </div>
  );
}

