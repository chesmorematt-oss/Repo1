import React, { useState } from 'react';
import {
  LayoutDashboard,
  ClipboardCheck,
  Scale,
  BookOpen,
  Plus,
  Menu,
  X,
  LogOut,
  Settings,
  MapPin,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ProfileModal } from './ProfileModal';
import { IndependenceLogo } from './IndependenceLogo';

export type NavTab = 'dashboard' | 'projects' | 'comparator' | 'ordinances';

interface LayoutProps {
  activeTab: NavTab;
  onNavigate: (tab: NavTab) => void;
  onNewProject: () => void;
  projectCounts: {
    total: number;
    attention: number;
  };
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({
  activeTab,
  onNavigate,
  onNewProject,
  projectCounts,
  children,
}) => {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const navItems: Array<{
    id: NavTab;
    label: string;
    subtitle: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string | number;
    badgeWarn?: boolean;
  }> = [
    {
      id: 'dashboard',
      label: 'Overview Dashboard',
      subtitle: 'KPIs & action queue',
      icon: LayoutDashboard,
    },
    {
      id: 'projects',
      label: 'Permit Checklists',
      subtitle: 'Zoning, Floodplain & Fence',
      icon: ClipboardCheck,
      badge: projectCounts.total,
      badgeWarn: projectCounts.attention > 0,
    },
    {
      id: 'comparator',
      label: 'Ordinance Comparator',
      subtitle: 'Live What-If Counter Check',
      icon: Scale,
    },
    {
      id: 'ordinances',
      label: 'Ordinance Rulebook',
      subtitle: 'Ch. 170, Ch. 167 & Ch. 152',
      icon: BookOpen,
    },
  ];

  const handleNav = (id: NavTab) => {
    onNavigate(id);
    setMobileOpen(false);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-950 text-slate-200 w-64 shrink-0 select-none">
      {/* Official City of Independence Planning & Zoning Brand Header */}
      <div className="p-4 border-b border-slate-800/80">
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            onClick={() => handleNav('dashboard')}
            className="w-full bg-white rounded-xl px-3 py-2.5 shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center group"
          >
            <IndependenceLogo size="md" className="max-w-full" />
          </button>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white shrink-0"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="mt-2.5 px-1 flex items-center justify-between text-[11px] text-slate-400">
          <span className="font-semibold text-slate-200 tracking-tight">IndeeCheck Suite</span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="w-3 h-3 text-sky-400" />
            50644
          </span>
        </div>
      </div>

      {/* Primary Action */}
      <div className="px-4 pt-4 pb-2">
        <button
          type="button"
          onClick={() => {
            setMobileOpen(false);
            onNewProject();
          }}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-3.5 rounded-xl bg-civic-600 hover:bg-civic-500 text-white font-semibold text-sm shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Permit Checklist
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
        <div className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Municipal Workspace
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNav(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all ${
                active
                  ? 'bg-slate-800/95 text-white shadow-sm border border-slate-700/70'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 ${active ? 'text-sky-400' : 'text-slate-400'}`}
                />
                <div className="truncate">
                  <div className="text-sm font-medium leading-tight truncate">{item.label}</div>
                  <div className="text-[11px] text-slate-500 truncate">{item.subtitle}</div>
                </div>
              </div>
              {item.badge !== undefined && (
                <span
                  className={`ml-2 px-2 py-0.5 text-[11px] font-semibold rounded-full tabular-nums ${
                    active
                      ? 'bg-civic-600 text-white'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* Quick Reference Card */}
        <div className="mt-6 mx-1 p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs space-y-2">
          <div className="font-semibold text-slate-200 flex items-center justify-between">
            <span>Independence Quick Caps</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-sky-400 font-mono">
              2025 Rev.
            </span>
          </div>
          <div className="space-y-1 text-[11px] text-slate-400 tabular-nums">
            <div className="flex justify-between">
              <span>Front Fence (IMC §152.02):</span>
              <span className="text-slate-200 font-medium">&le; 4&apos; 0&quot;</span>
            </div>
            <div className="flex justify-between">
              <span>Side/Rear Fence (§152.02):</span>
              <span className="text-slate-200 font-medium">&le; 6&apos; 6&quot;</span>
            </div>
            <div className="flex justify-between">
              <span>Corner 20&apos; Sight (§152.01):</span>
              <span className="text-slate-200 font-medium">&le; 3&apos; 0&quot;</span>
            </div>
            <div className="flex justify-between">
              <span>Fence Lot-Line Setback:</span>
              <span className="text-slate-200 font-medium">&ge; 3&apos; or Agmt</span>
            </div>
            <div className="flex justify-between">
              <span>SFHA Lowest Floor:</span>
              <span className="text-slate-200 font-medium">BFE + 1.0&apos;</span>
            </div>
            <div className="flex justify-between">
              <span>Sub-BFE HVAC (§4.02.14c):</span>
              <span className="text-slate-200 font-medium">BFE + 3.0&apos;</span>
            </div>
          </div>
        </div>
      </nav>

      {/* User Account Footer */}
      {user && (
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/60">
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-900 border border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-civic-700 text-white font-bold text-xs flex items-center justify-center shrink-0">
              {user.name
                .split(' ')
                .map((p) => p[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-white truncate">{user.name}</div>
              <div className="text-[11px] text-slate-400 truncate capitalize">{user.role} &middot; {user.title}</div>
            </div>
            <button
              type="button"
              onClick={() => setProfileOpen(true)}
              title="Account Settings & Role Switcher"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={async () => {
                await logout();
                showToast('Signed out of IndeeCheck.', 'info');
              }}
              title="Sign Out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:shrink-0 no-print">
        <div className="fixed inset-y-0 left-0 w-64 flex">{sidebarContent}</div>
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex no-print">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-10 flex w-72 max-w-[85vw]">{sidebarContent}</div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Top Bar */}
        <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between no-print">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => handleNav('dashboard')}
              className="flex items-center"
            >
              <IndependenceLogo size="sm" />
            </button>
          </div>
          <button
            type="button"
            onClick={onNewProject}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-civic-700 text-white text-xs font-semibold"
          >
            <Plus className="w-3.5 h-3.5" />
            New Review
          </button>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>

      {profileOpen && <ProfileModal onClose={() => setProfileOpen(false)} />}
    </div>
  );
};
