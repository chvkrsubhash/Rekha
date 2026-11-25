import { PenTool, Copy, Trash2, MoreVertical, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Dropdown } from '@/components/ui/Dropdown';
import { Badge } from '@/components/ui/Badge';

export interface WhiteboardSummary {
  id: string;
  title: string;
  subject?: string;
  updated_at?: string;
  page_count?: number;
  thumbnail_url?: string;
}

interface WhiteboardCardProps {
  whiteboard: WhiteboardSummary;
  onOpen: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}

export function WhiteboardCard({
  whiteboard,
  onOpen,
  onDuplicate,
  onDelete,
}: WhiteboardCardProps) {
  const editedAgo = whiteboard.updated_at
    ? formatDistanceToNow(new Date(whiteboard.updated_at), { addSuffix: true })
    : 'Just now';

  return (
    <div className="group flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white transition-shadow hover:shadow-md">
      {/* Thumbnail Area */}
      <button
        type="button"
        onClick={() => onOpen(whiteboard.id)}
        className="relative flex h-36 w-full items-center justify-center bg-slate-50 border-b border-slate-100 overflow-hidden"
      >
        {whiteboard.thumbnail_url ? (
          <img
            src={whiteboard.thumbnail_url}
            alt={whiteboard.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-slate-400">
            <PenTool className="h-7 w-7 text-primary/60" />
            <span className="text-[11px] font-medium">Open Canvas</span>
          </div>
        )}
        <div className="absolute inset-0 bg-primary/0 transition-colors group-hover:bg-primary/5" />
      </button>

      {/* Metadata */}
      <div className="flex items-start justify-between gap-2 p-3">
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => onOpen(whiteboard.id)}
            className="block truncate text-left text-sm font-semibold text-slate-900 hover:text-primary"
          >
            {whiteboard.title}
          </button>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
            {whiteboard.subject && <Badge variant="info">{whiteboard.subject}</Badge>}
            <span>{editedAgo}</span>
            {whiteboard.page_count !== undefined && (
              <span>· {whiteboard.page_count} pages</span>
            )}
          </div>
        </div>

        <Dropdown
          trigger={
            <button
              type="button"
              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Whiteboard actions"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          }
          items={[
            { label: 'Open', icon: <ExternalLink className="h-3.5 w-3.5" />, onSelect: () => onOpen(whiteboard.id) },
            { label: 'Duplicate', icon: <Copy className="h-3.5 w-3.5" />, onSelect: () => onDuplicate(whiteboard.id) },
            { label: 'sep', separator: true, onSelect: () => {} },
            {
              label: 'Delete',
              icon: <Trash2 className="h-3.5 w-3.5" />,
              danger: true,
              onSelect: () => onDelete(whiteboard.id),
            },
          ]}
        />
      </div>
    </div>
  );
}

