import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { sendWhatsAppTemplate } from '@/lib/whatsapp';

const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export async function POST(request: Request) {
  try {
    const groupId = process.env.WA_GROUP_JID;
    const templateName = process.env.WA_TEMPLATE_NAME || 'jadwal-pepk'; // Use env or fallback

    if (!groupId) {
      return NextResponse.json({ error: 'WA_GROUP_JID tidak dikonfigurasi di .env.local' }, { status: 500 });
    }

    // Get tomorrow's date
    const today = new Date();
    // Use UTC+7
    const tomorrow = new Date(today.getTime() + (7 * 60 * 60 * 1000) + (24 * 60 * 60 * 1000));
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Fetch schedules for tomorrow
    const jadwalRef = collection(db, 'jadwal_pepk_lmst');
    // NOTE: Since Firebase queries on string can be tricky if not exactly equal, we fetch all and filter, or just query where
    const q = query(jadwalRef, where('tanggal', '==', tomorrowStr));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return NextResponse.json({ error: 'Tidak ada jadwal untuk esok hari' }, { status: 400 });
    }

    // Sort by timestamp or just return them
    const jadwals = snapshot.docs.map(doc => doc.data());

    // Format variables
    const hari = DAYS[tomorrow.getUTCDay()];
    const tanggal = tomorrow.getUTCDate();
    const bulan = MONTHS[tomorrow.getUTCMonth()];
    const tahun = tomorrow.getUTCFullYear();

    const PEGAWAI_OPTIONS: Record<string, string> = {
      "DKA": "Pak Dendy",
      "RFB": "Pak Rija",
      "DS": "Mba Savira",
      "SUW": "Mba Riyanti",
      "TAD": "Pak Aria",
      "AIM": "Pak Aried",
      "RE": "Mba Reni",
      "AR": "Pak Audi",
      "MFF": "Mas Fikri",
    };

    // Construct the list
    const kegiatanList = jadwals.map((j, i) => {
      // Map names if possible, otherwise use original
      let names = '';
      if (Array.isArray(j.nama)) {
        names = j.nama.map((n: string) => PEGAWAI_OPTIONS[n] || n).join(', ');
      } else if (j.nama) {
        names = PEGAWAI_OPTIONS[j.nama] || j.nama;
      }

      let timeStr = '';
      if (j.jamMulai && j.jamSelesai) {
        timeStr = `${j.jamMulai} - ${j.jamSelesai} WIB`;
      } else if (j.jamMulai) {
        timeStr = `${j.jamMulai} WIB`;
      } else if (j.jamSelesai) {
        timeStr = `${j.jamSelesai} WIB`;
      }

      const tempatStr = j.tempat ? ` / ${j.tempat}` : '';
      const timePart = timeStr ? ` - ${timeStr}` : '';

      return `${i + 1}. ${names} - ${j.kegiatan}${timePart}${tempatStr}`;
    }).join('\n');

    const vars = {
      hari,
      tanggal: tanggal.toString(),
      bulan,
      tahun: tahun.toString(),
      content: kegiatanList // Maps to {{content}} in the OpenWA template
    };

    // Send WhatsApp Template Message
    const success = await sendWhatsAppTemplate(groupId, templateName, vars);

    if (success) {
      return NextResponse.json({ success: true, message: 'Pesan berhasil dikirim ke grup via template' });
    } else {
      return NextResponse.json({ error: 'Gagal mengirim pesan melalui WhatsApp API' }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Error sending group whatsapp:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
