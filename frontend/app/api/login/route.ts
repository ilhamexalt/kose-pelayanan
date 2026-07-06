import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { verifyPassword } from '@/lib/password';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const identifier = String(data.identifier || data.email || data.username || data.nip || '').trim();
    const password = String(data.password || '');

    if (!identifier || !password) {
      return NextResponse.json({ error: 'NIP / Username / Email dan Password wajib diisi' }, { status: 400 });
    }

    let userFound: any = null;

    const userDocRef = doc(db, 'users', identifier);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      userFound = { id: userDocSnap.id, ...userDocSnap.data() };
    } else {
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

    if (userFound) {
      if (verifyPassword(password, userFound.password)) {
        return NextResponse.json({ 
          success: true, 
          user: { 
            id: userFound.id || String(userFound.nip),
            nip: userFound.nip, 
            nama: userFound.nama, 
            email: userFound.email || '',
            username: userFound.username || String(userFound.nip),
            role: userFound.role || 'Pegawai',
            update_password: Boolean(userFound.update_password)
          } 
        });
      } else {
        return NextResponse.json({ error: 'Password salah' }, { status: 401 });
      }
    } else {
      return NextResponse.json({ error: 'Akun (NIP / Username / Email) tidak ditemukan' }, { status: 404 });
    }
  } catch (error: any) {
    console.error('Error during login:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
