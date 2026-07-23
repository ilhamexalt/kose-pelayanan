import { encrypt, decrypt } from './crypto';

// Token expiration time in seconds (120 minutes)
export const SESSION_EXPIRES_IN = 120 * 60;

export interface SessionPayload {
  user: {
    id: string;
    nip: string | number;
    nama: string;
    email: string;
    username: string;
    role: string;
    update_password: boolean;
  };
  session_token?: string;
  expiresAt: number;
}

/**
 * Mengenkripsi payload menjadi token string
 */
export function encryptSession(payload: SessionPayload): string {
  const dataString = JSON.stringify(payload);
  return encrypt(dataString);
}

/**
 * Mendekripsi token string menjadi payload. Mengembalikan null jika token tidak valid atau kadaluarsa.
 */
export function decryptSession(token: string): SessionPayload | null {
  try {
    const decryptedStr = decrypt(token);
    if (!decryptedStr) return null;
    
    const payload = JSON.parse(decryptedStr) as SessionPayload;
    
    // Verifikasi kadaluarsa
    if (Date.now() > payload.expiresAt) {
      return null;
    }
    
    return payload;
  } catch (error) {
    console.error('Failed to decrypt session:', error);
    return null;
  }
}
