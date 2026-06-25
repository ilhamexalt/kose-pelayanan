import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { email, password } = data; // 'email' field here acts as either nip or email

    if (!email || !password) {
      return NextResponse.json({ error: 'NIP/Email dan Password wajib diisi' }, { status: 400 });
    }

    let userFound: any = null;

    // Coba cari berdasarkan NIP (berasumsi NIP dijadikan document ID saat import)
    const userDocRef = doc(db, 'users', String(email));
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      userFound = { id: userDocSnap.id, ...userDocSnap.data() };
    } else {
      // Jika tidak ada di doc ID, cari berdasarkan field email
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const firstDoc = querySnapshot.docs[0];
        userFound = { id: firstDoc.id, ...firstDoc.data() };
      }
    }

    if (userFound) {
      if (userFound.password === password) {
        // Autentikasi berhasil
        return NextResponse.json({ 
          success: true, 
          user: { nip: userFound.nip, nama: userFound.nama, email: userFound.email } 
        });
      } else {
        return NextResponse.json({ error: 'Password salah' }, { status: 401 });
      }
    } else {
      return NextResponse.json({ error: 'Data Pegawai tidak ditemukan' }, { status: 404 });
    }
  } catch (error: any) {
    console.error('Error during login:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
