import { adminDb } from './firebaseAdmin';
import { ListEntry } from '@/types/list';
import { MediaType } from '@/types/media';
import { FieldValue } from 'firebase-admin/firestore';

const getCollection = (userId: string) => {
  return adminDb.collection('users').doc(userId).collection('listEntries');
};

export async function getUserList(userId: string): Promise<ListEntry[]> {
  const snapshot = await getCollection(userId)
    .orderBy('updatedAt', 'desc')
    .get();

  const entries: ListEntry[] = [];
  snapshot.forEach((doc) => {
    entries.push(doc.data() as ListEntry);
  });
  return entries;
}

export async function getListEntry(userId: string, entryId: string): Promise<ListEntry | null> {
  const doc = await getCollection(userId).doc(entryId).get();
  if (!doc.exists) {
    return null;
  }
  return doc.data() as ListEntry;
}

export async function upsertListEntry(
  userId: string,
  entryId: string,
  data: Omit<ListEntry, 'userId' | 'id' | 'createdAt' | 'updatedAt'> & { createdAt?: string }
): Promise<ListEntry> {
  const docRef = getCollection(userId).doc(entryId);
  const now = new Date().toISOString();
  
  const existing = await docRef.get();
  let finalEntry: ListEntry;

  if (!existing.exists) {
    finalEntry = {
      ...data,
      id: entryId,
      userId,
      createdAt: data.createdAt || now,
      updatedAt: now,
    } as ListEntry;
  } else {
    const current = existing.data() as ListEntry;
    
    // Explicitly update fields and keep original createdAt
    finalEntry = {
      ...current,
      ...data,
      updatedAt: now,
    } as ListEntry;
  }

  await docRef.set(finalEntry);
  return finalEntry;
}

export async function deleteListEntry(userId: string, entryId: string): Promise<void> {
  await getCollection(userId).doc(entryId).delete();
}

export async function findDuplicateAcrossTypes(
  userId: string,
  sourceId: number,
  currentType: MediaType
): Promise<ListEntry | null> {
  const snapshot = await getCollection(userId)
    .where('sourceId', '==', sourceId)
    .get();

  let duplicate: ListEntry | null = null;
  snapshot.forEach((doc) => {
    const entry = doc.data() as ListEntry;
    if (entry.type !== currentType) {
      duplicate = entry;
    }
  });

  return duplicate;
}

// User Profile lookups
export async function getUserByUsername(username: string) {
  const normalizedUsername = username.toLowerCase().trim();
  const usernameDoc = await adminDb.collection('usernames').doc(normalizedUsername).get();
  if (!usernameDoc.exists) {
    return null;
  }
  const { uid } = usernameDoc.data() as { uid: string };
  const userDoc = await adminDb.collection('users').doc(uid).get();
  if (!userDoc.exists) {
    return null;
  }
  return userDoc.data();
}

export async function getUserProfile(uid: string) {
  const userDoc = await adminDb.collection('users').doc(uid).get();
  if (!userDoc.exists) {
    return null;
  }
  return userDoc.data();
}

// Social Follow Transactions
export async function followUser(followerUid: string, followedUid: string): Promise<boolean> {
  if (followerUid === followedUid) return false;

  const followerRef = adminDb.collection('users').doc(followerUid);
  const followedRef = adminDb.collection('users').doc(followedUid);
  
  const followingRef = adminDb.collection('follows').doc(followerUid).collection('following').doc(followedUid);
  const followersRef = adminDb.collection('follows').doc(followedUid).collection('followers').doc(followerUid);

  const now = new Date().toISOString();

  await adminDb.runTransaction(async (transaction) => {
    const followDoc = await transaction.get(followingRef);
    if (followDoc.exists) return; // Already following

    transaction.set(followingRef, { followedAt: now });
    transaction.set(followersRef, { followedAt: now });

    transaction.update(followerRef, {
      followingCount: FieldValue.increment(1)
    });
    transaction.update(followedRef, {
      followerCount: FieldValue.increment(1)
    });
  });

  return true;
}

