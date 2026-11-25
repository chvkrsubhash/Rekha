import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Presentation,
  Grid,
  Sparkles,
  Download,
  Wifi,
  WifiOff,
  Trash2,
  FolderOpen,
} from 'lucide-react';
import { useWhiteboardStore, useUIStore } from '@/store';
import { Button } from '@/components/ui/Button';
import { Dropdown } from '@/components/ui/Dropdown';

interface TopBarProps {
  title: string;
  onTitleChange: (title: string) => void;
  saveStatus: 'saved' | 'saving' | 'offline' | 'local';
  isOnline: boolean;
  onOpenBackgrounds: () => void;
  onOpenResources: () => void;
  onExportPNG: () => void;
  onExportJSON: () => void;
  recordingSlot?: React.ReactNode;
}

export function TopBar({
  title,
  onTitleChange,
  saveStatus,
  isOnline,
  onOpenBackgrounds,
  onOpenResources,
  onExportPNG,
  onExportJSON,
  recordingSlot,
}: TopBarProps) {
  const navigate = useNavigate();
  const [editingTitle, setEditingTitle] = useState(false);

  const {
    undoStack,
    redoStack,
    undo,
    redo,
    transform,
    zoomIn,
    zoomOut,
    resetView,
    clearPage,
  } = useWhiteboardStore();

  const { setPresentationMode, aiPanelOpen, setAIPanelOpen } = useUIStore();

  return (
    <header className="whiteboard-topbar justify-between">
      {/* Left: Back + Title + Save Status */}
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          title="Back to Dashboard"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        {editingTitle ? (
          <input
            autoFocus
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            onBlur={() => setEditingTitle(false)}
            onKeyDown={(e) => e.key === 'Enter' && setEditingTitle(false)}
            className="h-7 rounded border border-primary px-2 text-sm font-semibold text-slate-900 outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditingTitle(true)}
            className="truncate max-w-[200px] text-sm font-semibold text-slate-900 hover:text-primary"
            title="Click to rename"
          >
            {title || 'Untitled Whiteboard'}
          </button>
        )}

        <span
          className={`save-status hidden sm:inline-flex ${
            saveStatus === 'saving'
              ? 'saving'
              : saveStatus === 'offline'
              ? 'offline'
              : 'saved'
          }`}
        >
          {isOnline ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
          {saveStatus === 'saving'
            ? 'Saving...'
            : saveStatus === 'offline'
            ? 'Offline (Saved locally)'
            : saveStatus === 'local'
            ? 'Saved locally'
            : 'Saved'}
        </span>
      </div>

      {/* Center: Undo/Redo + Zoom + Tools */}
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="icon"
          onClick={undo}
          disabled={undoStack.length === 0}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="icon"
          onClick={redo}
          disabled={redoStack.length === 0}
          title="Redo (Ctrl+Y)"
        >
          <Redo2 className="h-4 w-4" />
        </Button>

        <div className="mx-1.5 h-5 w-px bg-slate-200" />

        <Button size="sm" variant="icon" onClick={zoomOut} title="Zoom Out">
          <ZoomOut className="h-4 w-4" />
        </Button>
        <button
          type="button"
          onClick={resetView}
          className="px-1.5 text-xs font-mono font-medium text-slate-700 hover:text-primary"
          title="Reset Zoom to 100%"
        >
          {Math.round(transform.zoom * 100)}%
        </button>
        <Button size="sm" variant="icon" onClick={zoomIn} title="Zoom In">
          <ZoomIn className="h-4 w-4" />
        </Button>

        <div className="mx-1.5 hidden md:block h-5 w-px bg-slate-200" />

        <Button
          size="sm"
          variant="ghost"
          onClick={onOpenBackgrounds}
          leftIcon={<Grid className="h-3.5 w-3.5" />}
          className="hidden md:inline-flex"
        >
          Background
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={onOpenResources}
          leftIcon={<FolderOpen className="h-3.5 w-3.5" />}
          className="hidden md:inline-flex"
        >
          Resources
        </Button>

        <Button
          size="sm"
          variant="icon"
          onClick={() => clearPage()}
          title="Clear Current Page"
        >
          <Trash2 className="h-4 w-4 text-slate-500 hover:text-red-600" />
        </Button>
      </div>

      {/* Right: Recording + AI + Present + Export */}
      <div className="flex items-center gap-2">
        {recordingSlot}

        <Button
          size="sm"
          variant={aiPanelOpen ? 'primary' : 'secondary'}
          onClick={() => setAIPanelOpen(!aiPanelOpen)}
          leftIcon={<Sparkles className="h-3.5 w-3.5" />}
          className="hidden sm:inline-flex"
        >
          AI Assistant
        </Button>

        <Button
          size="sm"
          variant="primary"
          onClick={() => setPresentationMode(true)}
          leftIcon={<Presentation className="h-3.5 w-3.5" />}
        >
          Present
        </Button>

        <Dropdown
          trigger={
            <Button size="sm" variant="secondary" leftIcon={<Download className="h-3.5 w-3.5" />}>
              <span className="hidden sm:inline">Export</span>
            </Button>
          }
          items={[
            { label: 'Export Page as PNG', onSelect: onExportPNG },
            { label: 'Export Rekha JSON', onSelect: onExportJSON },
            { label: 'sep', separator: true, onSelect: () => {} },
            {
              label: 'Toggle Fullscreen',
              icon: <Maximize2 className="h-3.5 w-3.5" />,
              onSelect: () => {
                if (!document.fullscreenElement) {
                  document.documentElement.requestFullscreen().catch(() => {});
                } else {
                  document.exitFullscreen().catch(() => {});
                }
              },
            },
          ]}
        />
      </div>
    </header>
  );
}

