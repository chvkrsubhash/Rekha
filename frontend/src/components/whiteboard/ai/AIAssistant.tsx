import { useState } from 'react';
import { X, Send, Sparkles, PlusCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useUIStore, useWhiteboardStore, useAuthStore } from '@/store';
import { Button } from '@/components/ui/Button';
import { aiAPI } from '@/lib/api';
import { showError, showSuccess } from '@/components/ui/Toast';
import type { TextCanvasObject } from '@/types';

interface Message {
  id: string;
  role: 'teacher' | 'assistant';
  content: string;
}

const QUICK_PROMPTS = [
  'Create a 30-minute lesson plan',
  'Explain this concept simply for Class 8',
  'Generate 5 practice questions',
  'Create a step-by-step worked example',
];

export function AIAssistant() {
  const { aiPanelOpen, setAIPanelOpen } = useUIStore();
  const { currentPageId, objects, background, addObject } = useWhiteboardStore();
  const user = useAuthStore((s) => s.user);

  const [subject, setSubject] = useState('Mathematics');
  const [grade, setGrade] = useState('Class 8');
  const [language, setLanguage] = useState('English');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  const handleSend = async (promptText?: string) => {
    const text = (promptText || input).trim();
    if (!text) return;

    const userMsg: Message = { id: uuidv4(), role: 'teacher', content: text };
    setMessages((prev) => [...prev, userMsg]);
    if (!promptText) setInput('');
    setLoading(true);

    try {
      const res = await aiAPI.chat({
        prompt: text,
        subject,
        grade,
        language,
      });
      setMessages((prev) => [
        ...prev,
        { id: uuidv4(), role: 'assistant', content: res.content || res.reply || '' },
      ]);
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'AI provider is not configured on the server. Add GEMINI_API_KEY, GROQ_API_KEY, or OPENROUTER_API_KEY in backend/.env.';
      showError(detail);
      setMessages((prev) => [
        ...prev,
        { id: uuidv4(), role: 'assistant', content: `Note: ${detail}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const insertIntoBoard = (content: string) => {
    const now = new Date().toISOString();
    const obj: TextCanvasObject = {
      id: uuidv4(),
      type: 'text',
      pageId: currentPageId || '',
      createdById: user?.id || 'local',
      createdAt: now,
      updatedAt: now,
      x: 120,
      y: 120,
      width: 460,
      height: 200,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      zIndex: Object.keys(objects).length,
      content,
      fontSize: 16,
      fontFamily: 'Inter, Noto Sans Telugu, Noto Sans Devanagari, sans-serif',
      color: background.type === 'blackboard' || background.type === 'chalkboard' ? '#FFFFFF' : '#1F2937',
      align: 'left',
      bold: false,
      italic: false,
      underline: false,
    };
    addObject(obj);
    showSuccess('Inserted onto whiteboard — you can edit or move it freely.');
  };

  return (
    <aside className={`ai-assistant-panel ${aiPanelOpen ? 'open' : ''}`}>
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-slate-900">AI Teaching Assistant</span>
        </div>
        <button
          type="button"
          onClick={() => setAIPanelOpen(false)}
          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-3 gap-1.5 border-b border-slate-100 bg-slate-50 p-2">
        <select
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="rounded border border-slate-200 bg-white px-1.5 py-1 text-[11px] text-slate-700"
        >
          <option>Mathematics</option>
          <option>Physics</option>
          <option>Chemistry</option>
          <option>Biology</option>
          <option>English</option>
          <option>History</option>
        </select>
        <select
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
          className="rounded border border-slate-200 bg-white px-1.5 py-1 text-[11px] text-slate-700"
        >
          <option>Class 6</option>
          <option>Class 8</option>
          <option>Class 10</option>
          <option>Class 12</option>
          <option>Competitive</option>
        </select>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="rounded border border-slate-200 bg-white px-1.5 py-1 text-[11px] text-slate-700"
        >
          <option>English</option>
          <option>Telugu</option>
          <option>Hindi</option>
        </select>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-xs text-slate-500">
              Ask for lesson plans, worked examples, or practice questions. Review before sharing with students.
            </p>
            <div className="space-y-1.5 pt-1">
              {QUICK_PROMPTS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => handleSend(q)}
                  className="block w-full rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-left text-xs text-slate-700 hover:border-primary hover:bg-teal-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={`rounded-lg p-2.5 text-xs ${
              m.role === 'teacher'
                ? 'ml-6 bg-primary text-white'
                : 'mr-2 border border-slate-200 bg-slate-50 text-slate-800'
            }`}
          >
            <div className="whitespace-pre-wrap">{m.content}</div>
            {m.role === 'assistant' && !m.content.startsWith('Note:') && (
              <button
                type="button"
                onClick={() => insertIntoBoard(m.content)}
                className="mt-2 inline-flex items-center gap-1 rounded bg-white px-2 py-1 text-[11px] font-medium text-primary border border-teal-200 hover:bg-teal-50"
              >
                <PlusCircle className="h-3 w-3" />
                Insert into Whiteboard
              </button>
            )}
          </div>
        ))}

        {loading && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-500">
            Generating teaching content...
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="flex items-center gap-1.5 border-t border-slate-200 p-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask AI assistant..."
          className="h-8 flex-1 rounded-md border border-slate-200 px-2.5 text-xs text-slate-900 focus:border-primary focus:outline-none"
        />
        <Button type="submit" size="sm" disabled={loading || !input.trim()}>
          <Send className="h-3.5 w-3.5" />
        </Button>
      </form>
    </aside>
  );
}

