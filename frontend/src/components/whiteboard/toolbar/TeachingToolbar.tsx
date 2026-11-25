import {
  MousePointer2,
  Hand,
  Pen,
  Highlighter,
  Eraser,
  Square,
  Circle,
  Triangle,
  Minus,
  ArrowUpRight,
  Type,
  StickyNote,
  Sigma,
  LineChart,
  Image as ImageIcon,
  FileText,
  Sparkles,
  Sun,
  PanelTopClose,
  GripVertical,
} from 'lucide-react';
import { useWhiteboardStore, useUIStore } from '@/store';
import { TeachingTool, DrawingMode } from '@/types';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { Tooltip } from '@/components/ui/Tooltip';
import { cn } from '@/utils/cn';

interface TeachingToolbarProps {
  onOpenEquationEditor: () => void;
  onOpenGraphPlotter: () => void;
  onOpenImageUpload: () => void;
  onOpenPDFUpload: () => void;
}

export function TeachingToolbar({
  onOpenEquationEditor,
  onOpenGraphPlotter,
  onOpenImageUpload,
  onOpenPDFUpload,
}: TeachingToolbarProps) {
  const {
    tool,
    drawingMode,
    color,
    strokeWidth,
    setTool,
    setDrawingMode,
    setColor,
    setStrokeWidth,
  } = useWhiteboardStore();

  const {
    toolbarPosition,
    setToolbarPosition,
    toggleSpotlight,
    spotlight,
    curtainProgress,
    setCurtainProgress,
    setLaserPointer,
  } = useUIStore();

  const cyclePosition = () => {
    const order: Array<'left' | 'right' | 'bottom'> = ['left', 'right', 'bottom'];
    const idx = order.indexOf(toolbarPosition as 'left' | 'right' | 'bottom');
    setToolbarPosition(order[(idx + 1) % order.length]);
  };

  const selectShape = (mode: DrawingMode) => {
    setTool(TeachingTool.Shape);
    setDrawingMode(mode);
  };

  const btnClass = (active: boolean) =>
    cn('toolbar-btn', active && 'active');

  const isHorizontal = toolbarPosition === 'bottom';

  return (
    <div
      className={cn(
        'teaching-toolbar',
        toolbarPosition === 'right' && 'position-right',
        toolbarPosition === 'bottom' && 'position-bottom'
      )}
    >
      {/* Drag / Reposition Handle */}
      <Tooltip content="Move toolbar (Left / Right / Bottom)" side={isHorizontal ? 'top' : 'right'}>
        <button
          type="button"
          onClick={cyclePosition}
          className="flex items-center justify-center p-1 text-slate-400 hover:text-slate-600"
          aria-label="Reposition toolbar"
        >
          <GripVertical className={cn('h-4 w-4', isHorizontal && 'rotate-90')} />
        </button>
      </Tooltip>

      <Tooltip content="Select (V)" side={isHorizontal ? 'top' : 'right'}>
        <button type="button" onClick={() => setTool(TeachingTool.Select)} className={btnClass(tool === TeachingTool.Select)}>
          <MousePointer2 className="h-4 w-4" />
        </button>
      </Tooltip>

      <Tooltip content="Pan Canvas (Space)" side={isHorizontal ? 'top' : 'right'}>
        <button type="button" onClick={() => setTool(TeachingTool.Pan)} className={btnClass(tool === TeachingTool.Pan)}>
          <Hand className="h-4 w-4" />
        </button>
      </Tooltip>

      <div className={cn('bg-slate-200', isHorizontal ? 'mx-1 h-6 w-px' : 'my-1 h-px w-7 mx-auto')} />

      <Tooltip content="Pen (P)" side={isHorizontal ? 'top' : 'right'}>
        <button type="button" onClick={() => setTool(TeachingTool.Pen)} className={btnClass(tool === TeachingTool.Pen)}>
          <Pen className="h-4 w-4" />
        </button>
      </Tooltip>

      <Tooltip content="Highlighter (H)" side={isHorizontal ? 'top' : 'right'}>
        <button type="button" onClick={() => setTool(TeachingTool.Highlighter)} className={btnClass(tool === TeachingTool.Highlighter)}>
          <Highlighter className="h-4 w-4" />
        </button>
      </Tooltip>

      <Tooltip content="Eraser (E)" side={isHorizontal ? 'top' : 'right'}>
        <button type="button" onClick={() => setTool(TeachingTool.Eraser)} className={btnClass(tool === TeachingTool.Eraser)}>
          <Eraser className="h-4 w-4" />
        </button>
      </Tooltip>

      <div className={cn('bg-slate-200', isHorizontal ? 'mx-1 h-6 w-px' : 'my-1 h-px w-7 mx-auto')} />

      <Tooltip content="Rectangle" side={isHorizontal ? 'top' : 'right'}>
        <button
          type="button"
          onClick={() => selectShape(DrawingMode.Rectangle)}
          className={btnClass(tool === TeachingTool.Shape && drawingMode === DrawingMode.Rectangle)}
        >
          <Square className="h-4 w-4" />
        </button>
      </Tooltip>

      <Tooltip content="Circle / Ellipse" side={isHorizontal ? 'top' : 'right'}>
        <button
          type="button"
          onClick={() => selectShape(DrawingMode.Ellipse)}
          className={btnClass(tool === TeachingTool.Shape && drawingMode === DrawingMode.Ellipse)}
        >
          <Circle className="h-4 w-4" />
        </button>
      </Tooltip>

      <Tooltip content="Triangle" side={isHorizontal ? 'top' : 'right'}>
        <button
          type="button"
          onClick={() => selectShape(DrawingMode.Triangle)}
          className={btnClass(tool === TeachingTool.Shape && drawingMode === DrawingMode.Triangle)}
        >
          <Triangle className="h-4 w-4" />
        </button>
      </Tooltip>

      <Tooltip content="Line" side={isHorizontal ? 'top' : 'right'}>
        <button
          type="button"
          onClick={() => selectShape(DrawingMode.Straight)}
          className={btnClass(tool === TeachingTool.Shape && drawingMode === DrawingMode.Straight)}
        >
          <Minus className="h-4 w-4" />
        </button>
      </Tooltip>

      <Tooltip content="Arrow" side={isHorizontal ? 'top' : 'right'}>
        <button
          type="button"
          onClick={() => selectShape(DrawingMode.Arrow)}
          className={btnClass(tool === TeachingTool.Shape && drawingMode === DrawingMode.Arrow)}
        >
          <ArrowUpRight className="h-4 w-4" />
        </button>
      </Tooltip>

      <div className={cn('bg-slate-200', isHorizontal ? 'mx-1 h-6 w-px' : 'my-1 h-px w-7 mx-auto')} />

      <Tooltip content="Text (T)" side={isHorizontal ? 'top' : 'right'}>
        <button type="button" onClick={() => setTool(TeachingTool.Text)} className={btnClass(tool === TeachingTool.Text)}>
          <Type className="h-4 w-4" />
        </button>
      </Tooltip>

      <Tooltip content="Sticky Note" side={isHorizontal ? 'top' : 'right'}>
        <button type="button" onClick={() => setTool(TeachingTool.StickyNote)} className={btnClass(tool === TeachingTool.StickyNote)}>
          <StickyNote className="h-4 w-4" />
        </button>
      </Tooltip>

      <Tooltip content="Equation Editor (KaTeX)" side={isHorizontal ? 'top' : 'right'}>
        <button type="button" onClick={onOpenEquationEditor} className={btnClass(tool === TeachingTool.Equation)}>
          <Sigma className="h-4 w-4" />
        </button>
      </Tooltip>

      <Tooltip content="Graph Plotter" side={isHorizontal ? 'top' : 'right'}>
        <button type="button" onClick={onOpenGraphPlotter} className={btnClass(tool === TeachingTool.Graph)}>
          <LineChart className="h-4 w-4" />
        </button>
      </Tooltip>

      <Tooltip content="Insert Image" side={isHorizontal ? 'top' : 'right'}>
        <button type="button" onClick={onOpenImageUpload} className="toolbar-btn">
          <ImageIcon className="h-4 w-4" />
        </button>
      </Tooltip>

      <Tooltip content="Import PDF" side={isHorizontal ? 'top' : 'right'}>
        <button type="button" onClick={onOpenPDFUpload} className="toolbar-btn">
          <FileText className="h-4 w-4" />
        </button>
      </Tooltip>

      <div className={cn('bg-slate-200', isHorizontal ? 'mx-1 h-6 w-px' : 'my-1 h-px w-7 mx-auto')} />

      <Tooltip content="Laser Pointer" side={isHorizontal ? 'top' : 'right'}>
        <button
          type="button"
          onClick={() => {
            setTool(TeachingTool.LaserPointer);
            setLaserPointer(true);
          }}
          className={btnClass(tool === TeachingTool.LaserPointer)}
        >
          <Sparkles className="h-4 w-4 text-red-500" />
        </button>
      </Tooltip>

      <Tooltip content="Spotlight" side={isHorizontal ? 'top' : 'right'}>
        <button type="button" onClick={toggleSpotlight} className={btnClass(spotlight.active)}>
          <Sun className="h-4 w-4" />
        </button>
      </Tooltip>

      <Tooltip content="Screen Curtain" side={isHorizontal ? 'top' : 'right'}>
        <button
          type="button"
          onClick={() => setCurtainProgress(curtainProgress > 0 ? 0 : 0.5)}
          className={btnClass(curtainProgress > 0)}
        >
          <PanelTopClose className="h-4 w-4" />
        </button>
      </Tooltip>

      <div className={cn('bg-slate-200', isHorizontal ? 'mx-1 h-6 w-px' : 'my-1 h-px w-7 mx-auto')} />

      {/* Color Picker & Stroke Width */}
      <div className="flex flex-col items-center gap-1.5 px-1">
        <ColorPicker color={color} onChange={setColor} side={isHorizontal ? 'top' : 'right'} />
        {!isHorizontal && (
          <div className="flex items-center gap-1">
            {[2, 4, 8].map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setStrokeWidth(w)}
                title={`Stroke ${w}px`}
                className={cn(
                  'flex h-4 w-4 items-center justify-center rounded-full',
                  strokeWidth === w ? 'bg-teal-100 ring-1 ring-primary' : 'hover:bg-slate-100'
                )}
              >
                <span
                  className="rounded-full bg-slate-800"
                  style={{ width: Math.min(10, w + 2), height: Math.min(10, w + 2) }}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

