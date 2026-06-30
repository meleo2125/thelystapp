import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/backend/firebaseAdmin';
import { getSessionUser } from '@/lib/firebase/sessions';

async function deleteSnapshot(snapshot: FirebaseFirestore.QuerySnapshot) {
  if (snapshot.empty) return;
  const batch = adminDb.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
    }
    const uid = user.uid;

    const userRef = adminDb.collection('users').doc(uid);
    const userDoc = await userRef.get();
    const userData = userDoc.data();
    const username = userData?.username;

    // 1. Delete watchlist items in subcollections
    const listEntriesSnapshot = await userRef.collection('listEntries').get();
    await deleteSnapshot(listEntriesSnapshot);

    const listSnapshot = await userRef.collection('list').get();
    await deleteSnapshot(listSnapshot);

    // 2. Delete notifications
    const notifsSnapshot = await userRef.collection('notifications').get();
    await deleteSnapshot(notifsSnapshot);

    // 3. Delete follows subcollections under follows/{uid}
    const followingSnapshot = await adminDb.collection('follows').doc(uid).collection('following').get();
    await deleteSnapshot(followingSnapshot);

    const followersSnapshot = await adminDb.collection('follows').doc(uid).collection('followers').get();
    await deleteSnapshot(followersSnapshot);

    // 4. Delete followRequests sent or received
    const requestsSent = await adminDb.collection('followRequests').where('requesterUid', '==', uid).get();
    await deleteSnapshot(requestsSent);

    const requestsReceived = await adminDb.collection('followRequests').where('targetUid', '==', uid).get();
    await deleteSnapshot(requestsReceived);

    // 5. Delete logged activities
    const activitiesSnapshot = await adminDb.collection('activities').where('uid', '==', uid).get();
    await deleteSnapshot(activitiesSnapshot);

    // 6. Delete reviews and their subcollections
    const reviewsSnapshot = await adminDb.collectionGroup('userReviews').where('uid', '==', uid).get();
    for (const doc of reviewsSnapshot.docs) {
      const votesSnapshot = await doc.ref.collection('votes').get();
      await deleteSnapshot(votesSnapshot);
      await doc.ref.delete();
    }

    // 7. Delete claimed username
    if (username) {
      const usernameRef = adminDb.collection('usernames').doc(username);
      await usernameRef.delete();
    }

    // 8. Delete user follows root doc if present
    await adminDb.collection('follows').doc(uid).delete();

    // 9. Delete user document
    await userRef.delete();

    // 10. Delete Auth user account
    await adminAuth.deleteUser(uid);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('Delete user cascade error:', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
