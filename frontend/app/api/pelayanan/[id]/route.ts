import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, deleteField } from 'firebase/firestore';

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const id = params.id;

    const data = await request.json();
    const { status, processedBy } = data;

    if (!status) {
      return NextResponse.json({ error: 'Status tidak boleh kosong' }, { status: 400 });
    }

    const pelayananRef = doc(db, 'pelayanan', id);
    const docSnap = await getDoc(pelayananRef);

    if (!docSnap.exists()) {
      return NextResponse.json({ success: false, error: 'Data antrean tidak ditemukan' }, { status: 404 });
    }

    const currentData = docSnap.data();

    // Race condition guard: If someone else is already processing this item
    if (currentData.status === 'Diproses' && status === 'Diproses') {
      const existingNip = currentData.processedBy?.nip;
      const incomingNip = processedBy?.nip;
      if (existingNip && incomingNip && existingNip !== incomingNip) {
        return NextResponse.json({ 
          success: false, 
          error: `Gagal! Antrean ini baru saja diproses oleh ${currentData.processedBy?.nama || existingNip}` 
        }, { status: 409 });
      }
    }

    // Also prevent modifying items that are locked by someone else
    if (currentData.processedBy && processedBy && currentData.processedBy.nip !== processedBy.nip && currentData.status === 'Diproses') {
      return NextResponse.json({ 
        success: false, 
        error: `Akses ditolak! Antrean sedang diproses oleh ${currentData.processedBy?.nama}` 
      }, { status: 403 });
    }

    const updateData: any = { status };

    if (status === 'Antre') {
      updateData.processedBy = deleteField();
    } else if (processedBy) {
      updateData.processedBy = processedBy;
    }

    await updateDoc(pelayananRef, updateData);

    return NextResponse.json({ success: true, message: 'Status berhasil diperbarui' });
  } catch (error: any) {
    console.error('Error updating pelayanan status:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
