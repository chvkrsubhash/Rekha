// ─────────────────────────────────────────────────────────────
//  Rekha – Domain Types
//  AkashaVyom Labs
// ─────────────────────────────────────────────────────────────

// ───────────────────── Primitive helpers ─────────────────────
export type ISO8601 = string;
export type UUID = string;
export type Url = string;
export type HexColor = string;

// ───────────────────── Auth & Identity ───────────────────────
export type UserRole = 'teacher' | 'student' | 'admin' | 'guest';

export interface User {
  id: UUID;
  email: string;
  displayName: string;
  avatarUrl?: Url;
  role: UserRole;
  locale: string;               // e.g. "te", "hi", "en"
  preferredScript?: 'telugu' | 'devanagari' | 'latin';
  institutionId?: UUID;
  createdAt: ISO8601;
  updatedAt: ISO8601;
  lastActiveAt?: ISO8601;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;            // seconds
}

// ───────────────────── Institution ───────────────────────────
export interface Institution {
  id: UUID;
  name: string;
  slug: string;
  logoUrl?: Url;
  primaryColor?: HexColor;
  plan: 'free' | 'standard' | 'pro' | 'enterprise';
  maxTeachers: number;
  maxStudents: number;
  createdAt: ISO8601;
}

// ───────────────────── Workspace ─────────────────────────────
export interface Workspace {
  id: UUID;
  name: string;
  ownerId: UUID;
  institutionId?: UUID;
  memberIds: UUID[];
  createdAt: ISO8601;
  updatedAt: ISO8601;
}

// ───────────────────── Classroom ─────────────────────────────
export type ClassroomStatus = 'active' | 'archived' | 'scheduled';

export interface Classroom {
  id: UUID;
  name: string;
  description?: string;
  subject?: string;
  gradeLevel?: string;
  teacherId: UUID;
  institutionId?: UUID;
  joinCode: string;             // 6-character join code
  status: ClassroomStatus;
  coverColor?: HexColor;
  coverImageUrl?: Url;
  studentCount: number;
  lessonCount: number;
  createdAt: ISO8601;
  updatedAt: ISO8601;
}

export type ClassroomMemberRole = 'teacher' | 'co-teacher' | 'student' | 'observer';

export interface ClassroomMember {
  id: UUID;
  classroomId: UUID;
  userId: UUID;
  user?: User;
  role: ClassroomMemberRole;
  joinedAt: ISO8601;
  lastActiveAt?: ISO8601;
}

// ───────────────────── Lesson ────────────────────────────────
export type LessonStatus = 'draft' | 'published' | 'archived';

export interface Lesson {
  id: UUID;
  classroomId: UUID;
  title: string;
  description?: string;
  status: LessonStatus;
  pageCount: number;
  currentPage: number;
  thumbnailUrl?: Url;
  tags: string[];
  durationMinutes?: number;
  scheduledAt?: ISO8601;
  publishedAt?: ISO8601;
  createdById: UUID;
  createdAt: ISO8601;
  updatedAt: ISO8601;
}

// ───────────────────── Canvas / Whiteboard ───────────────────

/** Supported background types for a whiteboard page */
export type BackgroundType =
  | 'white'
  | 'blackboard'
  | 'chalkboard'
  | 'grid'
  | 'dots'
  | 'isometric'
  | 'music-staff'
  | 'cornell'
  | 'custom';

export interface Background {
  type: BackgroundType;
  color?: HexColor;
  imageUrl?: Url;
  gridSize?: number;    // px between grid lines
  opacity?: number;
}

/** Whiteboard page inside a lesson */
export interface WhiteboardPage {
  id: UUID;
  lessonId: UUID;
  index: number;
  title?: string;
  background: Background;
  objectIds: UUID[];    // ordered list of canvas object IDs
  thumbnailUrl?: Url;
  createdAt: ISO8601;
  updatedAt: ISO8601;
}

