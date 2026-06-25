import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const adminHeader = request.headers.get('x-admin-nip');
    if (String(adminHeader || '').toLowerCase() !== 'admin') {
      return NextResponse.json({ success: false, error: 'Akses ditolak: Hanya admin yang dapat mengakses data pegawai' }, { status: 403 });
    }

    const params = await props.params;
    const { id } = params;
    const body = await request.json();
    
    const updateData: any = {};
    if (body.nama !== undefined) updateData.nama = body.nama;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.password !== undefined && body.password !== '') updateData.password = body.password;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: false, error: 'Tidak ada data yang diubah' }, { status: 400 });
    }

    const userRef = doc(db, 'users', id);
    await updateDoc(userRef, updateData);

    return NextResponse.json({ success: true, message: 'Data pegawai berhasil diperbarui' });
  } catch (error: any) {
    console.error('Error updating pegawai:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const adminHeader = request.headers.get('x-admin-nip');
    if (String(adminHeader || '').toLowerCase() !== 'admin') {
      return NextResponse.json({ success: false, error: 'Akses ditolak: Hanya admin yang dapat menghapus pegawai' }, { status: 403 });
    }

    const params = await props.params;
    const { id } = params;

    if (id === 'admin') {
      return NextResponse.json({ success: false, error: 'Akun admin utama tidak boleh dihapus!' }, { status: 403 });
    }

    const userRef = doc(db, 'users', id);
    await deleteDoc(userRef);

    return NextResponse.json({ success: true, message: 'Pegawai berhasil dihapus' });
  } catch (error: any) {
    console.error('Error deleting pegawai:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
