import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import { decrypt } from '@/lib/crypto';

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

    await updateDoc(docRef, {
      ...data,
      updatedAt: Date.now()
    });

    const updatedData = { ...existingData, ...data };

    // Kirim notifikasi WA ke Pramusaji untuk update jadwal
    try {
      const usersRef = collection(db, 'users');
      const qPramusaji = query(usersRef, where('role', 'in', ['Pramusaji', 'pramusaji', 'PRAMUSAJI']));
      const pramusajiSnapshot = await getDocs(qPramusaji);

      const totalPeserta = (updatedData.pesertaInternal?.length || 0) + (updatedData.pesertaEksternal?.length || 0);
      const messageText = `*Pembaruan Jadwal Meeting*\n\n*Ruangan:* ${updatedData.ruangan}\n*Waktu:* ${updatedData.tanggal} ${updatedData.waktuMulai} - ${updatedData.waktuSelesai}\n*Instansi:* ${updatedData.instansi}\n*Status:* Diperbarui\n*Peserta:* ${totalPeserta} Orang\n*Keterangan:* ${updatedData.keterangan || '-'}`;

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
    await deleteDoc(meetingRef);

    return NextResponse.json({ success: true, message: 'Meeting deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting meeting:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
