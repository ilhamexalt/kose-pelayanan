import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decryptSession } from '@/lib/session';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('auth_session')?.value;
    
    if (sessionToken) {
      const payload = decryptSession(sessionToken);
      if (payload && payload.user?.id) {
        const userDocRef = doc(db, 'users', payload.user.id);
        await updateDoc(userDocRef, {
          is_active: false,
          session_token: null
        }).catch(err => console.error("Failed to clear DB session", err));
      }
    }

    cookieStore.delete('auth_session');
    
    return NextResponse.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
