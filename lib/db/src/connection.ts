const configuredDatabaseUrl =
  process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL;

if (!configuredDatabaseUrl) {
  throw new Error(
    "SUPABASE_DB_URL or DATABASE_URL must be set. Did you forget to configure a database?",
  );
}

function normalizeDatabaseUrl(urlValue: string): string {
  if (!process.env.SUPABASE_DB_URL) return urlValue;

  const url = new URL(urlValue);
  // Supabase's pooler certificate is encrypted but not trusted by the
  // container CA bundle. Keep TLS enabled while accepting that certificate.
  url.searchParams.set("sslmode", "no-verify");
  return url.toString();
}

export const databaseUrl = normalizeDatabaseUrl(configuredDatabaseUrl);