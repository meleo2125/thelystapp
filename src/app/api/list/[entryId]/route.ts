import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/firebase/sessions';
import { getListEntry, upsertListEntry, deleteListEntry } from '@/../backend/db';
import { updateEntrySchema } from '@/lib/validation/list';

interface RouteContext {
  params: Promise<{ entryId: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { entryId } = await params;

  try {
    const existing = await getListEntry(user.uid, entryId);
    if (!existing) {
      return NextResponse.json({ success: true, data: null });
    }
    return NextResponse.json({ success: true, data: existing });
  } catch (error) {
    console.error('Error fetching list entry:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PATCH(

  request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { entryId } = await params;

  try {
    const existing = await getListEntry(user.uid, entryId);
    if (!existing) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateEntrySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const updated = await upsertListEntry(user.uid, entryId, {
      ...existing,
      ...parsed.data,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating list entry:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { entryId } = await params;

  try {
    const existing = await getListEntry(user.uid, entryId);
    if (!existing) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    await deleteListEntry(user.uid, entryId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting list entry:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
