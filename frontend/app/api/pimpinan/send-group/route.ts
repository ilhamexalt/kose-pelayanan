import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { sendWhatsAppTemplate, sendWhatsAppMessage } from '@/lib/whatsapp';
import { decrypt } from '@/lib/crypto';

const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export async function POST(request: Request) {
  try {
    const templateName = 'info-jadwal-pimpinan';

    // 1. Cari user dengan role Sekretaris di Firestore
    const usersRef = collection(db, 'users');
    const usersSnap = await getDocs(usersRef);

    const sekretarisUsers = usersSnap.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as any))
      .filter(u => (u.role || '').trim().toLowerCase() === 'sekretaris');

    if (sekretarisUsers.length === 0) {
      return NextResponse.json({ 
        error: 'Tidak ada pengguna dengan role Sekretaris ditemukan di sistem' 
      }, { status: 400 });
    }

    const getPhone = (u: any): string => {
      const raw = u.no_hp || u.phone || u.No_HP || u.NoHP || '';
      if (!raw) return '';
      try {
        const dec = decrypt(raw);
        if (dec) return dec;
      } catch (e) {}
      return raw;
    };

    const targetSekretaris = sekretarisUsers
      .map(u => ({ ...u, phoneClean: getPhone(u) }))
      .filter(u => Boolean(u.phoneClean));

    if (targetSekretaris.length === 0) {
      return NextResponse.json({ 
        error: 'Pengguna dengan role Sekretaris ditemukan, tetapi tidak memiliki nomor WhatsApp yang tercatat' 
      }, { status: 400 });
    }

    // 2. Tentukan target hari (H+1 / besok, lewati akhir pekan jika kosong)
    const today = new Date();
    const current = new Date(today.getTime() + (7 * 60 * 60 * 1000));
    
    let targetDate = new Date(current.getTime() + (24 * 60 * 60 * 1000));
    let targetDateStr = targetDate.toISOString().split('T')[0];

    const jadwalRef = collection(db, 'jadwal_pimpinan');
    const snapshot = await getDocs(jadwalRef);
    const allJadwals = snapshot.docs.map(doc => doc.data());

    let jadwals: any[] = [];

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

      targetDate = new Date(targetDate.getTime() + (24 * 60 * 60 * 1000));
      targetDateStr = targetDate.toISOString().split('T')[0];
    }

    if (jadwals.length === 0) {
      return NextResponse.json({ 
        error: `Tidak ada jadwal pimpinan untuk tanggal ${targetDateStr}` 
      }, { status: 400 });
    }

    // 3. Format variabel template info-jadwal-pimpinan: {{nama-kegiatan}}, {{waktu}}, {{lokasi}}
    const hari = DAYS[targetDate.getUTCDay()];
    const tanggal = targetDate.getUTCDate();
    const bulan = MONTHS[targetDate.getUTCMonth()];
    const tahun = targetDate.getUTCFullYear();

    const namaKegiatanStr = jadwals.map((j, i) => {
      const prefix = jadwals.length > 1 ? `${i + 1}. ` : '';
      return `${prefix}${j.kegiatan}`;
    }).join('\n');

    const waktuStr = jadwals.map((j, i) => {
      const prefix = jadwals.length > 1 ? `${i + 1}. ` : '';
      const jamStr = j.jamMulai ? ` (${j.jamMulai} - ${j.jamSelesai || 'Selesai'} WIB)` : '';
      return `${prefix}${hari}, ${tanggal} ${bulan} ${tahun}${jamStr}`;
    }).join('\n');

    const lokasiStr = jadwals.map((j, i) => {
      const prefix = jadwals.length > 1 ? `${i + 1}. ` : '';
      return `${prefix}${j.tempat}`;
    }).join('\n');

    const vars = {
      'nama-kegiatan': namaKegiatanStr,
      'waktu': waktuStr,
      'lokasi': lokasiStr
    };

    let sentCount = 0;
    const errors: string[] = [];

    // 4. Kirim WhatsApp ke semua sekretaris
    for (const sekr of targetSekretaris) {
      const phone = sekr.phoneClean;
      let success = await sendWhatsAppTemplate(phone, templateName, vars);

      if (!success) {
        console.warn(`Template WA ${templateName} gagal dikirim ke ${phone}, mencoba fallback pesan teks biasa...`);
        const fallbackText = `*Informasi Jadwal Pimpinan OJK Provinsi Banten*\n\n*Kegiatan:*\n${namaKegiatanStr}\n\n*Waktu:*\n${waktuStr}\n\n*Lokasi:*\n${lokasiStr}\n\nTerima kasih.`;
        success = await sendWhatsAppMessage(phone, fallbackText);
      }

      if (success) {
        sentCount++;
      } else {
        errors.push(`Gagal mengirim ke ${sekr.nama || phone}`);
      }
    }

    if (sentCount > 0) {
      return NextResponse.json({ 
        success: true, 
        message: `Jadwal pimpinan berhasil dikirim via WhatsApp ke ${sentCount} Sekretaris` 
      });
    } else {
      return NextResponse.json({ 
        error: `Gagal mengirim pesan melalui WhatsApp API (${errors.join(', ')})` 
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Error sending whatsapp to sekretaris:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
