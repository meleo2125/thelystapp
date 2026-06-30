import { adminDb } from './firebaseAdmin';
import { ListEntry, Lyst, LystItemRef, LystRankingWindow } from '@/types/list';
import { MediaType } from '@/types/media';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

/* ============================================================
 * LIST ENTRIES (default watchlyst)
 * ========================================================== */

const getEntryCollection = (userId: string) =>
  adminDb.collection('users').doc(userId).collection('listEntries');

export async function getUserList(userId: string): Promise<ListEntry[]> {
  const snapshot = await getEntryCollection(userId)
    .orderBy('updatedAt', 'desc')
    .get();

  return snapshot.docs.map((d) => d.data() as ListEntry);
}

export async function getListEntry(
  userId: string,
  entryId: string
): Promise<ListEntry | null> {
  const doc = await getEntryCollection(userId).doc(entryId).get();
  return doc.exists ? (doc.data() as ListEntry) : null;
}

/**
 * Upsert a list entry. Preserves `createdAt`, refreshes `updatedAt`.
 * Bug fix: previous version used `set()` which silently wiped fields not
 * passed in `data`. We now use merge semantics for partial updates and a
 * full `set()` only on first-create.
 */
export async function upsertListEntry(
  userId: string,
  entryId: string,
  data: Partial<Omit<ListEntry, 'userId' | 'id' | 'createdAt' | 'updatedAt'>> & {
    createdAt?: string;
  }
): Promise<ListEntry> {
  const docRef = getEntryCollection(userId).doc(entryId);
  const now = new Date().toISOString();

  return adminDb.runTransaction(async (txn) => {
    const existing = await txn.get(docRef);

    let finalEntry: ListEntry;
    if (!existing.exists) {
      finalEntry = {
        // sensible defaults so a partial create still validates
        type: data.type as MediaType,
        sourceId: data.sourceId as number,
        status: data.status ?? 'none',
        score: data.score ?? null,
        progress: data.progress ?? 0,
        notes: data.notes ?? '',
        startedAt: data.startedAt ?? null,
        completedAt: data.completedAt ?? null,
        cache: data.cache!,
        lystIds: data.lystIds ?? [],
        id: entryId,
        userId,
        createdAt: data.createdAt || now,
        updatedAt: now,
      } as ListEntry;
      txn.set(docRef, finalEntry);
    } else {
      const current = existing.data() as ListEntry;
      finalEntry = {
        ...current,
        ...data,
        // Never let createdAt be clobbered
        createdAt: current.createdAt,
        updatedAt: now,
      } as ListEntry;
      txn.set(docRef, finalEntry, { merge: true });
    }
    return finalEntry;
  });
}

