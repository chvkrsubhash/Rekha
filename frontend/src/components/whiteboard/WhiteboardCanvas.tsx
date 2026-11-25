import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Stage,
  Layer,
  Path,
  Rect,
  Ellipse,
  Line,
  Arrow,
  Text as KonvaText,
  Image as KonvaImage,
  Transformer,
  Circle,
  RegularPolygon,
} from 'react-konva';
import type Konva from 'konva';
import { v4 as uuidv4 } from 'uuid';
import { useWhiteboardStore, useUIStore, useAuthStore } from '@/store';
import {
  TeachingTool,
  DrawingMode,
  type CanvasObject,
  type StrokeCanvasObject,
  type ShapeCanvasObject,
  type TextCanvasObject,
  type ImageCanvasObject,
  type StickyNoteCanvasObject,
  type StrokePoint,
  type ShapeKind,
} from '@/types';
import { strokeToSvgPath } from '@/utils/perfectFreehand';
import { hitTest } from '@/utils/canvas';

interface WhiteboardCanvasProps {
  stageRef: React.MutableRefObject<Konva.Stage | null>;
  onOpenEquationEditor?: () => void;
  onOpenGraphPlotter?: () => void;
  readOnly?: boolean;
}

function URLImage({ obj, onSelect, draggable, onDragEnd, onTransformEnd }: {
  obj: ImageCanvasObject;
  onSelect: () => void;
  draggable: boolean;
  onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onTransformEnd: (e: Konva.KonvaEventObject<Event>) => void;
}) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.src = obj.src;
    img.onload = () => setImage(img);
  }, [obj.src]);

  return (
    <KonvaImage
      id={obj.id}
      image={image || undefined}
      x={obj.x}
      y={obj.y}
      width={obj.width}
      height={obj.height}
      rotation={obj.rotation}
      opacity={obj.opacity}
      draggable={draggable && !obj.locked}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={onDragEnd}
      onTransformEnd={onTransformEnd}
    />
  );
}

