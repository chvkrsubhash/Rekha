import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { showSuccess } from '@/components/ui/Toast';

interface QuizQuestionDraft {
  id: string;
  prompt: string;
  options: [string, string, string, string];
  correctIndex: number;
}

export function QuizCreator({ onSave }: { onSave?: (title: string, questions: QuizQuestionDraft[]) => void }) {
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState<QuizQuestionDraft[]>([
    { id: '1', prompt: '', options: ['', '', '', ''], correctIndex: 0 },
  ]);

  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      { id: String(Date.now()), prompt: '', options: ['', '', '', ''], correctIndex: 0 },
    ]);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave?.(title, questions);
    showSuccess('Quiz saved');
  };

  return (
    <form onSubmit={handleSave} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
      <Input
        label="Quiz Title"
        placeholder="e.g. Quadratic Equations Quick Check"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />

      {questions.map((q, qi) => (
        <div key={q.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">Question {qi + 1}</span>
            {questions.length > 1 && (
              <button
                type="button"
                onClick={() => setQuestions((prev) => prev.filter((x) => x.id !== q.id))}
                className="text-slate-400 hover:text-red-600"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Input
            placeholder="Enter question..."
            value={q.prompt}
            onChange={(e) =>
              setQuestions((prev) =>
                prev.map((x) => (x.id === q.id ? { ...x, prompt: e.target.value } : x))
              )
            }
            required
          />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {q.options.map((opt, oi) => (
              <div key={oi} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`correct-${q.id}`}
                  checked={q.correctIndex === oi}
                  onChange={() =>
                    setQuestions((prev) =>
                      prev.map((x) => (x.id === q.id ? { ...x, correctIndex: oi } : x))
                    )
                  }
                />
                <Input
                  placeholder={`Option ${oi + 1}`}
                  value={opt}
                  onChange={(e) =>
                    setQuestions((prev) =>
                      prev.map((x) => {
                        if (x.id !== q.id) return x;
                        const nextOpts = [...x.options] as [string, string, string, string];
                        nextOpts[oi] = e.target.value;
                        return { ...x, options: nextOpts };
                      })
                    )
                  }
                  required
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="flex items-center justify-between">
        <Button type="button" variant="secondary" size="sm" onClick={addQuestion} leftIcon={<Plus className="h-3.5 w-3.5" />}>
          Add Question
        </Button>
        <Button type="submit">Save Quiz</Button>
      </div>
    </form>
  );
}

