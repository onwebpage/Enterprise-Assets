import jwt from "jsonwebtoken";

const ADMIN_JWT_SECRET =
  (process.env.SESSION_SECRET ?? "dev-secret-change-in-production") + "-admin-v1";
const ADMIN_JWT_EXPIRES_IN = "8h";

export interface AdminJwtPayload {
  adminId: number;
  username: string;
  isAdmin: true;
}

export function signAdminToken(payload: Omit<AdminJwtPayload, "isAdmin">): string {
  return jwt.sign({ ...payload, isAdmin: true }, ADMIN_JWT_SECRET, {
    expiresIn: ADMIN_JWT_EXPIRES_IN,
  });
}

export function verifyAdminToken(token: string): AdminJwtPayload {
  return jwt.verify(token, ADMIN_JWT_SECRET) as AdminJwtPayload;
}
