import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';

export async function GET(request: Request) {
  try {
    const menusRef = collection(db, 'menus');
    const snapshot = await getDocs(menusRef);
    const menus = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Urutkan berdasarkan created_at atau nama secara manual di frontend/backend
    // Untuk simpel, biarkan frontend yang sort.
    return NextResponse.json({ success: true, data: menus });
  } catch (error: any) {
    console.error('Error fetching menus:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const adminHeader = request.headers.get('x-admin-nip');
    if (String(adminHeader || '').toLowerCase() !== 'admin') {
      return NextResponse.json({ success: false, error: 'Akses ditolak: Hanya admin yang dapat menambahkan menu' }, { status: 403 });
    }

    const body = await request.json();
    const { nama, url, is_parent, parent_id } = body;

    if (!nama || !url) {
      return NextResponse.json({ success: false, error: 'Nama menu dan URL wajib diisi' }, { status: 400 });
    }

    // Generate random doc ID
    const docId = `menu_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const menuRef = doc(db, 'menus', docId);

    const now = new Date().toISOString();
    const adminUser = String(adminHeader || 'admin');

    await setDoc(menuRef, {
      nama: String(nama).trim(),
      url: String(url).trim(),
      is_parent: Boolean(is_parent),
      parent_id: parent_id ? String(parent_id) : null,
      created_at: now,
      created_by: adminUser,
      updated_at: now,
      updated_by: adminUser
    });

    return NextResponse.json({ success: true, message: 'Menu berhasil ditambahkan' });
  } catch (error: any) {
    console.error('Error creating menu:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
