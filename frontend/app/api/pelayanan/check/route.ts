import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const nik = searchParams.get('nik');

    if (!nik) {
      return NextResponse.json({ error: 'NIK diperlukan' }, { status: 400 });
    }

    const pelayananRef = collection(db, 'pelayanan');
    const q = query(pelayananRef, where('nik', '==', nik), limit(1));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const data = snapshot.docs[0].data();
      return NextResponse.json({ 
        success: true, 
        found: true, 
        data: {
          nama: data.nama,
          phone: data.phone
        } 
      });
    }

    return NextResponse.json({ success: true, found: false });
  } catch (error: any) {
    console.error('Error checking NIK:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
