import { useEffect, useState, type FormEvent } from 'react';
import type { User } from 'firebase/auth';
import { Download, FileText, Heart, Send, Trash2, X } from 'lucide-react';
import {
  formatFileSize,
  formatTimestamp,
  getFileKindLabel,
  isPreviewableFileType,
} from '../lib/fileUtils';
import {
  addAssignmentComment,
  deleteAssignmentComment,
  fetchAssignmentFileBlob,
  subscribeComments,
} from '../services/assignmentService';
import {
  VALIDATION_LIMITS,
  type Assignment,
  type AssignmentComment,
} from '../types/assignment';

interface AssignmentDetailModalProps {
  assignment: Assignment | null;
  user: User;
  isLiked: boolean;
  onClose: () => void;
  onToggleLike: (assignmentId: string, currentlyLiked: boolean) => Promise<void>;
}

/**
 * Detail modal for inspecting or downloading an assignment file and reading/posting comments.
 */
export function AssignmentDetailModal({
  assignment,
  user,
  isLiked,
  onClose,
  onToggleLike,
}: AssignmentDetailModalProps) {
  const [comments, setComments] = useState<AssignmentComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);

  const [fileLoading, setFileLoading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileBlob, setFileBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [textPreview, setTextPreview] = useState<string | null>(null);
  const [isLikePending, setIsLikePending] = useState(false);

  // Subscribe to live comments while modal is open
  useEffect(() => {
    if (!assignment) return;

    setCommentsLoading(true);
    setCommentsError(null);
    const unsubscribe = subscribeComments(
      assignment.id,
      (items) => {
        setComments(items);
        setCommentsLoading(false);
      },
      (err) => {
        setCommentsError(err.message);
        setCommentsLoading(false);
      },
    );

    return () => unsubscribe();
  }, [assignment?.id]);

  // Load file blob from chunks for preview and instant download
  useEffect(() => {
    if (!assignment) return;

    let cancelled = false;
    let createdObjectUrl: string | null = null;

    setFileLoading(true);
    setFileError(null);
    setFileBlob(null);
    setPreviewUrl(null);
    setTextPreview(null);

    fetchAssignmentFileBlob(assignment)
      .then(async (blob) => {
        if (cancelled) return;
        setFileBlob(blob);

        const previewMode = isPreviewableFileType(assignment.fileType);
        if (previewMode === 'text') {
          const text = await blob.text();
          if (!cancelled) {
            setTextPreview(text.slice(0, 20_000));
          }
        } else if (previewMode === 'image' || previewMode === 'pdf') {
          createdObjectUrl = URL.createObjectURL(blob);
          setPreviewUrl(createdObjectUrl);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setFileError(err instanceof Error ? err.message : 'Unable to load file.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setFileLoading(false);
        }
      });

    return () => {
      cancelled = true;
      if (createdObjectUrl) {
        URL.revokeObjectURL(createdObjectUrl);
      }
    };
  }, [assignment?.id]);

  if (!assignment) return null;

  const previewKind = isPreviewableFileType(assignment.fileType);
  const fileKind = getFileKindLabel(assignment.fileType, assignment.fileName);

  const handleDownload = () => {
    if (!fileBlob) return;
    const url = URL.createObjectURL(fileBlob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = assignment.fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const handleLikeClick = async () => {
    if (isLikePending) return;
    setIsLikePending(true);
    try {
      await onToggleLike(assignment.id, isLiked);
    } finally {
      setIsLikePending(false);
    }
  };

  const handlePostComment = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = commentText.trim();
    if (!trimmed || isPostingComment) return;

    setIsPostingComment(true);
    setCommentsError(null);
    try {
      await addAssignmentComment(assignment.id, trimmed, user);
      setCommentText('');
    } catch (err) {
      setCommentsError(err instanceof Error ? err.message : 'Could not post comment.');
    } finally {
      setIsPostingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteAssignmentComment(assignment.id, commentId);
    } catch (err) {
      setCommentsError(err instanceof Error ? err.message : 'Could not delete comment.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-slate-900/45 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="detail-modal-title"
    >
      <div className="w-full max-w-4xl max-h-[92vh] bg-white border border-slate-200/90 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-200 flex items-start justify-between gap-4 shrink-0">
          <div className="min-w-0 space-y-1">
            <h2
              id="detail-modal-title"
              className="font-display text-lg sm:text-xl font-semibold text-slate-900 break-words"
            >
              {assignment.title}
            </h2>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
              <span>{assignment.authorName}</span>
              <span aria-hidden="true">·</span>
              <span>{fileKind}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{formatFileSize(assignment.fileSize)}</span>
              <span aria-hidden="true">·</span>
              <span>{formatTimestamp(assignment.createdAt)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleLikeClick}
              disabled={isLikePending}
              aria-pressed={isLiked}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap cursor-pointer ${
                isLiked
                  ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
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
              onClick={handleDownload}
              disabled={!fileBlob || fileLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 active:scale-[0.98] disabled:opacity-50 rounded-xl transition-all duration-150 whitespace-nowrap cursor-pointer"
            >
              <Download className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span className="hidden sm:inline">Download</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close details"
              className="p-2 text-slate-500 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Body: Responsive 2-column split on desktop, stacked on mobile */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-y-auto lg:overflow-hidden">
          {/* File preview pane */}
          <div className="lg:col-span-7 bg-slate-50 border-b lg:border-b-0 lg:border-r border-slate-200 p-4 sm:p-6 flex flex-col min-h-[240px] lg:overflow-y-auto">
            {fileLoading ? (
              <div className="flex-1 flex items-center justify-center text-sm text-slate-500">
                Loading file...
              </div>
            ) : fileError ? (
              <div className="flex-1 flex items-center justify-center text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-4">
                {fileError}
              </div>
            ) : previewKind === 'image' && previewUrl ? (
              <div className="flex-1 flex items-center justify-center">
                <img
                  src={previewUrl}
                  alt={assignment.title}
                  className="max-w-full max-h-[55vh] rounded-lg border border-slate-200 bg-white object-contain"
                />
              </div>
            ) : previewKind === 'pdf' && previewUrl ? (
              <iframe
                src={previewUrl}
                title={assignment.title}
                className="w-full h-[50vh] lg:h-full min-h-[380px] rounded-lg border border-slate-200 bg-white"
              />
            ) : previewKind === 'text' && textPreview !== null ? (
              <pre className="w-full p-4 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-800 whitespace-pre-wrap break-words overflow-x-auto">
                {textPreview}
              </pre>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-white border border-slate-200 rounded-xl space-y-3">
                <FileText className="w-10 h-10 text-slate-400" aria-hidden="true" />
                <div className="space-y-1 max-w-xs">
                  <p className="text-sm font-medium text-slate-900 break-all">
                    {assignment.fileName}
                  </p>
                  <p className="text-xs text-slate-500">
                    Inline preview is unavailable for {fileKind} files. Download the file to view it
                    on your device.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={!fileBlob}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" aria-hidden="true" />
                  <span>Download {fileKind}</span>
                </button>
              </div>
            )}
          </div>

          {/* Comments pane */}
          <div className="lg:col-span-5 flex flex-col min-h-[280px] lg:min-h-0 bg-white">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="text-sm font-semibold text-slate-900">
                Comments{' '}
                <span className="font-mono tabular-nums text-slate-500 font-normal">
                  ({comments.length})
                </span>
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {commentsLoading ? (
                <p className="text-sm text-slate-500">Loading comments...</p>
              ) : comments.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No comments yet. Be the first to share feedback on this work.
                </p>
              ) : (
                comments.map((comment) => {
                  const canDelete =
                    comment.authorId === user.uid || assignment.authorId === user.uid;

                  return (
                    <div
                      key={comment.id}
                      className="pb-3.5 border-b border-slate-100 last:border-b-0 last:pb-0 space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-semibold text-slate-900">{comment.authorName}</span>
                          <span aria-hidden="true" className="text-slate-400">
                            ·
                          </span>
                          <span className="text-slate-500">
                            {formatTimestamp(comment.createdAt)}
                          </span>
                        </div>
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => handleDeleteComment(comment.id)}
                            aria-label="Delete comment"
                            className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap break-words">
                        {comment.text}
                      </p>
                    </div>
                  );
                })
              )}

              {commentsError && (
                <div
                  role="alert"
                  className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700"
                >
                  {commentsError}
                </div>
              )}
            </div>

            {/* Add comment form */}
            <form
              onSubmit={handlePostComment}
              className="p-4 border-t border-slate-200 bg-slate-50/70 flex items-center gap-2 shrink-0"
            >
              <label htmlFor="new-comment-input" className="sr-only">
                Write a comment
              </label>
              <input
                id="new-comment-input"
                type="text"
                maxLength={VALIDATION_LIMITS.COMMENT_MAX_LENGTH}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                disabled={isPostingComment}
                placeholder="Write a comment..."
                className="flex-1 min-w-0 px-3.5 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
              />
              <button
                type="submit"
                disabled={!commentText.trim() || isPostingComment}
                aria-label="Post comment"
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 active:scale-[0.98] disabled:opacity-50 rounded-xl transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Send className="w-4 h-4" aria-hidden="true" />
                <span className="hidden sm:inline">Post</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
