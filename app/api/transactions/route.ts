import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { getSql } from '@/lib/db';
import { handleApiError, jsonError, jsonOk } from '@/lib/api';
import type { Transaction } from '@/lib/types';

const createSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.number().positive('Сумма должна быть больше 0.'),
  categoryId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Укажите дату.'),
  note: z.string().max(120).optional().default(''),
});

function mapTx(row: Record<string, unknown>): Transaction {
  return {
    id: String(row.id),
    type: row.type as Transaction['type'],
    amount: Number(row.amount),
    categoryId: String(row.category_id),
    date: String(row.date).slice(0, 10),
    note: String(row.note || ''),
  };
}

export async function GET() {
  try {
    const user = await requireUser();
    const sql = getSql();
    const rows = await sql`
      SELECT id, type, amount, category_id, date, note
      FROM transactions
      WHERE user_id = ${user.id}
      ORDER BY date DESC, created_at DESC
    `;
    return jsonOk({ transactions: rows.map(mapTx) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = createSchema.safeParse(await request.json());
    if (!body.success) {
      return jsonError(body.error.issues[0]?.message || 'Неверные данные');
    }

    const sql = getSql();
    const category = await sql`
      SELECT id, type FROM categories
      WHERE id = ${body.data.categoryId} AND user_id = ${user.id}
      LIMIT 1
    `;
    if (!category[0] || category[0].type !== body.data.type) {
      return jsonError('Выберите категорию.');
    }

    const rows = await sql`
      INSERT INTO transactions (user_id, type, amount, category_id, date, note)
      VALUES (
        ${user.id},
        ${body.data.type},
        ${body.data.amount},
        ${body.data.categoryId},
        ${body.data.date},
        ${body.data.note.trim()}
      )
      RETURNING id, type, amount, category_id, date, note
    `;
    return jsonOk({ transaction: mapTx(rows[0]) }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
