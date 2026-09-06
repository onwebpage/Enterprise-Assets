import { Router } from "express";
import { and, eq } from "drizzle-orm";
import { db, socialIntegrations } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { requirePermission } from "../middlewares/requirePermission";
import { decryptIntegrationSecret, encryptIntegrationSecret } from "../lib/integrationSecrets";

const router = Router();
router.use(requireAuth);

const PROVIDERS = {
  facebook: { name: "Facebook", test: "https://graph.facebook.com/v19.0/me?fields=id,name" },
  instagram: { name: "Instagram", test: "https://graph.facebook.com/v19.0/me?fields=id,name" },
  linkedin: { name: "LinkedIn", test: "https://api.linkedin.com/v2/userinfo" },
  x: { name: "X", test: "https://api.x.com/2/users/me" },
  youtube: { name: "YouTube", test: "https://www.googleapis.com/youtube/v3/channels?part=id&mine=true" },
} as const;
type Provider = keyof typeof PROVIDERS;

function isProvider(value: unknown): value is Provider {
  return typeof value === "string" && value in PROVIDERS;
}

function safeIntegration(row: typeof socialIntegrations.$inferSelect) {
  return {
    id: row.id, provider: row.provider, accountName: row.accountName, accountId: row.accountId,
    expiresAt: row.expiresAt, status: row.status, lastTestedAt: row.lastTestedAt,
    lastError: row.lastError, updatedAt: row.updatedAt, hasRefreshToken: Boolean(row.refreshTokenEncrypted),
  };
}

async function testProvider(provider: Provider, accessToken: string) {
  const definition = PROVIDERS[provider];
  const response = await fetch(definition.test, { headers: { Authorization: `Bearer ${accessToken}` } });
  const body = await response.json().catch(() => ({})) as { id?: string; name?: string; localizedFirstName?: string; error?: { message?: string } };
  if (!response.ok) throw new Error(body.error?.message ?? `Unable to authenticate with ${definition.name}`);
  return { accountId: body.id ?? null, accountName: body.name ?? body.localizedFirstName ?? null };
}

router.get("/social", requirePermission("Settings", "view"), async (req: AuthRequest, res) => {
  try {
    if (!req.user!.orgId) { res.status(400).json({ success: false, error: "No organization found" }); return; }
    const rows = await db.select().from(socialIntegrations).where(eq(socialIntegrations.orgId, req.user!.orgId!));
    res.json({ success: true, data: rows.map(safeIntegration) });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch social integrations" });
  }
});

router.put("/social/:provider", requirePermission("Settings", "edit"), async (req: AuthRequest, res) => {
  try {
    if (!req.user!.orgId) { res.status(400).json({ success: false, error: "No organization found" }); return; }
    const provider = req.params.provider;
    if (!isProvider(provider)) { res.status(400).json({ success: false, error: "Unsupported social provider" }); return; }
    const { accessToken, refreshToken, accountName, expiresAt } = req.body as Record<string, unknown>;
    if (typeof accessToken !== "string" || accessToken.trim().length < 10) { res.status(400).json({ success: false, error: "A valid access token is required" }); return; }
    const existing = await db.select().from(socialIntegrations).where(and(eq(socialIntegrations.orgId, req.user!.orgId!), eq(socialIntegrations.provider, provider))).limit(1);
    const [saved] = existing.length
      ? await db.update(socialIntegrations).set({
        accessTokenEncrypted: encryptIntegrationSecret(accessToken.trim()),
        refreshTokenEncrypted: typeof refreshToken === "string" && refreshToken.trim() ? encryptIntegrationSecret(refreshToken.trim()) : existing[0].refreshTokenEncrypted,
        accountName: typeof accountName === "string" ? accountName.trim() || null : existing[0].accountName,
        expiresAt: parseExpiry(expiresAt, existing[0].expiresAt),
        status: "connected", lastError: null, updatedAt: new Date(),
      }).where(eq(socialIntegrations.id, existing[0].id)).returning()
      : await db.insert(socialIntegrations).values({
        orgId: req.user!.orgId!, provider, accessTokenEncrypted: encryptIntegrationSecret(accessToken.trim()),
        refreshTokenEncrypted: typeof refreshToken === "string" && refreshToken.trim() ? encryptIntegrationSecret(refreshToken.trim()) : null,
        accountName: typeof accountName === "string" ? accountName.trim() || null : null,
        expiresAt: parseExpiry(expiresAt, null), createdBy: req.user!.userId,
      }).returning();
    res.json({ success: true, data: safeIntegration(saved) });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : "Failed to save social integration" });
  }
});

router.post("/social/:provider/test", requirePermission("Settings", "edit"), async (req: AuthRequest, res) => {
  try {
    if (!req.user!.orgId) { res.status(400).json({ success: false, error: "No organization found" }); return; }
    const provider = req.params.provider;
    if (!isProvider(provider)) { res.status(400).json({ success: false, error: "Unsupported social provider" }); return; }
    const [integration] = await db.select().from(socialIntegrations).where(and(eq(socialIntegrations.orgId, req.user!.orgId!), eq(socialIntegrations.provider, provider))).limit(1);
    if (!integration) { res.status(404).json({ success: false, error: "Integration is not configured" }); return; }
    const result = await testProvider(provider, decryptIntegrationSecret(integration.accessTokenEncrypted));
    await db.update(socialIntegrations).set({ accountId: result.accountId, accountName: result.accountName ?? integration.accountName, status: "connected", lastTestedAt: new Date(), lastError: null, updatedAt: new Date() }).where(eq(socialIntegrations.id, integration.id));
    res.json({ success: true, data: { connected: true, accountName: result.accountName } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Connection test failed";
    const provider = req.params.provider;
    if (isProvider(provider)) await db.update(socialIntegrations).set({ status: "error", lastTestedAt: new Date(), lastError: message, updatedAt: new Date() }).where(and(eq(socialIntegrations.orgId, req.user!.orgId!), eq(socialIntegrations.provider, provider))).catch(() => undefined);
    res.status(502).json({ success: false, error: message });
  }
});

router.delete("/social/:provider", requirePermission("Settings", "edit"), async (req: AuthRequest, res) => {
  try {
    if (!req.user!.orgId) { res.status(400).json({ success: false, error: "No organization found" }); return; }
    if (!isProvider(req.params.provider)) { res.status(400).json({ success: false, error: "Unsupported social provider" }); return; }
    await db.delete(socialIntegrations).where(and(eq(socialIntegrations.orgId, req.user!.orgId!), eq(socialIntegrations.provider, req.params.provider)));
    res.json({ success: true, data: null });
  } catch {
    res.status(500).json({ success: false, error: "Failed to disconnect social integration" });
  }
});

export default router;

function parseExpiry(value: unknown, fallback: Date | null): Date | null {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value !== "string") throw new Error("Token expiry must be an ISO date");
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error("Token expiry must be a valid date");
  return parsed;
}