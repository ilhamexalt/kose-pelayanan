import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp, limit, where } from 'firebase/firestore';
import { encrypt, maskData, decrypt } from '@/lib/crypto';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { 
      nik, nama, alamat, phone, jenis, 
      instansi, keperluan, bertemu, keterangan, 
      jenisDebitur, slikNikNpwp, email,
      pengaduanNik, klasifikasi, sektor, perusahaan, produk, permasalahan, ringkasan 
    } = data;

    if (!nik || !nama || !alamat || !phone || !jenis) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }

    if (!/^\d{16}$/.test(nik)) {
      return NextResponse.json({ error: 'NIK utama harus berupa 16 digit angka' }, { status: 400 });
    }

    if (jenis === 'umum' && (!instansi || !keperluan || !bertemu || !keterangan)) {
      return NextResponse.json({ error: 'Formulir Registrasi Tamu tidak lengkap' }, { status: 400 });
    }

    if (jenis === 'slik') {
      if (!jenisDebitur || !slikNikNpwp || !email) {
        return NextResponse.json({ error: 'Formulir Pelayanan SLIK tidak lengkap' }, { status: 400 });
      }
      if (jenisDebitur !== 'Badan Usaha' && !/^\d{16}$/.test(slikNikNpwp)) {
        return NextResponse.json({ error: 'NIK Debitur SLIK harus berupa 16 digit angka' }, { status: 400 });
      }
      if (jenisDebitur === 'Badan Usaha' && !/^\d{15,16}$/.test(slikNikNpwp)) {
        return NextResponse.json({ error: 'NPWP Badan Usaha harus berupa 15 atau 16 digit angka' }, { status: 400 });
      }
    }

    if (jenis === 'pengaduan') {
      if (!pengaduanNik || !klasifikasi || !sektor || !perusahaan || !produk || !permasalahan || !ringkasan) {
        return NextResponse.json({ error: 'Formulir Pelayanan Pengaduan tidak lengkap' }, { status: 400 });
      }
      if (!/^\d{16}$/.test(pengaduanNik)) {
        return NextResponse.json({ error: 'NIK Pengaduan harus berupa 16 digit angka' }, { status: 400 });
      }
    }

    const pelayananRef = collection(db, 'pelayanan');
    
    let prefix = 'A';
    if (jenis === 'slik') prefix = 'A';
    else if (jenis === 'pengaduan') prefix = 'B';
    else if (jenis === 'umum') prefix = 'C';

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const q = query(pelayananRef, where('createdAt', '>=', startOfDay));
    const snapshot = await getDocs(q);
    let maxNum = 0;
    
    snapshot.forEach((doc) => {
      const d = doc.data();
      const rawQueueNumber = d.queueNumber_raw || d.queueNumber; // Fallback for old data
      
      if (rawQueueNumber && typeof rawQueueNumber === 'string') {
        const qn = rawQueueNumber.trim().toUpperCase();
        if (qn.startsWith(`${prefix}-`) || (qn.startsWith(prefix) && /^[A-Z]\d+$/.test(qn))) {
          const numStr = qn.replace(/^[A-Z]-?/, '');
          const numPart = parseInt(numStr, 10);
          if (!isNaN(numPart) && numPart > maxNum) {
            maxNum = numPart;
          }
        }
      }
    });

    const nextNum = maxNum + 1;
    const queueNumber = `${prefix}-${nextNum.toString().padStart(3, '0')}`;

    const payload: any = {
      nik: maskData(nik, 'nik'),
      nik_encrypted: encrypt(nik),
      nama,
      alamat: maskData(alamat, 'alamat'),
      alamat_encrypted: encrypt(alamat),
      phone: maskData(phone, 'phone'),
      phone_encrypted: encrypt(phone),
      jenis,
      queueNumber: maskData(queueNumber, 'register'),
      queueNumber_encrypted: encrypt(queueNumber),
      queueNumber_raw: queueNumber, // keeping raw for logic if needed, but masking display
      status: jenis === 'umum' ? 'Selesai' : 'Antre',
      createdAt: serverTimestamp(),
    };

    if (jenis === 'umum') {
      payload.instansi = instansi;
      payload.keperluan = keperluan;
      payload.bertemu = bertemu;
      payload.keterangan = keterangan;
      payload.processedBy = { nip: 'sistem', nama: 'Sistem' };
    }

    if (jenis === 'slik') {
      payload.jenisDebitur = jenisDebitur;
      payload.slikNikNpwp = maskData(slikNikNpwp, 'nik');
      payload.slikNikNpwp_encrypted = encrypt(slikNikNpwp);
      payload.email = email;
    }

    if (jenis === 'pengaduan') {
      payload.pengaduanNik = maskData(pengaduanNik, 'nik');
      payload.pengaduanNik_encrypted = encrypt(pengaduanNik);
      payload.klasifikasi = klasifikasi;
      payload.sektor = Array.isArray(sektor) ? sektor.join(', ') : (sektor || '');
      payload.perusahaan = perusahaan;
      payload.produk = produk;
      payload.permasalahan = permasalahan;
      payload.ringkasan = ringkasan;
    }

    await addDoc(pelayananRef, payload);

    return NextResponse.json({ success: true, queueNumber: queueNumber });
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
      
      if (data.nik_encrypted) data.nik = decrypt(data.nik_encrypted);
      if (data.phone_encrypted) data.phone = decrypt(data.phone_encrypted);
      if (data.alamat_encrypted) data.alamat = decrypt(data.alamat_encrypted);
      if (data.queueNumber_encrypted) data.queueNumber = decrypt(data.queueNumber_encrypted);
      if (data.slikNikNpwp_encrypted) data.slikNikNpwp = decrypt(data.slikNikNpwp_encrypted);
      if (data.pengaduanNik_encrypted) data.pengaduanNik = decrypt(data.pengaduanNik_encrypted);

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
