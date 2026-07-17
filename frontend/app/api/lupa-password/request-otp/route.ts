import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { decrypt } from '@/lib/crypto';
import { sendWhatsAppTemplate } from '@/lib/whatsapp';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const identifier = String(data.identifier || data.username || data.nip || '').trim();

    if (!identifier) {
      return NextResponse.json({ error: 'NIP / Username wajib diisi' }, { status: 400 });
    }

    let userFound: any = null;

    // Cek dengan ID langsung (sebagai NIP/Username)
    const userDocRef = doc(db, 'users', identifier);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      userFound = { id: userDocSnap.id, ...userDocSnap.data() };
    } else {
      // Cari di koleksi jika ID tidak cocok
      const usersRef = collection(db, 'users');
      const querySnapshot = await getDocs(usersRef);
      
      const numId = Number(identifier);
      const matchedDoc = querySnapshot.docs.find((d) => {
        const u = d.data();
        return (
          String(u.username || '').toLowerCase() === identifier.toLowerCase() ||
          String(u.email || '').toLowerCase() === identifier.toLowerCase() ||
          String(u.nip || '') === identifier ||
          (!isNaN(numId) && u.nip === numId)
        );
      });

      if (matchedDoc) {
        userFound = { id: matchedDoc.id, ...matchedDoc.data() };
      }
    }

    if (!userFound) {
      return NextResponse.json({ error: 'Akun tidak ditemukan' }, { status: 404 });
    }

    if (!userFound.no_hp) {
      return NextResponse.json({ error: 'Akun ini tidak memiliki nomor HP yang terdaftar. Hubungi admin.' }, { status: 400 });
    }

    // Dekripsi nomor HP
    const phone = decrypt(userFound.no_hp);
    if (!phone) {
      return NextResponse.json({ error: 'Gagal membaca nomor HP. Hubungi admin.' }, { status: 500 });
    }

    // Generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Simpan OTP ke database (bisa expired 5 menit)
    const resetsRef = collection(db, 'password_resets');
    await addDoc(resetsRef, {
      userId: userFound.id,
      otp: otp,
      createdAt: serverTimestamp(),
      expiresAt: new Date().getTime() + 5 * 60 * 1000, // 5 menit dari sekarang
      used: false
    });

    // Kirim pesan WhatsApp menggunakan variabel {{otp}} sesuai arahan
    const vars: Record<string, string> = {
      "otp": otp
    };

    const waResult = await sendWhatsAppTemplate(phone, 'info-otp', vars);

    if (!waResult) {
      return NextResponse.json({ error: 'Gagal mengirim OTP ke WhatsApp. Coba lagi.' }, { status: 500 });
    }

    // Berhasil
    return NextResponse.json({ 
      success: true, 
      message: 'OTP berhasil dikirim ke WhatsApp Anda',
      userId: userFound.id, // berguna untuk verifikasi selanjutnya
      phoneMasked: phone.slice(0, 4) + '****' + phone.slice(-3)
    });

  } catch (error: any) {
    console.error('Error requesting OTP:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
