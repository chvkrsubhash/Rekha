import { Plus, Trash2 } from 'lucide-react';
import { useWhiteboardStore } from '@/store';
import { cn } from '@/utils/cn';

export function PagePanel() {
  const { pages, currentPageId, setCurrentPage, addPage, deletePage } = useWhiteboardStore();

  return (
    <div className="page-panel">
      <div className="flex items-center gap-2">
        {pages.map((page, index) => {
          const isActive = page.id === currentPageId;
          const bgPreview =
            page.background.type === 'blackboard'
              ? 'bg-[#202020]'
              : page.background.type === 'chalkboard'
              ? 'bg-[#173F35]'
              : 'bg-white';

          return (
            <div key={page.id} className="group relative flex items-center">
              <button
                type="button"
                onClick={() => setCurrentPage(page.id)}
                className={cn('page-thumbnail', bgPreview, isActive && 'active')}
                title={page.title || `Page ${index + 1}`}
              >
                <span className="page-number">{index + 1}</span>
                <span
                  className={cn(
                    'block truncate px-1 text-[9px] font-medium',
                    page.background.type === 'blackboard' || page.background.type === 'chalkboard'
                      ? 'text-slate-300'
                      : 'text-slate-600'
                  )}
                >
                  {page.objectIds.length > 0 ? `${page.objectIds.length} items` : 'Blank'}
                </span>
              </button>

              {pages.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    deletePage(page.id);
                  }}
                  title="Delete page"
                  className="absolute -right-1.5 -top-1.5 hidden h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white shadow group-hover:flex"
                >
                  <Trash2 className="h-2.5 w-2.5" />
                </button>
              )}
            </div>
          );
        })}

        <button
          type="button"
          onClick={() => addPage()}
          className="flex h-[54px] w-14 shrink-0 flex-col items-center justify-center gap-0.5 rounded border border-dashed border-slate-300 bg-slate-50 text-slate-500 hover:border-primary hover:bg-teal-50 hover:text-primary"
          title="Add New Page"
        >
          <Plus className="h-4 w-4" />
          <span className="text-[10px] font-medium">Add</span>
        </button>
      </div>
    </div>
  );
}

