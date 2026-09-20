const configuredDatabaseUrl = process.env.SUPABASE_DATABASE_URL;

if (!configuredDatabaseUrl) {
  throw new Error(
    "SUPABASE_DATABASE_URL must be set. Did you forget to configure Supabase?",
  );
}
if (configuredDatabaseUrl.includes("[YOUR-PASSWORD]")) {
  throw new Error(
    "SUPABASE_DATABASE_URL still contains [YOUR-PASSWORD]. Set the Supabase database password before starting the application.",
  );
}

function normalizeDatabaseUrl(urlValue: string): string {
  const url = new URL(urlValue);
  // Supabase pooler certificates may not be present in the runtime CA bundle.
  url.searchParams.set("sslmode", "no-verify");
  return url.toString();
}

export const databaseUrl = normalizeDatabaseUrl(configuredDatabaseUrl);