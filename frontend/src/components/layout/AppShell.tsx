import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import { Sidebar, type NavSection } from './Sidebar';

interface AppShellProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  title?: string;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
}

export function AppShell({
  activeSection,
  onSelectSection,
  title,
  headerActions,
  children,
}: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white text-slate-900">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar
          activeSection={activeSection}
          onSelectSection={onSelectSection}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((c) => !c)}
        />
      </div>

      {/* Mobile Sidebar Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="fixed inset-0 bg-slate-900/40" onClick={() => setMobileOpen(false)} />
          <div className="relative z-10">
            <Sidebar
              activeSection={activeSection}
              onSelectSection={(sec) => {
                onSelectSection(sec);
                setMobileOpen(false);
              }}
              collapsed={false}
              onToggleCollapse={() => setMobileOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 md:hidden"
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
            {title && <h1 className="text-base font-semibold text-slate-900">{title}</h1>}
          </div>
          {headerActions && <div className="flex items-center gap-2">{headerActions}</div>}
        </header>

        <main className="flex-1 overflow-y-auto bg-slate-50/50 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

