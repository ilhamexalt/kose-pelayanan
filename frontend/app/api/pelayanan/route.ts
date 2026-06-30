import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp, limit } from 'firebase/firestore';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { 
      nik, nama, phone, jenis, 
      instansi, keperluan, bertemu, keterangan, 
      jenisDebitur, slikNikNpwp, email,
      pengaduanNik, klasifikasi, sektor, perusahaan, produk, permasalahan, ringkasan 
    } = data;

    if (!nik || !nama || !phone || !jenis) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }

    if (jenis === 'umum' && (!instansi || !keperluan || !bertemu || !keterangan)) {
      return NextResponse.json({ error: 'Formulir Registrasi Tamu tidak lengkap' }, { status: 400 });
    }

    if (jenis === 'slik' && (!jenisDebitur || !slikNikNpwp || !email)) {
      return NextResponse.json({ error: 'Formulir Pelayanan SLIK tidak lengkap' }, { status: 400 });
    }

    if (jenis === 'pengaduan' && (!pengaduanNik || !klasifikasi || !sektor || !perusahaan || !produk || !permasalahan || !ringkasan)) {
      return NextResponse.json({ error: 'Formulir Pelayanan Pengaduan tidak lengkap' }, { status: 400 });
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

    const payload: any = {
      nik,
      nama,
      phone,
      jenis,
      queueNumber,
      status: 'Antre',
      createdAt: serverTimestamp(),
    };

    if (jenis === 'umum') {
      payload.instansi = instansi;
      payload.keperluan = keperluan;
      payload.bertemu = bertemu;
      payload.keterangan = keterangan;
    }

    if (jenis === 'slik') {
      payload.jenisDebitur = jenisDebitur;
      payload.slikNikNpwp = slikNikNpwp;
      payload.email = email;
    }

    if (jenis === 'pengaduan') {
      payload.pengaduanNik = pengaduanNik;
      payload.klasifikasi = klasifikasi;
      payload.sektor = Array.isArray(sektor) ? sektor.join(', ') : (sektor || '');
      payload.perusahaan = perusahaan;
      payload.produk = produk;
      payload.permasalahan = permasalahan;
      payload.ringkasan = ringkasan;
    }

    await addDoc(pelayananRef, payload);

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
