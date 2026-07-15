import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { hashPassword } from '@/lib/password';
import { encrypt } from '@/lib/crypto';

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
      if (user.nama && user.username && user.password && user.role && user.no_hp) {
        const nipVal = user.nip !== undefined && user.nip !== null && user.nip !== '' ? Number(user.nip) : null;
        const docId = nipVal !== null ? String(nipVal) : `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const userRef = doc(db, 'users', docId);
        await setDoc(userRef, {
          nip: nipVal,
          nama: String(user.nama).trim(),
          email: user.email ? String(user.email).trim() : '',
          no_hp: encrypt(String(user.no_hp).trim()),
          username: String(user.username).trim(),
          password: hashPassword(String(user.password)),
          role: String(user.role).trim(),
          update_password: user.update_password !== undefined ? Boolean(user.update_password) : false,
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
