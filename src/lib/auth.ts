import "server-only";

export function isAuthorized(request: Request): boolean {
  const adminKey = process.env.ADMIN_KEY;
  const cronSecret = process.env.CRON_SECRET;
  const headerKey = request.headers.get("x-admin-key");
  const auth = request.headers.get("authorization");

  if (adminKey && headerKey === adminKey) return true;
  if (cronSecret && auth === `Bearer ${cronSecret}`) return true;
  return false;
}
