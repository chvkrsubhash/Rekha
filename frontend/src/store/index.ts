// ─────────────────────────────────────────────────────────────
//  Rekha – Zustand Stores
//  AkashaVyom Labs
// ─────────────────────────────────────────────────────────────

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

import type {
  User,
  AuthTokens,
  Classroom,
  ClassroomSession,
  SessionParticipant,
  ChatMessage,
  CanvasObject,
  WhiteboardPage,
  Background,
  TeachingTool,
  DrawingMode,
  ViewTransform,
  Point2D,
  UUID,
  HexColor,
  HistoryEntry,
} from '@/types';
import { TeachingTool as ToolEnum } from '@/types';

// ─────────────────────── Auth Store ──────────────────────────

interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  setUser: (user: User | null) => void;
  setTokens: (tokens: AuthTokens | null) => void;
  login: (user: User, tokens: AuthTokens) => void;
  logout: () => void;
  refreshToken: (tokens: AuthTokens) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    immer((set) => ({
      // State
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Actions
      setUser: (user) =>
        set((state) => {
          state.user = user;
          state.isAuthenticated = user !== null;
        }),

      setTokens: (tokens) =>
        set((state) => {
          state.tokens = tokens;
        }),

      login: (user, tokens) =>
        set((state) => {
          state.user = user;
          state.tokens = tokens;
          state.isAuthenticated = true;
          state.error = null;
        }),

      logout: () =>
        set((state) => {
          state.user = null;
          state.tokens = null;
          state.isAuthenticated = false;
          state.error = null;
        }),

      refreshToken: (tokens) =>
        set((state) => {
          state.tokens = tokens;
        }),

      setLoading: (loading) =>
        set((state) => {
          state.isLoading = loading;
        }),

      setError: (error) =>
        set((state) => {
          state.error = error;
        }),
    })),
    {
      name: 'rekha-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

// ─────────────────── Whiteboard Store ────────────────────────

const MAX_HISTORY = 50;

const DEFAULT_BACKGROUND: Background = {
  type: 'whiteboard' as Background['type'],
  color: '#fafafa',
};

const createDefaultPage = (lessonId: UUID, index: number): WhiteboardPage => ({
  id: uuidv4(),
  lessonId,
  index,
  title: `Page ${index + 1}`,
  background: DEFAULT_BACKGROUND,
  objectIds: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

interface WhiteboardState {
  lessonId: UUID | null;
  pages: WhiteboardPage[];
  currentPageId: UUID | null;
  objects: Record<UUID, CanvasObject>;
  selectedIds: UUID[];
  tool: TeachingTool;
  drawingMode: DrawingMode;
  color: HexColor;
  fillColor: HexColor | null;
  strokeWidth: number;
  opacity: number;
  background: Background;
  transform: ViewTransform;
  undoStack: HistoryEntry[];
  redoStack: HistoryEntry[];
  isDirty: boolean;
  isReadOnly: boolean;
}

interface WhiteboardActions {
  // Initialization
  initLesson: (lessonId: UUID, pages: WhiteboardPage[], objects: CanvasObject[]) => void;
  setReadOnly: (readOnly: boolean) => void;

  // Objects
  addObject: (obj: CanvasObject) => void;
  updateObject: (id: UUID, patch: Partial<CanvasObject>) => void;
  deleteObject: (id: UUID) => void;
  deleteSelected: () => void;
  duplicateObject: (id: UUID) => void;
  moveObjectZ: (id: UUID, direction: 'up' | 'down' | 'top' | 'bottom') => void;

  // Selection
  setSelected: (ids: UUID[]) => void;
  addToSelection: (id: UUID) => void;
  removeFromSelection: (id: UUID) => void;
  clearSelection: () => void;

  // Tool
  setTool: (tool: TeachingTool) => void;
  setDrawingMode: (mode: DrawingMode) => void;
  setColor: (color: HexColor) => void;
  setFillColor: (color: HexColor | null) => void;
  setStrokeWidth: (width: number) => void;
  setOpacity: (opacity: number) => void;

  // Background
  setBackground: (bg: Partial<Background>) => void;

  // Pages
  addPage: (afterIndex?: number) => void;
  deletePage: (pageId: UUID) => void;
  reorderPage: (pageId: UUID, newIndex: number) => void;
  setCurrentPage: (pageId: UUID) => void;
  updatePageThumbnail: (pageId: UUID, thumbnailUrl: string) => void;

  // Viewport
  zoomTo: (zoom: number, origin?: Point2D) => void;
  panTo: (panX: number, panY: number) => void;
  resetView: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  fitToPage: () => void;

  // History
  pushHistory: (entry: HistoryEntry) => void;
  undo: () => void;
  redo: () => void;

  // Misc
  clearPage: (pageId?: UUID) => void;
  setDirty: (dirty: boolean) => void;
}

export const useWhiteboardStore = create<WhiteboardState & WhiteboardActions>()(
  immer((set, get) => ({
    // ── State ──
    lessonId: null,
    pages: [],
    currentPageId: null,
    objects: {},
    selectedIds: [],
    tool: ToolEnum.Pen,
    drawingMode: 'freehand' as DrawingMode,
    color: '#000000',
    fillColor: null,
    strokeWidth: 3,
    opacity: 1,
    background: DEFAULT_BACKGROUND,
    transform: { zoom: 1, panX: 0, panY: 0 },
    undoStack: [],
    redoStack: [],
    isDirty: false,
    isReadOnly: false,

    // ── Actions ──

    initLesson: (lessonId, pages, objects) =>
      set((state) => {
        state.lessonId = lessonId;
        state.pages = pages.length > 0 ? pages : [createDefaultPage(lessonId, 0)];
        state.currentPageId = state.pages[0].id;
        state.objects = {};
        for (const obj of objects) {
          state.objects[obj.id] = obj;
        }
        state.undoStack = [];
        state.redoStack = [];
        state.isDirty = false;
      }),

    setReadOnly: (readOnly) =>
      set((state) => { state.isReadOnly = readOnly; }),

    addObject: (obj) =>
      set((state) => {
        state.objects[obj.id] = obj;
        const page = state.pages.find((p) => p.id === state.currentPageId);
        if (page && !page.objectIds.includes(obj.id)) {
          page.objectIds.push(obj.id);
          page.updatedAt = new Date().toISOString();
        }
        state.isDirty = true;
        state.redoStack = [];
      }),

    updateObject: (id, patch) =>
      set((state) => {
        if (state.objects[id]) {
          Object.assign(state.objects[id], patch, {
            updatedAt: new Date().toISOString(),
          });
          state.isDirty = true;
        }
      }),

    deleteObject: (id) =>
      set((state) => {
        delete state.objects[id];
        for (const page of state.pages) {
          const idx = page.objectIds.indexOf(id);
          if (idx !== -1) {
            page.objectIds.splice(idx, 1);
            page.updatedAt = new Date().toISOString();
          }
        }
        state.selectedIds = state.selectedIds.filter((sid) => sid !== id);
        state.isDirty = true;
      }),

    deleteSelected: () => {
      const { selectedIds, deleteObject } = get();
      selectedIds.forEach((id) => deleteObject(id));
    },

    duplicateObject: (id) =>
      set((state) => {
        const original = state.objects[id];
        if (!original) return;
        const clone: CanvasObject = {
          ...original,
          id: uuidv4(),
          x: original.x + 20,
          y: original.y + 20,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as CanvasObject;
        state.objects[clone.id] = clone;
        const page = state.pages.find((p) => p.id === state.currentPageId);
        if (page) {
          page.objectIds.push(clone.id);
          page.updatedAt = new Date().toISOString();
        }
        state.isDirty = true;
      }),

    moveObjectZ: (id, direction) =>
      set((state) => {
        const page = state.pages.find((p) => p.objectIds.includes(id));
        if (!page) return;
        const idx = page.objectIds.indexOf(id);
        const len = page.objectIds.length;
        if (direction === 'up' && idx < len - 1) {
          [page.objectIds[idx], page.objectIds[idx + 1]] = [page.objectIds[idx + 1], page.objectIds[idx]];
        } else if (direction === 'down' && idx > 0) {
          [page.objectIds[idx], page.objectIds[idx - 1]] = [page.objectIds[idx - 1], page.objectIds[idx]];
        } else if (direction === 'top') {
          page.objectIds.splice(idx, 1);
          page.objectIds.push(id);
        } else if (direction === 'bottom') {
          page.objectIds.splice(idx, 1);
          page.objectIds.unshift(id);
        }
        // Re-assign zIndex
        page.objectIds.forEach((oid, i) => {
          if (state.objects[oid]) {
            (state.objects[oid] as CanvasObject).zIndex = i;
          }
        });
        state.isDirty = true;
      }),

    setSelected: (ids) =>
      set((state) => { state.selectedIds = ids; }),

    addToSelection: (id) =>
      set((state) => {
        if (!state.selectedIds.includes(id)) state.selectedIds.push(id);
      }),

    removeFromSelection: (id) =>
      set((state) => {
        state.selectedIds = state.selectedIds.filter((sid) => sid !== id);
      }),

    clearSelection: () =>
      set((state) => { state.selectedIds = []; }),

    setTool: (tool) =>
      set((state) => {
        state.tool = tool;
        state.selectedIds = [];
      }),

    setDrawingMode: (mode) =>
      set((state) => { state.drawingMode = mode; }),

    setColor: (color) =>
      set((state) => { state.color = color; }),

    setFillColor: (color) =>
      set((state) => { state.fillColor = color; }),

    setStrokeWidth: (width) =>
      set((state) => { state.strokeWidth = width; }),

    setOpacity: (opacity) =>
      set((state) => { state.opacity = Math.min(1, Math.max(0, opacity)); }),

    setBackground: (bg) =>
      set((state) => {
        state.background = { ...state.background, ...bg };
        const page = state.pages.find((p) => p.id === state.currentPageId);
        if (page) {
          page.background = state.background;
          page.updatedAt = new Date().toISOString();
        }
        state.isDirty = true;
      }),

    addPage: (afterIndex) =>
      set((state) => {
        const insertAt = afterIndex !== undefined ? afterIndex + 1 : state.pages.length;
        const newPage = createDefaultPage(state.lessonId ?? 'local', insertAt);
        state.pages.splice(insertAt, 0, newPage);
        // Fix indices
        state.pages.forEach((p, i) => { p.index = i; });
        state.currentPageId = newPage.id;
        state.isDirty = true;
      }),

    deletePage: (pageId) =>
      set((state) => {
        if (state.pages.length <= 1) return; // keep at least one page
        const idx = state.pages.findIndex((p) => p.id === pageId);
        if (idx === -1) return;
        // Remove all objects on the page
        const page = state.pages[idx];
        for (const oid of page.objectIds) {
          delete state.objects[oid];
        }
        state.pages.splice(idx, 1);
        state.pages.forEach((p, i) => { p.index = i; });
        // Switch current page
        if (state.currentPageId === pageId) {
          state.currentPageId = state.pages[Math.max(0, idx - 1)].id;
        }
        state.isDirty = true;
      }),

    reorderPage: (pageId, newIndex) =>
      set((state) => {
        const idx = state.pages.findIndex((p) => p.id === pageId);
        if (idx === -1) return;
        const [page] = state.pages.splice(idx, 1);
        state.pages.splice(newIndex, 0, page);
        state.pages.forEach((p, i) => { p.index = i; });
        state.isDirty = true;
      }),

    setCurrentPage: (pageId) =>
      set((state) => {
        state.currentPageId = pageId;
        const page = state.pages.find((p) => p.id === pageId);
        if (page) state.background = page.background;
        state.selectedIds = [];
      }),

    updatePageThumbnail: (pageId, thumbnailUrl) =>
      set((state) => {
        const page = state.pages.find((p) => p.id === pageId);
        if (page) page.thumbnailUrl = thumbnailUrl;
      }),

    zoomTo: (zoom, _origin) =>
      set((state) => {
        state.transform.zoom = Math.min(5, Math.max(0.1, zoom));
      }),

    panTo: (panX, panY) =>
      set((state) => {
        state.transform.panX = panX;
        state.transform.panY = panY;
      }),

    resetView: () =>
      set((state) => { state.transform = { zoom: 1, panX: 0, panY: 0 }; }),

    zoomIn: () => {
      const { transform, zoomTo } = get();
      zoomTo(transform.zoom * 1.25);
    },

    zoomOut: () => {
      const { transform, zoomTo } = get();
      zoomTo(transform.zoom / 1.25);
    },

    fitToPage: () =>
      set((state) => { state.transform = { zoom: 1, panX: 0, panY: 0 }; }),

    pushHistory: (entry) =>
      set((state) => {
        state.undoStack.push(entry);
        if (state.undoStack.length > MAX_HISTORY) {
          state.undoStack.shift();
        }
        state.redoStack = [];
      }),

    undo: () =>
      set((state) => {
        const entry = state.undoStack.pop();
        if (!entry) return;
        // Restore objects from snapshot
        for (const snap of entry.snapshot) {
          if (snap.id) {
            if (state.objects[snap.id]) {
              Object.assign(state.objects[snap.id], snap);
            }
          }
        }
        state.redoStack.push(entry);
        state.isDirty = true;
      }),

    redo: () =>
      set((state) => {
        const entry = state.redoStack.pop();
        if (!entry) return;
        state.undoStack.push(entry);
        state.isDirty = true;
      }),

    clearPage: (pageId) =>
      set((state) => {
        const targetId = pageId ?? state.currentPageId;
        const page = state.pages.find((p) => p.id === targetId);
        if (!page) return;
        for (const oid of page.objectIds) {
          delete state.objects[oid];
        }
        page.objectIds = [];
        page.updatedAt = new Date().toISOString();
        state.selectedIds = [];
        state.isDirty = true;
      }),

    setDirty: (dirty) =>
      set((state) => { state.isDirty = dirty; }),
  })),
);

// ─────────────────── Classroom Store ─────────────────────────

interface ClassroomState {
  classroom: Classroom | null;
  session: ClassroomSession | null;
  participants: SessionParticipant[];
  messages: ChatMessage[];
  raisedHands: UUID[];          // userId list in order raised
  isConnected: boolean;
  connectionError: string | null;
  isTeacher: boolean;
}

interface ClassroomActions {
  setClassroom: (classroom: Classroom | null) => void;
  setSession: (session: ClassroomSession | null) => void;
  setParticipants: (participants: SessionParticipant[]) => void;
  updateParticipant: (participant: SessionParticipant) => void;
  removeParticipant: (userId: UUID) => void;
  addMessage: (message: ChatMessage) => void;
  clearMessages: () => void;
  raiseHand: (userId: UUID) => void;
  lowerHand: (userId: UUID) => void;
  lowerAllHands: () => void;
  setConnected: (connected: boolean) => void;
  setConnectionError: (error: string | null) => void;
  setIsTeacher: (isTeacher: boolean) => void;
  reset: () => void;
}

const classroomInitialState: ClassroomState = {
  classroom: null,
  session: null,
  participants: [],
  messages: [],
  raisedHands: [],
  isConnected: false,
  connectionError: null,
  isTeacher: false,
};

export const useClassroomStore = create<ClassroomState & ClassroomActions>()(
  immer((set) => ({
    ...classroomInitialState,

    setClassroom: (classroom) =>
      set((state) => { state.classroom = classroom; }),

    setSession: (session) =>
      set((state) => { state.session = session; }),

    setParticipants: (participants) =>
      set((state) => { state.participants = participants; }),

    updateParticipant: (participant) =>
      set((state) => {
        const idx = state.participants.findIndex((p) => p.userId === participant.userId);
        if (idx !== -1) {
          state.participants[idx] = participant;
        } else {
          state.participants.push(participant);
        }
      }),

    removeParticipant: (userId) =>
      set((state) => {
        state.participants = state.participants.filter((p) => p.userId !== userId);
        state.raisedHands = state.raisedHands.filter((id) => id !== userId);
      }),

    addMessage: (message) =>
      set((state) => {
        state.messages.push(message);
        // Keep last 200 messages in memory
        if (state.messages.length > 200) {
          state.messages.shift();
        }
      }),

    clearMessages: () =>
      set((state) => { state.messages = []; }),

    raiseHand: (userId) =>
      set((state) => {
        if (!state.raisedHands.includes(userId)) {
          state.raisedHands.push(userId);
        }
        const participant = state.participants.find((p) => p.userId === userId);
        if (participant) {
          participant.handRaised = true;
          participant.handRaisedAt = new Date().toISOString();
        }
      }),

    lowerHand: (userId) =>
      set((state) => {
        state.raisedHands = state.raisedHands.filter((id) => id !== userId);
        const participant = state.participants.find((p) => p.userId === userId);
        if (participant) {
          participant.handRaised = false;
          participant.handRaisedAt = undefined;
        }
      }),

    lowerAllHands: () =>
      set((state) => {
        state.raisedHands = [];
        for (const p of state.participants) {
          p.handRaised = false;
          p.handRaisedAt = undefined;
        }
      }),

    setConnected: (connected) =>
      set((state) => {
        state.isConnected = connected;
        if (connected) state.connectionError = null;
      }),

    setConnectionError: (error) =>
      set((state) => { state.connectionError = error; }),

    setIsTeacher: (isTeacher) =>
      set((state) => { state.isTeacher = isTeacher; }),

    reset: () =>
      set((state) => {
        Object.assign(state, classroomInitialState);
      }),
  })),
);

// ─────────────────────── UI Store ────────────────────────────

interface SpotlightState {
  active: boolean;
  x: number;
  y: number;
  radius: number;
}

interface UIState {
  sidebarOpen: boolean;
  sidebarTab: 'pages' | 'objects' | 'chat' | 'participants' | 'resources';
  toolbarPosition: 'left' | 'right' | 'top' | 'bottom' | 'floating';
  toolbarExpanded: boolean;
  presentationMode: boolean;
  fullscreen: boolean;
  spotlight: SpotlightState;
  curtainProgress: number;        // 0 = fully open, 1 = fully closed
  curtainFromTop: boolean;
  laserPointerActive: boolean;
  laserPointerPosition: { x: number; y: number };
  gridVisible: boolean;
  rulersVisible: boolean;
  snapEnabled: boolean;
  darkMode: boolean;
  compactMode: boolean;
  aiPanelOpen: boolean;
  miniMapVisible: boolean;
}

interface UIActions {
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSidebarTab: (tab: UIState['sidebarTab']) => void;
  setToolbarPosition: (position: UIState['toolbarPosition']) => void;
  toggleToolbarExpanded: () => void;
  setPresentationMode: (active: boolean) => void;
  setFullscreen: (active: boolean) => void;
  setSpotlight: (patch: Partial<SpotlightState>) => void;
  toggleSpotlight: () => void;
  setCurtainProgress: (progress: number) => void;
  setCurtainFromTop: (fromTop: boolean) => void;
  setLaserPointer: (active: boolean, x?: number, y?: number) => void;
  toggleGrid: () => void;
  toggleRulers: () => void;
  toggleSnap: () => void;
  toggleDarkMode: () => void;
  toggleCompactMode: () => void;
  setAIPanelOpen: (open: boolean) => void;
  setMiniMapVisible: (visible: boolean) => void;
}

export const useUIStore = create<UIState & UIActions>()(
  persist(
    immer((set) => ({
      // State
      sidebarOpen: true,
      sidebarTab: 'pages',
      toolbarPosition: 'left',
      toolbarExpanded: true,
      presentationMode: false,
      fullscreen: false,
      spotlight: { active: false, x: 0, y: 0, radius: 120 },
      curtainProgress: 0,
      curtainFromTop: true,
      laserPointerActive: false,
      laserPointerPosition: { x: 0, y: 0 },
      gridVisible: false,
      rulersVisible: false,
      snapEnabled: true,
      darkMode: true,
      compactMode: false,
      aiPanelOpen: false,
      miniMapVisible: false,

      // Actions
      toggleSidebar: () =>
        set((state) => { state.sidebarOpen = !state.sidebarOpen; }),

      setSidebarOpen: (open) =>
        set((state) => { state.sidebarOpen = open; }),

      setSidebarTab: (tab) =>
        set((state) => {
          state.sidebarTab = tab;
          state.sidebarOpen = true;
        }),

      setToolbarPosition: (position) =>
        set((state) => { state.toolbarPosition = position; }),

      toggleToolbarExpanded: () =>
        set((state) => { state.toolbarExpanded = !state.toolbarExpanded; }),

      setPresentationMode: (active) =>
        set((state) => {
          state.presentationMode = active;
          if (active) state.sidebarOpen = false;
        }),

      setFullscreen: (active) =>
        set((state) => { state.fullscreen = active; }),

      setSpotlight: (patch) =>
        set((state) => { Object.assign(state.spotlight, patch); }),

      toggleSpotlight: () =>
        set((state) => { state.spotlight.active = !state.spotlight.active; }),

      setCurtainProgress: (progress) =>
        set((state) => {
          state.curtainProgress = Math.min(1, Math.max(0, progress));
        }),

      setCurtainFromTop: (fromTop) =>
        set((state) => { state.curtainFromTop = fromTop; }),

      setLaserPointer: (active, x = 0, y = 0) =>
        set((state) => {
          state.laserPointerActive = active;
          state.laserPointerPosition = { x, y };
        }),

      toggleGrid: () =>
        set((state) => { state.gridVisible = !state.gridVisible; }),

      toggleRulers: () =>
        set((state) => { state.rulersVisible = !state.rulersVisible; }),

      toggleSnap: () =>
        set((state) => { state.snapEnabled = !state.snapEnabled; }),

      toggleDarkMode: () =>
        set((state) => { state.darkMode = !state.darkMode; }),

      toggleCompactMode: () =>
        set((state) => { state.compactMode = !state.compactMode; }),

      setAIPanelOpen: (open) =>
        set((state) => { state.aiPanelOpen = open; }),

      setMiniMapVisible: (visible) =>
        set((state) => { state.miniMapVisible = visible; }),
    })),
    {
      name: 'rekha-ui',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        toolbarPosition: state.toolbarPosition,
        toolbarExpanded: state.toolbarExpanded,
        darkMode: state.darkMode,
        compactMode: state.compactMode,
        snapEnabled: state.snapEnabled,
        gridVisible: state.gridVisible,
        rulersVisible: state.rulersVisible,
      }),
    },
  ),
);
