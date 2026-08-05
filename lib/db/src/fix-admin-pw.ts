import { sql } from "drizzle-orm";
import { db } from "./index.ts";
import bcrypt from "bcryptjs";

async function main() {
  // Check current hash
  const rows = await db.execute<{ id: number; username: string; password_hash: string }>(
    sql`SELECT id, username, password_hash FROM super_admins`
  );
  for (const r of rows) {
    console.log(`id=${r.id} username=${r.username}`);
    const ok = await bcrypt.compare("admin123", r.password_hash);
    console.log(`  bcrypt.compare("admin123", hash) = ${ok}`);
    
    // Also test Admin@1234
    const ok2 = await bcrypt.compare("Admin@1234", r.password_hash);
    console.log(`  bcrypt.compare("Admin@1234", hash) = ${ok2}`);
    
    if (!ok) {
      // Reset to admin123
      const newHash = await bcrypt.hash("admin123", 10);
      await db.execute(sql`UPDATE super_admins SET password_hash=${newHash} WHERE id=${r.id}`);
      console.log(`  ✓ Reset password to admin123, new hash: ${newHash.substring(0, 20)}...`);
    }
  }
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
