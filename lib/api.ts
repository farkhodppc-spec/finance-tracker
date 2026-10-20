import { NextResponse } from 'next/server';

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function handleApiError(error: unknown) {
  if (error instanceof Error && error.message === 'UNAUTHORIZED') {
    return jsonError('Нужно войти в аккаунт', 401);
  }
  console.error(error);
  return jsonError('Ошибка сервера', 500);
}