// ─────────── Drawing tools & modes ───────────
export enum TeachingTool {
  Select        = 'select',
  Pan           = 'pan',
  Pen           = 'pen',
  Highlighter   = 'highlighter',
  Eraser        = 'eraser',
  LaserPointer  = 'laser_pointer',
  Shape         = 'shape',
  Text          = 'text',
  Equation      = 'equation',
  Graph         = 'graph',
  Image         = 'image',
  StickyNote    = 'sticky_note',
  Ruler         = 'ruler',
  Protractor    = 'protractor',
  Compass       = 'compass',
  Zoom          = 'zoom',
  ColorPicker   = 'color_picker',
}

export enum DrawingMode {
  Freehand  = 'freehand',
  Straight  = 'straight',
  Arrow     = 'arrow',
  Rectangle = 'rectangle',
  Ellipse   = 'ellipse',
  Triangle  = 'triangle',
  Star      = 'star',
  Polygon   = 'polygon',
}

// ─────────── Ink / stroke points ─────────────
export interface StrokePoint {
  x: number;
  y: number;
  pressure?: number;    // 0–1, from pointer events
  tiltX?: number;
  tiltY?: number;
  timestamp?: number;
}

export interface InkStroke {
  points: StrokePoint[];
  size: number;
  thinning: number;
  smoothing: number;
  streamline: number;
  simulatePressure: boolean;
  last: boolean;
  color: HexColor;
  opacity: number;
  isHighlighter: boolean;
}

// ─────────── Canvas Object discriminated union ───────────────

interface BaseCanvasObject {
  id: UUID;
  pageId: UUID;
  createdById: UUID;
  createdAt: ISO8601;
  updatedAt: ISO8601;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;     // degrees
  opacity: number;      // 0–1
  locked: boolean;
  visible: boolean;
  zIndex: number;
}

export interface StrokeCanvasObject extends BaseCanvasObject {
  type: 'stroke';
  stroke: InkStroke;
  svgPath?: string;     // cached SVG path data from perfect-freehand
}

export type ShapeKind =
  | 'rectangle' | 'rounded-rectangle' | 'ellipse' | 'circle'
  | 'triangle' | 'right-triangle' | 'diamond' | 'star'
  | 'hexagon' | 'arrow' | 'double-arrow' | 'line' | 'polyline';

export interface ShapeCanvasObject extends BaseCanvasObject {
  type: 'shape';
  kind: ShapeKind;
  fillColor?: HexColor;
  strokeColor: HexColor;
  strokeWidth: number;
  strokeDash?: number[];  // SVG stroke-dasharray values
  cornerRadius?: number;
  points?: { x: number; y: number }[];  // for polyline / polygon
}

export interface TextCanvasObject extends BaseCanvasObject {
  type: 'text';
  content: string;        // HTML from TipTap
  fontSize: number;
  fontFamily: string;
  color: HexColor;
  align: 'left' | 'center' | 'right' | 'justify';
  bold: boolean;
  italic: boolean;
  underline: boolean;
  language?: 'en' | 'te' | 'hi';
}

export interface ImageCanvasObject extends BaseCanvasObject {
  type: 'image';
  src: Url;
  naturalWidth: number;
  naturalHeight: number;
  alt?: string;
  filters?: {
    brightness?: number;
    contrast?: number;
    saturation?: number;
    grayscale?: boolean;
  };
}

export interface EquationCanvasObject extends BaseCanvasObject {
  type: 'equation';
  latex: string;
  displayMode: boolean;   // block vs inline
  color: HexColor;
  fontSize: number;
}

export interface GraphCanvasObject extends BaseCanvasObject {
  type: 'graph';
  boardId: string;        // JSXGraph board id
  expressions: string[];  // JXG expressions / JSON definitions
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  showAxes: boolean;
  showGrid: boolean;
  theme: 'light' | 'dark';
}

