import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { cookies } from 'next/headers';
import { decryptSession } from '@/lib/session';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('auth_session')?.value;
    const session = sessionToken ? decryptSession(sessionToken) : null;
    
    if (!session || String(session.user.role).toLowerCase() !== 'admin') {
      return NextResponse.json({ success: false, error: 'Akses ditolak: Hanya admin yang dapat mengakses data user log' }, { status: 403 });
    }

    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    const users = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        nip: data.nip,
        nama: data.nama,
        role: data.role,
        is_active: Boolean(data.is_active),
        last_login: data.last_login || null,
      };
    });

    return NextResponse.json({ success: true, data: users });
  } catch (error: any) {
    console.error('Failed to fetch user logs:', error);
    return NextResponse.json({ success: false, error: error.message || 'Terjadi kesalahan internal' }, { status: 500 });
  }
}
