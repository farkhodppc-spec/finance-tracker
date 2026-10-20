import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { getSql } from '@/lib/db';
import { handleApiError, jsonError, jsonOk } from '@/lib/api';
import type { Transaction } from '@/lib/types';

const updateSchema = z.object({
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

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = updateSchema.safeParse(await request.json());
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
      UPDATE transactions
      SET
        type = ${body.data.type},
        amount = ${body.data.amount},
        category_id = ${body.data.categoryId},
        date = ${body.data.date},
        note = ${body.data.note.trim()}
      WHERE id = ${id} AND user_id = ${user.id}
      RETURNING id, type, amount, category_id, date, note
    `;
    if (!rows[0]) {
      return jsonError('Операция не найдена.', 404);
    }
    return jsonOk({ transaction: mapTx(rows[0]) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const sql = getSql();
    const rows = await sql`
      DELETE FROM transactions
      WHERE id = ${id} AND user_id = ${user.id}
      RETURNING id
    `;
    if (!rows[0]) {
      return jsonError('Операция не найдена.', 404);
    }
    return jsonOk({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
