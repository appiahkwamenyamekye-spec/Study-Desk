import type { User } from 'firebase/auth';
import { FolderKanban, LayoutDashboard, LogOut, Plus } from 'lucide-react';
import type { AppView } from '../types/assignment';
import { UserAvatar } from './UserAvatar';

interface SidebarProps {
  activeView: AppView;
  hasSelectedAccount: boolean;
  onSelectView: (view: AppView) => void;
  onOpenUpload: () => void;
  onSignOut: () => void;
  user: User;
}

/**
 * Responsive workspace navigation:
 * - Fixed 256px left sidebar on desktop (`lg+`) displaying the user's Google profile picture.
 * - Compact single-row mobile bottom tab bar (`< lg`).
 */
export function Sidebar({
  activeView,
  hasSelectedAccount,
  onSelectView,
  onOpenUpload,
  onSignOut,
  user,
}: SidebarProps) {
  const displayName = user.displayName || user.email?.split('@')[0] || 'Student';

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 lg:border-r lg:border-slate-200/80 lg:bg-white lg:min-h-screen lg:sticky lg:top-0 lg:h-screen">
        <div className="h-16 px-5 flex items-center gap-2.5 border-b border-slate-100">
          <span className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs font-display font-bold shrink-0">
            S
          </span>
          <span className="font-display text-lg font-bold tracking-tight text-slate-950 whitespace-nowrap">
            StudyDesk
          </span>
        </div>

        <div className="p-4 flex-1 flex flex-col justify-between gap-6">
          <div className="space-y-5">
            <button
              type="button"
              onClick={onOpenUpload}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 active:scale-[0.98] rounded-xl shadow-[0_2px_6px_rgba(15,23,42,0.16)] transition-all duration-150 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 cursor-pointer"
            >
              <Plus className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Upload Work</span>
            </button>

            <nav aria-label="Primary navigation" className="space-y-1">
              <button
                type="button"
                onClick={() => onSelectView('explore')}
                aria-current={!hasSelectedAccount && activeView === 'explore' ? 'page' : undefined}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium rounded-xl transition-all duration-150 whitespace-nowrap cursor-pointer ${
                  !hasSelectedAccount && activeView === 'explore'
                    ? 'bg-slate-900/5 text-slate-950 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <FolderKanban
                  className={`w-4 h-4 shrink-0 ${
                    !hasSelectedAccount && activeView === 'explore'
                      ? 'text-blue-600'
                      : 'text-slate-400'
                  }`}
                  aria-hidden="true"
                />
                <span>All Assignments</span>
              </button>

              <button
                type="button"
                onClick={() => onSelectView('dashboard')}
                aria-current={!hasSelectedAccount && activeView === 'dashboard' ? 'page' : undefined}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium rounded-xl transition-all duration-150 whitespace-nowrap cursor-pointer ${
                  !hasSelectedAccount && activeView === 'dashboard'
                    ? 'bg-slate-900/5 text-slate-950 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <LayoutDashboard
                  className={`w-4 h-4 shrink-0 ${
                    !hasSelectedAccount && activeView === 'dashboard'
                      ? 'text-blue-600'
                      : 'text-slate-400'
                  }`}
                  aria-hidden="true"
                />
                <span>My Dashboard</span>
              </button>
            </nav>
          </div>

          {/* Personalized Account Footer with Google Profile Picture */}
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <button
              type="button"
              onClick={() => onSelectView('dashboard')}
              className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-slate-50/90 hover:bg-slate-100/90 border border-slate-200/70 transition-colors text-left cursor-pointer"
            >
              <UserAvatar name={displayName} photoURL={user.photoURL} size="md" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900 truncate">{displayName}</p>
                {user.email && (
                  <p className="text-xs text-slate-500 truncate">{user.email}</p>
                )}
              </div>
            </button>

            <button
              type="button"
              onClick={onSignOut}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-colors whitespace-nowrap cursor-pointer"
            >
              <LogOut className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile & Tablet Bottom Navigation */}
      <nav
        aria-label="Mobile navigation"
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-2 py-1.5 flex items-center justify-around"
      >
        <button
          type="button"
          onClick={() => onSelectView('explore')}
          aria-current={!hasSelectedAccount && activeView === 'explore' ? 'page' : undefined}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 px-2 rounded-lg text-xs font-medium min-h-[44px] whitespace-nowrap cursor-pointer ${
            !hasSelectedAccount && activeView === 'explore' ? 'text-slate-950 font-semibold' : 'text-slate-500'
          }`}
        >
          <FolderKanban
            className={`w-4 h-4 shrink-0 ${
              !hasSelectedAccount && activeView === 'explore' ? 'text-blue-600' : ''
            }`}
            aria-hidden="true"
          />
          <span>All Work</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectView('dashboard')}
          aria-current={!hasSelectedAccount && activeView === 'dashboard' ? 'page' : undefined}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 px-2 rounded-lg text-xs font-medium min-h-[44px] whitespace-nowrap cursor-pointer ${
            !hasSelectedAccount && activeView === 'dashboard' ? 'text-slate-950 font-semibold' : 'text-slate-500'
          }`}
        >
          <LayoutDashboard
            className={`w-4 h-4 shrink-0 ${
              !hasSelectedAccount && activeView === 'dashboard' ? 'text-blue-600' : ''
            }`}
            aria-hidden="true"
          />
          <span>Dashboard</span>
        </button>

        <button
          type="button"
          onClick={onSignOut}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 px-2 rounded-lg text-xs font-medium text-slate-500 min-h-[44px] whitespace-nowrap cursor-pointer"
        >
          <LogOut className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>Sign out</span>
        </button>
      </nav>
    </>
  );
}
