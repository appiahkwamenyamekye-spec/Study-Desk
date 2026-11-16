import type { Timestamp } from 'firebase/firestore';

/**
 * Shared validation constants synchronized verbatim with `firebase-blueprint.json`
 * and `firestore.rules`.
 */
export const VALIDATION_LIMITS = {
  TITLE_MIN_LENGTH: 1,
  TITLE_MAX_LENGTH: 140,
  FILE_NAME_MAX_LENGTH: 255,
  FILE_TYPE_MAX_LENGTH: 120,
  MAX_FILE_SIZE_BYTES: 5 * 1024 * 1024, // 5 MB
  MAX_CHUNKS: 15,
  CHUNK_CHAR_SIZE: 450_000, // Well under Firestore's 1 MB document size limit
  DISPLAY_NAME_MAX_LENGTH: 100,
  COMMENT_MIN_LENGTH: 1,
  COMMENT_MAX_LENGTH: 1000,
  ID_PATTERN: /^[a-zA-Z0-9_-]+$/,
} as const;

/**
 * Active navigation view within the workspace.
 */
export type AppView = 'explore' | 'dashboard';

/**
 * Sort options for assignment listings.
 */
export type AssignmentSort = 'newest' | 'most-liked';

/**
 * Private user profile stored under `/users/{userId}`.
 */
export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

/**
 * Public non-PII account summary stored under `/publicAccounts/{userId}`
 * for account search and avatar display.
 */
export interface PublicAccount {
  uid: string;
  displayName: string;
  photoURL?: string;
  visibility: 'public';
  updatedAt: Timestamp | null;
}

/**
 * Shared school assignment or project stored under `/assignments/{assignmentId}`.
 */
export interface Assignment {
  id: string;
  title: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  chunkCount: number;
  authorId: string;
  authorName: string;
  visibility: 'public';
  likesCount: number;
  commentsCount: number;
  lastActionCommentId?: string;
  createdAt: Timestamp | null;
}

/**
 * Base64-encoded file slice stored under `/assignments/{assignmentId}/chunks/{chunkId}`.
 */
export interface FileChunk {
  assignmentId: string;
  authorId: string;
  index: number;
  data: string;
  visibility: 'public';
}

/**
 * Comment left on an assignment under `/assignments/{assignmentId}/comments/{commentId}`.
 */
export interface AssignmentComment {
  id: string;
  assignmentId: string;
  authorId: string;
  authorName: string;
  text: string;
  visibility: 'public';
  createdAt: Timestamp | null;
}
