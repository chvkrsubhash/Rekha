import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type Konva from 'konva';
import { Hand, Send, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { WhiteboardCanvas } from '@/components/whiteboard/WhiteboardCanvas';
import { useAuthStore, useWhiteboardStore } from '@/store';
import { showInfo, showSuccess } from '@/components/ui/Toast';
import type { CanvasObject } from '@/types';

export function StudentView() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const stageRef = useRef<Konva.Stage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const tokens = useAuthStore((s) => s.tokens);
  const { initLesson } = useWhiteboardStore();

  const [handRaised, setHandRaised] = useState(false);
  const [question, setQuestion] = useState('');
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    initLesson(sessionId || 'student-view', [], []);
  }, [sessionId, initLesson]);

  useEffect(() => {
    if (!sessionId || !tokens?.accessToken) return;
    const wsBase = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';
    const ws = new WebSocket(`${wsBase}/ws/classroom/${sessionId}?token=${tokens.accessToken}`);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.type === 'canvas_update') {
          const objs: CanvasObject[] = msg.objects || [];
          const store = useWhiteboardStore.getState();
          store.initLesson(sessionId, store.pages, objs);
        } else if (msg.type === 'session_ended') {
          showInfo('The teacher has ended the live session.');
          navigate('/student');
        }
      } catch {
        // ignore
      }
    };

    return () => ws.close();
  }, [sessionId, tokens?.accessToken, navigate]);

  const toggleHand = () => {
    const next = !handRaised;
    setHandRaised(next);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: next ? 'raise_hand' : 'lower_hand' }));
    }
  };

  const sendQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'student_question', question: question.trim() }));
      showSuccess('Question sent to teacher');
      setQuestion('');
    }
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-white">
      <header className="flex h-12 items-center justify-between border-b border-slate-200 px-4">
        <div className="flex items-center gap-2">
          <Badge variant={connected ? 'success' : 'warning'}>
            {connected ? 'Connected to Class' : 'Connecting...'}
          </Badge>
          <span className="text-xs text-slate-500">Read-only synchronized board</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={handRaised ? 'primary' : 'secondary'}
            onClick={toggleHand}
            leftIcon={<Hand className="h-3.5 w-3.5" />}
          >
            {handRaised ? 'Hand Raised' : 'Raise Hand'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => navigate('/student')}
            leftIcon={<LogOut className="h-3.5 w-3.5" />}
          >
            Leave
          </Button>
        </div>
      </header>

      <div className="relative flex-1">
        <WhiteboardCanvas stageRef={stageRef} readOnly />
      </div>

      <form
        onSubmit={sendQuestion}
        className="flex items-center gap-2 border-t border-slate-200 bg-slate-50 px-4 py-2"
      >
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask your teacher a question..."
          className="h-8 flex-1 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-900 focus:border-primary focus:outline-none"
        />
        <Button type="submit" size="sm" leftIcon={<Send className="h-3.5 w-3.5" />}>
          Ask
        </Button>
      </form>
    </div>
  );
}

