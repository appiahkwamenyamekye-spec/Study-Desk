import type { User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import {
  VALIDATION_LIMITS,
  type Assignment,
  type AssignmentComment,
  type FileChunk,
  type PublicAccount,
} from '../types/assignment';
import { base64ChunksToBlob, fileToBase64Chunks } from '../lib/fileUtils';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';

/**
 * Generates a Firestore-safe alphanumeric/hyphen identifier matching `^[a-zA-Z0-9_-]+$`.
 */
function createSafeId(): string {
  const autoDoc = doc(collection(db, 'assignments'));
  return autoDoc.id;
}

/**
 * Resolves a safe display name within blueprint bounds for a signed-in user.
 */
function getSafeAuthorName(user: User): string {
  const raw = user.displayName?.trim() || user.email?.split('@')[0] || 'Student';
  return raw.slice(0, VALIDATION_LIMITS.DISPLAY_NAME_MAX_LENGTH);
}

/**
 * Persists or updates the signed-in user's private profile document under `/users/{uid}`.
 *
 * @param user - Authenticated Firebase User.
 */
export async function syncUserProfile(user: User): Promise<void> {
  const path = `users/${user.uid}`;
  const userRef = doc(db, 'users', user.uid);
  const displayName = getSafeAuthorName(user);
  const email = (user.email || '').slice(0, 200);

  if (!email) return;

  try {
    const existingSnap = await getDoc(userRef);
    const payload: Record<string, unknown> = {
      uid: user.uid,
      displayName,
      email,
      updatedAt: serverTimestamp(),
    };

    if (user.photoURL && user.photoURL.length <= 500) {
      payload.photoURL = user.photoURL;
    }

    if (!existingSnap.exists()) {
      payload.createdAt = serverTimestamp();
      await setDoc(userRef, payload);
    } else {
      await setDoc(userRef, payload, { merge: true });
    }

    // Sync non-PII public account entry for account search & avatar lookup
    const publicRef = doc(db, 'publicAccounts', user.uid);
    const publicPayload: Record<string, unknown> = {
      uid: user.uid,
      displayName,
      visibility: 'public',
      updatedAt: serverTimestamp(),
    };
    if (user.photoURL && user.photoURL.length <= 500) {
      publicPayload.photoURL = user.photoURL;
    }
    await setDoc(publicRef, publicPayload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Subscribes to public non-PII account directory entries for account search.
 *
 * @param onData - Callback receiving alphabetically sorted public accounts.
 * @param onError - Callback receiving any listener errors.
 */
export function subscribePublicAccounts(
  onData: (accounts: PublicAccount[]) => void,
  onError: (err: Error) => void,
): Unsubscribe {
  const path = 'publicAccounts';
  const q = query(collection(db, 'publicAccounts'), where('visibility', '==', 'public'));

  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => d.data() as PublicAccount);
      items.sort((a, b) => a.displayName.localeCompare(b.displayName));
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    },
  );
}

/**
 * Subscribes to all shared school assignments and projects in real time.
 * Uses a single-field `visibility == 'public'` query and sorts newest-first on the client.
 *
 * @param onData - Callback receiving the updated list of assignments.
 * @param onError - Callback receiving any listener errors.
 */
export function subscribeAllAssignments(
  onData: (assignments: Assignment[]) => void,
  onError: (err: Error) => void,
): Unsubscribe {
  const path = 'assignments';
  const q = query(collection(db, 'assignments'), where('visibility', '==', 'public'));

  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => d.data() as Assignment);
      items.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() ?? Date.now();
        const bTime = b.createdAt?.toMillis?.() ?? Date.now();
        return bTime - aTime;
      });
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    },
  );
}

/**
 * Subscribes to only the assignments uploaded by a specific user for their dashboard.
 *
 * @param uid - Authenticated user's UID.
 * @param onData - Callback receiving the user's assignments.
 * @param onError - Callback receiving any listener errors.
 */
export function subscribeMyAssignments(
  uid: string,
  onData: (assignments: Assignment[]) => void,
  onError: (err: Error) => void,
): Unsubscribe {
  const path = 'assignments';
  const q = query(collection(db, 'assignments'), where('authorId', '==', uid));

  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => d.data() as Assignment);
      items.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() ?? Date.now();
        const bTime = b.createdAt?.toMillis?.() ?? Date.now();
        return bTime - aTime;
      });
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    },
  );
}

