import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import { decrypt } from '@/lib/crypto';
import dayjs from 'dayjs';
import 'dayjs/locale/id';

dayjs.locale('id');

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Meeting ID required' }, { status: 400 });

    const docRef = doc(db, 'meeting', id);
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
    if (!id) return NextResponse.json({ error: 'Meeting ID required' }, { status: 400 });

    const data = await request.json();
    const docRef = doc(db, 'meeting', id);
    const existingDoc = await getDoc(docRef);
    const existingData = existingDoc.exists() ? existingDoc.data() : {};

    const ruang = data.ruang || data.ruangan || existingData.ruangan;
    const tanggal = data.tanggal || existingData.tanggal;
    const waktuMulai = data.waktuMulai || existingData.waktuMulai;
    const waktuSelesai = data.waktuSelesai || existingData.waktuSelesai;

    if (ruang && tanggal && waktuMulai && waktuSelesai) {
      const meetingRef = collection(db, 'meeting');
      const qConflict = query(
        meetingRef, 
        where('ruangan', '==', ruang),
        where('tanggal', '==', tanggal)
      );
      
      const snapshot = await getDocs(qConflict);
      let conflict = null;
      
      snapshot.forEach((docItem) => {
        if (docItem.id === id) return;
        const d = docItem.data();
        if (waktuMulai < d.waktuSelesai && waktuSelesai > d.waktuMulai) {
          conflict = d;
        }
      });

      if (conflict) {
        return NextResponse.json({ 
          error: 'Conflict', 
          message: `Ruangan ${ruang} pada jam ${(conflict as any).waktuMulai} - ${(conflict as any).waktuSelesai} sudah diisi oleh ${(conflict as any).instansi}.` 
        }, { status: 409 });
      }
    }

    await updateDoc(docRef, {
      ...data,
      updatedAt: Date.now()
    });

    const updatedData = { ...existingData, ...data };



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
      return NextResponse.json({ error: 'Meeting ID required' }, { status: 400 });
    }

    const meetingRef = doc(db, 'meeting', id);
    const meetingSnap = await getDoc(meetingRef);

    if (meetingSnap.exists()) {
      const data = meetingSnap.data();
      
      const sumInternal = (data.pesertaInternal || []).reduce((acc: number, curr: any) => acc + (Number(curr.jumlah) || 0), 0);
      const sumEksternal = (data.pesertaEksternal || []).reduce((acc: number, curr: any) => acc + (Number(curr.jumlah) || 0), 0);
      const totalPeserta = sumInternal + sumEksternal;
      const formattedDate = dayjs(data.tanggal).format('dddd, D MMMM YYYY');

      const messageText = `📢 INFORMASI PEMBATALAN MEETING 📢

Halo tim,
Mohon perhatiannya, jadwal meeting berikut ini DIBATALKAN:

🏢 Instansi: ${data.instansi || '-'}
📍 Ruangan: ${data.ruangan || '-'}
📅 Tanggal: ${formattedDate}
⏰ Waktu: ${data.waktuMulai} - ${data.waktuSelesai}
👥 Jumlah Peserta: ${totalPeserta > 0 ? `${totalPeserta} Orang` : '-'}
❌ Status: Dibatalkan (Cancel)

📌 Keterangan:
Mohon untuk membatalkan persiapan ruangan serta pesanan konsumsi untuk acara tersebut. Ruangan dapat digunakan kembali untuk kebutuhan lain.

Terima kasih atas perhatian dan kerja samanya! 🙏`;

      try {
        const usersRef = collection(db, 'users');
        const qPramusaji = query(usersRef, where('role', 'in', ['Pramusaji', 'pramusaji', 'PRAMUSAJI']));
        const pramusajiSnapshot = await getDocs(qPramusaji);

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
        console.error('Error sending WA for cancelled meeting:', waError);
      }
    }

    await deleteDoc(meetingRef);

    return NextResponse.json({ success: true, message: 'Meeting deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting meeting:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
