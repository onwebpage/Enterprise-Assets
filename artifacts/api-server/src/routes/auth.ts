import { Router } from "express";
import { and, eq, sql } from "drizzle-orm";
import {
  db,
  users,
  roles,
  permissions,
  organizations,
  tenants,
  organizationMemberships,
  saasFeatures,
  saasPlans,
  saasSubscriptions,
} from "@workspace/db";
import { signToken } from "../lib/jwt";
import { hashPassword, verifyPassword } from "../lib/password";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router = Router();

function authUser(user: typeof users.$inferSelect, roleName = "User") {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    displayName: `${user.firstName} ${user.lastName}`,
    initials: `${user.firstName[0]}${user.lastName[0]}`.toUpperCase(),
    status: user.status,
    paymentStatus: user.paymentStatus,
    mfaEnabled: user.mfaEnabled,
    roleId: user.roleId,
    roleName,
    orgId: user.orgId,
  };
}

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      companyName,
    } = req.body as {
      email?: string;
      password?: string;
      firstName?: string;
      lastName?: string;
      companyName?: string;
    };

    const normalizedEmail = email?.trim().toLowerCase();
    const normalizedFirstName = firstName?.trim();
    const normalizedLastName = lastName?.trim();
    const normalizedCompanyName = companyName?.trim();

    if (!normalizedEmail || !normalizedFirstName || !normalizedLastName || !password) {
      res.status(400).json({
        success: false,
        error: "First name, last name, email, and password are required",
      });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      res.status(400).json({ success: false, error: "Enter a valid email address" });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({
        success: false,
        error: "Password must be at least 8 characters",
      });
      return;
    }

    if (normalizedFirstName.length > 80 || normalizedLastName.length > 80) {
      res.status(400).json({ success: false, error: "Names must be 80 characters or fewer" });
      return;
    }

    const existingUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (existingUser.length > 0) {
      res.status(409).json({ success: false, error: "An account with this email already exists" });
      return;
    }

    const passwordHash = await hashPassword(password);
    const displayCompanyName =
      normalizedCompanyName || `${normalizedFirstName} ${normalizedLastName}'s Organization`;

    const { user, roleName } = await db.transaction(async (tx) => {
      const [tenant] = await tx.insert(tenants).values({ name: displayCompanyName }).returning({ id: tenants.id });
      const [organization] = await tx
        .insert(organizations)
        .values({
          tenantId: tenant.id,
          name: displayCompanyName,
          legalName: displayCompanyName,
          employeeCount: 1,
          status: "active",
          currency: "INR",
          fiscalYearStart: "Jan",
          type: "Parent",
        })
        .returning({ id: organizations.id });

      // Create Admin role for this organization
      const [adminRole] = await tx
        .insert(roles)
        .values({
          orgId: organization.id,
          name: "Admin",
          description: "Organization Administrator",
          isSystem: false,
        })
        .returning();

      // Seed all feature permissions for the Admin role
      const allFeatures = await tx.select({ key: saasFeatures.key }).from(saasFeatures);
      const featureKeys = allFeatures.map((f) => f.key);
      const permKeys = Array.from(new Set([...featureKeys, "asset_depreciation", "gst_returns", "finance"]));
      if (permKeys.length > 0) {
        await tx.insert(permissions).values(
          permKeys.map((key) => ({
            roleId: adminRole.id,
            module: key,
            canView: true,
            canCreate: true,
            canEdit: true,
            canDelete: true,
          }))
        );
      }

      // Ensure active subscription for the new organization
      const [defaultPlan] = await tx.select({ id: saasPlans.id }).from(saasPlans).limit(1);
      if (defaultPlan) {
        await tx.insert(saasSubscriptions).values({
          orgId: organization.id,
          planId: defaultPlan.id,
          status: "active",
          billingCycle: "monthly",
        });
      }

      const [createdUser] = await tx
        .insert(users)
        .values({
          orgId: organization.id,
          email: normalizedEmail,
          passwordHash,
          firstName: normalizedFirstName,
          lastName: normalizedLastName,
          roleId: adminRole.id,
          status: "active",
          mfaEnabled: false,
        })
        .returning();

      await tx.insert(organizationMemberships).values({
        userId: createdUser.id,
        organizationId: organization.id,
        roleId: adminRole.id,
        isDefault: true,
      });

      return { user: createdUser, roleName: adminRole.name };
    });

    const token = signToken({
      userId: user.id,
      email: user.email,
      roleId: user.roleId,
      orgId: user.orgId,
      sessionVersion: user.sessionVersion,
    });

    res.status(201).json({
      success: true,
      data: {
        token,
        user: authUser(user, roleName),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message.toLowerCase().includes("unique")) {
      res.status(409).json({ success: false, error: "An account with this email already exists" });
      return;
    }
    logger.error({ err }, "Registration failed");
    res.status(503).json({
      success: false,
      error: "Account service is temporarily unavailable. Please try again in a moment.",
    });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      res.status(400).json({ success: false, error: "Email and password are required" });
      return;
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1);

    if (!user) {
      res.status(401).json({ success: false, error: "Invalid email or password" });
      return;
    }

    if (user.status === "inactive") {
      res.status(403).json({ success: false, error: "Your account has been deactivated" });
      return;
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ success: false, error: "Invalid email or password" });
      return;
    }

    // Auto-heal missing roleId for organization owner/primary user
    if (!user.roleId && user.orgId) {
      let [adminRole] = await db
        .select({ id: roles.id, name: roles.name })
        .from(roles)
        .where(and(eq(roles.orgId, user.orgId), sql`lower(${roles.name}) in ('admin', 'administrator', 'company admin', 'owner')`))
        .limit(1);

      if (!adminRole) {
        [adminRole] = await db
          .insert(roles)
          .values({
            orgId: user.orgId,
            name: "Admin",
            description: "Organization Administrator",
            isSystem: false,
          })
          .returning({ id: roles.id, name: roles.name });
      }

      user.roleId = adminRole.id;
      await db.update(users).set({ roleId: adminRole.id }).where(eq(users.id, user.id));
      await db
        .update(organizationMemberships)
        .set({ roleId: adminRole.id })
        .where(and(eq(organizationMemberships.userId, user.id), eq(organizationMemberships.organizationId, user.orgId)));
    }

    // Update last login
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

    // Fetch role name
    let roleName = "User";
    if (user.roleId) {
      const [role] = await db.select({ name: roles.name }).from(roles).where(eq(roles.id, user.roleId)).limit(1);
      if (role) roleName = role.name;
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      roleId: user.roleId,
      orgId: user.orgId,
      sessionVersion: user.sessionVersion,
    });

    res.json({
      success: true,
      data: {
        token,
        user: authUser(user, roleName),
      },
    });
  } catch (err) {
    logger.error({ err, email: typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : undefined }, "Login failed");
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// GET /api/auth/me
router.get("/me", requireAuth, async (req: AuthRequest, res) => {
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.user!.userId))
      .limit(1);

    if (!user) {
      res.status(404).json({ success: false, error: "User not found" });
      return;
    }

    // Auto-heal missing roleId
    if (!user.roleId && user.orgId) {
      let [adminRole] = await db
        .select({ id: roles.id, name: roles.name })
        .from(roles)
        .where(and(eq(roles.orgId, user.orgId), sql`lower(${roles.name}) in ('admin', 'administrator', 'company admin', 'owner')`))
        .limit(1);

      if (adminRole) {
        user.roleId = adminRole.id;
        await db.update(users).set({ roleId: adminRole.id }).where(eq(users.id, user.id));
        await db
          .update(organizationMemberships)
          .set({ roleId: adminRole.id })
          .where(and(eq(organizationMemberships.userId, user.id), eq(organizationMemberships.organizationId, user.orgId)));
      }
    }

    const resolvedRoleId = user.roleId ?? req.user!.roleId;
    let roleName = "User";
    if (resolvedRoleId) {
      const [role] = await db.select({ name: roles.name }).from(roles).where(eq(roles.id, resolvedRoleId)).limit(1);
      if (role) roleName = role.name;
    }

    user.orgId = user.orgId ?? req.user!.orgId;
    user.roleId = resolvedRoleId;

    res.json({
      success: true,
      data: authUser(user, roleName),
    });
  } catch {
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// POST /api/auth/logout
router.post("/logout", requireAuth, async (req: AuthRequest, res) => {
  try {
    await db.update(users).set({ sessionVersion: sql`${users.sessionVersion} + 1` }).where(eq(users.id, req.user!.userId));
    res.json({ success: true, data: null });
  } catch {
    res.status(500).json({ success: false, error: "Failed to log out" });
  }
});

export default router;
