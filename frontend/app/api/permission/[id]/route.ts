import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const adminHeader = request.headers.get('x-admin-nip');
    if (String(adminHeader || '').toLowerCase() !== 'admin') {
      return NextResponse.json({ success: false, error: 'Akses ditolak: Hanya admin yang dapat mengubah permission' }, { status: 403 });
    }

    const { id: roleId } = await params;
    if (!roleId || roleId.toLowerCase() === 'admin') {
      return NextResponse.json({ success: false, error: 'Role admin tidak dapat diubah secara manual' }, { status: 400 });
    }

    const body = await request.json();
    const { menu_permissions } = body;

    const roleRef = doc(db, 'permissions', roleId);
    const roleSnap = await getDoc(roleRef);

    if (!roleSnap.exists()) {
      return NextResponse.json({ success: false, error: 'Role tidak ditemukan' }, { status: 404 });
    }

    await updateDoc(roleRef, {
      menu_permissions: menu_permissions || {},
      updated_at: new Date().toISOString()
    });

    return NextResponse.json({ success: true, message: 'Hak akses berhasil diperbarui' });
  } catch (error: any) {
    console.error('Error updating permission:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const adminHeader = request.headers.get('x-admin-nip');
    if (String(adminHeader || '').toLowerCase() !== 'admin') {
      return NextResponse.json({ success: false, error: 'Akses ditolak: Hanya admin yang dapat menghapus permission' }, { status: 403 });
    }

    const { id: roleId } = await params;
    if (!roleId || roleId.toLowerCase() === 'admin') {
      return NextResponse.json({ success: false, error: 'Role admin tidak dapat dihapus' }, { status: 400 });
    }

    const roleRef = doc(db, 'permissions', roleId);
    const roleSnap = await getDoc(roleRef);

    if (!roleSnap.exists()) {
      return NextResponse.json({ success: false, error: 'Role tidak ditemukan' }, { status: 404 });
    }

    await deleteDoc(roleRef);

    return NextResponse.json({ success: true, message: 'Role berhasil dihapus' });
  } catch (error: any) {
    console.error('Error deleting permission:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
