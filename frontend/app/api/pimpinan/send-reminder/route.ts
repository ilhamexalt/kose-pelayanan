import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { sendWhatsAppTemplate, sendWhatsAppMessage } from '@/lib/whatsapp';
import { decrypt } from '@/lib/crypto';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);

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

    // 2. Cari jadwal pimpinan HARI INI (WIB / UTC+7)
    const nowWIB = dayjs().utcOffset(7);
    const todayStr = nowWIB.format('YYYY-MM-DD');

    const jadwalRef = collection(db, 'jadwal_pimpinan');
    const snapshot = await getDocs(jadwalRef);
    const allJadwals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

    const todayJadwals = allJadwals.filter(j => {
      const start = j.tanggalMulai || j.tanggal;
      const end = j.tanggalSelesai || j.tanggalMulai || j.tanggal;
      return start <= todayStr && todayStr <= end;
    });

    if (todayJadwals.length === 0) {
      return NextResponse.json({ 
        success: true,
        message: `Tidak ada jadwal pimpinan untuk hari ini (${todayStr})` 
      });
    }

    // 3. Filter jadwal yang jamMulai-nya min 1 jam dari sekarang (antara 45 - 75 menit) & belum diingatkan
    let remindedCount = 0;
    const remindedIds: string[] = [];
    const errors: string[] = [];

    for (const j of todayJadwals) {
      if (j.reminderSent) continue;
      if (!j.jamMulai) continue;

      const [hourStr, minStr] = j.jamMulai.split(':');
      const schedHour = parseInt(hourStr, 10);
      const schedMin = parseInt(minStr, 10);
      if (isNaN(schedHour) || isNaN(schedMin)) continue;

      const schedTimeWIB = nowWIB.hour(schedHour).minute(schedMin).second(0);
      const diffMinutes = schedTimeWIB.diff(nowWIB, 'minute');

      // Cek apakah jadwal dimulai sekitar 1 jam lagi (antara 45 - 75 menit ke depan)
      if (diffMinutes >= 45 && diffMinutes <= 75) {
        const dateObj = new Date(Date.now() + (7 * 60 * 60 * 1000));
        const hari = DAYS[dateObj.getUTCDay()];
        const tanggal = dateObj.getUTCDate();
        const bulan = MONTHS[dateObj.getUTCMonth()];
        const tahun = dateObj.getUTCFullYear();

        const jamStr = j.jamMulai ? ` (${j.jamMulai} - ${j.jamSelesai || 'Selesai'} WIB)` : '';
        const waktuStr = `${hari}, ${tanggal} ${bulan} ${tahun}${jamStr}`;
        const namaKegiatanStr = `[PENGINGAT 1 JAM LAGI] ${j.kegiatan}`;
        const lokasiStr = j.tempat || '-';

        const vars = {
          'nama-kegiatan': namaKegiatanStr,
          'waktu': waktuStr,
          'lokasi': lokasiStr
        };

        let sentSuccessForSchedule = false;

        for (const sekr of targetSekretaris) {
          const phone = sekr.phoneClean;
          let success = await sendWhatsAppTemplate(phone, templateName, vars);

          if (!success) {
            const names = Array.isArray(j.nama) ? j.nama.join(', ') : (j.nama || '-');
            const fallbackText = `*PENGINGAT (1 JAM LAGI): Jadwal Pimpinan OJK Provinsi Banten*\n\n*Kegiatan:*\n${j.kegiatan}\n\n*Waktu:*\n${waktuStr}\n\n*Lokasi:*\n${lokasiStr}\n\n*Pimpinan:*\n${names}\n\nTerima kasih.`;
            success = await sendWhatsAppMessage(phone, fallbackText);
          }

          if (success) {
            sentSuccessForSchedule = true;
          } else {
            errors.push(`Gagal mengingatkan jadwal "${j.kegiatan}" ke ${sekr.nama || phone}`);
          }
        }

        if (sentSuccessForSchedule) {
          const docRef = doc(db, 'jadwal_pimpinan', j.id);
          await updateDoc(docRef, {
            reminderSent: true,
            reminderSentAt: Date.now()
          });
          remindedCount++;
          remindedIds.push(j.id);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Proses pengingat (H-1 Jam) selesai. Terkirim untuk ${remindedCount} agenda pimpinan.`,
      remindedIds,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error: any) {
    console.error('Error sending reminder to sekretaris:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return POST(request);
}
