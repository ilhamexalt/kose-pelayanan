import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decryptSession } from '@/lib/session';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('auth_session')?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = decryptSession(sessionToken);

    if (!payload || !payload.user?.id) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
    }

    const userDocRef = doc(db, 'users', payload.user.id);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const userData = userDocSnap.data();
    if (userData.is_active === false || userData.session_token !== payload.session_token) {
      // Session has been killed or superceded
      cookieStore.delete('auth_session');
      return NextResponse.json({ error: 'Session killed or expired' }, { status: 401 });
    }

    // Refresh critical fields from DB so session is not stale
    payload.user.update_password = Boolean(userData.update_password);

    return NextResponse.json({ user: payload.user });
  } catch (error) {
    console.error('Error in /api/auth/me:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
