import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp, where } from 'firebase/firestore';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import { decrypt } from '@/lib/crypto';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { 
      ruang, tanggal, waktuMulai, waktuSelesai, instansi, 
      pesertaInternal, pesertaEksternal, keterangan 
    } = data;

    if (!ruang || !tanggal || !waktuMulai || !waktuSelesai || !instansi) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }

    const meetingRef = collection(db, 'meeting');

    // Cek bentrok jadwal
    const qConflict = query(
      meetingRef, 
      where('ruangan', '==', ruang),
      where('tanggal', '==', tanggal)
    );
    
    const snapshot = await getDocs(qConflict);
    let conflict = null;
    
    snapshot.forEach((doc) => {
      const d = doc.data();
      // Logic overlap
      if (
        (waktuMulai >= d.waktuMulai && waktuMulai < d.waktuSelesai) ||
        (waktuSelesai > d.waktuMulai && waktuSelesai <= d.waktuSelesai) ||
        (waktuMulai <= d.waktuMulai && waktuSelesai >= d.waktuSelesai)
      ) {
        conflict = d;
      }
    });

    if (conflict) {
      return NextResponse.json({ 
        error: 'Conflict', 
        message: `Ruangan ${ruang} pada jam ${(conflict as any).waktuMulai} - ${(conflict as any).waktuSelesai} sudah diisi oleh ${(conflict as any).instansi}.` 
      }, { status: 409 });
    }

    const payload = {
      ruangan: ruang,
      tanggal,
      waktuMulai,
      waktuSelesai,
      instansi,
      pesertaInternal: pesertaInternal || [],
      pesertaEksternal: pesertaEksternal || [],
      keterangan: keterangan || '',
      createdAt: serverTimestamp(),
    };

    await addDoc(meetingRef, payload);

    // Kirim notifikasi WA ke Pramusaji
    try {
      const usersRef = collection(db, 'users');
      const qPramusaji = query(usersRef, where('role', 'in', ['Pramusaji', 'pramusaji', 'PRAMUSAJI']));
      const pramusajiSnapshot = await getDocs(qPramusaji);

      const sumInternal = (pesertaInternal || []).reduce((acc: number, curr: any) => acc + (Number(curr.jumlah) || 0), 0);
      const sumEksternal = (pesertaEksternal || []).reduce((acc: number, curr: any) => acc + (Number(curr.jumlah) || 0), 0);
      const totalPeserta = sumInternal + sumEksternal;
      const messageText = `*Pemberitahuan Jadwal Meeting Baru*\n\n*Ruangan:* ${ruang}\n*Waktu:* ${tanggal} ${waktuMulai} - ${waktuSelesai}\n*Instansi:* ${instansi}\n*Status:* Baru\n*Peserta:* ${totalPeserta} Orang\n*Keterangan:* ${keterangan || '-'}`;

      const waPromises = pramusajiSnapshot.docs.map(async (docSnap) => {
        const userData = docSnap.data();
        if (userData.no_hp) {
          try {
            const phone = decrypt(userData.no_hp);
            if (phone) {
              await sendWhatsAppMessage(phone, messageText);
            }
          } catch (e) {
            console.error('Failed to decrypt phone or send WA for user:', docSnap.id, e);
          }
        }
      });

      await Promise.all(waPromises);
    } catch (waError) {
      console.error('Error retrieving Pramusaji users or sending WA:', waError);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error submitting meeting:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const meetingRef = collection(db, 'meeting');
    const q = query(meetingRef, orderBy('tanggal', 'desc'));
    const snapshot = await getDocs(q);

    const dataArray = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : null
      };
    });
      
    return NextResponse.json({ success: true, data: dataArray });
  } catch (error: any) {
    console.error('Error fetching meetings:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
