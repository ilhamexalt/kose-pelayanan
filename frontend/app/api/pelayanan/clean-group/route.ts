import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { sendWhatsAppTemplate } from '@/lib/whatsapp';

const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export async function POST(request: Request) {
  try {
    const groupId = process.env.WA_GROUP_JID;
    const templateName = 'info-cleansing';

    if (!groupId) {
      return NextResponse.json(
        { error: 'WA_GROUP_JID tidak dikonfigurasi di .env.local' },
        { status: 500 }
      );
    }

    // 1. Ambil semua data pelayanan di Firestore
    const pelayananRef = collection(db, 'pelayanan');
    const snapshot = await getDocs(pelayananRef);

    const totalDeleted = snapshot.size;

    // 2. Lakukan proses delete massal per chunk 100 dokumen agar stabil
    const docs = snapshot.docs;
    for (let i = 0; i < docs.length; i += 100) {
      const chunk = docs.slice(i, i + 100);
      await Promise.all(
        chunk.map((d) => deleteDoc(doc(db, 'pelayanan', d.id)))
      );
    }

    // 3. Waktu & tanggal dalam WIB (UTC+7)
    const today = new Date();
    const current = new Date(today.getTime() + 7 * 60 * 60 * 1000);

    const hari = DAYS[current.getUTCDay()];
    const tanggal = current.getUTCDate();
    const bulan = MONTHS[current.getUTCMonth()];
    const tahun = current.getUTCFullYear();

    const currentHour = current.getUTCHours();
    let waktu = 'pagi';
    if (currentHour >= 4 && currentHour < 11) {
      waktu = 'pagi';
    } else if (currentHour >= 11 && currentHour < 15) {
      waktu = 'siang';
    } else if (currentHour >= 15 && currentHour < 18) {
      waktu = 'sore';
    } else {
      waktu = 'malam';
    }

    // 4. Siapkan variabel untuk template WhatsApp info-cleansing
    const vars = {
      waktu,
      hari,
      tanggal: tanggal.toString(),
      bulan,
      tahun: tahun.toString(),
      total: totalDeleted.toString(),
      data: totalDeleted.toString(),
      jam: '16.40 WIB',
      content: `Cleansing data pelayanan di jam 16.40 WIB telah berhasil dilakukan. Total data dibersihkan: ${totalDeleted} antrean.`,
    };

    // 5. Kirim notifikasi WhatsApp ke grup menggunakan template info-cleansing
    const success = await sendWhatsAppTemplate(groupId, templateName, vars);

    if (success) {
      return NextResponse.json({
        success: true,
        message: `Cleansing berhasil (total ${totalDeleted} data dihapus) dan notifikasi WA info-cleansing terkirim ke grup.`,
        totalDeleted,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: `Cleansing berhasil (${totalDeleted} data dihapus) namun gagal mengirim pesan melalui WhatsApp API`,
          totalDeleted,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error cleansing pelayanan and sending WA:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  console.log('Cron GET request received for cleansing pelayanan!');
  return POST(request);
}
