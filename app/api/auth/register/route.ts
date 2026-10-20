import { z } from 'zod';
import { getSql } from '@/lib/db';
import {
  createSessionToken,
  hashPassword,
  seedDefaultCategories,
  setSessionCookie,
} from '@/lib/auth';
import { handleApiError, jsonError, jsonOk } from '@/lib/api';

const schema = z.object({
  email: z.string().email('Введите корректный email'),
  password: z.string().min(6, 'Пароль не короче 6 символов'),
});

export async function POST(request: Request) {
  try {
    const body = schema.safeParse(await request.json());
    if (!body.success) {
      return jsonError(body.error.issues[0]?.message || 'Неверные данные');
    }

    const email = body.data.email.trim().toLowerCase();
    const passwordHash = await hashPassword(body.data.password);
    const sql = getSql();

    const existing = await sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`;
    if (existing[0]) {
      return jsonError('Такой email уже зарегистрирован', 409);
    }

    const rows = await sql`
      INSERT INTO users (email, password_hash)
      VALUES (${email}, ${passwordHash})
      RETURNING id, email, currency
    `;
    const user = rows[0];
    await seedDefaultCategories(String(user.id));
    const token = await createSessionToken(String(user.id));
    await setSessionCookie(token);

    return jsonOk({
      user: {
        id: String(user.id),
        email: String(user.email),
        currency: String(user.currency),
      },
    }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
