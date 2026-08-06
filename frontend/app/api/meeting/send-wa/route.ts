import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import { decrypt } from '@/lib/crypto';
import dayjs from 'dayjs';
import 'dayjs/locale/id';

dayjs.locale('id');

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { 
      ruangan, tanggal, waktuMulai, waktuSelesai, instansi, 
      pesertaInternal, pesertaEksternal, keterangan, isUpdate 
    } = data;

    const usersRef = collection(db, 'users');
    const qPramusaji = query(usersRef, where('role', 'in', ['Pramusaji', 'pramusaji', 'PRAMUSAJI']));
    const pramusajiSnapshot = await getDocs(qPramusaji);

    const sumInternal = (pesertaInternal || []).reduce((acc: number, curr: any) => acc + (Number(curr.jumlah) || 0), 0);
    const sumEksternal = (pesertaEksternal || []).reduce((acc: number, curr: any) => acc + (Number(curr.jumlah) || 0), 0);
    const totalPeserta = sumInternal + sumEksternal;
    
    const title = isUpdate ? '📢 PEMBARUAN JADWAL MEETING 📢' : '📢 PEMBERITAHUAN JADWAL MEETING BARU 📢';
    const status = isUpdate ? 'Diperbarui' : 'Baru';
    const formattedDate = dayjs(tanggal).format('dddd, D MMMM YYYY');

    const messageText = `${title}

Halo tim,
Berikut adalah detail jadwal meeting terbaru yang perlu dipersiapkan:

🏢 Instansi: ${instansi}
📍 Ruangan: ${ruangan}
📅 Tanggal: ${formattedDate}
⏰ Waktu: ${waktuMulai} - ${waktuSelesai}
👥 Jumlah Peserta: ${totalPeserta > 0 ? `${totalPeserta} Orang` : '-'}
🆕 Status: ${status}

📌 Keterangan:
${keterangan || 'Mohon bantuannya untuk menyiapkan ruangan beserta konsumsi sebelum waktu meeting dimulai.'}

Terima kasih atas perhatian dan kerja samanya! 🙏`;

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

    return NextResponse.json({ success: true, message: 'WhatsApp sent successfully' });
  } catch (error: any) {
    console.error('Error sending WA for meeting:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
