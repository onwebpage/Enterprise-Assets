import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type ApiResponse } from "@/lib/api";

// ── Constants ─────────────────────────────────────────────────────────────────

export const DOC_FILE_TYPES = ["pdf", "excel", "word", "image", "csv", "text", "other"] as const;
export type DocFileType = (typeof DOC_FILE_TYPES)[number];

export const DOC_FOLDER_COLORS = ["blue", "emerald", "amber", "purple", "rose", "cyan", "orange", "slate"] as const;
export type DocFolderColor = (typeof DOC_FOLDER_COLORS)[number];

export const DOC_SHARE_PERMISSIONS = ["view", "edit"] as const;
export type DocSharePermission = (typeof DOC_SHARE_PERMISSIONS)[number];

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface DocPermissions {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface DocSummary {
  totalDocs: number;
  totalFolders: number;
  starred: number;
  recentDocs: number;
  totalBytes: number;
  storageUsed: string;
}

export interface DocFolder {
  id: number;
  orgId: number | null;
  name: string;
  description: string | null;
  parentId: number | null;
  color: DocFolderColor;
  icon: string;
  createdAt: string;
  updatedAt: string;
  docCount: number;
  totalBytes: number;
}

export interface DocDocument {
  id: number;
  orgId: number | null;
  docNumber: string;
  name: string;
  description: string | null;
  folderId: number | null;
  folderName: string | null;
  folderColor: string | null;
  fileType: DocFileType;
  mimeType: string | null;
  fileSize: number;
  fileContent?: string | null;
  tags: string | null;
  isStarred: boolean;
  isShared: boolean;
  version: number;
  status: "active" | "archived";
  createdBy: number | null;
  updatedBy: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocVersion {
  id: number;
  version: number;
  changeNote: string | null;
  fileSize: number;
  createdAt: string;
}

export interface DocShare {
  id: number;
  documentId: number;
  sharedWithEmail: string;
  sharedBy: number | null;
  permission: DocSharePermission;
  expiresAt: string | null;
  createdAt: string;
}

export interface InsertDocFolder {
  name: string;
  description?: string | null;
  parentId?: number | null;
  color?: DocFolderColor;
  icon?: string;
}

export interface InsertDocDocument {
  name: string;
  description?: string | null;
  folderId?: number | null;
  fileType?: DocFileType;
  mimeType?: string | null;
  fileSize?: number;
  fileContent?: string | null;
  tags?: string | null;
  isStarred?: boolean;
}

export interface UpdateDocDocument {
  name?: string;
  description?: string | null;
  folderId?: number | null;
  tags?: string | null;
  fileContent?: string | null;
  fileSize?: number;
  fileType?: DocFileType;
  mimeType?: string | null;
  changeNote?: string | null;
}

// ── Util ──────────────────────────────────────────────────────────────────────

export function fmtFileSize(bytes: number): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function inferFileType(name: string, mime?: string | null): DocFileType {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf" || mime === "application/pdf") return "pdf";
  if (["xls", "xlsx"].includes(ext) || mime?.includes("spreadsheet")) return "excel";
  if (["doc", "docx"].includes(ext) || mime?.includes("word")) return "word";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext) || mime?.startsWith("image/")) return "image";
  if (["csv"].includes(ext) || mime?.includes("csv")) return "csv";
  if (["txt", "md", "log"].includes(ext) || mime?.startsWith("text/")) return "text";
  return "other";
}

export function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the data URL prefix: "data:...;base64,"
      const base64 = result.split(",")[1] ?? result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Hooks: Permissions ────────────────────────────────────────────────────────

export function useDocPermissions() {
  return useQuery<ApiResponse<DocPermissions>>({
    queryKey: ["docs", "permissions"],
    queryFn: () => api.get("/docs/my-permissions"),
    staleTime: 60_000,
  });
}

// ── Hooks: Summary ────────────────────────────────────────────────────────────

