import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { hashPassword } from '@/lib/password';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, nip, newPassword } = body;

    const docId = String(id || nip || '').trim();

    if (!docId || !newPassword) {
      return NextResponse.json({ error: 'NIP/ID dan Password Baru wajib diisi' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Password baru minimal 6 karakter' }, { status: 400 });
    }

    const userRef = doc(db, 'users', docId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return NextResponse.json({ error: 'Akun pegawai tidak ditemukan' }, { status: 404 });
    }

    const now = new Date().toISOString();

    await updateDoc(userRef, {
      password: hashPassword(newPassword),
      update_password: true,
      updated_at: now,
      updated_by: String(nip || docId)
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Password berhasil diperbarui!' 
    });
  } catch (error: any) {
    console.error('Error updating password:', error);
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
