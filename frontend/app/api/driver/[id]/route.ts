import { NextResponse } from 'next/server';
import { deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const normalizeDriver = (body: Record<string, unknown>) => ({
    nama: String(body.nama || '').trim(),
    platNomor: String(body.platNomor || '').trim().toUpperCase(),
    nomorTelepon: String(body.nomorTelepon || '').trim(),
});

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
    try {
        const driver = normalizeDriver(await request.json());
        if (!driver.nama || !driver.platNomor || !driver.nomorTelepon) {
            return NextResponse.json({ success: false, error: 'Nama, plat nomor, dan nomor telepon wajib diisi' }, { status: 400 });
        }
        if (!/^[0-9+\-\s()]+$/.test(driver.nomorTelepon)) {
            return NextResponse.json({ success: false, error: 'Format nomor telepon tidak valid' }, { status: 400 });
        }

        const { id } = await props.params;
        await updateDoc(doc(db, 'drivers', id), { ...driver, updatedAt: serverTimestamp() });
        return NextResponse.json({ success: true, message: 'Data driver berhasil diperbarui' });
    } catch (error: any) {
        console.error('Error updating driver:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function DELETE(_request: Request, props: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await props.params;
        await deleteDoc(doc(db, 'drivers', id));
        return NextResponse.json({ success: true, message: 'Data driver berhasil dihapus' });
    } catch (error: any) {
        console.error('Error deleting driver:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}