/**
 * Fetches the set of assignment IDs currently liked by the signed-in user.
 *
 * @param assignmentIds - List of assignment IDs to check.
 * @param uid - Current user's UID.
 */
export async function fetchUserLikedAssignmentIds(
  assignmentIds: string[],
  uid: string,
): Promise<Set<string>> {
  const liked = new Set<string>();
  if (assignmentIds.length === 0) return liked;

  const checks = await Promise.all(
    assignmentIds.map(async (assignmentId) => {
      const path = `assignments/${assignmentId}/likes/${uid}`;
      try {
        const snap = await getDoc(doc(db, 'assignments', assignmentId, 'likes', uid));
        return snap.exists() ? assignmentId : null;
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, path);
      }
    }),
  );

  for (const id of checks) {
    if (id) liked.add(id);
  }
  return liked;
}

/**
 * Uploads a new school assignment or project using ONLY a title and a file.
 * Stores the assignment metadata and chunked file content in a single atomic batch.
 *
 * @param params.title - User-entered assignment title.
 * @param params.file - Selected File object.
 * @param params.user - Authenticated Firebase user.
 */
export async function uploadAssignment(params: {
  title: string;
  file: File;
  user: User;
}): Promise<string> {
  const cleanTitle = params.title.trim().slice(0, VALIDATION_LIMITS.TITLE_MAX_LENGTH);
  if (cleanTitle.length < VALIDATION_LIMITS.TITLE_MIN_LENGTH) {
    throw new Error('Please enter a title for your assignment or project.');
  }

  const safeFileName = (params.file.name || 'assignment').slice(
    0,
    VALIDATION_LIMITS.FILE_NAME_MAX_LENGTH,
  );
  const safeFileType = (params.file.type || 'application/octet-stream').slice(
    0,
    VALIDATION_LIMITS.FILE_TYPE_MAX_LENGTH,
  );

  const chunks = await fileToBase64Chunks(params.file);
  const assignmentId = createSafeId();
  const authorName = getSafeAuthorName(params.user);
  const path = `assignments/${assignmentId}`;

  const batch = writeBatch(db);
  const assignmentRef = doc(db, 'assignments', assignmentId);

  batch.set(assignmentRef, {
    id: assignmentId,
    title: cleanTitle,
    fileName: safeFileName,
    fileType: safeFileType,
    fileSize: params.file.size,
    chunkCount: chunks.length,
    authorId: params.user.uid,
    authorName,
    visibility: 'public',
    likesCount: 0,
    commentsCount: 0,
    createdAt: serverTimestamp(),
  });

  chunks.forEach((chunkData, index) => {
    const chunkRef = doc(db, 'assignments', assignmentId, 'chunks', `chunk_${index}`);
    batch.set(chunkRef, {
      assignmentId,
      authorId: params.user.uid,
      index,
      data: chunkData,
      visibility: 'public',
    });
  });

  try {
    await batch.commit();
    return assignmentId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

/**
 * Permanently deletes an assignment and all of its chunks, likes, and comments atomically.
 * Permitted only for the original author.
 *
 * @param assignmentId - ID of the assignment to delete.
 */
export async function deleteAssignment(assignmentId: string): Promise<void> {
  const path = `assignments/${assignmentId}`;
  try {
    const [chunksSnap, likesSnap, commentsSnap] = await Promise.all([
      getDocs(query(collection(db, 'assignments', assignmentId, 'chunks'), where('visibility', '==', 'public'))),
      getDocs(collection(db, 'assignments', assignmentId, 'likes')),
      getDocs(query(collection(db, 'assignments', assignmentId, 'comments'), where('visibility', '==', 'public'))),
    ]);

    const batch = writeBatch(db);
    chunksSnap.docs.forEach((d) => batch.delete(d.ref));
    likesSnap.docs.forEach((d) => batch.delete(d.ref));
    commentsSnap.docs.forEach((d) => batch.delete(d.ref));
    batch.delete(doc(db, 'assignments', assignmentId));

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Atomically toggles the current user's like on an assignment, keeping the
 * `/likes/{uid}` record and `likesCount` synchronized.
 *
 * @param assignmentId - Target assignment ID.
 * @param uid - Current user's UID.
 * @param currentlyLiked - Whether the user currently likes this assignment.
 */
export async function toggleAssignmentLike(
  assignmentId: string,
  uid: string,
  currentlyLiked: boolean,
): Promise<boolean> {
  const path = `assignments/${assignmentId}/likes/${uid}`;
  const assignmentRef = doc(db, 'assignments', assignmentId);
  const likeRef = doc(db, 'assignments', assignmentId, 'likes', uid);
  const batch = writeBatch(db);

  if (currentlyLiked) {
    batch.delete(likeRef);
    batch.update(assignmentRef, {
      likesCount: increment(-1),
    });
  } else {
    batch.set(likeRef, {
      assignmentId,
      userId: uid,
      createdAt: serverTimestamp(),
    });
    batch.update(assignmentRef, {
      likesCount: increment(1),
    });
  }

  try {
    await batch.commit();
    return !currentlyLiked;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Subscribes to live comments for a given assignment, sorted oldest-first.
 *
 * @param assignmentId - Target assignment ID.
 * @param onData - Callback receiving updated comment list.
 * @param onError - Callback receiving any listener error.
 */
export function subscribeComments(
  assignmentId: string,
  onData: (comments: AssignmentComment[]) => void,
  onError: (err: Error) => void,
): Unsubscribe {
  const path = `assignments/${assignmentId}/comments`;
  const q = query(
    collection(db, 'assignments', assignmentId, 'comments'),
    where('visibility', '==', 'public'),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => d.data() as AssignmentComment);
      items.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() ?? Date.now();
        const bTime = b.createdAt?.toMillis?.() ?? Date.now();
        return aTime - bTime;
      });
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    },
  );
}

/**
 * Atomically creates a comment on an assignment and increments its comment counter.
 *
 * @param assignmentId - Target assignment ID.
 * @param text - Comment body text.
 * @param user - Authenticated Firebase User.
 */
export async function addAssignmentComment(
  assignmentId: string,
  text: string,
  user: User,
): Promise<void> {
  const cleanText = text.trim().slice(0, VALIDATION_LIMITS.COMMENT_MAX_LENGTH);
  if (cleanText.length < VALIDATION_LIMITS.COMMENT_MIN_LENGTH) {
    throw new Error('Comment cannot be empty.');
  }

  const commentId = createSafeId();
  const path = `assignments/${assignmentId}/comments/${commentId}`;
  const batch = writeBatch(db);

  batch.set(doc(db, 'assignments', assignmentId, 'comments', commentId), {
    id: commentId,
    assignmentId,
    authorId: user.uid,
    authorName: getSafeAuthorName(user),
    text: cleanText,
    visibility: 'public',
    createdAt: serverTimestamp(),
  });

  batch.update(doc(db, 'assignments', assignmentId), {
    commentsCount: increment(1),
    lastActionCommentId: commentId,
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

/**
 * Atomically deletes a comment and decrements the parent assignment's comment counter.
 *
 * @param assignmentId - Target assignment ID.
 * @param commentId - Comment ID to remove.
 */
export async function deleteAssignmentComment(
  assignmentId: string,
  commentId: string,
): Promise<void> {
  const path = `assignments/${assignmentId}/comments/${commentId}`;
  const batch = writeBatch(db);

  batch.delete(doc(db, 'assignments', assignmentId, 'comments', commentId));
  batch.update(doc(db, 'assignments', assignmentId), {
    commentsCount: increment(-1),
    lastActionCommentId: commentId,
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Loads all ordered file chunks for an assignment and reconstructs the original Blob.
 *
 * @param assignment - Assignment metadata record.
 */
export async function fetchAssignmentFileBlob(assignment: Assignment): Promise<Blob> {
  const path = `assignments/${assignment.id}/chunks`;
  try {
    const q = query(
      collection(db, 'assignments', assignment.id, 'chunks'),
      where('visibility', '==', 'public'),
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      throw new Error('File contents could not be found.');
    }

    const chunks = snapshot.docs
      .map((d) => d.data() as FileChunk)
      .sort((a, b) => a.index - b.index)
      .map((chunk) => chunk.data);

    return base64ChunksToBlob(chunks, assignment.fileType);
  } catch (error) {
    if (error instanceof Error && error.message === 'File contents could not be found.') {
      throw error;
    }
    handleFirestoreError(error, OperationType.LIST, path);
  }
}