export interface StickyNoteCanvasObject extends BaseCanvasObject {
  type: 'sticky';
  content: string;        // plain text
  backgroundColor: HexColor;
  textColor: HexColor;
  fontSize: number;
  pinned: boolean;
}

/** Discriminated union of all object types */
export type CanvasObject =
  | StrokeCanvasObject
  | ShapeCanvasObject
  | TextCanvasObject
  | ImageCanvasObject
  | EquationCanvasObject
  | GraphCanvasObject
  | StickyNoteCanvasObject;

export type CanvasObjectType = CanvasObject['type'];

// ───────────────────── Classroom Session ─────────────────────
export type SessionStatus = 'waiting' | 'live' | 'paused' | 'ended';

export interface ClassroomSession {
  id: UUID;
  classroomId: UUID;
  lessonId?: UUID;
  hostId: UUID;
  status: SessionStatus;
  startedAt?: ISO8601;
  endedAt?: ISO8601;
  participantCount: number;
  recordingId?: UUID;
  settings: {
    allowStudentDraw: boolean;
    allowStudentChat: boolean;
    raiseHandEnabled: boolean;
    quizEnabled: boolean;
    spotlightEnabled: boolean;
  };
}

export type ParticipantStatus = 'joined' | 'left' | 'kicked';
export type ParticipantMediaState = 'off' | 'mic' | 'cam' | 'both';

export interface SessionParticipant {
  id: UUID;
  sessionId: UUID;
  userId: UUID;
  user?: User;
  status: ParticipantStatus;
  mediaState: ParticipantMediaState;
  handRaised: boolean;
  handRaisedAt?: ISO8601;
  joinedAt: ISO8601;
  leftAt?: ISO8601;
}

export interface ChatMessage {
  id: UUID;
  sessionId: UUID;
  senderId: UUID;
  senderName: string;
  content: string;
  timestamp: ISO8601;
  reactions?: Record<string, UUID[]>;   // emoji → userIds
}

// ───────────────────── Quiz ──────────────────────────────────
export type QuestionType = 'mcq' | 'true-false' | 'short-answer' | 'fill-blank' | 'match';

export interface QuizOption {
  id: UUID;
  text: string;
  isCorrect: boolean;
}

export interface QuizQuestion {
  id: UUID;
  quizId: UUID;
  type: QuestionType;
  text: string;
  imageUrl?: Url;
  options?: QuizOption[];
  correctAnswer?: string;
  explanation?: string;
  points: number;
  timeLimit?: number;   // seconds
  orderIndex: number;
}

export type QuizStatus = 'draft' | 'active' | 'paused' | 'completed';

export interface Quiz {
  id: UUID;
  lessonId?: UUID;
  classroomId?: UUID;
  createdById: UUID;
  title: string;
  description?: string;
  status: QuizStatus;
  questions: QuizQuestion[];
  timeLimitPerQuestion?: number;
  shuffleQuestions: boolean;
  showExplanation: boolean;
  createdAt: ISO8601;
  updatedAt: ISO8601;
}

export interface QuizResponse {
  id: UUID;
  quizId: UUID;
  studentId: UUID;
  sessionId?: UUID;
  answers: Record<UUID, string | string[]>;  // questionId → answer(s)
  score: number;
  maxScore: number;
  timeTakenSeconds: number;
  submittedAt: ISO8601;
}

// ───────────────────── Assignment ────────────────────────────
export type AssignmentStatus = 'draft' | 'published' | 'closed';

export interface Assignment {
  id: UUID;
  classroomId: UUID;
  lessonId?: UUID;
  createdById: UUID;
  title: string;
  instructions: string;         // HTML
  attachments: ResourceLibraryItem[];
  dueAt?: ISO8601;
  maxScore?: number;
  status: AssignmentStatus;
  submissionCount: number;
  createdAt: ISO8601;
  updatedAt: ISO8601;
}

export type SubmissionStatus = 'draft' | 'submitted' | 'graded' | 'returned';

