import jwt, { type SignOptions } from "jsonwebtoken";

const JWT_SECRET = process.env.SESSION_SECRET ?? "dev-secret-change-in-production";
const JWT_EXPIRES_IN = "24h";

export interface JwtPayload {
  userId: number;
  email: string;
  roleId: number | null;
  orgId: number | null;
  branchId?: number | null;
  tenantId?: number | null;
  sessionVersion?: number;
}

export function signToken(payload: JwtPayload, expiresIn: number | string = JWT_EXPIRES_IN): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: expiresIn as SignOptions["expiresIn"] });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}
