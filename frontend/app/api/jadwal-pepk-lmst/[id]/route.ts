import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, doc, getDoc, getDocs, updateDoc, deleteDoc } from 'firebase/firestore';

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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const docRef = doc(db, 'jadwal_pepk_lmst', id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: { id: docSnap.id, ...docSnap.data() } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const data = await request.json();
    const docRef = doc(db, 'jadwal_pepk_lmst', id);

    if (!data.driverId) {
      return NextResponse.json({ error: 'Driver wajib dipilih' }, { status: 400 });
    }
    const driverSnapshot = await getDoc(doc(db, 'drivers', data.driverId));
    if (!driverSnapshot.exists()) {
      return NextResponse.json({ error: 'Driver tidak ditemukan' }, { status: 400 });
    }
    const jadwalSnapshot = await getDocs(collection(db, 'jadwal_pepk_lmst'));
    if (jadwalSnapshot.docs.some((jadwalDoc) => jadwalDoc.id !== id && hasDriverConflict(data, jadwalDoc.data()))) {
      return NextResponse.json({ error: 'Driver sudah dibooking pada waktu tersebut' }, { status: 409 });
    }
    const driverData = driverSnapshot.data();

    await updateDoc(docRef, {
      ...data,
      driverName: driverData.nama || '',
      driverPlatNomor: driverData.platNomor || '',
      updatedAt: Date.now()
    });

    return NextResponse.json({ success: true, message: 'Updated successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    const docRef = doc(db, 'jadwal_pepk_lmst', id);
    await deleteDoc(docRef);

    return NextResponse.json({ success: true, message: 'Deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting jadwal:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
