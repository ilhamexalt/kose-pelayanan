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

    // Get current date in UTC+7
    const today = new Date();
    const current = new Date(today.getTime() + (7 * 60 * 60 * 1000));
    
    let targetDate = new Date(current.getTime() + (24 * 60 * 60 * 1000));
    let targetDateStr = targetDate.toISOString().split('T')[0];

    // Fetch schedules
    const jadwalRef = collection(db, 'jadwal_pepk_lmst');
    const snapshot = await getDocs(jadwalRef);
    const allJadwals = snapshot.docs.map(doc => doc.data());

    let jadwals: any[] = [];

    // Filter schedules for targetDate, skip weekends if empty
    while (true) {
      const dayOfWeek = targetDate.getUTCDay();
      const isWeekend = dayOfWeek === 6 || dayOfWeek === 0;

      jadwals = allJadwals.filter(j => {
        const start = j.tanggalMulai || j.tanggal;
        const end = j.tanggalSelesai || j.tanggalMulai || j.tanggal;
        return start <= targetDateStr && targetDateStr <= end;
      });

      if (jadwals.length > 0 || !isWeekend) {
        break;
      }

      // If it's a weekend and no schedules, skip to next day
      targetDate = new Date(targetDate.getTime() + (24 * 60 * 60 * 1000));
      targetDateStr = targetDate.toISOString().split('T')[0];
    }

    if (jadwals.length === 0) {
      return NextResponse.json({ error: `Tidak ada jadwal untuk tanggal ${targetDateStr}` }, { status: 400 });
    }

    // Format variables
    const hari = DAYS[targetDate.getUTCDay()];
    const tanggal = targetDate.getUTCDate();
    const bulan = MONTHS[targetDate.getUTCMonth()];
    const tahun = targetDate.getUTCFullYear();

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

    // Menentukan waktu (pagi/siang/sore/malam) berdasarkan jam saat ini (WIB)
    const currentHour = new Date(today.getTime() + (7 * 60 * 60 * 1000)).getUTCHours();
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

    const vars = {
      waktu,
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

export async function GET(request: Request) {
  console.log("Cron GET request received!");
  const authHeader = request.headers.get('authorization');
  console.log("Auth header:", authHeader ? "Present" : "Missing");
  return POST(request);
}
