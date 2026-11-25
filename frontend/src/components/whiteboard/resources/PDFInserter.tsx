import { useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { v4 as uuidv4 } from 'uuid';
import { FileUp } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { showError, showSuccess } from '@/components/ui/Toast';
import { useWhiteboardStore, useAuthStore } from '@/store';
import type { ImageCanvasObject } from '@/types';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

interface PDFInserterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PDFInserter({ open, onOpenChange }: PDFInserterProps) {
  const [loading, setLoading] = useState(false);
  const [pagePreviews, setPagePreviews] = useState<Array<{ pageNum: number; dataUrl: string; width: number; height: number }>>([]);
  const { currentPageId, objects, addObject } = useWhiteboardStore();
  const user = useAuthStore((s) => s.user);

  const handleFile = async (file: File) => {
    setLoading(true);
    setPagePreviews([]);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const maxPages = Math.min(pdf.numPages, 10);
      const previews: typeof pagePreviews = [];

      for (let i = 1; i <= maxPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.4 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          await page.render({ canvasContext: ctx, viewport }).promise;
          previews.push({
            pageNum: i,
            dataUrl: canvas.toDataURL('image/png'),
            width: viewport.width,
            height: viewport.height,
          });
        }
      }
      setPagePreviews(previews);
    } catch {
      showError('Could not parse PDF file. Ensure it is a valid, unencrypted PDF.');
    } finally {
      setLoading(false);
    }
  };

  const insertPage = (preview: (typeof pagePreviews)[number]) => {
    const now = new Date().toISOString();
    const scale = Math.min(1, 640 / preview.width);
    const obj: ImageCanvasObject = {
      id: uuidv4(),
      type: 'image',
      pageId: currentPageId || '',
      createdById: user?.id || 'local',
      createdAt: now,
      updatedAt: now,
      x: 100,
      y: 60,
      width: Math.round(preview.width * scale),
      height: Math.round(preview.height * scale),
      naturalWidth: preview.width,
      naturalHeight: preview.height,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      zIndex: Object.keys(objects).length,
      src: preview.dataUrl,
      alt: `PDF Page ${preview.pageNum}`,
    };
    addObject(obj);
    showSuccess(`Inserted PDF Page ${preview.pageNum} for annotation`);
    onOpenChange(false);
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Import Educational PDF"
      description="Render PDF textbook or worksheet pages onto the whiteboard for annotation."
      size="lg"
    >
      <div className="space-y-4">
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 py-6 hover:border-primary">
          <FileUp className="h-7 w-7 text-primary" />
          <span className="mt-2 text-xs font-medium text-slate-800">
            {loading ? 'Rendering PDF pages...' : 'Choose a PDF file'}
          </span>
          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </label>

        {pagePreviews.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {pagePreviews.map((p) => (
              <button
                key={p.pageNum}
                type="button"
                onClick={() => insertPage(p)}
                className="overflow-hidden rounded-lg border border-slate-200 bg-white text-left hover:border-primary"
              >
                <img src={p.dataUrl} alt={`Page ${p.pageNum}`} className="h-32 w-full object-contain bg-slate-50" />
                <div className="border-t border-slate-100 px-2 py-1 text-center text-xs font-medium text-slate-700">
                  Insert Page {p.pageNum}
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="flex justify-end">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}

