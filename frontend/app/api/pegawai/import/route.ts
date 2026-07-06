import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { hashPassword } from '@/lib/password';

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
    const now = new Date().toISOString();
    const adminUser = String(adminHeader || 'admin');

    for (const user of data) {
      if (user.nip && user.nama && user.password) {
        const nipNumber = Number(user.nip) || 0;
        const userRef = doc(db, 'users', String(user.nip));
        await setDoc(userRef, {
          nip: nipNumber,
          nama: String(user.nama).trim(),
          email: user.email ? String(user.email).trim() : '',
          username: user.username ? String(user.username).trim() : String(user.nip),
          password: hashPassword(String(user.password)),
          role: user.role ? String(user.role).trim() : 'Pegawai',
          update_password: false,
          created_at: now,
          created_by: adminUser,
          updated_at: now,
          updated_by: adminUser
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
