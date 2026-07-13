import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { hashPassword } from '@/lib/password';

export async function GET(request: Request) {
  try {
    const adminHeader = request.headers.get('x-admin-nip');
    if (String(adminHeader || '').toLowerCase() !== 'admin') {
      return NextResponse.json({ success: false, error: 'Akses ditolak: Hanya admin yang dapat mengakses data pegawai' }, { status: 403 });
    }

    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    const users = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({ success: true, data: users });
  } catch (error: any) {
    console.error('Error fetching pegawai:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const adminHeader = request.headers.get('x-admin-nip');
    if (String(adminHeader || '').toLowerCase() !== 'admin') {
      return NextResponse.json({ success: false, error: 'Akses ditolak: Hanya admin yang dapat mengubah data pegawai' }, { status: 403 });
    }

    const body = await request.json();
    const { nip, nama, email, username, password } = body;

    if (!password || !nama || !username) {
      return NextResponse.json({ success: false, error: 'Nama, Username, dan Password wajib diisi' }, { status: 400 });
    }

    const nipVal = nip !== undefined && nip !== null && nip !== '' ? Number(nip) : null;
    const docId = nipVal !== null ? String(nipVal) : `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const userRef = doc(db, 'users', docId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      return NextResponse.json({ success: false, error: 'Pegawai dengan NIP tersebut sudah terdaftar' }, { status: 409 });
    }

    const now = new Date().toISOString();
    const adminUser = String(adminHeader || 'admin');
    await setDoc(userRef, {
      nip: nipVal,
      nama: String(nama).trim(),
      email: email ? String(email).trim() : '',
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
