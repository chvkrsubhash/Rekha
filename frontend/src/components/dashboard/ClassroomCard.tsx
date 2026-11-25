import { Users, Play, Share2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

export interface ClassroomSummary {
  id: string;
  name: string;
  subject?: string;
  grade?: string;
  section?: string;
  code: string;
  member_count?: number;
}

interface ClassroomCardProps {
  classroom: ClassroomSummary;
  onOpen: (id: string) => void;
  onStartSession: (id: string) => void;
  onShareCode: (code: string) => void;
}

export function ClassroomCard({
  classroom,
  onOpen,
  onStartSession,
  onShareCode,
}: ClassroomCardProps) {
  return (
    <div className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-4 transition-shadow hover:shadow-md">
      <div>
        <div className="flex items-start justify-between gap-2">
          <div>
            <button
              type="button"
              onClick={() => onOpen(classroom.id)}
              className="text-left text-sm font-semibold text-slate-900 hover:text-primary"
            >
              {classroom.name}
            </button>
            <p className="mt-0.5 text-xs text-slate-500">
              {[classroom.grade, classroom.section].filter(Boolean).join(' · ') || 'General Classroom'}
            </p>
          </div>
          {classroom.subject && <Badge variant="info">{classroom.subject}</Badge>}
        </div>

        <div className="mt-3 flex items-center justify-between rounded-md bg-slate-50 px-2.5 py-1.5 text-xs">
          <span className="text-slate-500">Join Code</span>
          <span className="font-mono font-bold tracking-wider text-primary-800">{classroom.code}</span>
        </div>

        {classroom.member_count !== undefined && (
          <div className="mt-2.5 flex items-center gap-1.5 text-xs text-slate-500">
            <Users className="h-3.5 w-3.5" />
            <span>{classroom.member_count} enrolled</span>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
        <Button
          size="sm"
          className="flex-1"
          leftIcon={<Play className="h-3.5 w-3.5" />}
          onClick={() => onStartSession(classroom.id)}
        >
          Start Session
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onOpen(classroom.id)}
          title="Open Classroom"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onShareCode(classroom.code)}
          title="Copy Join Code"
        >
          <Share2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

