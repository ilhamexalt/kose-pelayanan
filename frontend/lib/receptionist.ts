import { db } from './firebase';
import { collection, getDocs } from 'firebase/firestore';

export async function getReceptionistUser(): Promise<{ nip: string; nama: string }> {
  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const role = String(data.role || '').trim().toLowerCase();
      // Cari role reseptionis / receptionist
      if (role.includes('reseptionis') || role.includes('receptionist')) {
        const nip = String(data.nip || data.username || data.email || 'Reseptionis');
        const nama = String(data.nama || 'Reseptionis');
        return { nip, nama };
      }
    }
  } catch (error) {
    console.error('Error fetching receptionist user:', error);
  }

  // Fallback default jika di DB belum ada role reseptionis
  return { nip: 'Reseptionis', nama: 'Reseptionis' };
}
