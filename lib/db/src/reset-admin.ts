import { sql } from "drizzle-orm";
import { db } from "./index.ts";
import bcrypt from "bcryptjs";

const hash = await bcrypt.hash("admin123", 10);
await db.execute(sql`UPDATE super_admins SET password_hash=${hash} WHERE username='admin'`);
console.log("✓ Password reset to admin123");
process.exit(0);
