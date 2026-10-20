import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { getSql } from '@/lib/db';
import { handleApiError, jsonError, jsonOk } from '@/lib/api';

const schema = z.object({
  currency: z.string().max(12).optional().default(''),
});

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    const body = schema.safeParse(await request.json());
    if (!body.success) {
      return jsonError(body.error.issues[0]?.message || 'Неверные данные');
    }

    const currency = body.data.currency.trim() || 'сум';
    const sql = getSql();
    const rows = await sql`
      UPDATE users
      SET currency = ${currency}
      WHERE id = ${user.id}
      RETURNING id, email, currency
    `;
    return jsonOk({
      user: {
        id: String(rows[0].id),
        email: String(rows[0].email),
        currency: String(rows[0].currency),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
