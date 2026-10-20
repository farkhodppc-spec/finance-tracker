import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { getSql } from '@/lib/db';
import { handleApiError, jsonError, jsonOk } from '@/lib/api';
import type { Category } from '@/lib/types';

const updateSchema = z.object({
  name: z.string().trim().min(1, 'Введите название.').max(40),
});

function mapCategory(row: Record<string, unknown>): Category {
  return {
    id: String(row.id),
    name: String(row.name),
    type: row.type as Category['type'],
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
    const current = await sql`
      SELECT id, name, type FROM categories
      WHERE id = ${id} AND user_id = ${user.id}
      LIMIT 1
    `;
    if (!current[0]) {
      return jsonError('Категория не найдена.', 404);
    }

    const duplicate = await sql`
      SELECT id FROM categories
      WHERE user_id = ${user.id}
        AND type = ${current[0].type}
        AND lower(name) = lower(${body.data.name})
        AND id <> ${id}
      LIMIT 1
    `;
    if (duplicate[0]) {
      return jsonError('Такая категория уже есть.');
    }

    const rows = await sql`
      UPDATE categories
      SET name = ${body.data.name}
      WHERE id = ${id} AND user_id = ${user.id}
      RETURNING id, name, type
    `;
    return jsonOk({ category: mapCategory(rows[0]) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const sql = getSql();

    const linked = await sql`
      SELECT id FROM transactions
      WHERE user_id = ${user.id} AND category_id = ${id}
      LIMIT 1
    `;
    if (linked[0]) {
      return jsonError('Сначала удалите или измените операции этой категории.');
    }

    const rows = await sql`
      DELETE FROM categories
      WHERE id = ${id} AND user_id = ${user.id}
      RETURNING id
    `;
    if (!rows[0]) {
      return jsonError('Категория не найдена.', 404);
    }
    return jsonOk({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
