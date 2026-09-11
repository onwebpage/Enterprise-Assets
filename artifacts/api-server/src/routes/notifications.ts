/**
 * /api/notifications — Notification Center module
 *
 * Covers: list, summary, create, mark read/unread, mark all read, archive, delete.
 * All routes require authentication; every user manages their own notifications.
 * System/admin roles can create notifications for any user in the org.
 */
import { Router } from "express";
import { eq, and, ilike, or, sql, desc } from "drizzle-orm";
import { db, notifications, roles } from "@workspace/db";
import { insertNotificationSchema } from "@workspace/db/schema";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

// ── Helpers ───────────────────────────────────────────────────────────────────

async function isSystemRole(roleId: number): Promise<boolean> {
  const [role] = await db.select({ isSystem: roles.isSystem })
    .from(roles).where(eq(roles.id, roleId)).limit(1);
  return role?.isSystem === true;
}

// ── Summary ───────────────────────────────────────────────────────────────────

router.get("/summary", async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;

    const [{ total }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isArchived, false)));

    const [{ unread }] = await db
      .select({ unread: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.read, false),
        eq(notifications.isArchived, false),
      ));

    const byCategory = await db
      .select({
        category: notifications.category,
        count:  sql<number>`count(*)::int`,
        unread: sql<number>`sum(case when ${notifications.read} = false and ${notifications.isArchived} = false then 1 else 0 end)::int`,
      })
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .groupBy(notifications.category);

    res.json({ success: true, data: { total, unread, byCategory } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch notification summary" });
  }
});

// ── List ──────────────────────────────────────────────────────────────────────

router.get("/", async (req: AuthRequest, res) => {
  try {
    const userId   = req.user!.userId;
    const page     = Math.max(1, parseInt(String(req.query.page  ?? "1")));
    const limit    = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? "20"))));
    const offset   = (page - 1) * limit;
    const search   = String(req.query.search   ?? "").trim();
    const category = String(req.query.category ?? "").trim();
    const filter   = String(req.query.filter   ?? "all").trim(); // all | unread | archived

    const conditions = [eq(notifications.userId, userId)];

    if (filter === "unread") {
      conditions.push(eq(notifications.read, false));
      conditions.push(eq(notifications.isArchived, false));
    } else if (filter === "archived") {
      conditions.push(eq(notifications.isArchived, true));
    } else {
      conditions.push(eq(notifications.isArchived, false));
    }

    if (category && category !== "all") {
      conditions.push(eq(notifications.category, category));
    }

    if (search) {
      conditions.push(
        or(
          ilike(notifications.title, `%${search}%`),
          ilike(notifications.body,  `%${search}%`),
        )!,
      );
    }

    const where = and(...conditions);

    const [{ total }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(notifications)
      .where(where);

    const rows = await db
      .select()
      .from(notifications)
      .where(where)
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);

    res.json({
      success: true,
      data: rows,
      total,
      page,
      pages: Math.ceil((total as number) / limit),
    });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch notifications" });
  }
});

// ── Create ────────────────────────────────────────────────────────────────────

router.post("/", async (req: AuthRequest, res) => {
  try {
    const user  = req.user!;
    const orgId = user.orgId!;

    const parsed = insertNotificationSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: "Invalid payload", details: parsed.error.issues });
      return;
    }

    const data = parsed.data;
    let targetUserId = user.userId;

    if (data.userId && data.userId !== user.userId) {
      const adminOk = user.roleId != null && await isSystemRole(user.roleId);
      if (!adminOk) {
        res.status(403).json({ success: false, error: "Cannot create notifications for other users" });
        return;
      }
      targetUserId = data.userId;
    }

    const [created] = await db.insert(notifications).values({
      orgId,
      userId:     targetUserId,
      title:      data.title,
      body:       data.body       ?? null,
      type:       data.type       ?? "info",
      category:   data.category   ?? "general",
      entityType: data.entityType ?? null,
      entityId:   data.entityId   ?? null,
      actionUrl:  data.actionUrl  ?? null,
    }).returning();

    res.status(201).json({ success: true, data: created });
  } catch {
    res.status(500).json({ success: false, error: "Failed to create notification" });
  }
});

// ── Mark single as read ───────────────────────────────────────────────────────

router.patch("/:id/read", async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const userId = req.user!.userId;
    const [existing] = await db.select({ id: notifications.id })
      .from(notifications)
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
      .limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Notification not found" }); return; }

    const [updated] = await db.update(notifications)
      .set({ read: true, readAt: new Date(), updatedAt: new Date() })
      .where(eq(notifications.id, id))
      .returning();
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to mark as read" });
  }
});

// ── Mark single as unread ─────────────────────────────────────────────────────

router.patch("/:id/unread", async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const userId = req.user!.userId;
    const [existing] = await db.select({ id: notifications.id })
      .from(notifications)
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
      .limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Notification not found" }); return; }

    const [updated] = await db.update(notifications)
      .set({ read: false, readAt: null, updatedAt: new Date() })
      .where(eq(notifications.id, id))
      .returning();
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to mark as unread" });
  }
});

// ── Mark all as read ──────────────────────────────────────────────────────────

router.patch("/read-all", async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    await db.update(notifications)
      .set({ read: true, readAt: new Date(), updatedAt: new Date() })
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.read, false),
        eq(notifications.isArchived, false),
      ));
    res.json({ success: true, data: { message: "All notifications marked as read" } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to mark all as read" });
  }
});

// ── Archive (toggle) ──────────────────────────────────────────────────────────

router.patch("/:id/archive", async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const userId = req.user!.userId;
    const [existing] = await db.select({ id: notifications.id, isArchived: notifications.isArchived })
      .from(notifications)
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
      .limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Notification not found" }); return; }

    const [updated] = await db.update(notifications)
      .set({ isArchived: !existing.isArchived, updatedAt: new Date() })
      .where(eq(notifications.id, id))
      .returning();
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to archive notification" });
  }
});

// ── Delete ────────────────────────────────────────────────────────────────────

router.delete("/:id", async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const userId = req.user!.userId;
    const [existing] = await db.select({ id: notifications.id })
      .from(notifications)
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
      .limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Notification not found" }); return; }

    await db.delete(notifications).where(eq(notifications.id, id));
    res.json({ success: true, data: { id } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete notification" });
  }
});

export default router;
