import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/firebase/sessions';
import { rateLimit } from '@/lib/rateLimit';
import { adminDb } from '@/../backend/firebaseAdmin';
import { getDeterministicEntryId } from '@/lib/list/entryId';
import { MediaType } from '@/types/media';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
  if (!rateLimit(ip, 60, 60_000)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') as MediaType | null;
  const sourceIdStr = searchParams.get('sourceId');

  if (!type || !sourceIdStr) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  const sourceId = parseInt(sourceIdStr, 10);
  if (isNaN(sourceId)) {
    return NextResponse.json({ error: 'Invalid sourceId' }, { status: 400 });
  }

  try {
    const entryId = getDeterministicEntryId(type, sourceId);
    
    // Query items across all lysts for this entry
    const snapshot = await adminDb
      .collectionGroup('items')
      .where('entryId', '==', entryId)
      .get();

    // Filter items belonging to the current user's lysts
    const userLystItems = snapshot.docs.filter((doc) => {
      const path = doc.ref.path;
      return path.startsWith(`users/${user.uid}/`);
    });

    if (userLystItems.length === 0) {
      return NextResponse.json({ success: true, lysts: [] });
    }

    // Fetch the parent Lyst documents in parallel to get their names
    const lystDocsQueries = userLystItems.map(async (doc) => {
      const lystRef = doc.ref.parent.parent;
      if (!lystRef) return null;
      const lystDoc = await lystRef.get();
      if (!lystDoc.exists) return null;
      const data = lystDoc.data();
      return {
        id: lystDoc.id,
        name: data?.name || 'Unnamed Lyst',
      };
    });

    const lysts = (await Promise.all(lystDocsQueries)).filter(Boolean);

    return NextResponse.json({ success: true, lysts });
  } catch (err: unknown) {
    console.error('Error finding lysts by media:', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
