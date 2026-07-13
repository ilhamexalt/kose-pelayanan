import crypto from 'crypto';

// Gunakan kunci dari environment, atau gunakan fallback untuk development.
// Pada production, HARUS mengatur ENCRYPTION_KEY di .env.local dengan kunci 32-byte (64 karakter hex).
// Rekomendasi kunci yang aman dapat digenerate dengan: crypto.randomBytes(32).toString('hex')
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '12345678901234567890123456789012'; // 32 chars (256 bit)
const IV_LENGTH = 16;

/**
 * Mengenkripsi teks menggunakan AES-256-CBC
 */
export function encrypt(text: string): string {
  if (!text) return text;
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  } catch (err) {
    console.error("Encryption error", err);
    return text;
  }
}

/**
 * Mendekripsi teks yang dienkripsi menggunakan AES-256-CBC
 */
export function decrypt(text: string): string {
  if (!text || !text.includes(':')) return text;
  try {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (err) {
    console.error("Decryption error", err);
    return text;
  }
}

/**
 * Menyamarkan (masking) sebagian karakter untuk ditampilkan di UI
 */
export function maskData(text: string, type: 'nik' | 'phone' | 'register' | 'alamat'): string {
  if (!text) return text;
  
  if (type === 'nik') {
    // Tampilkan 4 digit awal dan 4 digit akhir: 3271********9999
    if (text.length >= 16) {
      return text.substring(0, 4) + '*'.repeat(8) + text.substring(text.length - 4);
    }
  } else if (type === 'phone') {
    // Tampilkan 4 digit awal dan 3 digit akhir: 0812****789
    if (text.length >= 10) {
      return text.substring(0, 4) + '*'.repeat(text.length - 7) + text.substring(text.length - 3);
    }
  } else if (type === 'register') {
    // Tampilkan awal dan akhir antrean: A-***
    if (text.length >= 4) {
      return text.substring(0, 2) + '*'.repeat(text.length - 3) + text.substring(text.length - 1);
    }
  } else if (type === 'alamat') {
    if (text.length > 5) {
      return text.substring(0, 5) + '*'.repeat(Math.min(text.length - 5, 10)) + '...';
    }
  }
  
  // Default masking
  return text.substring(0, Math.min(2, text.length)) + '***';
}
