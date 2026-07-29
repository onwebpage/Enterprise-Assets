import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, users, roles } from "@workspace/db";
import { signToken } from "../lib/jwt";
import { verifyPassword } from "../lib/password";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router = Router();

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
    });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          displayName: `${user.firstName} ${user.lastName}`,
          initials: `${user.firstName[0]}${user.lastName[0]}`.toUpperCase(),
          status: user.status,
          mfaEnabled: user.mfaEnabled,
          roleId: user.roleId,
          roleName,
          orgId: user.orgId,
        },
      },
    });
  } catch (err) {
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

    let roleName = "User";
    if (user.roleId) {
      const [role] = await db.select({ name: roles.name }).from(roles).where(eq(roles.id, user.roleId)).limit(1);
      if (role) roleName = role.name;
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        displayName: `${user.firstName} ${user.lastName}`,
        initials: `${user.firstName[0]}${user.lastName[0]}`.toUpperCase(),
        status: user.status,
        mfaEnabled: user.mfaEnabled,
        roleId: user.roleId,
        roleName,
        orgId: user.orgId,
      },
    });
  } catch {
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// POST /api/auth/logout
router.post("/logout", requireAuth, (_req, res) => {
  // JWT is stateless — client drops the token
  res.json({ success: true, data: null });
});

export default router;
