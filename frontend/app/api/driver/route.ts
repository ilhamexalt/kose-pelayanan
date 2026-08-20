import { NextResponse } from 'next/server';
import { addDoc, collection, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const normalizeDriver = (body: Record<string, unknown>) => ({
    nama: String(body.nama || '').trim(),
    platNomor: String(body.platNomor || '').trim().toUpperCase(),
    nomorTelepon: String(body.nomorTelepon || '').trim(),
});

const validateDriver = (driver: ReturnType<typeof normalizeDriver>) => {
    if (!driver.nama || !driver.platNomor || !driver.nomorTelepon) {
        return 'Nama, plat nomor, dan nomor telepon wajib diisi';
    }
    if (!/^[0-9+\-\s()]+$/.test(driver.nomorTelepon)) {
        return 'Format nomor telepon tidak valid';
    }
    return null;
};

export async function GET() {
    try {
        const snapshot = await getDocs(collection(db, 'drivers'));
        const data = snapshot.docs
            .map((driver) => ({ id: driver.id, ...driver.data() }))
            .sort((first: any, second: any) => String(first.nama).localeCompare(String(second.nama), 'id'));
        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        console.error('Error fetching drivers:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const driver = normalizeDriver(await request.json());
        const validationError = validateDriver(driver);
        if (validationError) {
            return NextResponse.json({ success: false, error: validationError }, { status: 400 });
        }

        await addDoc(collection(db, 'drivers'), {
            ...driver,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        return NextResponse.json({ success: true, message: 'Driver berhasil ditambahkan' });
    } catch (error: any) {
        console.error('Error creating driver:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}