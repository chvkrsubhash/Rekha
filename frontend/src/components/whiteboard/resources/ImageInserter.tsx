import { useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Upload } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useWhiteboardStore, useAuthStore } from '@/store';
import type { ImageCanvasObject } from '@/types';

interface ImageInserterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImageInserter({ open, onOpenChange }: ImageInserterProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { currentPageId, objects, addObject } = useWhiteboardStore();
  const user = useAuthStore((s) => s.user);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new window.Image();
      img.onload = () => {
        const maxDim = 480;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const now = new Date().toISOString();
        const obj: ImageCanvasObject = {
          id: uuidv4(),
          type: 'image',
          pageId: currentPageId || '',
          createdById: user?.id || 'local',
          createdAt: now,
          updatedAt: now,
          x: 160,
          y: 120,
          width: Math.round(img.width * scale),
          height: Math.round(img.height * scale),
          naturalWidth: img.width,
          naturalHeight: img.height,
          rotation: 0,
          opacity: 1,
          locked: false,
          visible: true,
          zIndex: Object.keys(objects).length,
          src: dataUrl,
          alt: file.name,
        };
        addObject(obj);
        onOpenChange(false);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Insert Image"
      description="Upload PNG, JPEG, SVG, or GIF diagrams onto the whiteboard."
    >
      <div
        onClick={() => inputRef.current?.click()}
        className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 py-10 hover:border-primary hover:bg-teal-50/40"
      >
        <Upload className="h-8 w-8 text-primary" />
        <p className="mt-2 text-sm font-medium text-slate-800">Click to select an image</p>
        <p className="mt-1 text-xs text-slate-500">PNG, JPG, SVG, GIF up to 20MB</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,image/gif"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </div>
      <div className="mt-4 flex justify-end">
        <Button variant="secondary" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
      </div>
    </Modal>
  );
}

