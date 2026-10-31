import React from 'react';
import {
  LayoutDashboard,
  Cpu,
  FolderGit2,
  CheckSquare,
  BookOpen,
  Boxes,
  History,
  Settings,
  Shield,
  X,
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'agent'
  | 'projects'
  | 'tasks'
  | 'knowledge'
  | 'integrations'
  | 'history'
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  activeExecutionsCount: number;
  isMobileMenuOpen?: boolean;
  onCloseMobileMenu?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  activeExecutionsCount,
  isMobileMenuOpen,
  onCloseMobileMenu,
}) => {
  const navItems = [
    { id: 'dashboard' as NavTab, label: 'Dashboard', icon: LayoutDashboard },
    {
      id: 'agent' as NavTab,
      label: 'Agent Workspace',
      icon: Cpu,
      badge: activeExecutionsCount > 0 ? `${activeExecutionsCount} active` : undefined,
    },
    { id: 'projects' as NavTab, label: 'Projects & Repos', icon: FolderGit2 },
    { id: 'tasks' as NavTab, label: 'Tasks & Sync', icon: CheckSquare },
    { id: 'knowledge' as NavTab, label: 'Project Knowledge', icon: BookOpen },
    { id: 'integrations' as NavTab, label: 'Integrations', icon: Boxes },
    { id: 'history' as NavTab, label: 'Execution History', icon: History },
    { id: 'settings' as NavTab, label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* DESKTOP SIDEBAR: visible only on md: and above */}
      <aside className="hidden md:flex w-56 border-r border-zinc-800 bg-zinc-950 flex-col justify-between py-3 select-none flex-shrink-0">
        <nav className="space-y-1 px-2">
          <div className="px-3 pb-2 text-[11px] font-mono uppercase tracking-wider text-zinc-500 font-semibold">
            Platform
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-zinc-800/90 text-white shadow-sm border border-zinc-700/60 font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/80 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-zinc-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Security badge footer */}
        <div className="px-4 py-2 border-t border-zinc-800/80">
          <div className="flex items-center gap-2 text-[11px] text-zinc-500">
            <Shield className="w-3.5 h-3.5 text-emerald-500/80" />
            <span>Zero-Leak PAT Encryption</span>
          </div>
          <p className="text-[10px] text-zinc-600 mt-1 leading-tight font-mono">
            AES-256-GCM Server Vault
          </p>
        </div>
      </aside>

      {/* MOBILE SLIDE-OVER DRAWER (FULL SCREEN MODAL / DRAWER) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobileMenu}
          />

          {/* Drawer content */}
          <div className="relative w-72 max-w-[85vw] h-full bg-zinc-950 border-r border-zinc-800 flex flex-col justify-between py-4 px-3 shadow-2xl z-10 overflow-y-auto">
            <div>
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
                  Navigation Menu
                </span>
                <button
                  onClick={onCloseMobileMenu}
                  className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800"
                  aria-label="Close Menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onSelectTab(item.id);
                        if (onCloseMobileMenu) onCloseMobileMenu();
                      }}
                      className={`w-full flex items-center justify-between px-3 py-3 rounded-lg text-xs font-medium transition touch-manipulation ${
                        isActive
                          ? 'bg-zinc-800 text-white font-semibold border border-zinc-700'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-zinc-400'}`} />
                        <span className="text-sm">{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="pt-3 border-t border-zinc-800">
              <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-mono">
                <Shield className="w-3.5 h-3.5 text-emerald-500/80" />
                <span>AES-256-GCM Server Vault</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

/**
 * Bottom navigation bar for mobile devices.
 * Always renders horizontally at the very bottom of the viewport on mobile (hidden on md+).
 */
export const MobileBottomNav: React.FC<{
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenMenu: () => void;
}> = ({ currentTab, onSelectTab, onOpenMenu }) => {
  const tabs: { id: NavTab; label: string; icon: any }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'agent', label: 'Agent', icon: Cpu },
    { id: 'projects', label: 'Repos', icon: FolderGit2 },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'integrations', label: 'Integrations', icon: Boxes },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden w-full border-t border-zinc-800 bg-zinc-950/95 backdrop-blur-md px-1 py-1.5 flex items-center justify-around z-30 flex-shrink-0 select-none shadow-lg"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = currentTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-lg text-[10px] font-medium transition touch-manipulation ${
              isActive
                ? 'text-emerald-400 font-bold bg-emerald-950/30'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Icon className={`w-4 h-4 mb-0.5 ${isActive ? 'text-emerald-400' : 'text-zinc-400'}`} />
            <span className="truncate">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
