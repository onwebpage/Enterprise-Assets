import pg from "pg";

const { Pool } = pg;

const connectionString = process.env.SUPABASE_DATABASE_URL;

if (!connectionString) {
  console.error("SUPABASE_DATABASE_URL environment variable is not set");
  process.exit(1);
}
if (connectionString.includes("[YOUR-PASSWORD]")) {
  console.error("SUPABASE_DATABASE_URL still contains [YOUR-PASSWORD]");
  process.exit(1);
}

console.log("Testing database connection...");
console.log("Database host:", new URL(connectionString).host);

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 10000,
});

try {
  const client = await pool.connect();
  console.log("✅ Database connection successful!");
  
  const result = await client.query("SELECT version()");
  console.log("PostgreSQL version:", result.rows[0].version);
  
  client.release();
  await pool.end();
  process.exit(0);
} catch (err) {
  console.error("❌ Database connection failed:");
  console.error(err.message);
  console.error("Full error:", err);
  await pool.end();
  process.exit(1);
}
