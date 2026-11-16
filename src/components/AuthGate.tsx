import { BookOpen, FileUp, Heart, MessageSquare } from 'lucide-react';

interface AuthGateProps {
  onSignIn: () => void;
  isSigningIn: boolean;
  error: string | null;
}

/**
 * Clean editorial sign-in view displayed before a user authenticates with Google.
 * Explains the core assignment-sharing workflow without placeholder metrics.
 */
export function AuthGate({ onSignIn, isSigningIn, error }: AuthGateProps) {
  return (
    <div className="min-h-screen bg-[#F6F7F9] surface-grid-bg flex flex-col">
      <header className="w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
            <span className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs font-display font-bold">
              S
            </span>
            <span className="font-display text-lg font-bold tracking-tight text-slate-900">
              StudyDesk
            </span>
          </div>
          <button
            type="button"
            onClick={onSignIn}
            disabled={isSigningIn}
            className="px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 active:scale-[0.98] disabled:opacity-60 rounded-lg transition-all duration-150 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 cursor-pointer"
          >
            {isSigningIn ? 'Signing in...' : 'Sign in'}
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-2xl bg-white border border-slate-200/90 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.03),0_12px_32px_-8px_rgba(15,23,42,0.07)] overflow-hidden">
          <div className="p-6 sm:p-10 space-y-8">
            <div className="space-y-3">
              <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-slate-950 text-balance leading-[1.15]">
                Share school assignments and projects in one place
              </h1>
              <p className="text-base text-slate-600 leading-relaxed max-w-xl">
                Upload your work with just a title and a file, keep track of your submissions on
                your dashboard, and like or comment on projects shared by others.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 border-t border-slate-100">
              <div className="space-y-2">
                <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-900">
                  <FileUp className="w-4 h-4" aria-hidden="true" />
                </div>
                <p className="text-sm font-semibold text-slate-900">Simple upload</p>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Add a title, attach your file, and publish immediately.
                </p>
              </div>

              <div className="space-y-2">
                <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-900">
                  <BookOpen className="w-4 h-4" aria-hidden="true" />
                </div>
                <p className="text-sm font-semibold text-slate-900">User dashboard</p>
                <p className="text-sm text-slate-600 leading-relaxed">
                  View and manage all of your uploaded assignments in one view.
                </p>
              </div>

              <div className="space-y-2">
                <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-900 gap-0.5">
                  <Heart className="w-3.5 h-3.5" aria-hidden="true" />
                  <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
                </div>
                <p className="text-sm font-semibold text-slate-900">Likes &amp; comments</p>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Appreciate others&apos; work and leave feedback directly on any project.
                </p>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            <div className="pt-2">
              <button
                type="button"
                onClick={onSignIn}
                disabled={isSigningIn}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-6 py-3 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 active:scale-[0.98] disabled:opacity-60 rounded-xl shadow-[0_2px_6px_rgba(15,23,42,0.18)] transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 cursor-pointer"
              >
                <span>{isSigningIn ? 'Signing in with Google...' : 'Continue with Google'}</span>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
