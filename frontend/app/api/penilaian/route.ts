import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, getDoc, doc } from 'firebase/firestore';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { pelayananId, layananName, kebersihan, keramahan, solusi, informasi } = body;

    if (!pelayananId || !kebersihan || !keramahan || !solusi || !informasi) {
      return NextResponse.json(
        { success: false, error: 'Data survei tidak lengkap' },
        { status: 400 }
      );
    }

    const docRef = await addDoc(collection(db, 'penilaian'), {
      pelayananId,
      layananName: layananName || 'Layanan Umum',
      kebersihan,
      keramahan,
      solusi,
      informasi,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return NextResponse.json({ success: true, id: docRef.id });
  } catch (error: any) {
    console.error('Error adding survey:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to submit survey' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const penilaianRef = collection(db, 'penilaian');
    const q = query(penilaianRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    const surveys = [];
    const pelayananCache = new Map();

    for (const d of snapshot.docs) {
      const data = d.data();
      let namaPegawai = 'Pegawai Tidak Diketahui';

      if (data.pelayananId) {
        if (pelayananCache.has(data.pelayananId)) {
          namaPegawai = pelayananCache.get(data.pelayananId);
        } else {
          try {
            const pelayananDoc = await getDoc(doc(db, 'pelayanan', data.pelayananId));
            if (pelayananDoc.exists()) {
              const pData = pelayananDoc.data();
              namaPegawai = pData.processedBy?.nama || pData.processedBy?.nip || 'Pegawai Tidak Diketahui';
            }
            pelayananCache.set(data.pelayananId, namaPegawai);
          } catch (err) {
            console.error('Error fetching pelayanan for id:', data.pelayananId, err);
          }
        }
      }

      surveys.push({
        id: d.id,
        ...data,
        namaPegawai,
        createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now()
      });
    }

    return NextResponse.json({ success: true, data: surveys });
  } catch (error: any) {
    console.error('Error fetching surveys:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch surveys' },
      { status: 500 }
    );
  }
}
