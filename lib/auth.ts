import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { getSql } from './db';
import type { User } from './types';

const COOKIE_NAME = 'finance_session';
const DEFAULT_CATEGORIES = [
  { name: 'Зарплата', type: 'income' },
  { name: 'Подработка', type: 'income' },
  { name: 'Подарки', type: 'income' },
  { name: 'Еда', type: 'expense' },
  { name: 'Транспорт', type: 'expense' },
  { name: 'Жильё', type: 'expense' },
  { name: 'Развлечения', type: 'expense' },
] as const;

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error('AUTH_SECRET is not set');
  }
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(userId: string) {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(getSecret());
}

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export async function getSessionUserId(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<User | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;
  const sql = getSql();
  const rows = await sql`
    SELECT id, email, currency
    FROM users
    WHERE id = ${userId}
    LIMIT 1
  `;
  if (!rows[0]) return null;
  return {
    id: String(rows[0].id),
    email: String(rows[0].email),
    currency: String(rows[0].currency),
  };
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('UNAUTHORIZED');
  }
  return user;
}

export async function seedDefaultCategories(userId: string) {
  const sql = getSql();
  for (const category of DEFAULT_CATEGORIES) {
    await sql`
      INSERT INTO categories (user_id, name, type)
      VALUES (${userId}, ${category.name}, ${category.type})
      ON CONFLICT (user_id, type, name) DO NOTHING
    `;
  }
}

export { COOKIE_NAME };
