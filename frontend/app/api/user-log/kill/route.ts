import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { cookies } from 'next/headers';
import { decryptSession } from '@/lib/session';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('auth_session')?.value;
    const session = sessionToken ? decryptSession(sessionToken) : null;
    
    if (!session || String(session.user.role).toLowerCase() !== 'admin') {
      return NextResponse.json({ success: false, error: 'Akses ditolak: Hanya admin yang dapat melakukan kill session' }, { status: 403 });
    }

    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID tidak valid' }, { status: 400 });
    }

    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
      is_active: false,
      session_token: null
    });

    return NextResponse.json({ success: true, message: 'Session berhasil diakhiri' });
  } catch (error: any) {
    console.error('Failed to kill session:', error);
    return NextResponse.json({ success: false, error: error.message || 'Terjadi kesalahan internal' }, { status: 500 });
  }
}
