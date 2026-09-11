/**
 * /api/docs — Document Management module
 *
 * Covers: Folders (CRUD), Documents (CRUD + star + archive + download),
 *         Version history, Sharing
 * All routes require authentication + "Documents" module permission.
 */
import { Router } from "express";
import { eq, and, ilike, or, sql, desc, isNull } from "drizzle-orm";
import {
  db, permissions, roles,
  docFolders, docDocuments, docVersions, docShares,
} from "@workspace/db";
import {
  insertDocFolderSchema, updateDocFolderSchema,
  insertDocDocumentSchema, updateDocDocumentSchema,
  insertDocShareSchema,
} from "@workspace/db/schema";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { requirePermission } from "../middlewares/requirePermission";

const router = Router();
router.use(requireAuth);

const MODULE = "Documents";

// ── Helpers ───────────────────────────────────────────────────────────────────

function inferFileType(name: string, mime?: string | null): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["pdf"].includes(ext) || mime === "application/pdf") return "pdf";
  if (["xls", "xlsx", "csv"].includes(ext) || mime?.includes("spreadsheet") || mime?.includes("csv")) return "excel";
  if (["doc", "docx"].includes(ext) || mime?.includes("word")) return "word";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext) || mime?.startsWith("image/")) return "image";
  if (["txt", "md", "log"].includes(ext) || mime?.startsWith("text/")) return "text";
  return "other";
}

function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function nextDocNumber(orgId: number): Promise<string> {
  const [{ cnt }] = await db
    .select({ cnt: sql<number>`count(*)::int` })
    .from(docDocuments)
    .where(eq(docDocuments.orgId, orgId));
  return `DOC-${String((cnt ?? 0) + 1).padStart(4, "0")}`;
}

// ── My Permissions ────────────────────────────────────────────────────────────

router.get("/my-permissions", async (req: AuthRequest, res) => {
  try {
    const { roleId } = req.user!;
    if (roleId === null) {
      res.json({ success: true, data: { canView: false, canCreate: false, canEdit: false, canDelete: false } });
      return;
    }
    const [role] = await db.select({ isSystem: roles.isSystem }).from(roles)
      .where(eq(roles.id, roleId)).limit(1);
    if (role?.isSystem) {
      res.json({ success: true, data: { canView: true, canCreate: true, canEdit: true, canDelete: true } });
      return;
    }
    const [perm] = await db.select().from(permissions)
      .where(and(eq(permissions.roleId, roleId), sql`lower(${permissions.module}) = lower(${MODULE})`))
      .limit(1);
    res.json({
      success: true,
      data: perm
        ? { canView: perm.canView, canCreate: perm.canCreate, canEdit: perm.canEdit, canDelete: perm.canDelete }
        : { canView: false, canCreate: false, canEdit: false, canDelete: false },
    });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch permissions" });
  }
});

// ── Summary ───────────────────────────────────────────────────────────────────

router.get("/summary", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId!;

    const [[{ totalDocs }], [{ totalFolders }], [{ starred }], [{ totalBytes }], [{ recentDocs }]] = await Promise.all([
      db.select({ totalDocs: sql<number>`count(*)::int` })
        .from(docDocuments)
        .where(and(eq(docDocuments.orgId, orgId), eq(docDocuments.status, "active"))),
      db.select({ totalFolders: sql<number>`count(*)::int` })
        .from(docFolders)
        .where(eq(docFolders.orgId, orgId)),
      db.select({ starred: sql<number>`count(*)::int` })
        .from(docDocuments)
        .where(and(eq(docDocuments.orgId, orgId), eq(docDocuments.isStarred, true), eq(docDocuments.status, "active"))),
      db.select({ totalBytes: sql<number>`coalesce(sum(file_size), 0)::bigint` })
        .from(docDocuments)
        .where(and(eq(docDocuments.orgId, orgId), eq(docDocuments.status, "active"))),
      db.select({ recentDocs: sql<number>`count(*)::int` })
        .from(docDocuments)
        .where(and(
          eq(docDocuments.orgId, orgId),
          eq(docDocuments.status, "active"),
          sql`${docDocuments.updatedAt} >= now() - interval '7 days'`,
        )),
    ]);

    res.json({
      success: true,
      data: {
        totalDocs,
        totalFolders,
        starred,
        recentDocs,
        totalBytes,
        storageUsed: fmtBytes(totalBytes),
      },
    });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch summary" });
  }
});

// ── Folders ───────────────────────────────────────────────────────────────────