export function WhiteboardCanvas({
  stageRef,
  onOpenEquationEditor,
  onOpenGraphPlotter,
  readOnly = false,
}: WhiteboardCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const transformerRef = useRef<Konva.Transformer>(null);

  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<StrokePoint[]>([]);
  const [shapeDraft, setShapeDraft] = useState<{
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  } | null>(null);
  const [editingText, setEditingText] = useState<{
    id?: string;
    x: number;
    y: number;
    value: string;
  } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  const user = useAuthStore((s) => s.user);
  const {
    pages,
    currentPageId,
    objects,
    selectedIds,
    tool,
    drawingMode,
    color,
    fillColor,
    strokeWidth,
    opacity,
    background,
    transform,
    addObject,
    updateObject,
    deleteObject,
    setSelected,
    clearSelection,
    zoomTo,
    panTo,
    pushHistory,
  } = useWhiteboardStore();

  const { setLaserPointer, laserPointerActive, laserPointerPosition } = useUIStore();

  const currentPage = pages.find((p) => p.id === currentPageId);
  const pageObjects: CanvasObject[] = (currentPage?.objectIds || [])
    .map((id) => objects[id])
    .filter((o): o is CanvasObject => Boolean(o && o.visible !== false));

  // Resize observer
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Attach Transformer to selected nodes
  useEffect(() => {
    const tr = transformerRef.current;
    const stage = stageRef.current;
    if (!tr || !stage) return;

    const nodes = selectedIds
      .map((id) => stage.findOne(`#${id}`))
      .filter((n): n is Konva.Node => Boolean(n));
    tr.nodes(nodes);
    tr.getLayer()?.batchDraw();
  }, [selectedIds, pageObjects, stageRef]);

  const getCanvasPointer = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return { x: 0, y: 0 };
    const pos = stage.getPointerPosition();
    if (!pos) return { x: 0, y: 0 };
    return {
      x: (pos.x - transform.panX) / transform.zoom,
      y: (pos.y - transform.panY) / transform.zoom,
    };
  }, [stageRef, transform]);

  const handlePointerDown = (e: Konva.KonvaEventObject<PointerEvent>) => {
    if (readOnly) return;
    const stage = stageRef.current;
    if (!stage) return;

    // Pan tool or middle mouse button
    if (tool === TeachingTool.Pan || e.evt.button === 1) {
      const pos = stage.getPointerPosition();
      if (pos) {
        setIsPanning(true);
        panStart.current = { x: pos.x, y: pos.y, panX: transform.panX, panY: transform.panY };
      }
      return;
    }

    const pt = getCanvasPointer();

    if (tool === TeachingTool.Select) {
      if (e.target === stage) {
        clearSelection();
      }
      return;
    }

    if (tool === TeachingTool.Pen || tool === TeachingTool.Highlighter) {
      setIsDrawing(true);
      setCurrentPoints([
        {
          x: pt.x,
          y: pt.y,
          pressure: e.evt.pointerType === 'pen' ? e.evt.pressure : 0.5,
          timestamp: Date.now(),
        },
      ]);
      return;
    }

    if (tool === TeachingTool.Eraser) {
      setIsDrawing(true);
      // Erase any object under cursor
      for (let i = pageObjects.length - 1; i >= 0; i--) {
        const obj = pageObjects[i];
        if (!obj.locked && hitTest(pt, obj, Math.max(8, strokeWidth))) {
          deleteObject(obj.id);
          pushHistory({
            timestamp: Date.now(),
            action: 'delete',
            objectIds: [obj.id],
            snapshot: [obj],
          });
          break;
        }
      }
      return;
    }

    if (tool === TeachingTool.Shape) {
      setIsDrawing(true);
      setShapeDraft({ startX: pt.x, startY: pt.y, endX: pt.x, endY: pt.y });
      return;
    }

    if (tool === TeachingTool.Text) {
      if (e.target === stage) {
        setEditingText({ x: pt.x, y: pt.y, value: '' });
      }
      return;
    }

    if (tool === TeachingTool.StickyNote) {
      const now = new Date().toISOString();
      const sticky: StickyNoteCanvasObject = {
        id: uuidv4(),
        type: 'sticky',
        pageId: currentPageId || '',
        createdById: user?.id || 'local',
        createdAt: now,
        updatedAt: now,
        x: pt.x,
        y: pt.y,
        width: 200,
        height: 160,
        rotation: 0,
        opacity: 1,
        locked: false,
        visible: true,
        zIndex: pageObjects.length,
        content: 'Note...',
        backgroundColor: '#FEF08A',
        textColor: '#1F2937',
        fontSize: 15,
        pinned: false,
      };
      addObject(sticky);
      return;
    }

    if (tool === TeachingTool.Equation && onOpenEquationEditor) {
      onOpenEquationEditor();
      return;
    }

    if (tool === TeachingTool.Graph && onOpenGraphPlotter) {
      onOpenGraphPlotter();
      return;
    }
  };

  const handlePointerMove = (e: Konva.KonvaEventObject<PointerEvent>) => {
    const stage = stageRef.current;
    if (!stage) return;

    if (tool === TeachingTool.LaserPointer) {
      const pt = getCanvasPointer();
      setLaserPointer(true, pt.x, pt.y);
      return;
    }

    if (isPanning && panStart.current) {
      const pos = stage.getPointerPosition();
      if (pos) {
        const dx = pos.x - panStart.current.x;
        const dy = pos.y - panStart.current.y;
        panTo(panStart.current.panX + dx, panStart.current.panY + dy);
      }
      return;
    }

    if (!isDrawing) return;
    const pt = getCanvasPointer();

    if (tool === TeachingTool.Pen || tool === TeachingTool.Highlighter) {
      setCurrentPoints((prev) => [
        ...prev,
        {
          x: pt.x,
          y: pt.y,
          pressure: e.evt.pointerType === 'pen' ? e.evt.pressure : 0.5,
          timestamp: Date.now(),
        },
      ]);
    } else if (tool === TeachingTool.Eraser) {
      for (let i = pageObjects.length - 1; i >= 0; i--) {
        const obj = pageObjects[i];
        if (!obj.locked && hitTest(pt, obj, Math.max(8, strokeWidth))) {
          deleteObject(obj.id);
          break;
        }
      }
    } else if (tool === TeachingTool.Shape && shapeDraft) {
      setShapeDraft((prev) => (prev ? { ...prev, endX: pt.x, endY: pt.y } : null));
    }
  };

  const handlePointerUp = () => {
    if (isPanning) {
      setIsPanning(false);
      panStart.current = null;
      return;
    }

    if (!isDrawing) return;
    setIsDrawing(false);
    const now = new Date().toISOString();

    if ((tool === TeachingTool.Pen || tool === TeachingTool.Highlighter) && currentPoints.length > 0) {
      const isHighlighter = tool === TeachingTool.Highlighter;
      const strokeSize = isHighlighter ? Math.max(16, strokeWidth * 2.5) : strokeWidth;
      const strokeOpacity = isHighlighter ? Math.min(0.45, opacity) : opacity;

      const strokeObj: StrokeCanvasObject = {
        id: uuidv4(),
        type: 'stroke',
        pageId: currentPageId || '',
        createdById: user?.id || 'local',
        createdAt: now,
        updatedAt: now,
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        rotation: 0,
        opacity: strokeOpacity,
        locked: false,
        visible: true,
        zIndex: pageObjects.length,
        stroke: {
          points: currentPoints,
          size: strokeSize,
          thinning: isHighlighter ? 0 : 0.55,
          smoothing: 0.5,
          streamline: 0.5,
          simulatePressure: true,
          last: true,
          color,
          opacity: strokeOpacity,
          isHighlighter,
        },
        svgPath: strokeToSvgPath(currentPoints, {
          size: strokeSize,
          thinning: isHighlighter ? 0 : 0.55,
          smoothing: 0.5,
          streamline: 0.5,
          simulatePressure: true,
          last: true,
        }),
      };
      addObject(strokeObj);
      pushHistory({
        timestamp: Date.now(),
        action: 'add',
        objectIds: [strokeObj.id],
        snapshot: [strokeObj],
      });
      setCurrentPoints([]);
    }

    if (tool === TeachingTool.Shape && shapeDraft) {
      const x = Math.min(shapeDraft.startX, shapeDraft.endX);
      const y = Math.min(shapeDraft.startY, shapeDraft.endY);
      const w = Math.abs(shapeDraft.endX - shapeDraft.startX);
      const h = Math.abs(shapeDraft.endY - shapeDraft.startY);

      if (w > 4 || h > 4) {
        const modeToKind: Record<string, ShapeKind> = {
          [DrawingMode.Rectangle]: 'rectangle',
          [DrawingMode.Ellipse]: 'ellipse',
          [DrawingMode.Triangle]: 'triangle',
          [DrawingMode.Straight]: 'line',
          [DrawingMode.Arrow]: 'arrow',
        };
        const kind: ShapeKind = modeToKind[drawingMode] || 'rectangle';
        const shapeObj: ShapeCanvasObject = {
          id: uuidv4(),
          type: 'shape',
          kind,
          pageId: currentPageId || '',
          createdById: user?.id || 'local',
          createdAt: now,
          updatedAt: now,
          x: kind === 'line' || kind === 'arrow' ? shapeDraft.startX : x,
          y: kind === 'line' || kind === 'arrow' ? shapeDraft.startY : y,
          width: kind === 'line' || kind === 'arrow' ? shapeDraft.endX - shapeDraft.startX : w,
          height: kind === 'line' || kind === 'arrow' ? shapeDraft.endY - shapeDraft.startY : h,
          rotation: 0,
          opacity,
          locked: false,
          visible: true,
          zIndex: pageObjects.length,
          fillColor: fillColor || undefined,
          strokeColor: color,
          strokeWidth,
        };
        addObject(shapeObj);
        pushHistory({
          timestamp: Date.now(),
          action: 'add',
          objectIds: [shapeObj.id],
          snapshot: [shapeObj],
        });
      }
      setShapeDraft(null);
    }
  };

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    if (e.evt.ctrlKey || e.evt.metaKey) {
      const scaleBy = 1.08;
      const oldScale = transform.zoom;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
      zoomTo(newScale, pointer);
    } else {
      panTo(transform.panX - e.evt.deltaX, transform.panY - e.evt.deltaY);
    }
  };

  const commitText = () => {
    if (!editingText) return;
    const text = editingText.value.trim();
    if (editingText.id) {
      if (text) {
        updateObject(editingText.id, { content: text } as Partial<TextCanvasObject>);
      }
    } else if (text) {
      const now = new Date().toISOString();
      const textObj: TextCanvasObject = {
        id: uuidv4(),
        type: 'text',
        pageId: currentPageId || '',
        createdById: user?.id || 'local',
        createdAt: now,
        updatedAt: now,
        x: editingText.x,
        y: editingText.y,
        width: Math.max(160, text.length * 11),
        height: 40,
        rotation: 0,
        opacity: 1,
        locked: false,
        visible: true,
        zIndex: pageObjects.length,
        content: text,
        fontSize: 20,
        fontFamily: 'Inter, Noto Sans Telugu, Noto Sans Devanagari, sans-serif',
        color: background.type === 'blackboard' || background.type === 'chalkboard' ? '#FFFFFF' : color,
        align: 'left',
        bold: false,
        italic: false,
        underline: false,
      };
      addObject(textObj);
    }
    setEditingText(null);
  };

  const getBackgroundClass = () => {
    switch (background.type) {
      case 'blackboard':
        return 'bg-[#202020]';
      case 'chalkboard':
        return 'bg-[#173F35]';
      case 'grid':
        return 'bg-graph';
      case 'dots':
        return 'bg-dotted';
      case 'cornell':
        return 'bg-ruled';
      default:
        return 'bg-white';
    }
  };

  const liveStrokePath =
    currentPoints.length > 0
      ? strokeToSvgPath(currentPoints, {
          size: tool === TeachingTool.Highlighter ? Math.max(16, strokeWidth * 2.5) : strokeWidth,
          thinning: tool === TeachingTool.Highlighter ? 0 : 0.55,
          smoothing: 0.5,
          streamline: 0.5,
          simulatePressure: true,
          last: false,
        })
      : '';

  return (
    <div
      ref={containerRef}
      className={`whiteboard-canvas-container ${getBackgroundClass()}`}
      style={background.color && background.type === 'custom' ? { backgroundColor: background.color } : undefined}
    >
      <Stage
        ref={stageRef}
        width={dimensions.width}
        height={dimensions.height}
        scaleX={transform.zoom}
        scaleY={transform.zoom}
        x={transform.panX}
        y={transform.panY}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
      >
        <Layer>
          {pageObjects.map((obj) => {
            const isSelectable = tool === TeachingTool.Select && !readOnly;
            const handleSelect = () => {
              if (isSelectable) setSelected([obj.id]);
            };
            const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
              updateObject(obj.id, { x: e.target.x(), y: e.target.y() });
            };
            const handleTransformEnd = (e: Konva.KonvaEventObject<Event>) => {
              const node = e.target;
              const scaleX = node.scaleX();
              const scaleY = node.scaleY();
              node.scaleX(1);
              node.scaleY(1);
              updateObject(obj.id, {
                x: node.x(),
                y: node.y(),
                rotation: node.rotation(),
                width: Math.max(10, obj.width * scaleX),
                height: Math.max(10, obj.height * scaleY),
              });
            };

            if (obj.type === 'stroke') {
              const pathData = obj.svgPath || strokeToSvgPath(obj.stroke.points, obj.stroke);
              return (
                <Path
                  key={obj.id}
                  id={obj.id}
                  data={pathData}
                  fill={obj.stroke.color}
                  opacity={obj.opacity}
                  x={obj.x}
                  y={obj.y}
                  rotation={obj.rotation}
                  draggable={isSelectable && !obj.locked}
                  onClick={handleSelect}
                  onTap={handleSelect}
                  onDragEnd={handleDragEnd}
                />
              );
            }

            if (obj.type === 'shape') {
              if (obj.kind === 'line') {
                return (
                  <Line
                    key={obj.id}
                    id={obj.id}
                    points={[obj.x, obj.y, obj.x + obj.width, obj.y + obj.height]}
                    stroke={obj.strokeColor}
                    strokeWidth={obj.strokeWidth}
                    opacity={obj.opacity}
                    draggable={isSelectable && !obj.locked}
                    onClick={handleSelect}
                    onTap={handleSelect}
                  />
                );
              }
              if (obj.kind === 'arrow') {
                return (
                  <Arrow
                    key={obj.id}
                    id={obj.id}
                    points={[obj.x, obj.y, obj.x + obj.width, obj.y + obj.height]}
                    stroke={obj.strokeColor}
                    fill={obj.strokeColor}
                    strokeWidth={obj.strokeWidth}
                    opacity={obj.opacity}
                    draggable={isSelectable && !obj.locked}
                    onClick={handleSelect}
                    onTap={handleSelect}
                  />
                );
              }
              if (obj.kind === 'ellipse' || obj.kind === 'circle') {
                return (
                  <Ellipse
                    key={obj.id}
                    id={obj.id}
                    x={obj.x + obj.width / 2}
                    y={obj.y + obj.height / 2}
                    radiusX={Math.abs(obj.width / 2)}
                    radiusY={Math.abs(obj.height / 2)}
                    stroke={obj.strokeColor}
                    strokeWidth={obj.strokeWidth}
                    fill={obj.fillColor}
                    opacity={obj.opacity}
                    rotation={obj.rotation}
                    draggable={isSelectable && !obj.locked}
                    onClick={handleSelect}
                    onTap={handleSelect}
                    onDragEnd={(e) =>
                      updateObject(obj.id, {
                        x: e.target.x() - obj.width / 2,
                        y: e.target.y() - obj.height / 2,
                      })
                    }
                  />
                );
              }
              if (obj.kind === 'triangle') {
                const r = Math.max(obj.width, obj.height) / 2;
                return (
                  <RegularPolygon
                    key={obj.id}
                    id={obj.id}
                    x={obj.x + obj.width / 2}
                    y={obj.y + obj.height / 2}
                    sides={3}
                    radius={r}
                    stroke={obj.strokeColor}
                    strokeWidth={obj.strokeWidth}
                    fill={obj.fillColor}
                    opacity={obj.opacity}
                    rotation={obj.rotation}
                    draggable={isSelectable && !obj.locked}
                    onClick={handleSelect}
                    onTap={handleSelect}
                  />
                );
              }
              return (
                <Rect
                  key={obj.id}
                  id={obj.id}
                  x={obj.x}
                  y={obj.y}
                  width={obj.width}
                  height={obj.height}
                  stroke={obj.strokeColor}
                  strokeWidth={obj.strokeWidth}
                  fill={obj.fillColor}
                  cornerRadius={obj.cornerRadius || 0}
                  opacity={obj.opacity}
                  rotation={obj.rotation}
                  draggable={isSelectable && !obj.locked}
                  onClick={handleSelect}
                  onTap={handleSelect}
                  onDragEnd={handleDragEnd}
                  onTransformEnd={handleTransformEnd}
                />
              );
            }

            if (obj.type === 'text') {
              return (
                <KonvaText
                  key={obj.id}
                  id={obj.id}
                  x={obj.x}
                  y={obj.y}
                  text={obj.content.replace(/<[^>]+>/g, '')}
                  fontSize={obj.fontSize}
                  fontFamily={obj.fontFamily}
                  fill={obj.color}
                  width={obj.width}
                  rotation={obj.rotation}
                  opacity={obj.opacity}
                  draggable={isSelectable && !obj.locked}
                  onClick={handleSelect}
                  onTap={handleSelect}
                  onDblClick={() =>
                    !readOnly && setEditingText({ id: obj.id, x: obj.x, y: obj.y, value: obj.content })
                  }
                  onDragEnd={handleDragEnd}
                  onTransformEnd={handleTransformEnd}
                />
              );
            }

            if (obj.type === 'image') {
              return (
                <URLImage
                  key={obj.id}
                  obj={obj}
                  draggable={isSelectable}
                  onSelect={handleSelect}
                  onDragEnd={handleDragEnd}
                  onTransformEnd={handleTransformEnd}
                />
              );
            }

            if (obj.type === 'sticky') {
              return (
                <React.Fragment key={obj.id}>
                  <Rect
                    id={obj.id}
                    x={obj.x}
                    y={obj.y}
                    width={obj.width}
                    height={obj.height}
                    fill={obj.backgroundColor}
                    cornerRadius={6}
                    shadowColor="rgba(0,0,0,0.18)"
                    shadowBlur={8}
                    shadowOffsetY={3}
                    draggable={isSelectable && !obj.locked}
                    onClick={handleSelect}
                    onTap={handleSelect}
                    onDragEnd={handleDragEnd}
                    onTransformEnd={handleTransformEnd}
                  />
                  <KonvaText
                    x={obj.x + 12}
                    y={obj.y + 12}
                    width={obj.width - 24}
                    height={obj.height - 24}
                    text={obj.content}
                    fontSize={obj.fontSize}
                    fill={obj.textColor}
                    listening={false}
                  />
                </React.Fragment>
              );
            }

            if (obj.type === 'equation') {
              return (
                <KonvaText
                  key={obj.id}
                  id={obj.id}
                  x={obj.x}
                  y={obj.y}
                  text={obj.latex}
                  fontSize={obj.fontSize}
                  fontFamily="KaTeX_Main, serif"
                  fill={obj.color}
                  draggable={isSelectable && !obj.locked}
                  onClick={handleSelect}
                  onTap={handleSelect}
                  onDragEnd={handleDragEnd}
                />
              );
            }

            return null;
          })}

          {/* Live freehand stroke preview */}
          {liveStrokePath && (
            <Path
              data={liveStrokePath}
              fill={color}
              opacity={tool === TeachingTool.Highlighter ? 0.4 : opacity}
              listening={false}
            />
          )}

          {/* Live shape draft preview */}
          {shapeDraft && (
            <Rect
              x={Math.min(shapeDraft.startX, shapeDraft.endX)}
              y={Math.min(shapeDraft.startY, shapeDraft.endY)}
              width={Math.abs(shapeDraft.endX - shapeDraft.startX)}
              height={Math.abs(shapeDraft.endY - shapeDraft.startY)}
              stroke={color}
              strokeWidth={strokeWidth}
              dash={[6, 4]}
              listening={false}
            />
          )}

          {/* Ephemeral Laser Pointer */}
          {laserPointerActive && (
            <Circle
              x={laserPointerPosition.x}
              y={laserPointerPosition.y}
              radius={8}
              fill="#EF4444"
              shadowColor="#EF4444"
              shadowBlur={14}
              listening={false}
            />
          )}

          {/* Selection Transformer */}
          <Transformer
            ref={transformerRef}
            borderStroke="#0D9488"
            borderStrokeWidth={1.5}
            anchorStroke="#0D9488"
            anchorFill="#FFFFFF"
            anchorSize={8}
            rotateEnabled
          />
        </Layer>
      </Stage>

      {/* Inline Text Editor Overlay */}
      {editingText && (
        <textarea
          autoFocus
          value={editingText.value}
          onChange={(e) => setEditingText({ ...editingText, value: e.target.value })}
          onBlur={commitText}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setEditingText(null);
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              commitText();
            }
          }}
          placeholder="Type text (English, తెలుగు, हिन्दी)..."
          style={{
            position: 'absolute',
            left: editingText.x * transform.zoom + transform.panX,
            top: editingText.y * transform.zoom + transform.panY,
            minWidth: 200,
            minHeight: 40,
            fontSize: 18 * transform.zoom,
          }}
          className="z-50 rounded border-2 border-primary bg-white/95 p-2 text-slate-900 shadow-md outline-none"
        />
      )}
    </div>
  );
}

