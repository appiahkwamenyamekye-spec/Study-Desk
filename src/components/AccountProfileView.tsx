import { useMemo } from 'react';
import { ArrowLeft, FolderOpen } from 'lucide-react';
import type { Assignment } from '../types/assignment';
import type { AccountOption } from './AccountSearchBar';
import { AssignmentCard } from './AssignmentCard';
import { UserAvatar } from './UserAvatar';

interface AccountProfileViewProps {
  account: AccountOption;
  assignments: Assignment[];
  likedIds: Set<string>;
  currentUserId: string;
  onBack: () => void;
  onToggleLike: (assignmentId: string, currentlyLiked: boolean) => Promise<void>;
  onOpenDetail: (assignment: Assignment) => void;
  onDelete: (assignmentId: string) => Promise<void>;
}

/**
 * Displays a searched user's public assignments and real computed totals.
 */
export function AccountProfileView({
  account,
  assignments,
  likedIds,
  currentUserId,
  onBack,
  onToggleLike,
  onOpenDetail,
  onDelete,
}: AccountProfileViewProps) {
  const accountAssignments = useMemo(
    () => assignments.filter((item) => item.authorId === account.uid),
    [assignments, account.uid],
  );

  const totals = useMemo(() => {
    let likes = 0;
    let comments = 0;
    for (const item of accountAssignments) {
      likes += item.likesCount;
      comments += item.commentsCount;
    }
    return {
      uploads: accountAssignments.length,
      likes,
      comments,
    };
  }, [accountAssignments]);

  return (
    <section aria-labelledby="account-profile-heading" className="space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden="true" />
        <span>Back to All Assignments</span>
      </button>

      {/* Account Surface Header */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.03),0_4px_16px_-4px_rgba(15,23,42,0.04)] overflow-hidden">
        <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100">
          <div className="flex items-center gap-4 min-w-0">
            <UserAvatar name={account.displayName} photoURL={account.photoURL} size="lg" />
            <div className="min-w-0 space-y-0.5">
              <h1
                id="account-profile-heading"
                className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 truncate"
              >
                {account.displayName}
              </h1>
              <p className="text-sm text-slate-600">
                {account.uid === currentUserId
                  ? 'Your shared assignments and projects'
                  : 'Shared assignments and projects'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 divide-x divide-slate-100 bg-slate-50/50">
          <div className="p-4 sm:px-6 space-y-0.5">
            <p className="text-xs font-medium text-slate-500">Uploads</p>
            <p className="font-display text-xl font-bold text-slate-900 font-mono tabular-nums">
              {totals.uploads}
            </p>
          </div>
          <div className="p-4 sm:px-6 space-y-0.5">
            <p className="text-xs font-medium text-slate-500">Likes received</p>
            <p className="font-display text-xl font-bold text-slate-900 font-mono tabular-nums">
              {totals.likes}
            </p>
          </div>
          <div className="p-4 sm:px-6 space-y-0.5">
            <p className="text-xs font-medium text-slate-500">Comments received</p>
            <p className="font-display text-xl font-bold text-slate-900 font-mono tabular-nums">
              {totals.comments}
            </p>
          </div>
        </div>
      </div>

      {accountAssignments.length === 0 ? (
        <div className="bg-white border border-slate-200/90 rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-10 text-center space-y-3">
          <FolderOpen className="w-10 h-10 text-slate-400 mx-auto" aria-hidden="true" />
          <div className="space-y-1 max-w-md mx-auto">
            <h2 className="font-display text-base font-semibold text-slate-900">
              No assignments uploaded yet
            </h2>
            <p className="text-sm text-slate-600">
              {account.displayName} has not uploaded any assignments or projects yet.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {accountAssignments.map((assignment) => (
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