router.get("/folders", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId!;
    const folders = await db
      .select({
        id:          docFolders.id,
        name:        docFolders.name,
        description: docFolders.description,
        parentId:    docFolders.parentId,
        color:       docFolders.color,
        icon:        docFolders.icon,
        createdAt:   docFolders.createdAt,
        updatedAt:   docFolders.updatedAt,
        docCount:    sql<number>`(select count(*)::int from doc_documents d where d.folder_id = ${docFolders.id} and d.status = 'active')`,
        totalBytes:  sql<number>`coalesce((select sum(file_size) from doc_documents d where d.folder_id = ${docFolders.id} and d.status = 'active'), 0)::bigint`,
      })
      .from(docFolders)
      .where(eq(docFolders.orgId, orgId))
      .orderBy(docFolders.name);

    res.json({ success: true, data: folders });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch folders" });
  }
});

router.post("/folders", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = insertDocFolderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues });
    return;
  }
  try {
    const orgId = req.user!.orgId!;
    const [created] = await db
      .insert(docFolders)
      .values({ ...parsed.data, orgId, createdBy: req.user!.userId })
      .returning();
    res.status(201).json({ success: true, data: created });
  } catch {
    res.status(500).json({ success: false, error: "Failed to create folder" });
  }
});

router.put("/folders/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  const parsed = updateDocFolderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues });
    return;
  }
  try {
    const orgId = req.user!.orgId!;
    const [existing] = await db.select({ id: docFolders.id })
      .from(docFolders).where(and(eq(docFolders.id, id), eq(docFolders.orgId, orgId))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Folder not found" }); return; }
    const [updated] = await db.update(docFolders)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(docFolders.id, id)).returning();
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update folder" });
  }
});

router.delete("/folders/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const orgId = req.user!.orgId!;
    const [existing] = await db.select({ id: docFolders.id })
      .from(docFolders).where(and(eq(docFolders.id, id), eq(docFolders.orgId, orgId))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Folder not found" }); return; }
    // Unset folder_id on documents in this folder
    await db.update(docDocuments).set({ folderId: null }).where(eq(docDocuments.folderId, id));
    await db.delete(docFolders).where(eq(docFolders.id, id));
    res.json({ success: true, data: { id } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete folder" });
  }
});

// ── Documents ─────────────────────────────────────────────────────────────────

router.get("/files", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId   = req.user!.orgId!;
    const search   = (req.query.search   as string | undefined) ?? "";
    const folderId = req.query.folderId ? parseInt(req.query.folderId as string) : undefined;
    const fileType = (req.query.fileType as string | undefined) ?? "";
    const starred  = req.query.starred === "true";
    const recent   = req.query.recent === "true";
    const shared   = req.query.shared === "true";
    const archived = req.query.archived === "true";
    const page     = Math.max(1, parseInt((req.query.page as string) ?? "1", 10));
    const limit    = 50;
    const offset   = (page - 1) * limit;

    const conditions = [
      eq(docDocuments.orgId, orgId),
      eq(docDocuments.status, archived ? "archived" : "active"),
    ];
    if (search)                      conditions.push(ilike(docDocuments.name, `%${search}%`));
    if (folderId !== undefined)      conditions.push(eq(docDocuments.folderId, folderId));
    if (fileType)                    conditions.push(eq(docDocuments.fileType, fileType));
    if (starred)                     conditions.push(eq(docDocuments.isStarred, true));
    if (shared)                      conditions.push(eq(docDocuments.isShared, true));
    if (recent)                      conditions.push(sql`${docDocuments.updatedAt} >= now() - interval '7 days'`);

    const [rows, [{ total }]] = await Promise.all([
      db.select({
          id:          docDocuments.id,
          docNumber:   docDocuments.docNumber,
          name:        docDocuments.name,
          description: docDocuments.description,
          folderId:    docDocuments.folderId,
          fileType:    docDocuments.fileType,
          mimeType:    docDocuments.mimeType,
          fileSize:    docDocuments.fileSize,
          tags:        docDocuments.tags,
          isStarred:   docDocuments.isStarred,
          isShared:    docDocuments.isShared,
          version:     docDocuments.version,
          status:      docDocuments.status,
          createdBy:   docDocuments.createdBy,
          updatedBy:   docDocuments.updatedBy,
          createdAt:   docDocuments.createdAt,
          updatedAt:   docDocuments.updatedAt,
          folderName:  docFolders.name,
          folderColor: docFolders.color,
        })
        .from(docDocuments)
        .leftJoin(docFolders, eq(docDocuments.folderId, docFolders.id))
        .where(and(...conditions))
        .orderBy(desc(docDocuments.updatedAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: sql<number>`count(*)::int` })
        .from(docDocuments)
        .where(and(...conditions)),
    ]);

    res.json({ success: true, data: rows, total, totalPages: Math.ceil(total / limit) });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch documents" });
  }
});

