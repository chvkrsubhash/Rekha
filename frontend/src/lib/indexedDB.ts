// ─────────────────────────────────────────────────────────────
//  indexedDB.ts – IndexedDB wrapper using 'idb'
//  Stores: whiteboards, drafts
//  AkashaVyom Labs / Rekha
// ─────────────────────────────────────────────────────────────

import { openDB, type IDBPDatabase } from 'idb';
import type { CanvasObject, WhiteboardPage, UUID } from '@/types';

// ─────────────────── Schema ───────────────────────────────────

const DB_NAME    = 'rekha-db';
const DB_VERSION = 1;

interface WhiteboardRecord {
  lessonId: UUID;
  pages: WhiteboardPage[];
  objects: CanvasObject[];
  savedAt: number;
}

interface DraftRecord {
  lessonId: UUID;
  pages: WhiteboardPage[];
  objects: CanvasObject[];
  savedAt: number;
}

interface RekhaDB {
  whiteboards: {
    key: UUID;
    value: WhiteboardRecord;
  };
  drafts: {
    key: UUID;
    value: DraftRecord;
    indexes: { 'by-savedAt': number };
  };
}

// ─────────────────── Singleton DB ────────────────────────────

let _db: IDBPDatabase<RekhaDB> | null = null;

async function getDB(): Promise<IDBPDatabase<RekhaDB>> {
  if (_db) return _db;

  _db = await openDB<RekhaDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      // Whiteboards object store
      if (!db.objectStoreNames.contains('whiteboards')) {
        db.createObjectStore('whiteboards', { keyPath: 'lessonId' });
      }

      // Drafts object store (auto-save staging area)
      if (!db.objectStoreNames.contains('drafts')) {
        const draftStore = db.createObjectStore('drafts', { keyPath: 'lessonId' });
        draftStore.createIndex('by-savedAt', 'savedAt');
      }

      void oldVersion; // suppress unused warning
    },
    blocked() {
      console.warn('[IDB] Database upgrade blocked by another tab.');
    },
    blocking() {
      _db?.close();
      _db = null;
    },
    terminated() {
      _db = null;
    },
  });

  return _db;
}

// ─────────────────── Whiteboard ops ──────────────────────────

/**
 * Persist the full whiteboard state for a lesson.
 */
export async function saveWhiteboard(
  lessonId: UUID,
  data: { pages: WhiteboardPage[]; objects: CanvasObject[] },
): Promise<void> {
  const db = await getDB();
  const record: WhiteboardRecord = {
    lessonId,
    pages:   data.pages,
    objects: data.objects,
    savedAt: Date.now(),
  };
  await db.put('whiteboards', record);
}

/**
 * Load a whiteboard's persisted state from IndexedDB.
 * Returns null if no data is stored for the lesson.
 */
export async function loadWhiteboard(
  lessonId: UUID,
): Promise<{ pages: WhiteboardPage[]; objects: CanvasObject[] } | null> {
  const db = await getDB();
  const record = await db.get('whiteboards', lessonId);
  if (!record) return null;
  return { pages: record.pages, objects: record.objects };
}

/**
 * Delete all stored data for a whiteboard (e.g. after publish or delete).
 */
export async function deleteWhiteboard(lessonId: UUID): Promise<void> {
  const db = await getDB();
  await db.delete('whiteboards', lessonId);
}

// ─────────────────── Draft ops ────────────────────────────────

/**
 * Save a draft snapshot — lighter-weight auto-save staging area.
 */
export async function saveDraft(
  lessonId: UUID,
  data: { pages: WhiteboardPage[]; objects: CanvasObject[]; savedAt: number },
): Promise<void> {
  const db = await getDB();
  const record: DraftRecord = {
    lessonId,
    pages:   data.pages,
    objects: data.objects,
    savedAt: data.savedAt,
  };
  await db.put('drafts', record);
}

/**
 * Load the most recent draft for a lesson.
 */
export async function loadDraft(
  lessonId: UUID,
): Promise<{ pages: WhiteboardPage[]; objects: CanvasObject[]; savedAt: number } | null> {
  const db = await getDB();
  const record = await db.get('drafts', lessonId);
  if (!record) return null;
  return { pages: record.pages, objects: record.objects, savedAt: record.savedAt };
}

/**
 * Remove a draft (e.g. after successful server sync).
 */
export async function clearDraft(lessonId: UUID): Promise<void> {
  const db = await getDB();
  await db.delete('drafts', lessonId);
}

/**
 * List all draft entries, ordered by most recently saved.
 */
export async function listDrafts(): Promise<
  Array<{ lessonId: UUID; savedAt: number }>
> {
  const db = await getDB();
  const index = db.transaction('drafts').store.index('by-savedAt');
  const all = await index.getAll();
  // Sort descending by savedAt
  return all
    .sort((a, b) => b.savedAt - a.savedAt)
    .map(({ lessonId, savedAt }) => ({ lessonId, savedAt }));
}

/**
 * Remove all drafts older than a given age in milliseconds.
 */
export async function pruneOldDrafts(maxAgeMs: number): Promise<void> {
  const db = await getDB();
  const cutoff = Date.now() - maxAgeMs;
  const tx = db.transaction('drafts', 'readwrite');
  const index = tx.store.index('by-savedAt');
  let cursor = await index.openCursor();
  while (cursor) {
    if ((cursor.value as DraftRecord).savedAt < cutoff) {
      await cursor.delete();
    }
    cursor = await cursor.continue();
  }
  await tx.done;
}

/**
 * Clear all drafts (e.g. on sign-out).
 */
export async function clearAllDrafts(): Promise<void> {
  const db = await getDB();
  await db.clear('drafts');
}

/**
 * Close the database connection (useful for tests or sign-out cleanup).
 */
export function closeDB(): void {
  _db?.close();
  _db = null;
}
