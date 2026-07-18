import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { hashPassword } from '@/lib/password';
import { encrypt, decrypt } from '@/lib/crypto';
import { cookies } from 'next/headers';
import { decryptSession } from '@/lib/session';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('auth_session')?.value;
    const session = sessionToken ? decryptSession(sessionToken) : null;
    if (!session || String(session.user.role).toLowerCase() !== 'admin') {
      return NextResponse.json({ success: false, error: 'Akses ditolak: Hanya admin yang dapat mengakses data pegawai' }, { status: 403 });
    }

    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    const users = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        no_hp: data.no_hp ? decrypt(data.no_hp) : ''
      };
    });

    return NextResponse.json({ success: true, data: users });
  } catch (error: any) {
    console.error('Error fetching pegawai:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('auth_session')?.value;
    const session = sessionToken ? decryptSession(sessionToken) : null;
    if (!session || String(session.user.role).toLowerCase() !== 'admin') {
      return NextResponse.json({ success: false, error: 'Akses ditolak: Hanya admin yang dapat mengubah data pegawai' }, { status: 403 });
    }

    const body = await request.json();
    const { nip, nama, email, username, password, no_hp } = body;

    if (!password || !nama || !username || !no_hp) {
      return NextResponse.json({ success: false, error: 'Nama, Username, Password, dan No HP wajib diisi' }, { status: 400 });
    }

    const nipVal = nip !== undefined && nip !== null && nip !== '' ? Number(nip) : null;
    const docId = nipVal !== null ? String(nipVal) : `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const userRef = doc(db, 'users', docId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      return NextResponse.json({ success: false, error: 'Pegawai dengan NIP tersebut sudah terdaftar' }, { status: 409 });
    }

    const now = new Date().toISOString();
    const adminUser = String(session.user.nip);
    await setDoc(userRef, {
      nip: nipVal,
      nama: String(nama).trim(),
      email: email ? String(email).trim() : '',
      no_hp: encrypt(String(no_hp).trim()),
      username: username ? String(username).trim() : String(nipVal || ''),
      password: hashPassword(String(password)),
      role: body.role ? String(body.role).trim() : 'Pegawai',
      update_password: false,
      created_at: now,
      created_by: adminUser,
      updated_at: now,
      updated_by: adminUser
    });

    return NextResponse.json({ success: true, message: 'Pegawai berhasil ditambahkan' });
  } catch (error: any) {
    console.error('Error creating pegawai:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
