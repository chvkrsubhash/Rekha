import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type Konva from 'konva';
import { Hand, MessageSquare, PhoneOff, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { WhiteboardCanvas } from '@/components/whiteboard/WhiteboardCanvas';
import { TeachingToolbar } from '@/components/whiteboard/toolbar/TeachingToolbar';
import { useAuthStore, useWhiteboardStore } from '@/store';
import { showInfo, showSuccess } from '@/components/ui/Toast';

export function LiveSession() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const stageRef = useRef<Konva.Stage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const tokens = useAuthStore((s) => s.tokens);
  const { initLesson, pages, objects, currentPageId } = useWhiteboardStore();

  const [participantCount, setParticipantCount] = useState(1);
  const [raisedHands, setRaisedHands] = useState<Array<{ userId: string; userName: string }>>([]);
  const [questions, setQuestions] = useState<Array<{ userName: string; question: string }>>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    initLesson(sessionId || 'live-session', [], []);
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
        if (msg.type === 'participant_joined' || msg.type === 'participant_left') {
          setParticipantCount(msg.participant_count ?? 1);
        } else if (msg.type === 'hand_raised') {
          setRaisedHands((prev) => [...prev.filter((h) => h.userId !== msg.user_id), { userId: msg.user_id, userName: msg.user_name }]);
          showInfo(`${msg.user_name} raised their hand`);
        } else if (msg.type === 'hand_lowered') {
          setRaisedHands((prev) => prev.filter((h) => h.userId !== msg.user_id));
        } else if (msg.type === 'student_question') {
          setQuestions((prev) => [...prev, { userName: msg.user_name, question: msg.question }]);
        }
      } catch {
        // ignore malformed packets
      }
    };

    return () => ws.close();
  }, [sessionId, tokens?.accessToken]);

  // Sync object changes to students
  useEffect(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(
      JSON.stringify({
        type: 'canvas_update',
        page_id: currentPageId,
        objects: Object.values(objects),
      })
    );
  }, [objects, currentPageId, pages]);

  const handleEndSession = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'session_control', action: 'end_session' }));
    }
    showSuccess('Live session ended');
    navigate('/dashboard');
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white">
      <div className="relative flex-1">
        <div className="fixed left-4 top-3 z-[110] flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
          <Badge variant={connected ? 'success' : 'warning'}>
            {connected ? 'Live Session' : 'Connecting...'}
          </Badge>
          <span className="flex items-center gap-1 text-xs text-slate-600">
            <Users className="h-3.5 w-3.5" />
            {participantCount}
          </span>
          <Button size="sm" variant="danger" onClick={handleEndSession} leftIcon={<PhoneOff className="h-3.5 w-3.5" />}>
            End
          </Button>
        </div>

        <WhiteboardCanvas stageRef={stageRef} />
        <TeachingToolbar
          onOpenEquationEditor={() => {}}
          onOpenGraphPlotter={() => {}}
          onOpenImageUpload={() => {}}
          onOpenPDFUpload={() => {}}
        />
      </div>

      {/* Teacher Live Controls Sidebar */}
      <aside className="w-72 border-l border-slate-200 bg-slate-50 p-3 flex flex-col gap-4 overflow-y-auto">
        <div>
          <h3 className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
            <Hand className="h-3.5 w-3.5 text-amber-500" />
            Raised Hands ({raisedHands.length})
          </h3>
          <div className="mt-2 space-y-1.5">
            {raisedHands.length === 0 ? (
              <p className="text-[11px] text-slate-500">No raised hands.</p>
            ) : (
              raisedHands.map((h) => (
                <div key={h.userId} className="flex items-center justify-between rounded bg-white px-2.5 py-1.5 text-xs border border-slate-200">
                  <span>{h.userName}</span>
                  <button
                    type="button"
                    onClick={() => setRaisedHands((prev) => prev.filter((x) => x.userId !== h.userId))}
                    className="text-[11px] text-primary hover:underline"
                  >
                    Dismiss
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <h3 className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
            <MessageSquare className="h-3.5 w-3.5 text-primary" />
            Student Questions ({questions.length})
          </h3>
          <div className="mt-2 space-y-2">
            {questions.length === 0 ? (
              <p className="text-[11px] text-slate-500">No questions yet.</p>
            ) : (
              questions.map((q, i) => (
                <div key={i} className="rounded border border-slate-200 bg-white p-2 text-xs">
                  <div className="font-semibold text-slate-900">{q.userName}</div>
                  <div className="mt-0.5 text-slate-700">{q.question}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}

