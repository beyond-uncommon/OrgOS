export function verifyCronRequest(request: Request): { authorized: boolean; reason?: string } {
  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { authorized: false, reason: "Missing or malformed Authorization header" };
  }

  const token = authHeader.slice(7);
  const expected = process.env.CRON_SECRET;

  if (!expected) {
    return { authorized: false, reason: "CRON_SECRET not configured on server" };
  }

  if (token !== expected) {
    return { authorized: false, reason: "Invalid token" };
  }

  return { authorized: true };
}
