// ─────────────────────────────────────────────────────────────
//  useWebSocket – Live classroom WebSocket with reconnection
//  AkashaVyom Labs / Rekha
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';

import { useClassroomStore, useWhiteboardStore } from '@/store';
import { useAuthStore } from '@/store';
import type { WSEvent, WSEventType, UUID } from '@/types';

const WS_URL = import.meta.env.VITE_WS_URL ?? window.location.origin;
const BASE_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30_000;
const MAX_RECONNECT_ATTEMPTS = 10;

interface UseWebSocketOptions {
  sessionId: UUID;
  enabled?: boolean;
  onEvent?: (event: WSEvent) => void;
}

interface WebSocketReturn {
  send: <T>(type: WSEventType, payload: T) => void;
  disconnect: () => void;
  isConnected: boolean;
}

export function useWebSocket({
  sessionId,
  enabled = true,
  onEvent,
}: UseWebSocketOptions): WebSocketReturn {
  const socketRef = useRef<Socket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isIntentionalDisconnect = useRef(false);

  const { tokens } = useAuthStore.getState();
  const { setConnected, setConnectionError } = useClassroomStore.getState();

  // ── Handle incoming events ────────────────────────────────
  const handleEvent = useCallback(
    (event: WSEvent) => {
      const wb = useWhiteboardStore.getState();
      const cr = useClassroomStore.getState();

      switch (event.type) {
        case 'canvas:object_add':
          wb.addObject(event.payload as Parameters<typeof wb.addObject>[0]);
          break;

        case 'canvas:object_update': {
          const { id, ...patch } = event.payload as { id: UUID } & Parameters<typeof wb.updateObject>[1];
          wb.updateObject(id, patch);
          break;
        }

        case 'canvas:object_delete':
          wb.deleteObject(event.payload as UUID);
          break;

        case 'canvas:page_change':
          wb.setCurrentPage(event.payload as UUID);
          break;

        case 'canvas:clear':
          wb.clearPage();
          break;

        case 'chat:message':
          cr.addMessage(event.payload as Parameters<typeof cr.addMessage>[0]);
          break;

        case 'hand:raise':
          cr.raiseHand(event.senderId);
          break;

        case 'hand:lower':
          cr.lowerHand(event.senderId);
          break;

        case 'session:participant_update':
          cr.updateParticipant(event.payload as Parameters<typeof cr.updateParticipant>[0]);
          break;

        case 'session:leave':
          cr.removeParticipant(event.senderId);
          break;

        default:
          break;
      }

      // Bubble to consumer
      onEvent?.(event);
    },
    [onEvent],
  );

  // ── Connect ───────────────────────────────────────────────
  const connect = useCallback(() => {
    if (!enabled || !sessionId) return;
    if (socketRef.current?.connected) return;

    const socket = io(WS_URL, {
      path: '/socket.io',
      auth: { token: tokens?.accessToken ?? '' },
      query: { sessionId },
      transports: ['websocket', 'polling'],
      reconnection: false,       // We handle reconnection manually
      timeout: 10_000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      reconnectAttempts.current = 0;
      setConnected(true);
      setConnectionError(null);
      socket.emit('session:join', { sessionId });
    });

    socket.on('disconnect', (reason) => {
      setConnected(false);
      if (isIntentionalDisconnect.current) return;
      if (reason === 'io server disconnect') {
        // Server closed the connection — do not reconnect
        setConnectionError('Session ended by server.');
        return;
      }
      scheduleReconnect();
    });

    socket.on('connect_error', (err) => {
      setConnected(false);
      setConnectionError(err.message);
      scheduleReconnect();
    });

    socket.on('event', handleEvent);
  }, [enabled, sessionId, tokens, setConnected, setConnectionError, handleEvent]);

  // ── Reconnection with exponential backoff ─────────────────
  const scheduleReconnect = useCallback(() => {
    if (reconnectAttempts.current >= MAX_RECONNECT_ATTEMPTS) {
      toast.error('Could not reconnect to classroom. Please refresh.', { duration: 0 });
      return;
    }
    const delay = Math.min(
      BASE_RECONNECT_DELAY * 2 ** reconnectAttempts.current,
      MAX_RECONNECT_DELAY,
    );
    reconnectAttempts.current++;
    reconnectTimer.current = setTimeout(() => {
      socketRef.current?.close();
      socketRef.current = null;
      connect();
    }, delay);
  }, [connect]);

  // ── Disconnect ────────────────────────────────────────────
  const disconnect = useCallback(() => {
    isIntentionalDisconnect.current = true;
    if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    if (socketRef.current) {
      socketRef.current.emit('session:leave', { sessionId });
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setConnected(false);
  }, [sessionId, setConnected]);

  // ── Send helper ───────────────────────────────────────────
  const send = useCallback(<T>(type: WSEventType, payload: T) => {
    if (!socketRef.current?.connected) {
      console.warn('[WS] Cannot send — not connected:', type);
      return;
    }
    const { user } = useAuthStore.getState();
    const event: WSEvent<T> = {
      type,
      sessionId,
      senderId: user?.id ?? 'anonymous',
      timestamp: new Date().toISOString(),
      payload,
    };
    socketRef.current.emit('event', event);
  }, [sessionId]);

  // ── Lifecycle ─────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;
    isIntentionalDisconnect.current = false;
    connect();
    return () => {
      disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, sessionId]);

  // ── Re-auth on token change ───────────────────────────────
  useEffect(() => {
    if (!socketRef.current?.connected) return;
    socketRef.current.auth = { token: tokens?.accessToken ?? '' };
  }, [tokens?.accessToken]);

  const isConnected = socketRef.current?.connected ?? false;

  return { send, disconnect, isConnected };
}
