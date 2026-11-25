import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import type Konva from 'konva';
import { v4 as uuidv4 } from 'uuid';
import { useWhiteboardStore, useUIStore } from '@/store';
import { TeachingTool, type WhiteboardPage, type CanvasObject } from '@/types';
import { whiteboardsAPI } from '@/lib/api';
import { useAutosave } from '@/hooks/useAutosave';
import { loadWhiteboard } from '@/lib/indexedDB';
import { showSuccess } from '@/components/ui/Toast';
import { WhiteboardCanvas } from './WhiteboardCanvas';
import { TeachingToolbar } from './toolbar/TeachingToolbar';
import { TopBar } from './toolbar/TopBar';
import { PagePanel } from './pages/PagePanel';
import { BackgroundSelector } from './background/BackgroundSelector';
import { EquationEditor } from './math/EquationEditor';
import { GraphPlotter } from './math/GraphPlotter';
import { SpotlightTool } from './presentation/SpotlightTool';
import { CurtainTool } from './presentation/CurtainTool';
import { PresentationMode } from './presentation/PresentationMode';
import { AIAssistant } from './ai/AIAssistant';
import { RecordingControls } from './recording/RecordingControls';
import { ImageInserter } from './resources/ImageInserter';
import { PDFInserter } from './resources/PDFInserter';
import { ResourceLibrary } from '@/components/resources/ResourceLibrary';

export function WhiteboardEditor() {
  const { id } = useParams<{ id: string }>();
  const lessonId = id || 'local-board';
  const stageRef = useRef<Konva.Stage | null>(null);

  const [title, setTitle] = useState('Untitled Whiteboard');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [bgModalOpen, setBgModalOpen] = useState(false);
  const [eqModalOpen, setEqModalOpen] = useState(false);
  const [graphModalOpen, setGraphModalOpen] = useState(false);
  const [imgModalOpen, setImgModalOpen] = useState(false);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);

  const {
    initLesson,
    pages,
    objects,
    isDirty,
    undo,
    redo,
    deleteSelected,
    clearSelection,
    setTool,
  } = useWhiteboardStore();

  const { presentationMode } = useUIStore();

  useAutosave({ lessonId, enabled: true });

  // Online/Offline listener
  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // Load whiteboard from server or IndexedDB
  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!lessonId.startsWith('offline-')) {
        try {
          const data = await whiteboardsAPI.get(lessonId);
          if (cancelled) return;
          setTitle(data.title || 'Untitled Whiteboard');

          const loadedPages: WhiteboardPage[] = (data.pages || []).map(
            (p: { page_id?: string; id?: string; order?: number; name?: string; background?: string; objects?: CanvasObject[] }, idx: number) => ({
              id: p.page_id || p.id || uuidv4(),
              lessonId,
              index: p.order ?? idx,
              title: p.name,
              background: { type: (p.background as 'white') || 'white', gridSize: 24, opacity: 1 },
              objectIds: (p.objects || []).map((o) => o.id),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            })
          );

          const loadedObjects: CanvasObject[] = [];
          for (const p of data.pages || []) {
            for (const o of p.objects || []) {
              loadedObjects.push(o);
            }
          }
          initLesson(lessonId, loadedPages, loadedObjects);
          return;
        } catch {
          // Fallback to local IndexedDB
        }
      }

      const local = await loadWhiteboard(lessonId);
      if (cancelled) return;
      if (local) {
        initLesson(lessonId, local.pages, local.objects);
      } else {
        initLesson(lessonId, [], []);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [lessonId, initLesson]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        deleteSelected();
      } else if (e.key === 'Escape') {
        clearSelection();
      } else if (e.key.toLowerCase() === 'p') {
        setTool(TeachingTool.Pen);
      } else if (e.key.toLowerCase() === 'v') {
        setTool(TeachingTool.Select);
      } else if (e.key.toLowerCase() === 'e') {
        setTool(TeachingTool.Eraser);
      } else if (e.key.toLowerCase() === 'h') {
        setTool(TeachingTool.Highlighter);
      } else if (e.key.toLowerCase() === 't') {
        setTool(TeachingTool.Text);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undo, redo, deleteSelected, clearSelection, setTool]);

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    if (!lessonId.startsWith('offline-')) {
      whiteboardsAPI.update(lessonId, { title: newTitle }).catch(() => {});
    }
  };

  const handleExportPNG = () => {
    const stage = stageRef.current;
    if (!stage) return;
    const dataUrl = stage.toDataURL({ pixelRatio: 2 });
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${title.replace(/\s+/g, '_')}.png`;
    a.click();
    showSuccess('Exported current page as PNG');
  };

  const handleExportJSON = () => {
    const payload = JSON.stringify({ title, pages, objects }, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_')}.rekha.json`;
    a.click();
    URL.revokeObjectURL(url);
    showSuccess('Exported Rekha JSON');
  };

  const saveStatus = !isOnline ? 'offline' : isDirty ? 'saving' : 'saved';

  return (
    <div className={`relative h-screen w-screen overflow-hidden ${presentationMode ? 'presentation-mode' : ''}`}>
      <TopBar
        title={title}
        onTitleChange={handleTitleChange}
        saveStatus={saveStatus}
        isOnline={isOnline}
        onOpenBackgrounds={() => setBgModalOpen(true)}
        onOpenResources={() => setResourcesOpen(true)}
        onExportPNG={handleExportPNG}
        onExportJSON={handleExportJSON}
        recordingSlot={<RecordingControls stageRef={stageRef} />}
      />

      <div className="h-full w-full pt-12 pb-[72px]">
        <WhiteboardCanvas
          stageRef={stageRef}
          onOpenEquationEditor={() => setEqModalOpen(true)}
          onOpenGraphPlotter={() => setGraphModalOpen(true)}
        />
      </div>

      <TeachingToolbar
        onOpenEquationEditor={() => setEqModalOpen(true)}
        onOpenGraphPlotter={() => setGraphModalOpen(true)}
        onOpenImageUpload={() => setImgModalOpen(true)}
        onOpenPDFUpload={() => setPdfModalOpen(true)}
      />

      <PagePanel />
      <AIAssistant />
      <SpotlightTool />
      <CurtainTool />
      <PresentationMode />

      <BackgroundSelector open={bgModalOpen} onOpenChange={setBgModalOpen} />
      <EquationEditor open={eqModalOpen} onOpenChange={setEqModalOpen} />
      <GraphPlotter open={graphModalOpen} onOpenChange={setGraphModalOpen} />
      <ImageInserter open={imgModalOpen} onOpenChange={setImgModalOpen} />
      <PDFInserter open={pdfModalOpen} onOpenChange={setPdfModalOpen} />
      <ResourceLibrary open={resourcesOpen} onOpenChange={setResourcesOpen} />
    </div>
  );
}

