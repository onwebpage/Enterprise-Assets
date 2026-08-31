const configuredDatabaseUrl =
  process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL;

if (!configuredDatabaseUrl) {
  throw new Error(
    "SUPABASE_DB_URL or DATABASE_URL must be set. Did you forget to configure a database?",
  );
}

export const databaseUrl = configuredDatabaseUrl;