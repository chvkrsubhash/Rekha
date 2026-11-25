import axios from 'axios';
import { useAuthStore } from '@/store';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
});

// ─── Request Interceptor: Attach Bearer token ─────────────────────────────

apiClient.interceptors.request.use(
  (config) => {
    const tokens = useAuthStore.getState().tokens;
    if (tokens?.accessToken) {
      config.headers.Authorization = `Bearer ${tokens.accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor: Handle 401 / Token Refresh ────────────────────

let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function notifySubscribers(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      const tokens = useAuthStore.getState().tokens;
      if (!tokens?.refreshToken) {
        useAuthStore.getState().logout();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeTokenRefresh((newToken) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            resolve(apiClient(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const res = await axios.post(`${API_BASE}/api/v1/auth/refresh`, {
          refresh_token: tokens.refreshToken,
        });
        const newAccessToken = res.data.access_token;
        const updatedTokens = { ...tokens, accessToken: newAccessToken };
        useAuthStore.getState().setTokens(updatedTokens);
        notifySubscribers(newAccessToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch {
        useAuthStore.getState().logout();
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

// ─── API Methods ──────────────────────────────────────────────────────────

export const authAPI = {
  register: (data: { full_name: string; email: string; password: string; role: string; institution_name?: string }) =>
    apiClient.post('/auth/register', data).then((r) => r.data),
  login: (data: { email: string; password: string }) =>
    apiClient.post('/auth/login', data).then((r) => r.data),
  refresh: (refresh_token: string) =>
    apiClient.post('/auth/refresh', { refresh_token }).then((r) => r.data),
  me: () => apiClient.get('/auth/me').then((r) => r.data),
  updateMe: (data: { full_name?: string; avatar_url?: string }) =>
    apiClient.put('/auth/me', data).then((r) => r.data),
};

export const whiteboardsAPI = {
  list: () => apiClient.get('/whiteboards/').then((r) => r.data),
  get: (id: string) => apiClient.get(`/whiteboards/${id}`).then((r) => r.data),
  create: (data: { title?: string; subject?: string; lesson_id?: string }) =>
    apiClient.post('/whiteboards/', data).then((r) => r.data),
  update: (id: string, data: Record<string, unknown>) =>
    apiClient.put(`/whiteboards/${id}`, data).then((r) => r.data),
  delete: (id: string) => apiClient.delete(`/whiteboards/${id}`),
  duplicate: (id: string) => apiClient.post(`/whiteboards/${id}/duplicate`).then((r) => r.data),

  // Pages
  listPages: (id: string) => apiClient.get(`/whiteboards/${id}/pages`).then((r) => r.data),
  addPage: (id: string, data: { name?: string; background?: string }) =>
    apiClient.post(`/whiteboards/${id}/pages`, data).then((r) => r.data),
  updatePage: (id: string, pageId: string, data: { name?: string; background?: string; order?: number }) =>
    apiClient.put(`/whiteboards/${id}/pages/${pageId}`, data).then((r) => r.data),
  deletePage: (id: string, pageId: string) =>
    apiClient.delete(`/whiteboards/${id}/pages/${pageId}`),

  // Objects
  addObject: (id: string, pageId: string, data: object) =>
    apiClient.post(`/whiteboards/${id}/pages/${pageId}/objects`, data).then((r) => r.data),
  updateObject: (id: string, pageId: string, objId: string, data: object) =>
    apiClient.put(`/whiteboards/${id}/pages/${pageId}/objects/${objId}`, data).then((r) => r.data),
  deleteObject: (id: string, pageId: string, objId: string) =>
    apiClient.delete(`/whiteboards/${id}/pages/${pageId}/objects/${objId}`),
};

export const classroomsAPI = {
  list: () => apiClient.get('/classrooms/').then((r) => r.data),
  get: (id: string) => apiClient.get(`/classrooms/${id}`).then((r) => r.data),
  create: (data: object) => apiClient.post('/classrooms/', data).then((r) => r.data),
  update: (id: string, data: object) => apiClient.put(`/classrooms/${id}`, data).then((r) => r.data),
  join: (code: string) => apiClient.post('/classrooms/join', { code }).then((r) => r.data),
  getMembers: (id: string) => apiClient.get(`/classrooms/${id}/members`).then((r) => r.data),
  removeMember: (id: string, userId: string) => apiClient.delete(`/classrooms/${id}/members/${userId}`),
  startSession: (id: string, data: { whiteboard_id?: string }) =>
    apiClient.post(`/classrooms/${id}/sessions`, data).then((r) => r.data),
  updateSession: (classroomId: string, sessionId: string, data: object) =>
    apiClient.put(`/classrooms/${classroomId}/sessions/${sessionId}`, data).then((r) => r.data),
};

export const lessonsAPI = {
  list: (params?: { subject?: string; classroom_id?: string }) =>
    apiClient.get('/lessons/', { params }).then((r) => r.data),
  get: (id: string) => apiClient.get(`/lessons/${id}`).then((r) => r.data),
  create: (data: object) => apiClient.post('/lessons/', data).then((r) => r.data),
  update: (id: string, data: object) => apiClient.put(`/lessons/${id}`, data).then((r) => r.data),
  delete: (id: string) => apiClient.delete(`/lessons/${id}`),
  duplicate: (id: string) => apiClient.post(`/lessons/${id}/duplicate`).then((r) => r.data),
  share: (id: string, classroomId: string) =>
    apiClient.post(`/lessons/${id}/share`, { classroom_id: classroomId }).then((r) => r.data),
};

export const aiAPI = {
  generateLessonPlan: (data: object) => apiClient.post('/ai/generate/lesson-plan', data).then((r) => r.data),
  generateQuiz: (data: object) => apiClient.post('/ai/generate/quiz', data).then((r) => r.data),
  generateWorksheet: (data: object) => apiClient.post('/ai/generate/worksheet', data).then((r) => r.data),
  generateExplanation: (data: object) => apiClient.post('/ai/generate/explanation', data).then((r) => r.data),
  generateDiagram: (data: object) => apiClient.post('/ai/generate/diagram', data).then((r) => r.data),
  chat: (data: object) => apiClient.post('/ai/chat', data).then((r) => r.data),
};

export const templatesAPI = {
  list: (category?: string) => apiClient.get('/templates/', { params: { category } }).then((r) => r.data),
  get: (id: string) => apiClient.get(`/templates/${id}`).then((r) => r.data),
  create: (data: object) => apiClient.post('/templates/', data).then((r) => r.data),
};

export const assignmentsAPI = {
  list: (classroomId?: string) =>
    apiClient.get('/assignments/', { params: { classroom_id: classroomId } }).then((r) => r.data),
  get: (id: string) => apiClient.get(`/assignments/${id}`).then((r) => r.data),
  create: (data: object) => apiClient.post('/assignments/', data).then((r) => r.data),
  submit: (id: string, data: object) => apiClient.post(`/assignments/${id}/submit`, data).then((r) => r.data),
  grade: (id: string, subId: string, data: object) =>
    apiClient.put(`/assignments/${id}/submissions/${subId}`, data).then((r) => r.data),
};

export const mediaAPI = {
  upload: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return apiClient
      .post('/media/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((r) => r.data);
  },
  list: () => apiClient.get('/media/').then((r) => r.data),
  delete: (id: string) => apiClient.delete(`/media/${id}`),
};

export const api = {
  auth: authAPI,
  whiteboards: whiteboardsAPI,
  classrooms: classroomsAPI,
  lessons: lessonsAPI,
  ai: aiAPI,
  templates: templatesAPI,
  assignments: assignmentsAPI,
  media: mediaAPI,
};

export default apiClient;

