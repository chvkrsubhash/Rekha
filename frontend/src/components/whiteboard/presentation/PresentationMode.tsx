import { useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Pen,
  Highlighter,
  Eraser,
  Sparkles,
  Sun,
  PanelTopClose,
  Timer,
  X,
} from 'lucide-react';
import { useWhiteboardStore, useUIStore } from '@/store';
import { TeachingTool } from '@/types';

export function PresentationMode() {
  const { pages, currentPageId, setCurrentPage, tool, setTool } = useWhiteboardStore();
  const {
    presentationMode,
    setPresentationMode,
    spotlight,
    toggleSpotlight,
    curtainProgress,
    setCurtainProgress,
    setLaserPointer,
  } = useUIStore();

  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);

  const currentIdx = pages.findIndex((p) => p.id === currentPageId);

  useEffect(() => {
    if (!presentationMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPresentationMode(false);
      if (e.key === 'ArrowRight' && currentIdx < pages.length - 1) {
        setCurrentPage(pages[currentIdx + 1].id);
      }
      if (e.key === 'ArrowLeft' && currentIdx > 0) {
        setCurrentPage(pages[currentIdx - 1].id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [presentationMode, currentIdx, pages, setCurrentPage, setPresentationMode]);

  useEffect(() => {
    if (!timerRunning) return;
    const id = setInterval(() => setTimerSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [timerRunning]);

  if (!presentationMode) return null;

  const formatTime = (secs: number) => {
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="presentation-controls">
      <button
        type="button"
        disabled={currentIdx <= 0}
        onClick={() => currentIdx > 0 && setCurrentPage(pages[currentIdx - 1].id)}
        title="Previous Page"
        className="disabled:opacity-30"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span className="px-2 text-xs font-medium text-slate-200">
        {currentIdx + 1} / {pages.length}
      </span>
      <button
        type="button"
        disabled={currentIdx >= pages.length - 1}
        onClick={() => currentIdx < pages.length - 1 && setCurrentPage(pages[currentIdx + 1].id)}
        title="Next Page"
        className="disabled:opacity-30"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      <div className="mx-1 h-4 w-px bg-slate-600" />

      <button
        type="button"
        onClick={() => setTool(TeachingTool.Pen)}
        className={tool === TeachingTool.Pen ? 'bg-primary' : ''}
        title="Pen"
      >
        <Pen className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => setTool(TeachingTool.Highlighter)}
        className={tool === TeachingTool.Highlighter ? 'bg-primary' : ''}
        title="Highlighter"
      >
        <Highlighter className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => setTool(TeachingTool.Eraser)}
        className={tool === TeachingTool.Eraser ? 'bg-primary' : ''}
        title="Eraser"
      >
        <Eraser className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => {
          setTool(TeachingTool.LaserPointer);
          setLaserPointer(true);
        }}
        className={tool === TeachingTool.LaserPointer ? 'bg-primary' : ''}
        title="Laser Pointer"
      >
        <Sparkles className="h-4 w-4 text-red-400" />
      </button>
      <button
        type="button"
        onClick={toggleSpotlight}
        className={spotlight.active ? 'bg-primary' : ''}
        title="Spotlight"
      >
        <Sun className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => setCurtainProgress(curtainProgress > 0 ? 0 : 0.5)}
        className={curtainProgress > 0 ? 'bg-primary' : ''}
        title="Screen Curtain"
      >
        <PanelTopClose className="h-4 w-4" />
      </button>

      <div className="mx-1 h-4 w-px bg-slate-600" />

      <button
        type="button"
        onClick={() => setTimerRunning((r) => !r)}
        title="Toggle Class Timer"
        className="flex items-center gap-1 px-2 rounded-full"
      >
        <Timer className="h-3.5 w-3.5" />
        <span className="font-mono text-xs">{formatTime(timerSeconds)}</span>
      </button>

      <button
        type="button"
        onClick={() => setPresentationMode(false)}
        title="Exit Presentation (Esc)"
        className="ml-1 bg-red-600/80 hover:bg-red-600"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

