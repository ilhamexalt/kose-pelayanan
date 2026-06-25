import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

export async function POST(request: Request) {
  try {
    const adminHeader = request.headers.get('x-admin-nip');
    if (String(adminHeader || '').toLowerCase() !== 'admin') {
      return NextResponse.json({ success: false, error: 'Akses ditolak: Hanya admin yang dapat import pegawai' }, { status: 403 });
    }

    const data = await request.json();
    if (!Array.isArray(data)) {
      return NextResponse.json({ error: 'Data harus berupa array' }, { status: 400 });
    }

    let count = 0;
    for (const user of data) {
      if (user.nip && user.password) {
        const userRef = doc(db, 'users', String(user.nip));
        await setDoc(userRef, {
          nip: String(user.nip),
          nama: user.nama || '',
          email: user.email || '',
          password: String(user.password)
        });
        count++;
      }
    }

    return NextResponse.json({ success: true, message: `${count} data pegawai berhasil diimport` });
  } catch (error: any) {
    console.error('Error importing pegawai:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