export async function unfollowUser(followerUid: string, followedUid: string): Promise<boolean> {
  const followerRef = adminDb.collection('users').doc(followerUid);
  const followedRef = adminDb.collection('users').doc(followedUid);
  
  const followingRef = adminDb.collection('follows').doc(followerUid).collection('following').doc(followedUid);
  const followersRef = adminDb.collection('follows').doc(followedUid).collection('followers').doc(followerUid);

  await adminDb.runTransaction(async (transaction) => {
    const followDoc = await transaction.get(followingRef);
    if (!followDoc.exists) return; // Not following

    transaction.delete(followingRef);
    transaction.delete(followersRef);

    transaction.update(followerRef, {
      followingCount: FieldValue.increment(-1)
    });
    transaction.update(followedRef, {
      followerCount: FieldValue.increment(-1)
    });
  });

  return true;
}

export async function isFollowing(followerUid: string, followedUid: string): Promise<boolean> {
  const followingRef = adminDb.collection('follows').doc(followerUid).collection('following').doc(followedUid);
  const doc = await followingRef.get();
  return doc.exists;
}

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

export async function getReviews(type: string, sourceId: number): Promise<UserReview[]> {
  const snapshot = await adminDb
    .collection('reviews')
    .doc(`${type}-${sourceId}`)
    .collection('userReviews')
    .orderBy('updatedAt', 'desc')
    .get();

  const reviews: UserReview[] = [];
  snapshot.forEach((doc) => {
    reviews.push(doc.data() as UserReview);
  });
  return reviews;
}

export async function deleteReview(type: string, sourceId: number, uid: string): Promise<void> {
  const reviewRef = adminDb
    .collection('reviews')
    .doc(`${type}-${sourceId}`)
    .collection('userReviews')
    .doc(uid);

  const votesSnapshot = await reviewRef.collection('votes').get();
  const batch = adminDb.batch();
  votesSnapshot.forEach((doc) => {
    batch.delete(doc.ref);
  });
  batch.delete(reviewRef);
  await batch.commit();
}

// Activities Feed Logging
export interface UserActivity {
  id?: string;
  uid: string;
  username: string;
  type: 'completed' | 'watching' | 'review' | 'follow';
  mediaType?: string;
  sourceId?: number;
  mediaTitle?: string;
  mediaPoster?: string | null;
  detail?: string;
  createdAt: string;
}

export async function logActivity(activity: Omit<UserActivity, 'createdAt'>): Promise<void> {
  const activityRef = adminDb.collection('activities').doc();
  const now = new Date().toISOString();
  await activityRef.set({
    ...activity,
    id: activityRef.id,
    createdAt: now
  });
}

export async function getFollowingActivities(uid: string): Promise<UserActivity[]> {
  const followingSnapshot = await adminDb
    .collection('follows')
    .doc(uid)
    .collection('following')
    .get();

  const followedUids: string[] = [];
  followingSnapshot.forEach((doc) => {
    followedUids.push(doc.id);
  });

  if (followedUids.length === 0) {
    return [];
  }

  const uidsToQuery = followedUids.slice(0, 30);

  const snapshot = await adminDb
    .collection('activities')
    .where('uid', 'in', uidsToQuery)
    .orderBy('createdAt', 'desc')
    .limit(20)
    .get();

  const activities: UserActivity[] = [];
  snapshot.forEach((doc) => {
    activities.push(doc.data() as UserActivity);
  });
  return activities;
}

// Follow Request Operations
export async function getFollowStatus(followerUid: string, followedUid: string): Promise<'following' | 'requested' | 'none'> {
  const followingRef = adminDb.collection('follows').doc(followerUid).collection('following').doc(followedUid);
  const followDoc = await followingRef.get();
  if (followDoc.exists) return 'following';

  const requestRef = adminDb.collection('followRequests').doc(`${followedUid}_${followerUid}`);
  const requestDoc = await requestRef.get();
  if (requestDoc.exists) return 'requested';

  return 'none';
}

export async function requestFollow(requesterUid: string, targetUid: string, requesterUsername: string): Promise<void> {
  const requestRef = adminDb.collection('followRequests').doc(`${targetUid}_${requesterUid}`);
  const now = new Date().toISOString();

  await requestRef.set({
    targetUid,
    requesterUid,
    requesterUsername,
    createdAt: now
  });

  // Create follow_request notification
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
    createdAt: now
  });
}