export interface AssignmentSubmission {
  id: UUID;
  assignmentId: UUID;
  studentId: UUID;
  student?: User;
  content: string;              // HTML or plain text
  attachments: ResourceLibraryItem[];
  score?: number;
  feedback?: string;
  status: SubmissionStatus;
  submittedAt?: ISO8601;
  gradedAt?: ISO8601;
  gradedById?: UUID;
}

// ───────────────────── Recording ─────────────────────────────
export type RecordingStatus = 'pending' | 'processing' | 'ready' | 'failed';

export interface Recording {
  id: UUID;
  sessionId: UUID;
  classroomId: UUID;
  lessonId?: UUID;
  title: string;
  durationSeconds: number;
  fileUrl?: Url;
  thumbnailUrl?: Url;
  status: RecordingStatus;
  sizeBytes?: number;
  createdAt: ISO8601;
  expiresAt?: ISO8601;
}

// ───────────────────── Template ──────────────────────────────
export type TemplateCategory =
  | 'lesson' | 'quiz' | 'blank' | 'grid' | 'math'
  | 'science' | 'language' | 'art' | 'timeline';

export interface Template {
  id: UUID;
  name: string;
  description?: string;
  category: TemplateCategory;
  thumbnailUrl?: Url;
  pageCount: number;
  pages: WhiteboardPage[];      // serialized pages
  tags: string[];
  isPublic: boolean;
  createdById: UUID;
  usageCount: number;
  createdAt: ISO8601;
}

// ───────────────────── AI Conversation ───────────────────────
export type AIMessageRole = 'user' | 'assistant' | 'system';

export interface AIMessage {
  id: UUID;
  role: AIMessageRole;
  content: string;
  timestamp: ISO8601;
  attachments?: { type: 'image' | 'equation' | 'canvas_snapshot'; url: Url }[];
}

export interface AIConversation {
  id: UUID;
  userId: UUID;
  lessonId?: UUID;
  classroomId?: UUID;
  title: string;
  messages: AIMessage[];
  model: string;
  contextType: 'lesson' | 'quiz' | 'general' | 'explain' | 'generate';
  createdAt: ISO8601;
  updatedAt: ISO8601;
}

// ───────────────────── Resource Library ──────────────────────
export type ResourceType =
  | 'image' | 'pdf' | 'video' | 'audio' | 'document' | 'link' | 'whiteboard_snapshot';

export interface ResourceLibraryItem {
  id: UUID;
  uploadedById: UUID;
  classroomId?: UUID;
  institutionId?: UUID;
  name: string;
  type: ResourceType;
  mimeType: string;
  url: Url;
  thumbnailUrl?: Url;
  sizeBytes: number;
  tags: string[];
  isPublic: boolean;
  usageCount: number;
  createdAt: ISO8601;
}

// ─────────────────── Realtime / WS events ────────────────────
export type WSEventType =
  | 'session:join'
  | 'session:leave'
  | 'session:participant_update'
  | 'canvas:object_add'
  | 'canvas:object_update'
  | 'canvas:object_delete'
  | 'canvas:page_change'
  | 'canvas:clear'
  | 'chat:message'
  | 'chat:reaction'
  | 'hand:raise'
  | 'hand:lower'
  | 'quiz:start'
  | 'quiz:end'
  | 'quiz:answer'
  | 'spotlight:move'
  | 'curtain:update'
  | 'pointer:move'
  | 'media:state_change';

export interface WSEvent<T = unknown> {
  type: WSEventType;
  sessionId: UUID;
  senderId: UUID;
  timestamp: ISO8601;
  payload: T;
}

// ─────────────────── UI State helpers ────────────────────────
export interface Point2D {
  x: number;
  y: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ViewTransform {
  zoom: number;
  panX: number;
  panY: number;
}

export interface HistoryEntry {
  timestamp: number;
  action: string;
  objectIds: UUID[];
  snapshot: Partial<CanvasObject>[];
}
