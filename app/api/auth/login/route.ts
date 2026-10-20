import { z } from 'zod';
import { getSql } from '@/lib/db';
import {
  createSessionToken,
  setSessionCookie,
  verifyPassword,
} from '@/lib/auth';
import { handleApiError, jsonError, jsonOk } from '@/lib/api';

const schema = z.object({
  email: z.string().email('Введите корректный email'),
  password: z.string().min(1, 'Введите пароль'),
});

export async function POST(request: Request) {
  try {
    const body = schema.safeParse(await request.json());
    if (!body.success) {
      return jsonError(body.error.issues[0]?.message || 'Неверные данные');
    }

    const email = body.data.email.trim().toLowerCase();
    const sql = getSql();
    const rows = await sql`
      SELECT id, email, currency, password_hash
      FROM users
      WHERE email = ${email}
      LIMIT 1
    `;
    const user = rows[0];
    if (!user) {
      return jsonError('Неверный email или пароль', 401);
    }

    const ok = await verifyPassword(body.data.password, String(user.password_hash));
    if (!ok) {
      return jsonError('Неверный email или пароль', 401);
    }

    const token = await createSessionToken(String(user.id));
    await setSessionCookie(token);

    return jsonOk({
      user: {
        id: String(user.id),
        email: String(user.email),
        currency: String(user.currency),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