export async function cancelFollowRequest(requesterUid: string, targetUid: string): Promise<void> {
  const requestRef = adminDb.collection('followRequests').doc(`${targetUid}_${requesterUid}`);
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
  const requestRef = adminDb.collection('followRequests').doc(`${targetUid}_${requesterUid}`);
  const requestDoc = await requestRef.get();
  if (!requestDoc.exists) return;

  const followerRef = adminDb.collection('users').doc(requesterUid);
  const followedRef = adminDb.collection('users').doc(targetUid);
  const followingRef = adminDb.collection('follows').doc(requesterUid).collection('following').doc(targetUid);
  const followersRef = adminDb.collection('follows').doc(targetUid).collection('followers').doc(requesterUid);

  const now = new Date().toISOString();

  await adminDb.runTransaction(async (transaction) => {
    transaction.set(followingRef, { createdAt: now });
    transaction.set(followersRef, { createdAt: now });
    transaction.update(followerRef, { followingCount: FieldValue.increment(1) });
    transaction.update(followedRef, { followerCount: FieldValue.increment(1) });
  });

  await requestRef.delete();

  // Convert follow_request notification to follow notification
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
    createdAt: now
  });

  // Log activity
  await logActivity({
    uid: requesterUid,
    username: requesterUsername,
    type: 'follow',
    detail: `started following @${targetUsername}`
  });
}

export async function declineFollowRequest(targetUid: string, requesterUid: string): Promise<void> {
  const requestRef = adminDb.collection('followRequests').doc(`${targetUid}_${requesterUid}`);
  await requestRef.delete();

  const notificationRef = adminDb
    .collection('users')
    .doc(targetUid)
    .collection('notifications')
    .doc(`${requesterUid}_follow_request`);
  await notificationRef.delete();
}

// Reviews Votes Up/Down
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

  let likesCount = 0;
  let dislikesCount = 0;

  await adminDb.runTransaction(async (transaction) => {
    const reviewDoc = await transaction.get(reviewRef);
    if (!reviewDoc.exists) throw new Error('Review not found');

    const reviewData = reviewDoc.data() || {};
    likesCount = reviewData.likesCount || 0;
    dislikesCount = reviewData.dislikesCount || 0;

    const voteDoc = await transaction.get(voteRef);
    const currentVote = voteDoc.exists ? (voteDoc.data()?.type as 'like' | 'dislike') : 'none';

    if (currentVote === voteType) return; // No change

    // Subtract old vote
    if (currentVote === 'like') likesCount = Math.max(0, likesCount - 1);
    if (currentVote === 'dislike') dislikesCount = Math.max(0, dislikesCount - 1);

    // Add new vote
    if (voteType === 'like') likesCount++;
    if (voteType === 'dislike') dislikesCount++;

    // Update vote document
    if (voteType === 'none') {
      transaction.delete(voteRef);
    } else {
      transaction.set(voteRef, { type: voteType, updatedAt: new Date().toISOString() });
    }

    // Update review document
    transaction.update(reviewRef, { likesCount, dislikesCount });
  });

  return { likesCount, dislikesCount };
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

// Notifications Helpers
export interface UserNotification {
  id: string;
  type: 'follow_request' | 'follow' | 'recommendation' | 'like';
  requesterUid?: string;
  requesterUsername?: string;
  mediaType?: string;
  sourceId?: number;
  mediaTitle?: string;
  read: boolean;
  createdAt: string;
}

export async function getNotifications(uid: string): Promise<UserNotification[]> {
  const snapshot = await adminDb
    .collection('users')
    .doc(uid)
    .collection('notifications')
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get();

  const notifications: UserNotification[] = [];
  snapshot.forEach((doc) => {
    notifications.push(doc.data() as UserNotification);
  });
  return notifications;
}

export async function markNotificationsAsRead(uid: string): Promise<void> {
  const colRef = adminDb.collection('users').doc(uid).collection('notifications');
  const snapshot = await colRef.where('read', '==', false).get();

  const batch = adminDb.batch();
  snapshot.forEach((doc) => {
    batch.update(doc.ref, { read: true });
  });
  await batch.commit();
}

export async function createSystemNotification(uid: string, notification: Omit<UserNotification, 'read' | 'createdAt'>): Promise<void> {
  const notifRef = adminDb.collection('users').doc(uid).collection('notifications').doc(notification.id);
  await notifRef.set({
    ...notification,
    read: false,
    createdAt: new Date().toISOString()
  });
}
