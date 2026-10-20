import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { getSql } from '@/lib/db';
import { handleApiError, jsonError, jsonOk } from '@/lib/api';
import type { Category } from '@/lib/types';

const createSchema = z.object({
  name: z.string().trim().min(1, 'Введите название.').max(40),
  type: z.enum(['income', 'expense']),
});

function mapCategory(row: Record<string, unknown>): Category {
  return {
    id: String(row.id),
    name: String(row.name),
    type: row.type as Category['type'],
  };
}

export async function GET() {
  try {
    const user = await requireUser();
    const sql = getSql();
    const rows = await sql`
      SELECT id, name, type
      FROM categories
      WHERE user_id = ${user.id}
      ORDER BY type, name
    `;
    return jsonOk({ categories: rows.map(mapCategory) });
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
    const duplicate = await sql`
      SELECT id FROM categories
      WHERE user_id = ${user.id}
        AND type = ${body.data.type}
        AND lower(name) = lower(${body.data.name})
      LIMIT 1
    `;
    if (duplicate[0]) {
      return jsonError('Такая категория уже есть.');
    }

    const rows = await sql`
      INSERT INTO categories (user_id, name, type)
      VALUES (${user.id}, ${body.data.name}, ${body.data.type})
      RETURNING id, name, type
    `;
    return jsonOk({ category: mapCategory(rows[0]) }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
