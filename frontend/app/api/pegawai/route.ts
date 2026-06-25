import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';

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
    const { nip, nama, email, password } = body;

    if (!nip || !password || !nama) {
      return NextResponse.json({ success: false, error: 'NIP, Nama, dan Password wajib diisi' }, { status: 400 });
    }

    const userRef = doc(db, 'users', String(nip));
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      return NextResponse.json({ success: false, error: 'Pegawai dengan NIP tersebut sudah terdaftar' }, { status: 409 });
    }

    await setDoc(userRef, {
      nip: String(nip),
      nama: String(nama),
      email: String(email || ''),
      password: String(password)
    });

    return NextResponse.json({ success: true, message: 'Pegawai berhasil ditambahkan' });
  } catch (error: any) {
    console.error('Error creating pegawai:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
