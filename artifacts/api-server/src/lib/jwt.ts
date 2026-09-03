import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.SESSION_SECRET ?? "dev-secret-change-in-production";
const JWT_EXPIRES_IN = "24h";

export interface JwtPayload {
  userId: number;
  email: string;
  roleId: number | null;
  orgId: number | null;
  tenantId?: number | null;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}
