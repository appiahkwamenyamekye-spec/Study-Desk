# Security Specification

## 1. Data Invariants

1. **PII Isolation**: User emails and profile records in `/users/{userId}` can only be read or written by the authenticated owner (`request.auth.uid == userId`) with a verified email token.
2. **Identity Integrity**: Every created `Assignment`, `FileChunk`, `AssignmentLike`, and `AssignmentComment` must bind `authorId` (or `userId`) strictly to `request.auth.uid` and require `request.auth.token.email_verified == true`.
3. **Upload Purity & Bounds**: Assignments require non-empty `title` (1..140 chars), `fileName` (1..255 chars), `fileType` (1..120 chars), `fileSize` (1..5242880 bytes), `chunkCount` (1..15), `likesCount == 0`, `commentsCount == 0`, and `createdAt == request.time`.
4. **Atomic File Chunks**: Every `FileChunk` must reference an existing or synchronously created parent `Assignment` via `getAfter`, belong to the same `authorId`, and stay strictly under 600,000 characters.
5. **Atomic Likes & Comments Counters**:
   - Liking an assignment must atomically create `/likes/{request.auth.uid}` AND increment `likesCount` by 1 in the same batch (`existsAfter` + `getAfter`).
   - Unliking must atomically delete `/likes/{request.auth.uid}` AND decrement `likesCount` by 1 in the same batch.
   - Adding a comment must atomically create `/comments/{commentId}` AND increment `commentsCount` by 1 with `lastActionCommentId == commentId`.
   - Deleting a comment (permitted only for the comment author or assignment author, or during parent assignment deletion) must atomically decrement `commentsCount` by 1 when the parent assignment still exists.
6. **No Client-Delegated Queries**: All `allow list` rules explicitly evaluate `resource.data` without `get()` or `exists()`.

## 2. Dirty Dozen Payloads (All Must Return PERMISSION_DENIED)

1. **Unauthenticated Read**: Read `/assignments` without `request.auth`.
2. **PII Cross-User Read**: Authenticated user B tries to read `/users/{userA}`.
3. **Unverified Email Write**: Authenticated user with `email_verified: false` tries to create an assignment.
4. **Author Spoofing**: User A tries to create an assignment with `authorId: userB`.
5. **Shadow / Ghost Field Injection**: User A creates an assignment with an extra field `isFeatured: true` or `role: 'admin'`.
6. **Non-Zero Initial Counts**: User A creates an assignment with `likesCount: 999` or `commentsCount: 50`.
7. **Timestamp Forgery**: User A creates an assignment with a backdated `createdAt` instead of `request.time`.
8. **Oversized Title / ID Poisoning**: User A tries to create an assignment with a 200-char title or an invalid document ID containing spaces/slashes.
9. **Desynced Like Bump**: User A updates `likesCount` on an assignment without creating `/likes/{userA}` in the same batch.
10. **Foreign Like Deletion**: User B tries to delete `/assignments/{id}/likes/{userA}`.
11. **Desynced Comment Bump**: User A increments `commentsCount` on an assignment without creating `/comments/{lastActionCommentId}` in the same batch.
12. **Unauthorized Assignment Deletion**: User B tries to delete an assignment authored by User A.