export function useDocSummary() {
  return useQuery<ApiResponse<DocSummary>>({
    queryKey: ["docs", "summary"],
    queryFn: () => api.get("/docs/summary"),
  });
}

// ── Hooks: Folders ────────────────────────────────────────────────────────────

export function useDocFolders() {
  return useQuery<ApiResponse<DocFolder[]>>({
    queryKey: ["docs", "folders"],
    queryFn: () => api.get("/docs/folders"),
  });
}

export function useCreateDocFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: InsertDocFolder) => api.post("/docs/folders", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["docs"] }); },
  });
}

export function useUpdateDocFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertDocFolder> }) =>
      api.put(`/docs/folders/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["docs"] }); },
  });
}

export function useDeleteDocFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/docs/folders/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["docs"] }); },
  });
}

// ── Hooks: Documents ──────────────────────────────────────────────────────────

export function useDocDocuments(params?: {
  search?: string;
  folderId?: number | null;
  fileType?: string;
  starred?: boolean;
  recent?: boolean;
  shared?: boolean;
  archived?: boolean;
  page?: number;
}) {
  const qs = new URLSearchParams();
  if (params?.search)              qs.set("search",   params.search);
  if (params?.folderId != null)    qs.set("folderId", String(params.folderId));
  if (params?.fileType)            qs.set("fileType", params.fileType);
  if (params?.starred)             qs.set("starred",  "true");
  if (params?.recent)              qs.set("recent",   "true");
  if (params?.shared)              qs.set("shared",   "true");
  if (params?.archived)            qs.set("archived", "true");
  if (params?.page)                qs.set("page",     String(params.page));
  return useQuery<ApiResponse<DocDocument[]> & { total?: number; totalPages?: number }>({
    queryKey: ["docs", "files", params],
    queryFn: () => api.get(`/docs/files?${qs}`),
  });
}

export function useDocDocument(id: number | null) {
  return useQuery<ApiResponse<DocDocument>>({
    queryKey: ["docs", "files", id],
    queryFn: () => api.get(`/docs/files/${id}`),
    enabled: id !== null,
  });
}

export function useCreateDocDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: InsertDocDocument) => api.post("/docs/files", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["docs"] }); },
  });
}

export function useUpdateDocDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateDocDocument }) =>
      api.put(`/docs/files/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["docs"] }); },
  });
}

export function useDeleteDocDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/docs/files/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["docs"] }); },
  });
}

export function useStarDocDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.post(`/docs/files/${id}/star`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["docs"] }); },
  });
}

export function useArchiveDocDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.post(`/docs/files/${id}/archive`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["docs"] }); },
  });
}

export function useMoveDocDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, folderId }: { id: number; folderId: number | null }) =>
      api.post(`/docs/files/${id}/move`, { folderId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["docs"] }); },
  });
}

// ── Hooks: Versions ───────────────────────────────────────────────────────────

export function useDocVersions(documentId: number | null) {
  return useQuery<ApiResponse<DocVersion[]>>({
    queryKey: ["docs", "versions", documentId],
    queryFn: () => api.get(`/docs/files/${documentId}/versions`),
    enabled: documentId !== null,
  });
}

// ── Hooks: Sharing ────────────────────────────────────────────────────────────

export function useDocShares(documentId: number | null) {
  return useQuery<ApiResponse<DocShare[]>>({
    queryKey: ["docs", "shares", documentId],
    queryFn: () => api.get(`/docs/files/${documentId}/shares`),
    enabled: documentId !== null,
  });
}

export function useShareDocDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { sharedWithEmail: string; permission?: DocSharePermission } }) =>
      api.post(`/docs/files/${id}/share`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["docs"] }); },
  });
}

export function useDeleteDocShare() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ documentId, shareId }: { documentId: number; shareId: number }) =>
      api.delete(`/docs/files/${documentId}/shares/${shareId}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["docs"] }); },
  });
}
