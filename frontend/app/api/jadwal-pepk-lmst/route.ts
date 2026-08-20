import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, serverTimestamp, doc, getDoc } from 'firebase/firestore';

const hasDriverConflict = (candidate: any, existing: any) => {
  if (!candidate.driverId || candidate.driverId !== existing.driverId) return false;
  const candidateStart = candidate.tanggalMulai || candidate.tanggal;
  const candidateEnd = candidate.tanggalSelesai || candidate.tanggalMulai || candidate.tanggal;
  const existingStart = existing.tanggalMulai || existing.tanggal;
  const existingEnd = existing.tanggalSelesai || existing.tanggalMulai || existing.tanggal;
  const datesOverlap = candidateStart <= existingEnd && existingStart <= candidateEnd;
  const timesOverlap = !candidate.jamMulai || !candidate.jamSelesai || !existing.jamMulai || !existing.jamSelesai ||
    (candidate.jamMulai < existing.jamSelesai && existing.jamMulai < candidate.jamSelesai);
  return datesOverlap && timesOverlap;
};

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { nama, kegiatan, tempat, tanggalMulai, tanggalSelesai, jamMulai, jamSelesai, status, createdBy, driverId } = data;

    if (!nama || (Array.isArray(nama) && nama.length === 0) || !kegiatan || !tempat || !tanggalMulai || !tanggalSelesai || !driverId) {
      return NextResponse.json({ error: 'Nama, kegiatan, tempat, tanggal, dan driver wajib diisi' }, { status: 400 });
    }

    const driverSnapshot = await getDoc(doc(db, 'drivers', driverId));
    if (!driverSnapshot.exists()) {
      return NextResponse.json({ error: 'Driver tidak ditemukan' }, { status: 400 });
    }
    const jadwalSnapshot = await getDocs(collection(db, 'jadwal_pepk_lmst'));
    if (jadwalSnapshot.docs.some((jadwalDoc) => hasDriverConflict(data, jadwalDoc.data()))) {
      return NextResponse.json({ error: 'Driver sudah dibooking pada waktu tersebut' }, { status: 409 });
    }
    const driverData = driverSnapshot.data();

    const payload = {
      nama,
      kegiatan,
      tempat,
      tanggalMulai,
      tanggalSelesai,
      jamMulai: jamMulai || '',
      jamSelesai: jamSelesai || '',
      driverId: driverId || '',
      driverName: driverData.nama || '',
      driverPlatNomor: driverData.platNomor || '',
      status: status || 'Belum Mulai',
      createdBy: createdBy || '',
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
