import React from 'react';
import {
  Home,
  PenTool,
  Users,
  BookOpen,
  FolderOpen,
  Video,
  ClipboardList,
  HelpCircle,
  LayoutTemplate,
  Share2,
  Trash2,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '@/store';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/utils/cn';

export type NavSection =
  | 'home'
  | 'whiteboards'
  | 'classrooms'
  | 'lessons'
  | 'resources'
  | 'recordings'
  | 'assignments'
  | 'quizzes'
  | 'templates'
  | 'shared'
  | 'trash'
  | 'settings';

interface SidebarProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const NAV_ITEMS: Array<{ id: NavSection; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'whiteboards', label: 'My Whiteboards', icon: PenTool },
  { id: 'classrooms', label: 'My Classrooms', icon: Users },
  { id: 'lessons', label: 'Lessons', icon: BookOpen },
  { id: 'resources', label: 'Teaching Resources', icon: FolderOpen },
  { id: 'recordings', label: 'Recordings', icon: Video },
  { id: 'assignments', label: 'Assignments', icon: ClipboardList },
  { id: 'quizzes', label: 'Quizzes', icon: HelpCircle },
  { id: 'templates', label: 'Templates', icon: LayoutTemplate },
  { id: 'shared', label: 'Shared With Me', icon: Share2 },
  { id: 'trash', label: 'Trash', icon: Trash2 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ activeSection, onSelectSection, collapsed, onToggleCollapse }: SidebarProps) {
  const { user, logout } = useAuthStore();

  return (
    <aside
      className={cn(
        'flex h-screen flex-col border-r border-slate-200 bg-[#F8FAFC] transition-all duration-200 select-none shrink-0',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Brand Header */}
      <div className="flex h-14 items-center justify-between border-b border-slate-200 px-3">
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white font-bold text-base">
              R
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 leading-none">Rekha</div>
              <div className="text-[10px] font-medium text-slate-500 mt-0.5">AkashaVyom Labs</div>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white font-bold text-base">
            R
          </div>
        )}
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="hidden md:flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-200/70 hover:text-slate-700"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectSection(item.id)}
              title={collapsed ? item.label : undefined}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors',
                isActive
                  ? 'bg-teal-50 text-primary-800 border border-teal-200/70'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                collapsed && 'justify-center px-0'
              )}
            >
              <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-primary' : 'text-slate-500')} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="border-t border-slate-200 p-2.5">
        <div className={cn('flex items-center gap-2.5', collapsed && 'justify-center')}>
          <Avatar name={user?.displayName || 'Teacher'} src={user?.avatarUrl} size="sm" />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-900">
                {user?.displayName || 'Teacher'}
              </p>
              <p className="truncate text-[11px] capitalize text-slate-500">{user?.role || 'teacher'}</p>
            </div>
          )}
          {!collapsed && (
            <button
              type="button"
              onClick={logout}
              title="Sign out"
              className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}

