import { useMemo, useState } from 'react';
import { FolderOpen, Plus, Search } from 'lucide-react';
import type { Assignment, AssignmentSort } from '../types/assignment';
import { AssignmentCard } from './AssignmentCard';

interface ExploreViewProps {
  assignments: Assignment[];
  likedIds: Set<string>;
  currentUserId: string;
  isLoading: boolean;
  onToggleLike: (assignmentId: string, currentlyLiked: boolean) => Promise<void>;
  onOpenDetail: (assignment: Assignment) => void;
  onDelete: (assignmentId: string) => Promise<void>;
  onOpenUpload: () => void;
}

/**
 * Community feed displaying all uploaded school assignments and projects,
 * with live search and sort controls.
 */
export function ExploreView({
  assignments,
  likedIds,
  currentUserId,
  isLoading,
  onToggleLike,
  onOpenDetail,
  onDelete,
  onOpenUpload,
}: ExploreViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<AssignmentSort>('newest');

  const filteredAssignments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = q
      ? assignments.filter(
          (item) =>
            item.title.toLowerCase().includes(q) ||
            item.authorName.toLowerCase().includes(q) ||
            item.fileName.toLowerCase().includes(q),
        )
      : [...assignments];

    if (sortBy === 'most-liked') {
      list.sort((a, b) => b.likesCount - a.likesCount);
    } else {
      list.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() ?? Date.now();
        const bTime = b.createdAt?.toMillis?.() ?? Date.now();
        return bTime - aTime;
      });
    }

    return list;
  }, [assignments, searchQuery, sortBy]);

  return (
    <section aria-labelledby="explore-heading" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="space-y-1">
          <h1
            id="explore-heading"
            className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 text-balance"
          >
            All Assignments &amp; Projects
          </h1>
          <p className="text-sm text-slate-600">
            Browse work shared by everyone, leave comments, and like helpful submissions.
          </p>
        </div>

        {/* Search & Sort Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by title or author..."
              aria-label="Search assignments"
              className="w-full sm:w-64 pl-9 pr-3.5 py-2 text-sm text-slate-900 bg-white border border-slate-200/90 rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.03)] placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
            />
          </div>

          <div
            role="group"
            aria-label="Sort assignments"
            className="inline-flex items-center p-1 bg-slate-200/60 border border-slate-200/80 rounded-xl self-start sm:self-auto"
          >
            <button
              type="button"
              onClick={() => setSortBy('newest')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-150 whitespace-nowrap cursor-pointer ${
                sortBy === 'newest'
                  ? 'bg-white text-slate-950 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Newest
            </button>
            <button
              type="button"
              onClick={() => setSortBy('most-liked')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-150 whitespace-nowrap cursor-pointer ${
                sortBy === 'most-liked'
                  ? 'bg-white text-slate-950 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Most Liked
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {[1, 2, 3].map((slot) => (
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
            <FolderOpen className="w-5 h-5 text-slate-600" aria-hidden="true" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h2 className="font-display text-lg font-semibold text-slate-950">
              {searchQuery.trim() ? 'No matching assignments' : 'No assignments uploaded yet'}
            </h2>
            <p className="text-sm text-slate-600">
              {searchQuery.trim()
                ? 'Try a different search term or clear your search filter.'
                : 'Be the first to share a school assignment or project by adding a title and file.'}
            </p>
          </div>
          {!searchQuery.trim() && (
            <button
              type="button"
              onClick={onOpenUpload}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 active:scale-[0.98] rounded-xl transition-all duration-150 cursor-pointer"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>Upload first assignment</span>
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
    </section>
  );
}
