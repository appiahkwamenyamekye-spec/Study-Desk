import { useState } from 'react';
import {
  ArrowUpRight,
  FileArchive,
  FileCode2,
  FileImage,
  FileSpreadsheet,
  FileText,
  Heart,
  MessageSquare,
  Trash2,
} from 'lucide-react';
import { formatFileSize, formatTimestamp, getFileKindLabel } from '../lib/fileUtils';
import type { Assignment } from '../types/assignment';

interface AssignmentCardProps {
  assignment: Assignment;
  isLiked: boolean;
  isOwner: boolean;
  onToggleLike: (assignmentId: string, currentlyLiked: boolean) => Promise<void>;
  onOpenDetail: (assignment: Assignment) => void;
  onDelete?: (assignmentId: string) => Promise<void>;
}

/**
 * Selects a matching outline icon for the uploaded file type.
 */
function FileKindIcon({ fileType, fileName }: { fileType: string; fileName: string }) {
  const lower = fileType.toLowerCase();
  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  if (lower.startsWith('image/')) {
    return <FileImage className="w-4 h-4 text-slate-800 shrink-0" aria-hidden="true" />;
  }
  if (lower.includes('spreadsheet') || ext === 'csv' || ext === 'xlsx') {
    return <FileSpreadsheet className="w-4 h-4 text-slate-800 shrink-0" aria-hidden="true" />;
  }
  if (lower.includes('zip') || ext === 'zip') {
    return <FileArchive className="w-4 h-4 text-slate-800 shrink-0" aria-hidden="true" />;
  }
  if (
    ext === 'ts' ||
    ext === 'tsx' ||
    ext === 'js' ||
    ext === 'py' ||
    ext === 'html' ||
    ext === 'css' ||
    ext === 'json'
  ) {
    return <FileCode2 className="w-4 h-4 text-slate-800 shrink-0" aria-hidden="true" />;
  }
  return <FileText className="w-4 h-4 text-slate-800 shrink-0" aria-hidden="true" />;
}

/**
 * Single-elevation editorial card displaying an uploaded assignment or project with
 * unboxed metadata, atomic like toggle, comment trigger, and owner delete control.
 */
export function AssignmentCard({
  assignment,
  isLiked,
  isOwner,
  onToggleLike,
  onOpenDetail,
  onDelete,
}: AssignmentCardProps) {
  const [isLikePending, setIsLikePending] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fileKind = getFileKindLabel(assignment.fileType, assignment.fileName);

  const handleLikeClick = async () => {
    if (isLikePending) return;
    setIsLikePending(true);
    try {
      await onToggleLike(assignment.id, isLiked);
    } finally {
      setIsLikePending(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!onDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      await onDelete(assignment.id);
    } finally {
      setIsDeleting(false);
      setConfirmingDelete(false);
    }
  };

  return (
    <article className="group bg-white border border-slate-200/90 rounded-2xl p-5 flex flex-col justify-between gap-4 shadow-[0_1px_2px_rgba(15,23,42,0.03),0_4px_12px_-4px_rgba(15,23,42,0.04)] hover:border-slate-300 hover:shadow-[0_2px_4px_rgba(15,23,42,0.04),0_12px_24px_-8px_rgba(15,23,42,0.08)] transition-all duration-150">
      <div className="space-y-3">
        <div className="flex items-start gap-3.5">
          <div className="mt-0.5 w-9 h-9 rounded-xl bg-slate-100/90 border border-slate-200/80 flex items-center justify-center shrink-0 group-hover:bg-blue-50/80 group-hover:border-blue-100 transition-colors">
            <FileKindIcon fileType={assignment.fileType} fileName={assignment.fileName} />
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <button
              type="button"
              onClick={() => onOpenDetail(assignment)}
              className="text-left block w-full cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600 rounded"
            >
              <h3 className="text-[15px] font-semibold text-slate-950 group-hover:text-blue-700 transition-colors line-clamp-2 leading-snug">
                {assignment.title}
              </h3>
            </button>

            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-slate-500">
              <span className="font-medium text-slate-600">{fileKind}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{formatFileSize(assignment.fileSize)}</span>
              <span aria-hidden="true">·</span>
              <span className="truncate max-w-[130px]">{assignment.authorName}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{formatTimestamp(assignment.createdAt)}</span>
            </div>
          </div>
        </div>

        <div className="px-3 py-1.5 rounded-lg bg-slate-50/90 border border-slate-200/60">
          <p className="text-xs font-mono text-slate-600 truncate" title={assignment.fileName}>
            {assignment.fileName}
          </p>
        </div>
      </div>

      {/* Action bar */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleLikeClick}
            disabled={isLikePending}
            aria-pressed={isLiked}
            aria-label={isLiked ? `Unlike ${assignment.title}` : `Like ${assignment.title}`}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 active:scale-95 min-h-[36px] whitespace-nowrap cursor-pointer ${
              isLiked
                ? 'text-rose-700 bg-rose-50 hover:bg-rose-100'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
            }`}
          >
            <Heart
              className={`w-4 h-4 shrink-0 ${isLiked ? 'fill-rose-600 text-rose-600' : ''}`}
              aria-hidden="true"
            />
            <span className="font-mono tabular-nums">{assignment.likesCount}</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenDetail(assignment)}
            aria-label={`View comments on ${assignment.title}`}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-colors min-h-[36px] whitespace-nowrap cursor-pointer"
          >
            <MessageSquare className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="font-mono tabular-nums">{assignment.commentsCount}</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {isOwner && onDelete && (
            confirmingDelete ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="px-2.5 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 rounded-lg whitespace-nowrap cursor-pointer"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  disabled={isDeleting}
                  className="px-2 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg whitespace-nowrap cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                aria-label={`Delete ${assignment.title}`}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors min-h-[36px] min-w-[36px] inline-flex items-center justify-center cursor-pointer"
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
              </button>
            )
          )}

          <button
            type="button"
            onClick={() => onOpenDetail(assignment)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-900 hover:text-white active:scale-[0.98] rounded-lg transition-all duration-150 min-h-[36px] whitespace-nowrap cursor-pointer"
          >
            <span>Open</span>
            <ArrowUpRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
}