export async function deleteListEntry(
  userId: string,
  entryId: string
): Promise<void> {
  // Remove the entry document AND any references in the user's custom Lysts.
  const userRef = adminDb.collection('users').doc(userId);
  const entryRef = userRef.collection('listEntries').doc(entryId);

  // Snapshot of Lysts that contain this entry (one read pass).
  const lystsSnap = await userRef.collection('lysts').get();

  const batch = adminDb.batch();
  batch.delete(entryRef);

  for (const lystDoc of lystsSnap.docs) {
    const itemRef = lystDoc.ref.collection('items').doc(entryId);
    const itemSnap = await itemRef.get();
    if (itemSnap.exists) {
      batch.delete(itemRef);
      batch.update(lystDoc.ref, {
        itemCount: FieldValue.increment(-1),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  await batch.commit();
}

export async function findDuplicateAcrossTypes(
  userId: string,
  sourceId: number,
  currentType: MediaType
): Promise<ListEntry | null> {
  const snapshot = await getEntryCollection(userId)
    .where('sourceId', '==', sourceId)
    .get();

  // Bug fix: the original code overwrote `duplicate` on every match and
  // ignored when more than one cross-type entry existed. Use `find()`.
  const dup = snapshot.docs
    .map((d) => d.data() as ListEntry)
    .find((e) => e.type !== currentType);
  return dup ?? null;
}

/* ============================================================
 * USER PROFILE LOOKUPS
 * ========================================================== */

export async function getUserByUsername(username: string) {
  const normalized = username.toLowerCase().trim();
  if (!normalized) return null;
  const usernameDoc = await adminDb
    .collection('usernames')
    .doc(normalized)
    .get();
  if (!usernameDoc.exists) return null;
  const { uid } = usernameDoc.data() as { uid: string };
  const userDoc = await adminDb.collection('users').doc(uid).get();
  if (!userDoc.exists) return null;
  return userDoc.data();
}

export async function getUserProfile(uid: string) {
  if (!uid) return null;
  const userDoc = await adminDb.collection('users').doc(uid).get();
  return userDoc.exists ? userDoc.data() : null;
}

/* ============================================================
 * SOCIAL FOLLOW
 * ========================================================== */

export async function followUser(
  followerUid: string,
  followedUid: string
): Promise<boolean> {
  if (followerUid === followedUid) return false;

  const followerRef = adminDb.collection('users').doc(followerUid);
  const followedRef = adminDb.collection('users').doc(followedUid);

  const followingRef = adminDb
    .collection('follows')
    .doc(followerUid)
    .collection('following')
    .doc(followedUid);
  const followersRef = adminDb
    .collection('follows')
    .doc(followedUid)
    .collection('followers')
    .doc(followerUid);

  const now = new Date().toISOString();

  await adminDb.runTransaction(async (transaction) => {
    const followDoc = await transaction.get(followingRef);
    if (followDoc.exists) return; // Already following

    transaction.set(followingRef, { followedAt: now });
    transaction.set(followersRef, { followedAt: now });

    transaction.set(
      followerRef,
      { followingCount: FieldValue.increment(1) },
      { merge: true }
    );
    transaction.set(
      followedRef,
      { followerCount: FieldValue.increment(1) },
      { merge: true }
    );
  });

  return true;
}

export async function unfollowUser(
  followerUid: string,
  followedUid: string
): Promise<boolean> {
  const followerRef = adminDb.collection('users').doc(followerUid);
  const followedRef = adminDb.collection('users').doc(followedUid);

  const followingRef = adminDb
    .collection('follows')
    .doc(followerUid)
    .collection('following')
    .doc(followedUid);
  const followersRef = adminDb
    .collection('follows')
    .doc(followedUid)
    .collection('followers')
    .doc(followerUid);

  await adminDb.runTransaction(async (transaction) => {
    const followDoc = await transaction.get(followingRef);
    if (!followDoc.exists) return; // Not following

    transaction.delete(followingRef);
    transaction.delete(followersRef);

    transaction.set(
      followerRef,
      { followingCount: FieldValue.increment(-1) },
      { merge: true }
    );
    transaction.set(
      followedRef,
      { followerCount: FieldValue.increment(-1) },
      { merge: true }
    );
  });

  return true;
}

export async function isFollowing(
  followerUid: string,
  followedUid: string
): Promise<boolean> {
  const followingRef = adminDb
    .collection('follows')
    .doc(followerUid)
    .collection('following')
    .doc(followedUid);
  const doc = await followingRef.get();
  return doc.exists;
}

/* ============================================================
 * REVIEWS
 * ========================================================== */

export interface UserReview {
  uid: string;
  username: string;
  content: string;
  isSpoiler: boolean;
  rating: number | null;
  likesCount?: number;
  dislikesCount?: number;
  createdAt: string;
  updatedAt: string;
}

export async function upsertReview(
  type: string,
  sourceId: number,
  uid: string,
  username: string,
  content: string,
  isSpoiler: boolean,
  rating: number | null
): Promise<UserReview> {
  const docRef = adminDb
    .collection('reviews')
    .doc(`${type}-${sourceId}`)
    .collection('userReviews')
    .doc(uid);

  const now = new Date().toISOString();
  const existing = await docRef.get();

  let review: UserReview;
  if (!existing.exists) {
    review = {
      uid,
      username,
      content,
      isSpoiler,
      rating,
      likesCount: 0,
      dislikesCount: 0,
      createdAt: now,
      updatedAt: now,
    };
  } else {
    const current = existing.data() as UserReview;
    review = {
      ...current,
      content,
      isSpoiler,
      rating,
      updatedAt: now,
    };
  }

  await docRef.set(review);
  return review;
}

export async function getReviews(
  type: string,
  sourceId: number
): Promise<UserReview[]> {
  const snapshot = await adminDb
    .collection('reviews')
    .doc(`${type}-${sourceId}`)
    .collection('userReviews')
    .orderBy('updatedAt', 'desc')
    .get();

  return snapshot.docs.map((d) => d.data() as UserReview);
}

export async function deleteReview(
  type: string,
  sourceId: number,
  uid: string
): Promise<void> {
  const reviewRef = adminDb
    .collection('reviews')
    .doc(`${type}-${sourceId}`)
    .collection('userReviews')
    .doc(uid);

  const votesSnapshot = await reviewRef.collection('votes').get();
  const batch = adminDb.batch();
  votesSnapshot.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(reviewRef);
  await batch.commit();
}

/* ============================================================
 * ACTIVITY FEED
 * ========================================================== */

export interface UserActivity {
  id?: string;
  uid: string;
  username: string;
  type: 'completed' | 'watching' | 'review' | 'follow' | 'lyst_created';
  mediaType?: string;
  sourceId?: number;
  mediaTitle?: string;
  mediaPoster?: string | null;
  detail?: string;
  createdAt: string;
}

export async function logActivity(
  activity: Omit<UserActivity, 'createdAt'>
): Promise<void> {
  const activityRef = adminDb.collection('activities').doc();
  const now = new Date().toISOString();
  await activityRef.set({
    ...activity,
    id: activityRef.id,
    createdAt: now,
  });
}

export async function getFollowingActivities(
  uid: string
): Promise<UserActivity[]> {
  const [followingSnapshot, userDoc] = await Promise.all([
    adminDb
      .collection('follows')
      .doc(uid)
      .collection('following')
      .get(),
    adminDb.collection('users').doc(uid).get()
  ]);

  const followedUids = followingSnapshot.docs.map((d) => d.id);
  if (followedUids.length === 0) return [];

  const lastCleared = userDoc.exists ? (userDoc.data()?.lastClearedActivityAt || null) : null;

  /**
   * Firestore `in` queries are capped at 30 values. If the user follows more
   * than 30 people we run multiple parallel queries and merge the result.
   */
  const chunks: string[][] = [];
  for (let i = 0; i < followedUids.length; i += 30) {
    chunks.push(followedUids.slice(i, i + 30));
  }

  const queries = chunks.map((chunk) =>
    adminDb
      .collection('activities')
      .where('uid', 'in', chunk)
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get()
  );

  const snapshots = await Promise.all(queries);
  const merged: UserActivity[] = [];
  for (const snap of snapshots) {
    for (const d of snap.docs) merged.push(d.data() as UserActivity);
  }

  merged.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  let filtered = merged;
  if (lastCleared) {
    filtered = merged.filter((a) => a.createdAt > lastCleared);
  }

  return filtered.slice(0, 20);
}

export async function clearUserFeed(uid: string): Promise<void> {
  const userRef = adminDb.collection('users').doc(uid);
  const now = new Date().toISOString();
  await userRef.set(
    { lastClearedActivityAt: now },
    { merge: true }
  );
}

/* ============================================================
 * FOLLOW REQUESTS
 * ========================================================== */

export async function getFollowStatus(
  followerUid: string,
  followedUid: string
): Promise<'following' | 'requested' | 'none'> {
  if (!followerUid || !followedUid) return 'none';
  const followingRef = adminDb
    .collection('follows')
    .doc(followerUid)
    .collection('following')
    .doc(followedUid);
  const followDoc = await followingRef.get();
  if (followDoc.exists) return 'following';

  const requestRef = adminDb
    .collection('followRequests')
    .doc(`${followedUid}_${followerUid}`);
  const requestDoc = await requestRef.get();
  if (requestDoc.exists) return 'requested';

  return 'none';
}

export async function requestFollow(
  requesterUid: string,
  targetUid: string,
  requesterUsername: string
): Promise<void> {
  const requestRef = adminDb
    .collection('followRequests')
    .doc(`${targetUid}_${requesterUid}`);
  const now = new Date().toISOString();

  await requestRef.set({
    targetUid,
    requesterUid,
    requesterUsername,
    createdAt: now,
  });

  const notificationRef = adminDb
    .collection('users')
    .doc(targetUid)
    .collection('notifications')
    .doc(`${requesterUid}_follow_request`);

  await notificationRef.set({
    id: `${requesterUid}_follow_request`,
    type: 'follow_request',
    requesterUid,
    requesterUsername,
    read: false,
    createdAt: now,
  });
}

export async function cancelFollowRequest(
  requesterUid: string,
  targetUid: string
): Promise<void> {
  const requestRef = adminDb
    .collection('followRequests')
    .doc(`${targetUid}_${requesterUid}`);
  await requestRef.delete();

  const notificationRef = adminDb
    .collection('users')
    .doc(targetUid)
    .collection('notifications')
    .doc(`${requesterUid}_follow_request`);
  await notificationRef.delete();
}

export async function acceptFollowRequest(
  targetUid: string,
  requesterUid: string,
  requesterUsername: string,
  targetUsername: string
): Promise<void> {
  const requestRef = adminDb
    .collection('followRequests')
    .doc(`${targetUid}_${requesterUid}`);
  const requestDoc = await requestRef.get();
  if (!requestDoc.exists) return;

  const followerRef = adminDb.collection('users').doc(requesterUid);
  const followedRef = adminDb.collection('users').doc(targetUid);
  const followingRef = adminDb
    .collection('follows')
    .doc(requesterUid)
    .collection('following')
    .doc(targetUid);
  const followersRef = adminDb
    .collection('follows')
    .doc(targetUid)
    .collection('followers')
    .doc(requesterUid);

  const now = new Date().toISOString();

  await adminDb.runTransaction(async (transaction) => {
    transaction.set(followingRef, { createdAt: now });
    transaction.set(followersRef, { createdAt: now });
    transaction.set(
      followerRef,
      { followingCount: FieldValue.increment(1) },
      { merge: true }
    );
    transaction.set(
      followedRef,
      { followerCount: FieldValue.increment(1) },
      { merge: true }
    );
    transaction.delete(requestRef);
  });

  // Convert follow_request notification to follow notification.
  const notificationRef = adminDb
    .collection('users')
    .doc(targetUid)
    .collection('notifications')
    .doc(`${requesterUid}_follow_request`);

  await notificationRef.set({
    id: `${requesterUid}_follow_request`,
    type: 'follow',
    requesterUid,
    requesterUsername,
    read: false,
    createdAt: now,
  });
}

export async function declineFollowRequest(
  targetUid: string,
  requesterUid: string
): Promise<void> {
  const requestRef = adminDb
    .collection('followRequests')
    .doc(`${targetUid}_${requesterUid}`);
  await requestRef.delete();

  const notificationRef = adminDb
    .collection('users')
    .doc(targetUid)
    .collection('notifications')
    .doc(`${requesterUid}_follow_request`);
  await notificationRef.delete();
}

/* ============================================================
 * REVIEW VOTES
 * ========================================================== */

export async function voteReview(
  type: string,
  sourceId: number,
  reviewUid: string,
  voterUid: string,
  voteType: 'like' | 'dislike' | 'none'
): Promise<{ likesCount: number; dislikesCount: number }> {
  const reviewRef = adminDb
    .collection('reviews')
    .doc(`${type}-${sourceId}`)
    .collection('userReviews')
    .doc(reviewUid);
  const voteRef = reviewRef.collection('votes').doc(voterUid);

  return adminDb.runTransaction(async (transaction) => {
    const reviewDoc = await transaction.get(reviewRef);
    if (!reviewDoc.exists) throw new Error('Review not found');

    const reviewData = reviewDoc.data() || {};
    let likesCount: number = reviewData.likesCount || 0;
    let dislikesCount: number = reviewData.dislikesCount || 0;

    const voteDoc = await transaction.get(voteRef);
    const currentVote = voteDoc.exists
      ? ((voteDoc.data()?.type as 'like' | 'dislike') ?? 'none')
      : 'none';

    if (currentVote === voteType) return { likesCount, dislikesCount };

    if (currentVote === 'like') likesCount = Math.max(0, likesCount - 1);
    if (currentVote === 'dislike') dislikesCount = Math.max(0, dislikesCount - 1);
    if (voteType === 'like') likesCount++;
    if (voteType === 'dislike') dislikesCount++;

    if (voteType === 'none') transaction.delete(voteRef);
    else
      transaction.set(voteRef, {
        type: voteType,
        updatedAt: new Date().toISOString(),
      });

    transaction.update(reviewRef, { likesCount, dislikesCount });

    return { likesCount, dislikesCount };
  });
}

export async function getUserVoteOnReview(
  type: string,
  sourceId: number,
  reviewUid: string,
  voterUid: string
): Promise<'like' | 'dislike' | 'none'> {
  const voteDoc = await adminDb
    .collection('reviews')
    .doc(`${type}-${sourceId}`)
    .collection('userReviews')
    .doc(reviewUid)
    .collection('votes')
    .doc(voterUid)
    .get();

  if (!voteDoc.exists) return 'none';
  return voteDoc.data()?.type || 'none';
}

/* ============================================================
 * NOTIFICATIONS
 * ========================================================== */

export interface UserNotification {
  id: string;
  type:
    | 'follow_request'
    | 'follow'
    | 'recommendation'
    | 'like'
    | 'lyst_clone'
    | 'lyst_like';
  requesterUid?: string;
  requesterUsername?: string;
  mediaType?: string;
  sourceId?: number;
  mediaTitle?: string;
  /** For lyst-related notifications. */
  lystId?: string;
  lystName?: string;
  read: boolean;
  dismissed?: boolean;
  createdAt: string;
}

export async function getNotifications(
  uid: string
): Promise<UserNotification[]> {
  const snapshot = await adminDb
    .collection('users')
    .doc(uid)
    .collection('notifications')
    .orderBy('createdAt', 'desc')
    .limit(100)
    .get();
  return snapshot.docs
    .map((d) => d.data() as UserNotification)
    .filter((n) => !n.dismissed)
    .slice(0, 50);
}

export async function markNotificationsAsRead(uid: string): Promise<void> {
  const colRef = adminDb
    .collection('users')
    .doc(uid)
    .collection('notifications');
  const snapshot = await colRef.where('read', '==', false).get();
  if (snapshot.empty) return;

  const batch = adminDb.batch();
  snapshot.docs.forEach((d) => batch.update(d.ref, { read: true }));
  await batch.commit();
}

export async function dismissAllNotifications(uid: string): Promise<void> {
  const colRef = adminDb
    .collection('users')
    .doc(uid)
    .collection('notifications');
  const snapshot = await colRef.get();
  if (snapshot.empty) return;

  const batch = adminDb.batch();
  snapshot.docs.forEach((d) => {
    const data = d.data();
    if (!data.dismissed) {
      batch.update(d.ref, { dismissed: true });
    }
  });
  await batch.commit();
}

export async function createSystemNotification(
  uid: string,
  notification: Omit<UserNotification, 'read' | 'createdAt'>
): Promise<void> {
  const notifRef = adminDb
    .collection('users')
    .doc(uid)
    .collection('notifications')
    .doc(notification.id);
  await notifRef.set({
    ...notification,
    read: false,
    createdAt: new Date().toISOString(),
  });
}

/* ============================================================
 *               CUSTOM LYSTS (Task 2)
 * ========================================================== */

const lystsCollection = (uid: string) =>
  adminDb.collection('users').doc(uid).collection('lysts');

const lystItemsCollection = (uid: string, lystId: string) =>
  lystsCollection(uid).doc(lystId).collection('items');

export async function createLyst(
  uid: string,
  ownerUsername: string,
  data: { name: string; description?: string; isPublic?: boolean }
): Promise<Lyst> {
  const ref = lystsCollection(uid).doc();
  const now = new Date().toISOString();
  const lyst: Lyst = {
    id: ref.id,
    userId: uid,
    name: data.name.trim(),
    description: data.description?.trim() ?? '',
    isPublic: !!data.isPublic,
    itemCount: 0,
    likesCount: 0,
    dislikesCount: 0,
    ownerUsername,
    coverPosterPath: null,
    clonedFrom: null,
    createdAt: now,
    updatedAt: now,
  };
  await ref.set(lyst);
  return lyst;
}

export async function getUserLysts(uid: string): Promise<Lyst[]> {
  const snapshot = await lystsCollection(uid)
    .orderBy('updatedAt', 'desc')
    .get();
  return snapshot.docs.map((d) => d.data() as Lyst);
}

export async function getLyst(
  uid: string,
  lystId: string
): Promise<Lyst | null> {
  const doc = await lystsCollection(uid).doc(lystId).get();
  return doc.exists ? (doc.data() as Lyst) : null;
}

export async function updateLyst(
  uid: string,
  lystId: string,
  data: Partial<Pick<Lyst, 'name' | 'description' | 'isPublic'>>
): Promise<Lyst | null> {
  const ref = lystsCollection(uid).doc(lystId);
  const snap = await ref.get();
  if (!snap.exists) return null;
  await ref.set(
    { ...data, updatedAt: new Date().toISOString() },
    { merge: true }
  );
  return (await ref.get()).data() as Lyst;
}

export async function deleteLyst(uid: string, lystId: string): Promise<void> {
  const lystRef = lystsCollection(uid).doc(lystId);
  // Delete all items in batches of 400 (Firestore batch limit is 500).
  const items = await lystRef.collection('items').get();
  let batch = adminDb.batch();
  let opCount = 0;
  for (const doc of items.docs) {
    batch.delete(doc.ref);
    opCount++;
    if (opCount === 400) {
      await batch.commit();
      batch = adminDb.batch();
      opCount = 0;
    }
  }
  // Delete public-side likes index (see voteOnLyst).
  const likes = await adminDb
    .collection('lystLikes')
    .doc(`${uid}_${lystId}`)
    .collection('votes')
    .get();
  for (const doc of likes.docs) {
    batch.delete(doc.ref);
    opCount++;
    if (opCount === 400) {
      await batch.commit();
      batch = adminDb.batch();
      opCount = 0;
    }
  }
  batch.delete(adminDb.collection('lystLikes').doc(`${uid}_${lystId}`));
  batch.delete(lystRef);
  await batch.commit();
}

export async function addItemToLyst(
  uid: string,
  lystId: string,
  ref: LystItemRef
): Promise<{ added: boolean }> {
  const lystRef = lystsCollection(uid).doc(lystId);
  const itemRef = lystRef.collection('items').doc(ref.entryId);

  return adminDb.runTransaction(async (txn) => {
    const lystDoc = await txn.get(lystRef);
    if (!lystDoc.exists) throw new Error('Lyst not found');

    const existing = await txn.get(itemRef);
    if (existing.exists) return { added: false };

    txn.set(itemRef, ref);
    const updates: Record<string, any> = {
      itemCount: FieldValue.increment(1),
      updatedAt: new Date().toISOString(),
    };
    // First item sets the cover poster automatically.
    const current = lystDoc.data() as Lyst;
    if (!current.coverPosterPath && ref.posterPath) {
      updates.coverPosterPath = ref.posterPath;
    }
    txn.update(lystRef, updates);

    return { added: true };
  });
}

export async function removeItemFromLyst(
  uid: string,
  lystId: string,
  entryId: string
): Promise<{ removed: boolean }> {
  const lystRef = lystsCollection(uid).doc(lystId);
  const itemRef = lystRef.collection('items').doc(entryId);

  return adminDb.runTransaction(async (txn) => {
    const lystDoc = await txn.get(lystRef);
    if (!lystDoc.exists) throw new Error('Lyst not found');

    const existing = await txn.get(itemRef);
    if (!existing.exists) return { removed: false };

    txn.delete(itemRef);
    txn.update(lystRef, {
      itemCount: FieldValue.increment(-1),
      updatedAt: new Date().toISOString(),
    });
    return { removed: true };
  });
}

export async function getLystItems(
  uid: string,
  lystId: string
): Promise<LystItemRef[]> {
  const snap = await lystItemsCollection(uid, lystId)
    .orderBy('addedAt', 'desc')
    .get();
  return snap.docs.map((d) => d.data() as LystItemRef);
}

/* ---------- Likes / Dislikes (Task 3) -------------------- */

/**
 * Lyst votes are tracked in a separate top-level collection
 * `lystLikes/{ownerUid}_{lystId}/votes/{voterUid}`. This lets us share rules
 * with the public lyst leaderboard query without exposing private user
 * subcollections.
 */
const lystLikesDoc = (ownerUid: string, lystId: string) =>
  adminDb.collection('lystLikes').doc(`${ownerUid}_${lystId}`);

export async function voteOnLyst(
  ownerUid: string,
  lystId: string,
  voterUid: string,
  voteType: 'like' | 'dislike' | 'none'
): Promise<{ likesCount: number; dislikesCount: number }> {
  if (ownerUid === voterUid) {
    throw new Error('You cannot vote on your own Lyst');
  }
  const lystRef = lystsCollection(ownerUid).doc(lystId);
  const indexRef = lystLikesDoc(ownerUid, lystId);
  const voteRef = indexRef.collection('votes').doc(voterUid);

  return adminDb.runTransaction(async (txn) => {
    // --- ALL reads must happen before any writes in a Firestore transaction ---
    const [lystDoc, indexDoc, voteDoc] = await Promise.all([
      txn.get(lystRef),
      txn.get(indexRef),
      txn.get(voteRef),
    ]);

    if (!lystDoc.exists) throw new Error('Lyst not found');
    const lyst = lystDoc.data() as Lyst;
    if (!lyst.isPublic) throw new Error('Lyst is not public');

    const currentVote = voteDoc.exists
      ? ((voteDoc.data()?.type as 'like' | 'dislike') ?? 'none')
      : 'none';

    let likesCount = lyst.likesCount || 0;
    let dislikesCount = lyst.dislikesCount || 0;

    // No-op if casting the same vote again
    if (currentVote === voteType) {
      return { likesCount, dislikesCount };
    }

    if (currentVote === 'like') likesCount = Math.max(0, likesCount - 1);
    if (currentVote === 'dislike') dislikesCount = Math.max(0, dislikesCount - 1);
    if (voteType === 'like') likesCount++;
    if (voteType === 'dislike') dislikesCount++;

    const now = new Date().toISOString();

    // --- All writes happen after all reads ---
    // Ensure the lystLikes index document exists
    if (!indexDoc.exists) {
      txn.set(indexRef, {
        ownerUid,
        lystId,
        likesCount,
        dislikesCount,
        updatedAt: now,
      });
    } else {
      txn.set(indexRef, { likesCount, dislikesCount, updatedAt: now }, { merge: true });
    }

    if (voteType === 'none') {
      txn.delete(voteRef);
    } else {
      txn.set(voteRef, { type: voteType, createdAt: now });
    }

    txn.update(lystRef, { likesCount, dislikesCount, updatedAt: now });

    return { likesCount, dislikesCount };
  });
}

export async function getUserVoteOnLyst(
  ownerUid: string,
  lystId: string,
  voterUid: string
): Promise<'like' | 'dislike' | 'none'> {
  if (!voterUid) return 'none';
  const doc = await lystLikesDoc(ownerUid, lystId)
    .collection('votes')
    .doc(voterUid)
    .get();
  if (!doc.exists) return 'none';
  return (doc.data()?.type as 'like' | 'dislike') ?? 'none';
}

/* ---------- Rankings (Task 3) ---------------------------- */

const windowStart = (window: LystRankingWindow): Date | null => {
  const now = new Date();
  switch (window) {
    case 'week':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case 'month':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case 'year':
      return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    case 'all':
    default:
      return null;
  }
};

/**
 * Compute the top public Lysts by net score (likes - dislikes) within the
 * given time window. We use the `lystLikes` index to fetch recent like
 * activity and then aggregate per-lyst counts in-memory. For 'all', we
 * collection-group across `lysts`.
 */
export async function getTopPublicLysts(
  window: LystRankingWindow,
  limit = 10
): Promise<Lyst[]> {
  if (window === 'all') {
    const snap = await adminDb
      .collectionGroup('lysts')
      .where('isPublic', '==', true)
      .orderBy('likesCount', 'desc')
      .limit(limit)
      .get();
    return snap.docs.map((d) => d.data() as Lyst);
  }

  const since = windowStart(window)!;
  const sinceIso = since.toISOString();

  // Fetch all vote documents without a date filter (avoids requiring a
  // COLLECTION_GROUP_ASC index on createdAt) then filter in-memory.
  const votesSnap = await adminDb
    .collectionGroup('votes')
    .get();

  type Tally = { likes: number; dislikes: number };
  const scores = new Map<string, Tally>();
  votesSnap.docs.forEach((doc) => {
    // Path: lystLikes/{ownerUid}_{lystId}/votes/{voterUid}
    const parent = doc.ref.parent.parent;
    if (!parent) return;
    if (!parent.parent || parent.parent.id !== 'lystLikes') return;

    const data = doc.data() as { type?: string; createdAt?: string };

    // Apply time-window filter in memory
    if (data.createdAt && data.createdAt < sinceIso) return;

    const indexId = parent.id; // ownerUid_lystId
    const tally = scores.get(indexId) ?? { likes: 0, dislikes: 0 };
    if (data.type === 'like') tally.likes++;
    else if (data.type === 'dislike') tally.dislikes++;
    scores.set(indexId, tally);
  });

  const ranked = [...scores.entries()]
    .map(([id, t]) => ({ id, net: t.likes - t.dislikes }))
    .sort((a, b) => b.net - a.net)
    .slice(0, limit);

  // Hydrate Lyst documents for the ranked IDs.
  const lysts: Lyst[] = [];
  for (const { id } of ranked) {
    const sep = id.indexOf('_');
    if (sep <= 0) continue;
    const ownerUid = id.slice(0, sep);
    const lystId = id.slice(sep + 1);
    const lystDoc = await lystsCollection(ownerUid).doc(lystId).get();
    if (!lystDoc.exists) continue;
    const lyst = lystDoc.data() as Lyst;
    if (lyst.isPublic) lysts.push(lyst);
  }
  return lysts;
}

/* ---------- Clone (Task 2) ------------------------------- */

export async function cloneLyst(
  sourceOwnerUid: string,
  sourceLystId: string,
  targetUid: string,
  targetUsername: string
): Promise<Lyst> {
  const sourceRef = lystsCollection(sourceOwnerUid).doc(sourceLystId);
  const sourceDoc = await sourceRef.get();
  if (!sourceDoc.exists) throw new Error('Source Lyst not found');
  const source = sourceDoc.data() as Lyst;
  if (!source.isPublic && sourceOwnerUid !== targetUid) {
    throw new Error('Cannot clone a private Lyst');
  }

  // Snapshot items once (outside the transaction).
  const itemsSnap = await sourceRef.collection('items').get();
  const items = itemsSnap.docs.map((d) => d.data() as LystItemRef);

  const targetLystRef = lystsCollection(targetUid).doc();
  const now = new Date().toISOString();
  const cloned: Lyst = {
    id: targetLystRef.id,
    userId: targetUid,
    name: `${source.name} (Clone)`.slice(0, 60),
    description: source.description,
    isPublic: false,
    itemCount: items.length,
    likesCount: 0,
    dislikesCount: 0,
    ownerUsername: targetUsername,
    coverPosterPath: source.coverPosterPath,
    clonedFrom: {
      ownerUid: sourceOwnerUid,
      lystId: sourceLystId,
      ownerUsername: source.ownerUsername,
    },
    createdAt: now,
    updatedAt: now,
  };

  // Write parent + items in batches.
  let batch = adminDb.batch();
  let ops = 0;
  batch.set(targetLystRef, cloned);
  ops++;
  for (const item of items) {
    const ref = targetLystRef.collection('items').doc(item.entryId);
    batch.set(ref, { ...item, addedAt: now });
    ops++;
    if (ops >= 400) {
      await batch.commit();
      batch = adminDb.batch();
      ops = 0;
    }
  }
  if (ops > 0) await batch.commit();

  // Notify the original author (best effort).
  if (sourceOwnerUid !== targetUid) {
    try {
      await createSystemNotification(sourceOwnerUid, {
        id: `${targetUid}_lyst_clone_${sourceLystId}`,
        type: 'lyst_clone',
        requesterUid: targetUid,
        requesterUsername: targetUsername,
        lystId: sourceLystId,
        lystName: source.name,
      });
    } catch (err) {
      console.warn('Failed to write clone notification:', err);
    }
  }

  return cloned;
}

/* ---------- Public profile listing of lysts -------------- */

export async function getPublicUserLysts(uid: string): Promise<Lyst[]> {
  const snap = await lystsCollection(uid)
    .where('isPublic', '==', true)
    .orderBy('updatedAt', 'desc')
    .get();
  return snap.docs.map((d) => d.data() as Lyst);
}
