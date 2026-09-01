import jwt, { type SignOptions } from "jsonwebtoken";

const ADMIN_JWT_SECRET =
  (process.env.SESSION_SECRET ?? "dev-secret-change-in-production") + "-admin-v1";
const ADMIN_JWT_EXPIRES_IN = "8h";

export interface AdminJwtPayload {
  adminId: number;
  username: string;
  sessionVersion: number;
  isAdmin: true;
}

export function signAdminToken(payload: Omit<AdminJwtPayload, "isAdmin">, expiresIn: number | string = ADMIN_JWT_EXPIRES_IN): string {
  return jwt.sign({ ...payload, isAdmin: true }, ADMIN_JWT_SECRET, {
    expiresIn: expiresIn as SignOptions["expiresIn"],
  });
}

export function verifyAdminToken(token: string): AdminJwtPayload {
  return jwt.verify(token, ADMIN_JWT_SECRET) as AdminJwtPayload;
}