router.get("/files/:id", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const orgId = req.user!.orgId!;
    const [doc] = await db
      .select({
        id:          docDocuments.id,
        docNumber:   docDocuments.docNumber,
        name:        docDocuments.name,
        description: docDocuments.description,
        folderId:    docDocuments.folderId,
        fileType:    docDocuments.fileType,
        mimeType:    docDocuments.mimeType,
        fileSize:    docDocuments.fileSize,
        fileContent: docDocuments.fileContent,
        tags:        docDocuments.tags,
        isStarred:   docDocuments.isStarred,
        isShared:    docDocuments.isShared,
        version:     docDocuments.version,
        status:      docDocuments.status,
        createdBy:   docDocuments.createdBy,
        updatedBy:   docDocuments.updatedBy,
        createdAt:   docDocuments.createdAt,
        updatedAt:   docDocuments.updatedAt,
        folderName:  docFolders.name,
        folderColor: docFolders.color,
      })
      .from(docDocuments)
      .leftJoin(docFolders, eq(docDocuments.folderId, docFolders.id))
      .where(and(eq(docDocuments.id, id), eq(docDocuments.orgId, orgId)))
      .limit(1);
    if (!doc) { res.status(404).json({ success: false, error: "Document not found" }); return; }
    res.json({ success: true, data: doc });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch document" });
  }
});

router.post("/files", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = insertDocDocumentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues });
    return;
  }
  try {
    const orgId = req.user!.orgId!;
    const docNumber = await nextDocNumber(orgId);

    // Auto-detect file type from name if not provided
    const fileType = parsed.data.fileType && parsed.data.fileType !== "other"
      ? parsed.data.fileType
      : inferFileType(parsed.data.name, parsed.data.mimeType);

    const [created] = await db
      .insert(docDocuments)
      .values({
        ...parsed.data,
        fileType,
        orgId,
        docNumber,
        createdBy:  req.user!.userId,
        updatedBy:  req.user!.userId,
        version:    1,
      })
      .returning();

    // Create initial version record
    await db.insert(docVersions).values({
      documentId:  created.id,
      version:     1,
      changeNote:  "Initial upload",
      fileContent: parsed.data.fileContent ?? null,
      fileSize:    parsed.data.fileSize ?? 0,
      createdBy:   req.user!.userId,
    });

    res.status(201).json({ success: true, data: created });
  } catch {
    res.status(500).json({ success: false, error: "Failed to create document" });
  }
});

router.put("/files/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  const parsed = updateDocDocumentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues });
    return;
  }
  try {
    const orgId = req.user!.orgId!;
    const [existing] = await db
      .select({ id: docDocuments.id, version: docDocuments.version, status: docDocuments.status })
      .from(docDocuments)
      .where(and(eq(docDocuments.id, id), eq(docDocuments.orgId, orgId)))
      .limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Document not found" }); return; }

    const { changeNote, fileContent, fileSize, ...rest } = parsed.data;
    const newVersion = fileContent !== undefined ? existing.version + 1 : existing.version;

    const [updated] = await db
      .update(docDocuments)
      .set({
        ...rest,
        ...(fileContent !== undefined ? { fileContent, fileSize: fileSize ?? 0, version: newVersion } : {}),
        updatedBy: req.user!.userId,
        updatedAt: new Date(),
      })
      .where(eq(docDocuments.id, id))
      .returning();

    // Create new version record when file content changes
    if (fileContent !== undefined) {
      await db.insert(docVersions).values({
        documentId:  id,
        version:     newVersion,
        changeNote:  changeNote ?? "Updated",
        fileContent: fileContent ?? null,
        fileSize:    fileSize ?? 0,
        createdBy:   req.user!.userId,
      });
    }

    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update document" });
  }
});

router.delete("/files/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const orgId = req.user!.orgId!;
    const [existing] = await db
      .select({ id: docDocuments.id, status: docDocuments.status })
      .from(docDocuments)
      .where(and(eq(docDocuments.id, id), eq(docDocuments.orgId, orgId)))
      .limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Document not found" }); return; }
    await db.delete(docDocuments).where(eq(docDocuments.id, id));
    res.json({ success: true, data: { id } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete document" });
  }
});

// ── Star toggle ────────────────────────────────────────────────────────────────

router.post("/files/:id/star", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const orgId = req.user!.orgId!;
    const [existing] = await db
      .select({ id: docDocuments.id, isStarred: docDocuments.isStarred })
      .from(docDocuments)
      .where(and(eq(docDocuments.id, id), eq(docDocuments.orgId, orgId)))
      .limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Document not found" }); return; }
    const [updated] = await db
      .update(docDocuments)
      .set({ isStarred: !existing.isStarred, updatedAt: new Date() })
      .where(eq(docDocuments.id, id))
      .returning();
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to toggle star" });
  }
});

