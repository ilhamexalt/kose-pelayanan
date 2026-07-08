import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const roleParam = searchParams.get('role');

    // Jika request membawa parameter role, berarti untuk kebutuhan validasi akses (bisa diakses non-admin)
    if (roleParam) {
      const roleRef = doc(db, 'permissions', roleParam);
      const roleSnap = await getDoc(roleRef);
      if (roleSnap.exists()) {
        return NextResponse.json({ success: true, data: { id: roleSnap.id, ...roleSnap.data() } });
      }
      return NextResponse.json({ success: true, data: null });
    }

    // Jika tidak ada parameter role, berarti request list semua role (hanya admin)
    const adminHeader = request.headers.get('x-admin-nip');
    if (String(adminHeader || '').toLowerCase() !== 'admin') {
      return NextResponse.json({ success: false, error: 'Akses ditolak: Hanya admin yang dapat mengakses data permission' }, { status: 403 });
    }

    const permsRef = collection(db, 'permissions');
    const snapshot = await getDocs(permsRef);
    const permissions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({ success: true, data: permissions });
  } catch (error: any) {
    console.error('Error fetching permissions:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const adminHeader = request.headers.get('x-admin-nip');
    if (String(adminHeader || '').toLowerCase() !== 'admin') {
      return NextResponse.json({ success: false, error: 'Akses ditolak: Hanya admin yang dapat menambah data permission' }, { status: 403 });
    }

    const body = await request.json();
    const { role, menu_permissions } = body;

    if (!role) {
      return NextResponse.json({ success: false, error: 'Nama Role wajib diisi' }, { status: 400 });
    }

    const roleId = String(role).trim();
    if (roleId.toLowerCase() === 'admin') {
      return NextResponse.json({ success: false, error: 'Role admin adalah peran utama dan tidak dapat dimanipulasi secara manual' }, { status: 400 });
    }

    const roleRef = doc(db, 'permissions', roleId);
    const roleSnap = await getDoc(roleRef);

    if (roleSnap.exists()) {
      return NextResponse.json({ success: false, error: 'Role tersebut sudah terdaftar' }, { status: 409 });
    }

    const now = new Date().toISOString();
    await setDoc(roleRef, {
      role: roleId,
      menu_permissions: menu_permissions || {},
      created_at: now,
      updated_at: now
    });

    return NextResponse.json({ success: true, message: 'Role berhasil ditambahkan' });
  } catch (error: any) {
    console.error('Error creating permission:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
