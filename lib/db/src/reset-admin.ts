import { sql } from "drizzle-orm";
import { db } from "./index.ts";
import bcrypt from "bcryptjs";

const username = process.env.SUPER_ADMIN_USERNAME?.trim();
const password = process.env.SUPER_ADMIN_PASSWORD;
if (!username || !password) throw new Error("Set SUPER_ADMIN_USERNAME and SUPER_ADMIN_PASSWORD in the secure environment before resetting an admin.");
if (password.length < 12) throw new Error("SUPER_ADMIN_PASSWORD must be at least 12 characters.");
const hash = await bcrypt.hash(password, 12);
await db.execute(sql`UPDATE super_admins SET password_hash=${hash}, session_version=session_version + 1, updated_at=NOW() WHERE username=${username}`);
console.log("✓ Super admin password reset without printing credentials.");
process.exit(0);
