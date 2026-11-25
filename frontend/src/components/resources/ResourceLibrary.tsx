import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Search } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Tabs } from '@/components/ui/Tabs';
import { showSuccess } from '@/components/ui/Toast';
import { useWhiteboardStore, useAuthStore } from '@/store';
import type { ImageCanvasObject } from '@/types';

interface ResourceLibraryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ResourceItem {
  id: string;
  name: string;
  category: 'math' | 'physics' | 'chemistry' | 'biology' | 'competitive';
  svg: string;
}

const EDUCATIONAL_RESOURCES: ResourceItem[] = [
  {
    id: 'number-line',
    name: 'Number Line (-5 to 5)',
    category: 'math',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="520" height="80" viewBox="0 0 520 80">
      <line x1="20" y1="40" x2="500" y2="40" stroke="#1F2937" stroke-width="2"/>
      <polygon points="20,40 30,35 30,45" fill="#1F2937"/>
      <polygon points="500,40 490,35 490,45" fill="#1F2937"/>
      ${[-5,-4,-3,-2,-1,0,1,2,3,4,5].map((n, i) => {
        const x = 60 + i * 40;
        return `<line x1="${x}" y1="32" x2="${x}" y2="48" stroke="#0D9488" stroke-width="2"/>
                <text x="${x}" y="65" font-size="13" text-anchor="middle" fill="#1F2937" font-family="Inter, sans-serif">${n}</text>`;
      }).join('')}
    </svg>`,
  },
  {
    id: 'fraction-bar',
    name: 'Fraction Bar (3/4)',
    category: 'math',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="70" viewBox="0 0 360 70">
      <rect x="10" y="15" width="85" height="40" fill="#0D9488" stroke="#115E59" stroke-width="2"/>
      <rect x="95" y="15" width="85" height="40" fill="#0D9488" stroke="#115E59" stroke-width="2"/>
      <rect x="180" y="15" width="85" height="40" fill="#0D9488" stroke="#115E59" stroke-width="2"/>
      <rect x="265" y="15" width="85" height="40" fill="#FFFFFF" stroke="#115E59" stroke-width="2"/>
    </svg>`,
  },
  {
    id: 'venn-2',
    name: '2-Set Venn Diagram',
    category: 'math',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200" viewBox="0 0 320 200">
      <circle cx="120" cy="100" r="75" fill="rgba(13,148,136,0.15)" stroke="#0D9488" stroke-width="2"/>
      <circle cx="200" cy="100" r="75" fill="rgba(37,99,235,0.15)" stroke="#2563EB" stroke-width="2"/>
      <text x="85" y="105" font-size="14" font-weight="bold" fill="#1F2937">A</text>
      <text x="230" y="105" font-size="14" font-weight="bold" fill="#1F2937">B</text>
    </svg>`,
  },
  {
    id: 'circuit-resistor',
    name: 'Resistor Symbol',
    category: 'physics',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="60" viewBox="0 0 220 60">
      <polyline points="10,30 50,30 60,12 75,48 90,12 105,48 120,12 135,48 145,30 210,30" fill="none" stroke="#1F2937" stroke-width="2.5"/>
      <text x="110" y="56" font-size="12" text-anchor="middle" fill="#0D9488">R</text>
    </svg>`,
  },
  {
    id: 'circuit-battery',
    name: 'DC Battery Cell',
    category: 'physics',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="80" viewBox="0 0 180 80">
      <line x1="10" y1="40" x2="75" y2="40" stroke="#1F2937" stroke-width="2.5"/>
      <line x1="75" y1="15" x2="75" y2="65" stroke="#1F2937" stroke-width="3"/>
      <line x1="95" y1="26" x2="95" y2="54" stroke="#1F2937" stroke-width="5"/>
      <line x1="95" y1="40" x2="170" y2="40" stroke="#1F2937" stroke-width="2.5"/>
      <text x="64" y="20" font-size="14" fill="#DC2626">+</text>
      <text x="103" y="20" font-size="14" fill="#1F2937">-</text>
    </svg>`,
  },
  {
    id: 'convex-lens',
    name: 'Convex Lens Ray Diagram',
    category: 'physics',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="180" viewBox="0 0 360 180">
      <line x1="10" y1="90" x2="350" y2="90" stroke="#64748B" stroke-width="1.5" stroke-dasharray="4 4"/>
      <path d="M180,20 Q210,90 180,160 Q150,90 180,20 Z" fill="rgba(13,148,136,0.2)" stroke="#0D9488" stroke-width="2"/>
      <circle cx="100" cy="90" r="3" fill="#1F2937"/><text x="95" y="108" font-size="12" fill="#1F2937">F1</text>
      <circle cx="260" cy="90" r="3" fill="#1F2937"/><text x="255" y="108" font-size="12" fill="#1F2937">F2</text>
    </svg>`,
  },
  {
    id: 'beaker',
    name: 'Laboratory Beaker',
    category: 'chemistry',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="180" viewBox="0 0 160 180">
      <path d="M35,30 L40,150 Q40,160 50,160 L110,160 Q120,160 120,150 L125,30" fill="none" stroke="#1F2937" stroke-width="2.5"/>
      <rect x="41" y="95" width="78" height="62" rx="4" fill="rgba(13,148,136,0.25)"/>
      <line x1="50" y1="70" x2="65" y2="70" stroke="#64748B" stroke-width="1.5"/>
      <line x1="50" y1="100" x2="65" y2="100" stroke="#64748B" stroke-width="1.5"/>
      <line x1="50" y1="130" x2="65" y2="130" stroke="#64748B" stroke-width="1.5"/>
    </svg>`,
  },
  {
    id: 'bohr-atom',
    name: 'Atomic Structure (Bohr Model)',
    category: 'chemistry',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
      <circle cx="100" cy="100" r="16" fill="#0D9488"/>
      <circle cx="100" cy="100" r="45" fill="none" stroke="#64748B" stroke-width="1.5" stroke-dasharray="4 3"/>
      <circle cx="100" cy="100" r="78" fill="none" stroke="#64748B" stroke-width="1.5" stroke-dasharray="4 3"/>
      <circle cx="100" cy="55" r="5" fill="#2563EB"/>
      <circle cx="100" cy="145" r="5" fill="#2563EB"/>
      <circle cx="178" cy="100" r="5" fill="#2563EB"/>
    </svg>`,
  },
  {
    id: 'plant-cell',
    name: 'Plant Cell Outline',
    category: 'biology',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="180" viewBox="0 0 240 180">
      <rect x="15" y="15" width="210" height="150" rx="18" fill="#ECFDF5" stroke="#16A34A" stroke-width="4"/>
      <rect x="25" y="25" width="190" height="130" rx="12" fill="none" stroke="#0D9488" stroke-width="1.5"/>
      <circle cx="75" cy="70" r="24" fill="#A7F3D0" stroke="#059669" stroke-width="2"/>
      <text x="75" y="74" font-size="10" text-anchor="middle" fill="#065F46">Nucleus</text>
      <ellipse cx="155" cy="95" rx="40" ry="30" fill="#E0F2FE" stroke="#0284C7" stroke-width="1.5"/>
      <text x="155" y="99" font-size="10" text-anchor="middle" fill="#0369A1">Vacuole</text>
    </svg>`,
  },
  {
    id: 'circular-seating',
    name: 'Circular Seating Puzzle (8 Seats)',
    category: 'competitive',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220" viewBox="0 0 220 220">
      <circle cx="110" cy="110" r="65" fill="none" stroke="#1F2937" stroke-width="2"/>
      ${[0,45,90,135,180,225,270,315].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const cx = 110 + 82 * Math.cos(rad);
        const cy = 110 + 82 * Math.sin(rad);
        return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="10" fill="#F0FDFA" stroke="#0D9488" stroke-width="2"/>`;
      }).join('')}
    </svg>`,
  },
];

export function ResourceLibrary({ open, onOpenChange }: ResourceLibraryProps) {
  const [query, setQuery] = useState('');
  const { currentPageId, objects, addObject } = useWhiteboardStore();
  const user = useAuthStore((s) => s.user);

  const insertResource = (item: ResourceItem) => {
    const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(item.svg)}`;
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
      width: 280,
      height: 180,
      naturalWidth: 280,
      naturalHeight: 180,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      zIndex: Object.keys(objects).length,
      src: dataUrl,
      alt: item.name,
    };
    addObject(obj);
    showSuccess(`Inserted "${item.name}"`);
    onOpenChange(false);
  };

  const renderGrid = (category?: ResourceItem['category']) => {
    const filtered = EDUCATIONAL_RESOURCES.filter((r) => {
      const matchCat = !category || r.category === category;
      const matchQuery = r.name.toLowerCase().includes(query.toLowerCase());
      return matchCat && matchQuery;
    });

    if (filtered.length === 0) {
      return <p className="py-8 text-center text-xs text-slate-500">No matching resources.</p>;
    }

    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {filtered.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => insertResource(item)}
            className="flex flex-col items-center rounded-lg border border-slate-200 bg-white p-3 text-center hover:border-primary hover:bg-teal-50/40"
          >
            <img
              src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(item.svg)}`}
              alt={item.name}
              className="h-24 w-full object-contain"
            />
            <span className="mt-2 text-xs font-medium text-slate-800">{item.name}</span>
          </button>
        ))}
      </div>
    );
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Educational Resource Library"
      description="Insert editable vector diagrams for Math, Physics, Chemistry, Biology, and Competitive Exams."
      size="xl"
    >
      <div className="space-y-4">
        <Input
          placeholder="Search diagrams (e.g. Venn, Resistor, Plant Cell, Seating)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          leftElement={<Search className="h-4 w-4" />}
        />

        <Tabs
          items={[
            { value: 'all', label: 'All', content: renderGrid() },
            { value: 'math', label: 'Mathematics', content: renderGrid('math') },
            { value: 'physics', label: 'Physics', content: renderGrid('physics') },
            { value: 'chemistry', label: 'Chemistry', content: renderGrid('chemistry') },
            { value: 'biology', label: 'Biology', content: renderGrid('biology') },
            { value: 'competitive', label: 'Competitive', content: renderGrid('competitive') },
          ]}
        />
      </div>
    </Modal>
  );
}

