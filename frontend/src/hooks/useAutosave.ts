// ─────────────────────────────────────────────────────────────
//  useAutosave – Debounced IndexedDB autosave with offline queue
//  AkashaVyom Labs / Rekha
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useCallback } from 'react';
import { saveWhiteboard, saveDraft, loadDraft } from '@/lib/indexedDB';
import { useWhiteboardStore } from '@/store';
import { api } from '@/lib/api';
import type { WhiteboardPage, CanvasObject, UUID } from '@/types';

const DEBOUNCE_MS = 2000;
const SYNC_INTERVAL_MS = 30_000;

interface AutosaveOptions {
  lessonId: UUID;
  enabled?: boolean;
}

interface OfflineQueueItem {
  lessonId: UUID;
  pages: WhiteboardPage[];
  objects: CanvasObject[];
  savedAt: number;
}

// Module-level offline queue persisted in memory between renders
const offlineQueue: Map<UUID, OfflineQueueItem> = new Map();

function getCanvasSnapshot(
  pages: WhiteboardPage[],
  objects: Record<UUID, CanvasObject>,
): { pages: WhiteboardPage[]; objects: CanvasObject[] } {
  return {
    pages: structuredClone(pages),
    objects: Object.values(objects).map((o) => structuredClone(o)),
  };
}

export function useAutosave({ lessonId, enabled = true }: AutosaveOptions) {
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const isOnline = useRef(navigator.onLine);
  const isSaving = useRef(false);

  // ── Save to IndexedDB (always, as a local draft) ──────────
  const saveLocally = useCallback(
    async (pages: WhiteboardPage[], objects: CanvasObject[]) => {
      try {
        await Promise.all([
          saveWhiteboard(lessonId, { pages, objects }),
          saveDraft(lessonId, { pages, objects, savedAt: Date.now() }),
        ]);
      } catch (err) {
        console.warn('[Autosave] IndexedDB save failed:', err);
      }
    },
    [lessonId],
  );

  // ── Push to server ────────────────────────────────────────
  const pushToServer = useCallback(
    async (pages: WhiteboardPage[], objects: CanvasObject[]) => {
      if (!isOnline.current || isSaving.current) return;
      isSaving.current = true;
      try {
        await api.whiteboards.update(lessonId, { pages, objects });
        offlineQueue.delete(lessonId);
        useWhiteboardStore.getState().setDirty(false);
      } catch (err) {
        console.warn('[Autosave] Server sync failed, queuing:', err);
        offlineQueue.set(lessonId, { lessonId, pages, objects, savedAt: Date.now() });
      } finally {
        isSaving.current = false;
      }
    },
    [lessonId],
  );

  // ── Flush the offline queue when back online ──────────────
  const flushOfflineQueue = useCallback(async () => {
    if (!isOnline.current) return;
    for (const [lid, item] of offlineQueue.entries()) {
      try {
        await api.whiteboards.update(lid, {
          pages: item.pages,
          objects: item.objects,
        });
        offlineQueue.delete(lid);
      } catch {
        // Will retry on next sync cycle
      }
    }
  }, []);

  // ── Main trigger: called whenever store changes ───────────
  const triggerSave = useCallback(() => {
    if (!enabled) return;
    const state = useWhiteboardStore.getState();
    if (!state.isDirty) return;

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(async () => {
      const snap = getCanvasSnapshot(state.pages, state.objects);
      await saveLocally(snap.pages, snap.objects);
      await pushToServer(snap.pages, snap.objects);
    }, DEBOUNCE_MS);
  }, [enabled, saveLocally, pushToServer]);

  // ── Load draft on mount ───────────────────────────────────
  const loadSavedDraft = useCallback(async () => {
    try {
      const draft = await loadDraft(lessonId);
      return draft;
    } catch {
      return null;
    }
  }, [lessonId]);

  // ── Online / offline listeners ────────────────────────────
  useEffect(() => {
    const handleOnline = () => {
      isOnline.current = true;
      flushOfflineQueue();
    };
    const handleOffline = () => { isOnline.current = false; };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [flushOfflineQueue]);

  // ── Periodic sync for resilience ─────────────────────────
  useEffect(() => {
    if (!enabled) return;
    syncTimer.current = setInterval(() => {
      const state = useWhiteboardStore.getState();
      if (state.isDirty) {
        const snap = getCanvasSnapshot(state.pages, state.objects);
        pushToServer(snap.pages, snap.objects);
      }
      if (offlineQueue.size > 0) flushOfflineQueue();
    }, SYNC_INTERVAL_MS);

    return () => {
      if (syncTimer.current) clearInterval(syncTimer.current);
    };
  }, [enabled, pushToServer, flushOfflineQueue]);

  // ── Subscribe to whiteboard store changes ─────────────────
  useEffect(() => {
    if (!enabled) return;
    const unsubscribe = useWhiteboardStore.subscribe((state) => {
      if (state.isDirty) triggerSave();
    });
    return unsubscribe;
  }, [enabled, triggerSave]);

  // ── Cleanup on unmount ────────────────────────────────────
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      // Final save on unmount
      const state = useWhiteboardStore.getState();
      if (state.isDirty) {
        const snap = getCanvasSnapshot(state.pages, state.objects);
        void saveLocally(snap.pages, snap.objects);
      }
    };
  }, [saveLocally]);

  return { triggerSave, loadSavedDraft };
}
