import { useState, useMemo } from 'react';
import katex from 'katex';
import { v4 as uuidv4 } from 'uuid';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useWhiteboardStore, useAuthStore } from '@/store';
import type { EquationCanvasObject } from '@/types';

interface EquationEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MATH_SNIPPETS = [
  { label: 'Fraction', latex: '\\frac{a}{b}' },
  { label: 'Square Root', latex: '\\sqrt{x}' },
  { label: 'Exponent', latex: 'x^{2}' },
  { label: 'Subscript', latex: 'x_{n}' },
  { label: 'Integral', latex: '\\int_{a}^{b} f(x)\\,dx' },
  { label: 'Sum', latex: '\\sum_{i=1}^{n} i' },
  { label: 'Limit', latex: '\\lim_{x \\to \\infty} f(x)' },
  { label: 'Quadratic', latex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}' },
  { label: 'Matrix', latex: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}' },
  { label: 'π', latex: '\\pi' },
  { label: 'θ', latex: '\\theta' },
  { label: 'Δ', latex: '\\Delta' },
];

export function EquationEditor({ open, onOpenChange }: EquationEditorProps) {
  const [latex, setLatex] = useState('x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}');
  const { currentPageId, objects, color, background, addObject } = useWhiteboardStore();
  const user = useAuthStore((s) => s.user);

  const renderedHtml = useMemo(() => {
    try {
      return katex.renderToString(latex, { displayMode: true, throwOnError: false });
    } catch {
      return '<span class="text-red-500 text-xs">Invalid LaTeX syntax</span>';
    }
  }, [latex]);

  const handleInsert = () => {
    if (!latex.trim()) return;
    const now = new Date().toISOString();
    const eqObj: EquationCanvasObject = {
      id: uuidv4(),
      type: 'equation',
      pageId: currentPageId || '',
      createdById: user?.id || 'local',
      createdAt: now,
      updatedAt: now,
      x: 180,
      y: 160,
      width: 320,
      height: 60,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      zIndex: Object.keys(objects).length,
      latex,
      displayMode: true,
      color: background.type === 'blackboard' || background.type === 'chalkboard' ? '#FFFFFF' : color,
      fontSize: 24,
    };
    addObject(eqObj);
    onOpenChange(false);
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Equation Editor (LaTeX / KaTeX)"
      description="Enter mathematical expressions or click a symbol template to insert."
      size="lg"
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-1.5">
          {MATH_SNIPPETS.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => setLatex((prev) => `${prev} ${s.latex}`.trim())}
              className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700 hover:border-primary hover:bg-teal-50 hover:text-primary-800"
            >
              {s.label}
            </button>
          ))}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">LaTeX Expression</label>
          <textarea
            rows={3}
            value={latex}
            onChange={(e) => setLatex(e.target.value)}
            className="w-full rounded-md border border-slate-200 p-2.5 font-mono text-sm text-slate-900 focus:border-primary focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Live Preview</label>
          <div
            className="flex min-h-[72px] items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-4 text-slate-900"
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleInsert}>Insert onto Whiteboard</Button>
        </div>
      </div>
    </Modal>
  );
}

