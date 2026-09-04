import jwt, { type SignOptions } from "jsonwebtoken";

const sessionSecret = process.env.SESSION_SECRET;
const ADMIN_JWT_SECRET = sessionSecret ? `${sessionSecret}-admin-v1` : null;
const ADMIN_JWT_EXPIRES_IN = "8h";

export interface AdminJwtPayload {
  adminId: number;
  username: string;
  sessionVersion: number;
  isAdmin: true;
}

export function signAdminToken(payload: Omit<AdminJwtPayload, "isAdmin">, expiresIn: number | string = ADMIN_JWT_EXPIRES_IN): string {
  if (!ADMIN_JWT_SECRET) throw new Error("SESSION_SECRET is required to sign admin sessions.");
  return jwt.sign({ ...payload, isAdmin: true }, ADMIN_JWT_SECRET, {
    expiresIn: expiresIn as SignOptions["expiresIn"],
  });
}

export function verifyAdminToken(token: string): AdminJwtPayload {
  if (!ADMIN_JWT_SECRET) throw new Error("SESSION_SECRET is required to verify admin sessions.");
  return jwt.verify(token, ADMIN_JWT_SECRET) as AdminJwtPayload;
}
