import { getCurrentUser } from '@/lib/auth';
import { handleApiError, jsonError, jsonOk } from '@/lib/api';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return jsonError('Нужно войти в аккаунт', 401);
    }
    return jsonOk({ user });
  } catch (error) {
    return handleApiError(error);
  }
}
