/**
 * Normalize permission module keys to match canonical RBAC keys.
 *
 * This script updates existing permissions.module values to use the canonical
 * keys defined in rbac.ts MODULE_ALIASES, ensuring consistent permission matching.
 *
 * Run with: npx tsx scripts/normalize-permission-modules.ts
 */
import { pool } from "@workspace/db";
import { canonicalModuleKey } from "../src/lib/rbac";

async function main() {
  console.log("🔍 Checking permissions table for module key mismatches...\n");

  try {
    // Get all distinct module values from permissions
    const result = await pool.query<{ module: string; count: number }>(
      `SELECT module, COUNT(*)::int as count 
       FROM permissions 
       WHERE module IS NOT NULL 
       GROUP BY module 
       ORDER BY module`
    );

    const modules = result.rows;
    console.log(`Found ${modules.length} distinct module keys in permissions table:\n`);

    const updates: Array<{ oldKey: string; newKey: string; count: number }> = [];

    for (const { module, count } of modules) {
      const canonical = canonicalModuleKey(module);
      
      if (canonical !== module.toLowerCase()) {
        console.log(`  ⚠️  "${module}" → "${canonical}" (${count} rows)`);
        updates.push({ oldKey: module, newKey: canonical, count });
      } else {
        console.log(`  ✓  "${module}" is already canonical (${count} rows)`);
      }
    }

    if (updates.length === 0) {
      console.log("\n✅ All permission module keys are already canonical. No updates needed.");
      await pool.end();
      return;
    }

    console.log(`\n📝 Found ${updates.length} module keys that need normalization.`);
    console.log("   Total rows to update:", updates.reduce((sum, u) => sum + u.count, 0));
    
    // Perform updates
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      
      for (const { oldKey, newKey, count } of updates) {
        const result = await client.query(
          `UPDATE permissions SET module = $1 WHERE module = $2`,
          [newKey, oldKey]
        );
        console.log(`  ✓ Updated "${oldKey}" → "${newKey}" (${result.rowCount} rows)`);
      }
      
      await client.query("COMMIT");
      console.log("\n✅ Successfully normalized all permission module keys!");
      
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("\n❌ Failed to update permissions:", error);
      throw error;
    } finally {
      client.release();
    }

    // Show final state
    console.log("\n📊 Final module keys in permissions table:");
    const finalResult = await pool.query<{ module: string; count: number }>(
      `SELECT module, COUNT(*)::int as count 
       FROM permissions 
       WHERE module IS NOT NULL 
       GROUP BY module 
       ORDER BY module`
    );
    
    for (const { module, count } of finalResult.rows) {
      console.log(`  • ${module}: ${count} rows`);
    }

  } catch (error) {
    console.error("\n❌ Error:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
