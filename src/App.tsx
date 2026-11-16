import { useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { Plus } from 'lucide-react';
import { AccountProfileView } from './components/AccountProfileView';
import { AccountSearchBar, type AccountOption } from './components/AccountSearchBar';
import { AssignmentDetailModal } from './components/AssignmentDetailModal';
import { AuthGate } from './components/AuthGate';
import { DashboardView } from './components/DashboardView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ExploreView } from './components/ExploreView';
import { Sidebar } from './components/Sidebar';
import { UploadModal } from './components/UploadModal';
import { UserAvatar } from './components/UserAvatar';
import { auth, googleProvider } from './lib/firebase';
import {
  deleteAssignment,
  fetchUserLikedAssignmentIds,
  subscribeAllAssignments,
  subscribeMyAssignments,
  subscribePublicAccounts,
  syncUserProfile,
  toggleAssignmentLike,
} from './services/assignmentService';
import type { AppView, Assignment, PublicAccount } from './types/assignment';

/**
 * Root StudyDesk workspace coordinating Firebase authentication, live Firestore
 * listeners for assignments, public accounts, and user dashboard data.
 */
function StudyDeskApp() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [activeView, setActiveView] = useState<AppView>('explore');
  const [selectedAccount, setSelectedAccount] = useState<AccountOption | null>(null);
  const [allAssignments, setAllAssignments] = useState<Assignment[]>([]);
  const [myAssignments, setMyAssignments] = useState<Assignment[]>([]);
  const [publicAccounts, setPublicAccounts] = useState<PublicAccount[]>([]);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);

  // Track Firebase auth session
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);

      if (currentUser) {
        try {
          await syncUserProfile(currentUser);
        } catch (err) {
          console.error('Failed to sync profile:', err);
        }
      } else {
        setAllAssignments([]);
        setMyAssignments([]);
        setPublicAccounts([]);
        setSelectedAccount(null);
        setLikedIds(new Set());
        setDataLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Attach real-time Firestore listeners only when authenticated
  useEffect(() => {
    if (!authReady || !user) return;

    setDataLoading(true);
    setDataError(null);

    const unsubAll = subscribeAllAssignments(
      (items) => {
        setAllAssignments(items);
        setDataLoading(false);
      },
      (err) => {
        setDataError(err.message);
        setDataLoading(false);
      },
    );

    const unsubMine = subscribeMyAssignments(
      user.uid,
      (items) => {
        setMyAssignments(items);
      },
      (err) => {
        setDataError(err.message);
      },
    );

    const unsubAccounts = subscribePublicAccounts(
      (accounts) => {
        setPublicAccounts(accounts);
      },
      (err) => {
        console.error('Failed to load public accounts:', err);
      },
    );

    return () => {
      unsubAll();
      unsubMine();
      unsubAccounts();
    };
  }, [authReady, user?.uid]);

  // Keep user's liked assignment IDs synced with loaded assignments
  useEffect(() => {
    if (!user || allAssignments.length === 0) {
      setLikedIds(new Set());
      return;
    }

    let cancelled = false;
    const ids = allAssignments.map((item) => item.id);
    fetchUserLikedAssignmentIds(ids, user.uid)
      .then((likedSet) => {
        if (!cancelled) {
          setLikedIds(likedSet);
        }
      })
      .catch((err) => {
        console.error('Failed to load liked status:', err);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.uid, allAssignments.map((a) => a.id).join(',')]);

  const handleSignIn = async () => {
    setAuthError(null);
    setIsSigningIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Unable to sign in with Google.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    setSelectedAssignmentId(null);
    setSelectedAccount(null);
    setIsUploadOpen(false);
    await signOut(auth);
  };

  const handleSelectView = (view: AppView) => {
    setSelectedAccount(null);
    setActiveView(view);
  };

  const handleToggleLike = async (assignmentId: string, currentlyLiked: boolean) => {
    if (!user) return;
    const nowLiked = await toggleAssignmentLike(assignmentId, user.uid, currentlyLiked);
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (nowLiked) {
        next.add(assignmentId);
      } else {
        next.delete(assignmentId);
      }
      return next;
    });
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (selectedAssignmentId === assignmentId) {
      setSelectedAssignmentId(null);
    }
    await deleteAssignment(assignmentId);
  };

  // Resolve latest snapshot of the selected assignment so live like/comment counts update inside modal
  const selectedAssignment =
    selectedAssignmentId
      ? allAssignments.find((a) => a.id === selectedAssignmentId) ??
        myAssignments.find((a) => a.id === selectedAssignmentId) ??
        null
      : null;

  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <p className="text-sm text-slate-500">Loading workspace...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <AuthGate
        onSignIn={handleSignIn}
        isSigningIn={isSigningIn}
        error={authError}
      />
    );
  }

  const userDisplayName = user.displayName || user.email?.split('@')[0] || 'Student';
  const headerContextTitle = selectedAccount
    ? selectedAccount.displayName
    : activeView === 'dashboard'
      ? 'My Dashboard'
      : 'All Assignments';

  return (
    <div className="min-h-screen bg-[#F6F7F9] flex flex-col lg:flex-row">
      <Sidebar
        activeView={activeView}
        hasSelectedAccount={selectedAccount !== null}
        onSelectView={handleSelectView}
        onOpenUpload={() => setIsUploadOpen(true)}
        onSignOut={handleSignOut}
        user={user}
      />

      <div className="flex-1 min-w-0 flex flex-col pb-20 lg:pb-0">
        {/* Unified Responsive Header with Account Search Bar, Upload CTA, and Google Profile Picture */}
        <header className="bg-white/90 backdrop-blur-md border-b border-slate-200/80">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3 sm:gap-6">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="lg:hidden w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs font-display font-bold shrink-0">
                S
              </span>
              <span className="lg:hidden font-display text-base font-bold tracking-tight text-slate-950 whitespace-nowrap">
                StudyDesk
              </span>
              <span className="hidden lg:inline text-sm font-medium text-slate-500 truncate">
                {headerContextTitle}
              </span>
            </div>

            <div className="order-3 sm:order-2 w-full sm:w-auto flex-1 sm:flex-initial flex justify-end">
              <AccountSearchBar
                accounts={publicAccounts}
                assignments={allAssignments}
                selectedAccountId={selectedAccount?.uid ?? null}
                onSelectAccount={(account) => setSelectedAccount(account)}
                onClearAccount={() => setSelectedAccount(null)}
              />
            </div>

            <div className="order-2 sm:order-3 flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsUploadOpen(true)}
                className="lg:hidden inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 active:scale-[0.98] rounded-xl transition-all duration-150 whitespace-nowrap cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>Upload</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectView('dashboard')}
                aria-label="Open My Dashboard"
                title={userDisplayName}
                className="inline-flex items-center gap-2.5 p-1 pr-2.5 rounded-full bg-slate-50/90 hover:bg-slate-100 border border-slate-200/70 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-slate-900"
              >
                <UserAvatar name={userDisplayName} photoURL={user.photoURL} size="sm" />
                <span className="hidden md:inline text-sm font-medium text-slate-800 max-w-[140px] truncate">
                  {userDisplayName}
                </span>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
          {dataError && (
            <div
              role="alert"
              className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 break-words"
            >
              {dataError}
            </div>
          )}

          {selectedAccount ? (
            <AccountProfileView
              account={selectedAccount}
              assignments={allAssignments}
              likedIds={likedIds}
              currentUserId={user.uid}
              onBack={() => setSelectedAccount(null)}
              onToggleLike={handleToggleLike}
              onOpenDetail={(item) => setSelectedAssignmentId(item.id)}
              onDelete={handleDeleteAssignment}
            />
          ) : activeView === 'explore' ? (
            <ExploreView
              assignments={allAssignments}
              likedIds={likedIds}
              currentUserId={user.uid}
              isLoading={dataLoading}
              onToggleLike={handleToggleLike}
              onOpenDetail={(item) => setSelectedAssignmentId(item.id)}
              onDelete={handleDeleteAssignment}
              onOpenUpload={() => setIsUploadOpen(true)}
            />
          ) : (
            <DashboardView
              myAssignments={myAssignments}
              likedIds={likedIds}
              currentUserId={user.uid}
              userName={userDisplayName}
              userPhotoURL={user.photoURL}
              isLoading={dataLoading}
              onToggleLike={handleToggleLike}
              onOpenDetail={(item) => setSelectedAssignmentId(item.id)}
              onDelete={handleDeleteAssignment}
              onOpenUpload={() => setIsUploadOpen(true)}
            />
          )}
        </main>
      </div>

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        user={user}
        onSuccess={() => {
          setSelectedAccount(null);
          setActiveView('dashboard');
        }}
      />

      <AssignmentDetailModal
        assignment={selectedAssignment}
        user={user}
        isLiked={selectedAssignment ? likedIds.has(selectedAssignment.id) : false}
        onClose={() => setSelectedAssignmentId(null)}
        onToggleLike={handleToggleLike}
      />
    </div>
  );
}

/**
 * Application entry wrapped in an ErrorBoundary.
 */
export default function App() {
  return (
    <ErrorBoundary>
      <StudyDeskApp />
    </ErrorBoundary>
  );
}
