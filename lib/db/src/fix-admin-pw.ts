import { sql } from "drizzle-orm";
import { db } from "./index.ts";
import bcrypt from "bcryptjs";

async function main() {
  // Check current hash
  const rows = await db.execute<{ id: number; username: string; password_hash: string }>(
    sql`SELECT id, username, password_hash FROM super_admins`
  );
  for (const r of rows) {
    console.log(`id=${r.id} username=${r.username} passwordHash=${r.password_hash.startsWith("$2") ? "bcrypt" : "unexpected"}`);
  }
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
