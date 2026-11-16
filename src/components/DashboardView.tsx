import { useMemo, useState } from 'react';
import { FileUp, Plus, Search } from 'lucide-react';
import type { Assignment } from '../types/assignment';
import { AssignmentCard } from './AssignmentCard';
import { UserAvatar } from './UserAvatar';

interface DashboardViewProps {
  myAssignments: Assignment[];
  likedIds: Set<string>;
  currentUserId: string;
  userName: string;
  userPhotoURL?: string | null;
  isLoading: boolean;
  onToggleLike: (assignmentId: string, currentlyLiked: boolean) => Promise<void>;
  onOpenDetail: (assignment: Assignment) => void;
  onDelete: (assignmentId: string) => Promise<void>;
  onOpenUpload: () => void;
}

/**
 * Personal user dashboard summarizing the user's actual uploads, likes received,
 * and comments received, alongside full management of their submitted work.
 */
export function DashboardView({
  myAssignments,
  likedIds,
  currentUserId,
  userName,
  userPhotoURL,
  isLoading,
  onToggleLike,
  onOpenDetail,
  onDelete,
  onOpenUpload,
}: DashboardViewProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const totals = useMemo(() => {
    let likes = 0;
    let comments = 0;
    for (const item of myAssignments) {
      likes += item.likesCount;
      comments += item.commentsCount;
    }
    return {
      uploads: myAssignments.length,
      likes,
      comments,
    };
  }, [myAssignments]);

  const filteredAssignments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return myAssignments;
    return myAssignments.filter(
      (item) =>
        item.title.toLowerCase().includes(q) || item.fileName.toLowerCase().includes(q),
    );
  }, [myAssignments, searchQuery]);

  return (
    <section aria-labelledby="dashboard-heading" className="space-y-6">
      {/* Personalized Dashboard Summary Surface */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.03),0_4px_16px_-4px_rgba(15,23,42,0.04)] overflow-hidden">
        <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100">
          <div className="flex items-center gap-4 min-w-0">
            <UserAvatar name={userName} photoURL={userPhotoURL} size="lg" />
            <div className="min-w-0 space-y-0.5">
              <h1
                id="dashboard-heading"
                className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 truncate"
              >
                My Dashboard
              </h1>
              <p className="text-sm text-slate-600 truncate">
                Signed in as <span className="font-medium text-slate-900">{userName}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenUpload}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 active:scale-[0.98] rounded-xl shadow-[0_2px_6px_rgba(15,23,42,0.16)] transition-all duration-150 whitespace-nowrap self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Upload Assignment</span>
          </button>
        </div>

        {/* Real Computed Summary Strip (Zero fabricated figures) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 bg-slate-50/60">
          <div className="p-5 space-y-1">
            <p className="text-xs font-medium text-slate-500">Your uploads</p>
            <p className="font-display text-2xl font-bold text-slate-950 font-mono tabular-nums">
              {isLoading ? '—' : totals.uploads}
            </p>
          </div>
          <div className="p-5 space-y-1">
            <p className="text-xs font-medium text-slate-500">Likes received</p>
            <p className="font-display text-2xl font-bold text-slate-950 font-mono tabular-nums">
              {isLoading ? '—' : totals.likes}
            </p>
          </div>
          <div className="p-5 space-y-1">
            <p className="text-xs font-medium text-slate-500">Comments received</p>
            <p className="font-display text-2xl font-bold text-slate-950 font-mono tabular-nums">
              {isLoading ? '—' : totals.comments}
            </p>
          </div>
        </div>
      </div>

      {/* User's Uploaded Work */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="font-display text-xl font-bold text-slate-950">
            Your uploaded work
          </h2>

          {myAssignments.length > 0 && (
            <div className="relative">
              <Search
                className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter your uploads..."
                aria-label="Filter your uploads"
                className="w-full sm:w-64 pl-9 pr-3.5 py-2 text-sm text-slate-900 bg-white border border-slate-200/90 rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.03)] placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
              />
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {[1, 2].map((slot) => (
              <div
                key={slot}
                className="h-44 bg-white border border-slate-200/90 rounded-2xl p-5 animate-pulse space-y-4"
              >
                <div className="h-5 bg-slate-100 rounded w-3/4" />
                <div className="h-3.5 bg-slate-100 rounded w-1/2" />
                <div className="pt-4 border-t border-slate-100 flex justify-between">
                  <div className="h-7 bg-slate-100 rounded w-24" />
                  <div className="h-7 bg-slate-100 rounded w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredAssignments.length === 0 ? (
          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.03),0_4px_12px_-4px_rgba(15,23,42,0.04)] p-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200/80 flex items-center justify-center mx-auto">
              <FileUp className="w-5 h-5 text-slate-600" aria-hidden="true" />
            </div>
            <div className="space-y-1.5 max-w-md mx-auto">
              <h3 className="font-display text-lg font-semibold text-slate-950">
                {searchQuery.trim()
                  ? 'No matching uploads'
                  : 'You have not uploaded any work yet'}
              </h3>
              <p className="text-sm text-slate-600">
                {searchQuery.trim()
                  ? 'Try clearing your filter to see all of your uploaded files.'
                  : 'Upload a school assignment or project with a title and file to see it listed here.'}
              </p>
            </div>
            {!searchQuery.trim() && (
              <button
                type="button"
                onClick={onOpenUpload}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 active:scale-[0.98] rounded-xl transition-all duration-150 cursor-pointer"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span>Upload Assignment</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredAssignments.map((assignment) => (
              <AssignmentCard
                key={assignment.id}
                assignment={assignment}
                isLiked={likedIds.has(assignment.id)}
                isOwner={assignment.authorId === currentUserId}
                onToggleLike={onToggleLike}
                onOpenDetail={onOpenDetail}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
