import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp, doc, updateDoc } from 'firebase/firestore';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { nama, kegiatan, tempat, tanggalMulai, tanggalSelesai, jamMulai, jamSelesai, status } = data;

    if (!nama || (Array.isArray(nama) && nama.length === 0) || !kegiatan || !tempat || !tanggalMulai || !tanggalSelesai) {
      return NextResponse.json({ error: 'Nama, kegiatan, tempat, dan tanggal wajib diisi' }, { status: 400 });
    }

    const payload = {
      nama,
      kegiatan,
      tempat,
      tanggalMulai,
      tanggalSelesai,
      jamMulai: jamMulai || '',
      jamSelesai: jamSelesai || '',
      status: status || 'Belum Mulai',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const jadwalRef = collection(db, 'jadwal_pepk_lmst');
    await addDoc(jadwalRef, payload);

    return NextResponse.json({ success: true, message: 'Jadwal berhasil ditambahkan' });
  } catch (error: any) {
    console.error('Error submitting jadwal:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const jadwalRef = collection(db, 'jadwal_pepk_lmst');
    const q = query(jadwalRef);
    const snapshot = await getDocs(q);

    const dataArray = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : null,
        updatedAt: data.updatedAt?.toMillis ? data.updatedAt.toMillis() : null,
      };
    });

    dataArray.sort((a: any, b: any) => {
      const dateA = a.tanggalMulai || '';
      const dateB = b.tanggalMulai || '';
      if (dateA !== dateB) {
        return dateB.localeCompare(dateA);
      }
      const jamA = a.jamMulai || '';
      const jamB = b.jamMulai || '';
      return jamB.localeCompare(jamA);
    });

    return NextResponse.json({ success: true, data: dataArray });
  } catch (error: any) {
    console.error('Error fetching jadwal:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
