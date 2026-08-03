/**
 * /api/settings — Settings module
 *
 * Covers: profile, change-password, mfa toggle, org settings, user preferences.
 */
import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, users, organizations, userPreferences, roles } from "@workspace/db";
import { hashPassword, verifyPassword } from "../lib/password";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

// ── Profile ───────────────────────────────────────────────────────────────────

router.get("/profile", async (req: AuthRequest, res) => {
  try {
    const [row] = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        phone: users.phone,
        status: users.status,
        mfaEnabled: users.mfaEnabled,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
        roleId: users.roleId,
        orgId: users.orgId,
        roleName: roles.name,
      })
      .from(users)
      .leftJoin(roles, eq(users.roleId, roles.id))
      .where(eq(users.id, req.user!.userId))
      .limit(1);
    if (!row) { res.status(404).json({ success: false, error: "User not found" }); return; }
    res.json({ success: true, data: row });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch profile" });
  }
});

router.put("/profile", async (req: AuthRequest, res) => {
  try {
    const { firstName, lastName, phone } = req.body as {
      firstName?: string; lastName?: string; phone?: string;
    };
    const [user] = await db
      .update(users)
      .set({
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(phone !== undefined && { phone }),
        updatedAt: new Date(),
      })
      .where(eq(users.id, req.user!.userId))
      .returning();
    if (!user) { res.status(404).json({ success: false, error: "User not found" }); return; }
    const { passwordHash: _ph, ...safe } = user;
    res.json({ success: true, data: safe });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update profile" });
  }
});

// ── Change Password ───────────────────────────────────────────────────────────

router.post("/change-password", async (req: AuthRequest, res) => {
  try {
    const { currentPassword, newPassword } = req.body as {
      currentPassword?: string; newPassword?: string;
    };
    if (!currentPassword || !newPassword) {
      res.status(400).json({ success: false, error: "currentPassword and newPassword are required" });
      return;
    }
    if (newPassword.length < 8) {
      res.status(400).json({ success: false, error: "New password must be at least 8 characters" });
      return;
    }
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.user!.userId))
      .limit(1);
    if (!user) { res.status(404).json({ success: false, error: "User not found" }); return; }
    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) {
      res.status(400).json({ success: false, error: "Current password is incorrect" });
      return;
    }
    const passwordHash = await hashPassword(newPassword);
    await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, req.user!.userId));
    res.json({ success: true, data: { message: "Password changed successfully" } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to change password" });
  }
});

// ── MFA Toggle ────────────────────────────────────────────────────────────────

router.patch("/mfa", async (req: AuthRequest, res) => {
  try {
    const { enabled } = req.body as { enabled?: boolean };
    if (enabled === undefined) {
      res.status(400).json({ success: false, error: "enabled is required" });
      return;
    }
    const [user] = await db
      .update(users)
      .set({ mfaEnabled: enabled, updatedAt: new Date() })
      .where(eq(users.id, req.user!.userId))
      .returning();
    if (!user) { res.status(404).json({ success: false, error: "User not found" }); return; }
    const { passwordHash: _ph, ...safe } = user;
    res.json({ success: true, data: safe });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update MFA" });
  }
});

// ── Organization ──────────────────────────────────────────────────────────────

router.get("/org", async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId;
    if (!orgId) { res.status(404).json({ success: false, error: "No organization found" }); return; }
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);
    if (!org) { res.status(404).json({ success: false, error: "Organization not found" }); return; }
    res.json({ success: true, data: org });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch organization" });
  }
});

router.put("/org", async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId;
    if (!orgId) { res.status(404).json({ success: false, error: "No organization found" }); return; }
    const {
      name, legalName, taxId, industry, foundedYear,
      employeeCount, currency, fiscalYearStart, country, gstin,
    } = req.body;
    const [org] = await db
      .update(organizations)
      .set({
        ...(name !== undefined && { name }),
        ...(legalName !== undefined && { legalName }),
        ...(taxId !== undefined && { taxId }),
        ...(industry !== undefined && { industry }),
        ...(foundedYear !== undefined && { foundedYear: foundedYear ? Number(foundedYear) : null }),
        ...(employeeCount !== undefined && { employeeCount: employeeCount ? Number(employeeCount) : null }),
        ...(currency !== undefined && { currency }),
        ...(fiscalYearStart !== undefined && { fiscalYearStart }),
        ...(country !== undefined && { country }),
        ...(gstin !== undefined && { gstin }),
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, orgId))
      .returning();
    if (!org) { res.status(404).json({ success: false, error: "Organization not found" }); return; }
    res.json({ success: true, data: org });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update organization" });
  }
});

// ── Preferences ───────────────────────────────────────────────────────────────

router.get("/preferences", async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    let [pref] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1);
    if (!pref) {
      [pref] = await db.insert(userPreferences).values({ userId }).returning();
    }
    res.json({ success: true, data: pref });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch preferences" });
  }
});

router.put("/preferences", async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const {
      notifEmail, notifPush, notifInvoices, notifPayroll, notifAlerts, notifReports,
      sessionTimeout, ipWhitelist, auditLog,
      theme, language, timezone, dateFormat,
    } = req.body;

    const vals: Record<string, unknown> = { updatedAt: new Date() };
    if (notifEmail !== undefined) vals.notifEmail = notifEmail;
    if (notifPush !== undefined) vals.notifPush = notifPush;
    if (notifInvoices !== undefined) vals.notifInvoices = notifInvoices;
    if (notifPayroll !== undefined) vals.notifPayroll = notifPayroll;
    if (notifAlerts !== undefined) vals.notifAlerts = notifAlerts;
    if (notifReports !== undefined) vals.notifReports = notifReports;
    if (sessionTimeout !== undefined) vals.sessionTimeout = sessionTimeout;
    if (ipWhitelist !== undefined) vals.ipWhitelist = ipWhitelist;
    if (auditLog !== undefined) vals.auditLog = auditLog;
    if (theme !== undefined) vals.theme = theme;
    if (language !== undefined) vals.language = language;
    if (timezone !== undefined) vals.timezone = timezone;
    if (dateFormat !== undefined) vals.dateFormat = dateFormat;

    const [existing] = await db
      .select({ id: userPreferences.id })
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1);

    let pref;
    if (existing) {
      [pref] = await db
        .update(userPreferences)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .set(vals as any)
        .where(eq(userPreferences.userId, userId))
        .returning();
    } else {
      [pref] = await db
        .insert(userPreferences)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .values({ userId, ...vals } as any)
        .returning();
    }
    res.json({ success: true, data: pref });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update preferences" });
  }
});

export default router;
