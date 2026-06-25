import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

export async function GET() {
  try {
    const adminRef = doc(db, 'users', 'admin');
    await setDoc(adminRef, {
      nip: 'admin',
      nama: 'Administrator',
      password: 'admin',
      email: 'admin@ojk.go.id'
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Akun admin berhasil dibuat. Silakan login dengan NIP: admin, Password: admin' 
    });
  } catch (error: any) {
    console.error('Error creating admin:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
