import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDocs, collection, query, where, updateDoc } from 'firebase/firestore';
import { hashPassword } from '@/lib/password';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { userId, otp, newPassword } = data;

    if (!userId || !otp || !newPassword) {
      return NextResponse.json({ error: 'User ID, OTP, dan Password Baru wajib diisi' }, { status: 400 });
    }

    // Cari OTP yang valid di koleksi password_resets
    const resetsRef = collection(db, 'password_resets');
    const q = query(
      resetsRef, 
      where('userId', '==', userId),
      where('otp', '==', String(otp)),
      where('used', '==', false)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return NextResponse.json({ error: 'Kode OTP tidak valid atau salah' }, { status: 400 });
    }

    // Temukan dokumen OTP yang belum kedaluwarsa
    const now = new Date().getTime();
    let validDoc = null;

    for (const d of querySnapshot.docs) {
      const resetData = d.data();
      if (resetData.expiresAt > now) {
        validDoc = d;
        break;
      }
    }

    if (!validDoc) {
      return NextResponse.json({ error: 'Kode OTP sudah kedaluwarsa. Silakan request ulang.' }, { status: 400 });
    }

    // OTP Valid!
    // 1. Update password di tabel users
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      password: hashPassword(newPassword)
    });

    // 2. Tandai OTP sebagai sudah digunakan
    await updateDoc(doc(db, 'password_resets', validDoc.id), {
      used: true
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Password berhasil diubah. Silakan login dengan password baru.' 
    });

  } catch (error: any) {
    console.error('Error verifying OTP:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