// ── Archive / restore ─────────────────────────────────────────────────────────

router.post("/files/:id/archive", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const orgId = req.user!.orgId!;
    const [existing] = await db
      .select({ id: docDocuments.id, status: docDocuments.status })
      .from(docDocuments)
      .where(and(eq(docDocuments.id, id), eq(docDocuments.orgId, orgId)))
      .limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Document not found" }); return; }
    const newStatus = existing.status === "active" ? "archived" : "active";
    const [updated] = await db
      .update(docDocuments)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(eq(docDocuments.id, id))
      .returning();
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to archive document" });
  }
});

// ── Version history ───────────────────────────────────────────────────────────

router.get("/files/:id/versions", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const orgId = req.user!.orgId!;
    const [doc] = await db
      .select({ id: docDocuments.id })
      .from(docDocuments)
      .where(and(eq(docDocuments.id, id), eq(docDocuments.orgId, orgId)))
      .limit(1);
    if (!doc) { res.status(404).json({ success: false, error: "Document not found" }); return; }

    const versions = await db
      .select({
        id:          docVersions.id,
        version:     docVersions.version,
        changeNote:  docVersions.changeNote,
        fileSize:    docVersions.fileSize,
        createdAt:   docVersions.createdAt,
      })
      .from(docVersions)
      .where(eq(docVersions.documentId, id))
      .orderBy(desc(docVersions.version));

    res.json({ success: true, data: versions });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch versions" });
  }
});

// ── Sharing ───────────────────────────────────────────────────────────────────

router.get("/files/:id/shares", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const orgId = req.user!.orgId!;
    const [doc] = await db.select({ id: docDocuments.id })
      .from(docDocuments).where(and(eq(docDocuments.id, id), eq(docDocuments.orgId, orgId))).limit(1);
    if (!doc) { res.status(404).json({ success: false, error: "Document not found" }); return; }
    const shares = await db.select().from(docShares)
      .where(eq(docShares.documentId, id)).orderBy(desc(docShares.createdAt));
    res.json({ success: true, data: shares });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch shares" });
  }
});

router.post("/files/:id/share", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  const parsed = insertDocShareSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues });
    return;
  }
  try {
    const orgId = req.user!.orgId!;
    const [doc] = await db.select({ id: docDocuments.id })
      .from(docDocuments).where(and(eq(docDocuments.id, id), eq(docDocuments.orgId, orgId))).limit(1);
    if (!doc) { res.status(404).json({ success: false, error: "Document not found" }); return; }

    const [share] = await db.insert(docShares).values({
      documentId:      id,
      sharedWithEmail: parsed.data.sharedWithEmail,
      sharedBy:        req.user!.userId,
      permission:      parsed.data.permission,
      expiresAt:       parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
    }).returning();

    // Mark document as shared
    await db.update(docDocuments).set({ isShared: true, updatedAt: new Date() }).where(eq(docDocuments.id, id));

    res.status(201).json({ success: true, data: share });
  } catch {
    res.status(500).json({ success: false, error: "Failed to share document" });
  }
});

router.delete("/files/:id/shares/:shareId", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const id      = parseInt(req.params.id as string);
  const shareId = parseInt(req.params.shareId as string);
  if (isNaN(id) || isNaN(shareId)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    await db.delete(docShares).where(and(eq(docShares.id, shareId), eq(docShares.documentId, id)));
    // If no more shares remain, clear the isShared flag
    const [{ cnt }] = await db.select({ cnt: sql<number>`count(*)::int` })
      .from(docShares).where(eq(docShares.documentId, id));
    if (cnt === 0) {
      await db.update(docDocuments).set({ isShared: false, updatedAt: new Date() }).where(eq(docDocuments.id, id));
    }
    res.json({ success: true, data: { id: shareId } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to remove share" });
  }
});

// ── Move to folder ────────────────────────────────────────────────────────────

router.post("/files/:id/move", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  const folderId = req.body.folderId != null ? parseInt(String(req.body.folderId)) : null;
  try {
    const orgId = req.user!.orgId!;
    const [existing] = await db.select({ id: docDocuments.id })
      .from(docDocuments).where(and(eq(docDocuments.id, id), eq(docDocuments.orgId, orgId))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Document not found" }); return; }
    const [updated] = await db.update(docDocuments)
      .set({ folderId, updatedAt: new Date() })
      .where(eq(docDocuments.id, id))
      .returning();
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to move document" });
  }
});

export default router;
