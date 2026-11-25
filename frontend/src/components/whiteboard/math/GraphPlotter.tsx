import { useEffect, useRef, useState } from 'react';
import JXG from 'jsxgraph';
import { v4 as uuidv4 } from 'uuid';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { showError } from '@/components/ui/Toast';
import { useWhiteboardStore, useAuthStore } from '@/store';
import type { ImageCanvasObject } from '@/types';

interface GraphPlotterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PRESET_EXPRESSIONS = [
  'x^2 - 4',
  'Math.sin(x)',
  'Math.cos(x)',
  '2*x + 1',
  'Math.exp(x/3)',
];

export function GraphPlotter({ open, onOpenChange }: GraphPlotterProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<JXG.Board | null>(null);
  const [expression, setExpression] = useState('x^2 - 4');
  const [xRange, setXRange] = useState(8);
  const { currentPageId, objects, addObject } = useWhiteboardStore();
  const user = useAuthStore((s) => s.user);

  const buildEvaluator = (expr: string) => {
    const normalized = expr.replace(/\^/g, '**');
    // eslint-disable-next-line no-new-func
    return new Function('x', `with (Math) { return ${normalized}; }`) as (x: number) => number;
  };

  useEffect(() => {
    if (!open || !containerRef.current) return;

    const id = 'rekha-jxg-board';
    containerRef.current.id = id;

    try {
      const board = JXG.JSXGraph.initBoard(id, {
        boundingbox: [-xRange, xRange, xRange, -xRange],
        axis: true,
        grid: true,
        showCopyright: false,
        showNavigation: true,
      });
      boardRef.current = board;

      const fn = buildEvaluator(expression);
      board.create('functiongraph', [fn, -xRange, xRange], {
        strokeColor: '#0D9488',
        strokeWidth: 2.5,
      });
    } catch {
      showError('Invalid mathematical expression.');
    }

    return () => {
      if (boardRef.current) {
        JXG.JSXGraph.freeBoard(boardRef.current);
        boardRef.current = null;
      }
    };
  }, [open, expression, xRange]);

  const handleInsertGraph = () => {
    if (!containerRef.current) return;
    const svg = containerRef.current.querySelector('svg');
    if (!svg) return;

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);
    const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;

    const now = new Date().toISOString();
    const imgObj: ImageCanvasObject = {
      id: uuidv4(),
      type: 'image',
      pageId: currentPageId || '',
      createdById: user?.id || 'local',
      createdAt: now,
      updatedAt: now,
      x: 160,
      y: 120,
      width: 420,
      height: 320,
      naturalWidth: 420,
      naturalHeight: 320,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      zIndex: Object.keys(objects).length,
      src: dataUrl,
      alt: `Graph of y = ${expression}`,
    };
    addObject(imgObj);
    onOpenChange(false);
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Interactive Graph Plotter (JSXGraph)"
      description="Plot functions with real mathematical evaluation and insert onto the board."
      size="xl"
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <Input
              label="Function f(x) ="
              value={expression}
              onChange={(e) => setExpression(e.target.value)}
              placeholder="e.g. x^2 - 4 or sin(x)"
              className="font-mono"
            />
          </div>
          <div className="w-28">
            <Input
              label="Axis Range (±)"
              type="number"
              min={2}
              max={50}
              value={xRange}
              onChange={(e) => setXRange(Math.max(2, Number(e.target.value) || 8))}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {PRESET_EXPRESSIONS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setExpression(p)}
              className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-xs text-slate-700 hover:border-primary hover:bg-teal-50"
            >
              {p}
            </button>
          ))}
        </div>

        <div
          ref={containerRef}
          className="h-80 w-full rounded-lg border border-slate-200 bg-white overflow-hidden"
        />

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleInsertGraph}>Insert Graph onto Whiteboard</Button>
        </div>
      </div>
    </Modal>
  );
}

