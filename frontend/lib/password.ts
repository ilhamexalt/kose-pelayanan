import bcrypt from 'bcryptjs';

export function hashPassword(password: string): string {
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(password, salt);
}

export function verifyPassword(plainPassword: string, dbPassword: string): boolean {
  if (!dbPassword) return false;
  if (dbPassword.startsWith('$2a$') || dbPassword.startsWith('$2b$') || dbPassword.startsWith('$2y$')) {
    return bcrypt.compareSync(plainPassword, dbPassword);
  }
  return plainPassword === dbPassword;
}
