import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const adminHeader = request.headers.get('x-admin-nip');
    if (String(adminHeader || '').toLowerCase() !== 'admin') {
      return NextResponse.json({ success: false, error: 'Akses ditolak: Hanya admin yang dapat mengubah menu' }, { status: 403 });
    }

    const params = await props.params;
    const { id } = params;
    const body = await request.json();
    
    const updateData: any = {};
    if (body.nama !== undefined) updateData.nama = String(body.nama).trim();
    if (body.url !== undefined) updateData.url = String(body.url).trim();
    if (body.is_parent !== undefined) updateData.is_parent = Boolean(body.is_parent);
    if (body.parent_id !== undefined) updateData.parent_id = body.parent_id ? String(body.parent_id) : null;
    if (body.urutan !== undefined) updateData.urutan = Number(body.urutan) || 0;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: false, error: 'Tidak ada data yang diubah' }, { status: 400 });
    }

    updateData.updated_at = new Date().toISOString();
    updateData.updated_by = String(adminHeader || 'admin');

    const menuRef = doc(db, 'menus', id);
    await updateDoc(menuRef, updateData);

    return NextResponse.json({ success: true, message: 'Data menu berhasil diperbarui' });
  } catch (error: any) {
    console.error('Error updating menu:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const adminHeader = request.headers.get('x-admin-nip');
    if (String(adminHeader || '').toLowerCase() !== 'admin') {
      return NextResponse.json({ success: false, error: 'Akses ditolak: Hanya admin yang dapat menghapus menu' }, { status: 403 });
    }

    const params = await props.params;
    const { id } = params;

    const menuRef = doc(db, 'menus', id);
    await deleteDoc(menuRef);

    return NextResponse.json({ success: true, message: 'Menu berhasil dihapus' });
  } catch (error: any) {
    console.error('Error deleting menu:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
