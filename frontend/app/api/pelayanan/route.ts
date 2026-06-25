import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp, limit } from 'firebase/firestore';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { nik, nama, phone, jenis } = data;

    if (!nik || !nama || !phone || !jenis) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }

    const pelayananRef = collection(db, 'pelayanan');
    
    // Get the latest queue number
    const qLatest = query(pelayananRef, orderBy('createdAt', 'desc'), limit(1));
    const snapshot = await getDocs(qLatest);
    let nextNum = 1;
    if (!snapshot.empty) {
      const latestData = snapshot.docs[0].data();
      if (latestData.queueNumber && latestData.queueNumber.startsWith('A-')) {
        const currentNum = parseInt(latestData.queueNumber.split('-')[1], 10);
        if (!isNaN(currentNum)) {
          nextNum = currentNum + 1;
        }
      }
    }
    
    const queueNumber = `A-${nextNum.toString().padStart(3, '0')}`;

    await addDoc(pelayananRef, {
      nik,
      nama,
      phone,
      jenis,
      queueNumber,
      status: 'Antre',
      createdAt: serverTimestamp(),
    });

    return NextResponse.json({ success: true, queueNumber });
  } catch (error: any) {
    console.error('Error submitting pelayanan:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const pelayananRef = collection(db, 'pelayanan');
    const q = query(pelayananRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    const dataArray = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Convert Firestore timestamp to milliseconds if it exists
        createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : null
      };
    });
      
    return NextResponse.json({ success: true, data: dataArray });
  } catch (error: any) {
    console.error('Error fetching pelayanan:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
