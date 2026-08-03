import { useState, useRef, useCallback } from 'react';
import {
  FileText, Folder, Upload, Download, Search, MoreHorizontal, Plus,
  Eye, Share2, Trash2, Star, Clock, File, FileImage,
  FileSpreadsheet, Archive, X, ChevronRight, FolderPlus, Tag,
  RefreshCw, History, Link, Shield, AlertCircle, CheckCircle,
} from 'lucide-react';
import AppLayout from '@/components/app/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  useDocPermissions, useDocSummary, useDocFolders, useDocDocuments,
  useDocDocument, useDocVersions, useDocShares,
  useCreateDocFolder, useUpdateDocFolder, useDeleteDocFolder,
  useCreateDocDocument, useUpdateDocDocument, useDeleteDocDocument,
  useStarDocDocument, useArchiveDocDocument, useMoveDocDocument,
  useShareDocDocument, useDeleteDocShare,
  fmtFileSize, inferFileType, readFileAsBase64,
  DOC_FOLDER_COLORS,
  type DocFolder, type DocDocument, type DocFolderColor,
} from '@/hooks/useDocuments';

// ── Visual helpers ────────────────────────────────────────────────────────────

const folderColorMap: Record<string, { bg: string; text: string; border: string }> = {
  blue:    { bg: 'from-[#2563EB]/20 to-[#2563EB]/5',   text: 'text-[#2563EB]',   border: 'border-[#2563EB]/20' },
  emerald: { bg: 'from-emerald-500/20 to-emerald-500/5', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  amber:   { bg: 'from-amber-500/20 to-amber-500/5',   text: 'text-amber-400',   border: 'border-amber-500/20' },
  purple:  { bg: 'from-purple-500/20 to-purple-500/5', text: 'text-purple-400',  border: 'border-purple-500/20' },
  rose:    { bg: 'from-rose-500/20 to-rose-500/5',     text: 'text-rose-400',    border: 'border-rose-500/20' },
  cyan:    { bg: 'from-cyan-500/20 to-cyan-500/5',     text: 'text-cyan-400',    border: 'border-cyan-500/20' },
  orange:  { bg: 'from-orange-500/20 to-orange-500/5', text: 'text-orange-400',  border: 'border-orange-500/20' },
  slate:   { bg: 'from-white/10 to-white/5',           text: 'text-white/50',    border: 'border-white/10' },
};

function FileTypeIcon({ type, size = 'md' }: { type: string; size?: 'sm' | 'md' }) {
  const s = size === 'sm' ? 'w-6 h-6' : 'w-8 h-8';
  const i = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
  switch (type) {
    case 'pdf':   return <div className={`${s} rounded-lg bg-red-500/15 border border-red-500/20 flex items-center justify-center flex-shrink-0`}><FileText className={`${i} text-red-400`} /></div>;
    case 'excel': return <div className={`${s} rounded-lg bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center flex-shrink-0`}><FileSpreadsheet className={`${i} text-emerald-400`} /></div>;
    case 'word':  return <div className={`${s} rounded-lg bg-[#2563EB]/15 border border-[#2563EB]/20 flex items-center justify-center flex-shrink-0`}><FileText className={`${i} text-[#2563EB]`} /></div>;
    case 'image': return <div className={`${s} rounded-lg bg-purple-500/15 border border-purple-500/20 flex items-center justify-center flex-shrink-0`}><FileImage className={`${i} text-purple-400`} /></div>;
    case 'csv':   return <div className={`${s} rounded-lg bg-amber-500/15 border border-amber-500/20 flex items-center justify-center flex-shrink-0`}><FileSpreadsheet className={`${i} text-amber-400`} /></div>;
    case 'text':  return <div className={`${s} rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0`}><FileText className={`${i} text-white/50`} /></div>;
    default:      return <div className={`${s} rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0`}><File className={`${i} text-white/40`} /></div>;
  }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

// ── Upload Dialog ─────────────────────────────────────────────────────────────

function UploadDialog({
  open, onClose, folders, defaultFolderId,
}: {
  open: boolean; onClose: () => void;
  folders: DocFolder[]; defaultFolderId?: number | null;
}) {
  const { toast } = useToast();
  const create = useCreateDocDocument();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dragging, setDragging]   = useState(false);
  const [files, setFiles]         = useState<File[]>([]);
  const [folderId, setFolderId]   = useState<string>(defaultFolderId ? String(defaultFolderId) : '_none');
  const [description, setDesc]    = useState('');
  const [tags, setTags]           = useState('');
  const [uploading, setUploading] = useState(false);

  const addFiles = useCallback((newFiles: File[]) => {
    setFiles(prev => {
      const names = new Set(prev.map(f => f.name));
      return [...prev, ...newFiles.filter(f => !names.has(f.name))];
    });
  }, []);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  }

  async function handleUpload() {
    if (files.length === 0) { toast({ title: 'Select at least one file', variant: 'destructive' }); return; }
    setUploading(true);
    let ok = 0;
    for (const file of files) {
      try {
        const base64 = await readFileAsBase64(file);
        const ft = inferFileType(file.name, file.type);
        await create.mutateAsync({
          name: file.name,
          description: description || null,
          folderId: folderId !== '_none' ? parseInt(folderId) : null,
          fileType: ft,
          mimeType: file.type || null,
          fileSize: file.size,
          fileContent: base64,
          tags: tags || null,
        });
        ok++;
      } catch {
        toast({ title: `Failed to upload "${file.name}"`, variant: 'destructive' });
      }
    }
    setUploading(false);
    if (ok > 0) {
      toast({ title: `${ok} file${ok > 1 ? 's' : ''} uploaded` });
      setFiles([]); setDesc(''); setTags('');
      onClose();
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="bg-[#0d1117] border-white/[0.1] text-white max-w-xl">
        <DialogHeader>
          <DialogTitle>Upload Documents</DialogTitle>
          <DialogDescription className="text-white/40">Drag & drop files or browse to select them.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
              ${dragging ? 'border-[#2563EB] bg-[#2563EB]/5' : 'border-white/[0.1] hover:border-white/20 hover:bg-white/[0.02]'}`}
          >
            <Upload className="w-8 h-8 text-white/20 mx-auto mb-2" />
            <p className="text-white/50 text-sm">Drop files here or <span className="text-[#2563EB]">browse</span></p>
            <p className="text-white/30 text-xs mt-1">All file types supported</p>
            <input ref={fileInputRef} type="file" multiple className="hidden"
              onChange={e => addFiles(Array.from(e.target.files ?? []))} />
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-2 bg-white/[0.03] rounded-lg px-3 py-2">
                  <FileTypeIcon type={inferFileType(f.name, f.type)} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{f.name}</p>
                    <p className="text-xs text-white/30">{fmtFileSize(f.size)}</p>
                  </div>
                  <button onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}
                    className="text-white/20 hover:text-red-400 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Folder + metadata */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs">Folder</Label>
              <Select value={folderId} onValueChange={setFolderId}>
                <SelectTrigger className="bg-white/[0.05] border-white/[0.1] text-white">
                  <SelectValue placeholder="No folder" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">No folder</SelectItem>
                  {folders.map(f => <SelectItem key={f.id} value={String(f.id)}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs">Tags (comma-separated)</Label>
              <Input value={tags} onChange={e => setTags(e.target.value)} placeholder="contract, 2026"
                className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/30" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs">Description</Label>
            <Textarea value={description} onChange={e => setDesc(e.target.value)} rows={2}
              placeholder="Optional description for all uploaded files"
              className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/30 resize-none" />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}
              className="border-white/[0.1] bg-transparent text-white/60 hover:text-white">Cancel</Button>
            <Button onClick={handleUpload} disabled={uploading || files.length === 0}
              className="bg-[#2563EB] hover:bg-[#1d4ed8]">
              {uploading ? 'Uploading…' : `Upload ${files.length > 0 ? `(${files.length})` : ''}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Folder Form Dialog ────────────────────────────────────────────────────────

function FolderFormDialog({
  open, onClose, initial,
}: { open: boolean; onClose: () => void; initial?: DocFolder | null }) {
  const { toast } = useToast();
  const createFolder = useCreateDocFolder();
  const updateFolder = useUpdateDocFolder();
  const isEdit = !!initial;

  const [name, setName]     = useState(initial?.name ?? '');
  const [desc, setDesc]     = useState(initial?.description ?? '');
  const [color, setColor]   = useState<DocFolderColor>(initial?.color ?? 'blue');
  const busy = createFolder.isPending || updateFolder.isPending;

  async function handleSubmit() {
    if (!name.trim()) { toast({ title: 'Folder name required', variant: 'destructive' }); return; }
    try {
      if (isEdit && initial) {
        await updateFolder.mutateAsync({ id: initial.id, data: { name: name.trim(), description: desc || null, color } });
        toast({ title: 'Folder updated' });
      } else {
        await createFolder.mutateAsync({ name: name.trim(), description: desc || null, color });
        toast({ title: 'Folder created' });
      }
      onClose();
    } catch {
      toast({ title: 'Something went wrong', variant: 'destructive' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="bg-[#0d1117] border-white/[0.1] text-white max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Folder' : 'New Folder'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs">Name *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Folder name"
              className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/30" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs">Description</Label>
            <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Optional"
              className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/30" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs">Color</Label>
            <div className="flex gap-2 flex-wrap">
              {DOC_FOLDER_COLORS.map(c => {
                const m = folderColorMap[c];
                return (
                  <button key={c} onClick={() => setColor(c)}
                    className={`w-7 h-7 rounded-lg bg-gradient-to-br ${m.bg} border-2 transition-all
                      ${color === c ? m.border.replace('border-', 'border-') + ' scale-110' : 'border-transparent opacity-60 hover:opacity-100'}`}
                  />
                );
              })}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}
              className="border-white/[0.1] bg-transparent text-white/60 hover:text-white">Cancel</Button>
            <Button onClick={handleSubmit} disabled={busy} className="bg-[#2563EB] hover:bg-[#1d4ed8]">
              {busy ? 'Saving…' : isEdit ? 'Save' : 'Create'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Share Dialog ──────────────────────────────────────────────────────────────

function ShareDialog({ doc, onClose }: { doc: DocDocument | null; onClose: () => void }) {
  const { toast } = useToast();
  const shareDoc    = useShareDocDocument();
  const deleteShare = useDeleteDocShare();
  const { data: sharesData } = useDocShares(doc?.id ?? null);
  const shares = sharesData?.data ?? [];

  const [email, setEmail]         = useState('');
  const [permission, setPerm]     = useState<'view' | 'edit'>('view');

  async function handleShare() {
    if (!email.trim() || !doc) return;
    try {
      await shareDoc.mutateAsync({ id: doc.id, data: { sharedWithEmail: email.trim(), permission } });
      toast({ title: 'Document shared' });
      setEmail('');
    } catch {
      toast({ title: 'Failed to share', variant: 'destructive' });
    }
  }

  async function handleRevoke(shareId: number) {
    if (!doc) return;
    try {
      await deleteShare.mutateAsync({ documentId: doc.id, shareId });
      toast({ title: 'Access revoked' });
    } catch {
      toast({ title: 'Failed to revoke', variant: 'destructive' });
    }
  }

  return (
    <Dialog open={doc !== null} onOpenChange={v => !v && onClose()}>
      <DialogContent className="bg-[#0d1117] border-white/[0.1] text-white max-w-md">
        <DialogHeader>
          <DialogTitle>Share Document</DialogTitle>
          <DialogDescription className="text-white/40 truncate">{doc?.name}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address"
              className="flex-1 bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/30" />
            <Select value={permission} onValueChange={v => setPerm(v as 'view' | 'edit')}>
              <SelectTrigger className="w-24 bg-white/[0.05] border-white/[0.1] text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="view">View</SelectItem>
                <SelectItem value="edit">Edit</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleShare} disabled={!email.trim() || shareDoc.isPending}
              className="bg-[#2563EB] hover:bg-[#1d4ed8] px-3">
              <Share2 className="w-4 h-4" />
            </Button>
          </div>

          {shares.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-white/40">Shared with</p>
              {shares.map(s => (
                <div key={s.id} className="flex items-center gap-2 bg-white/[0.03] rounded-lg px-3 py-2">
                  <div className="w-7 h-7 rounded-full bg-[#2563EB]/20 flex items-center justify-center text-xs text-[#2563EB] font-medium flex-shrink-0">
                    {s.sharedWithEmail[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{s.sharedWithEmail}</p>
                    <p className="text-xs text-white/30 capitalize">{s.permission} access</p>
                  </div>
                  <button onClick={() => handleRevoke(s.id)}
                    className="text-white/20 hover:text-red-400 transition-colors p-1">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 p-3 bg-white/[0.03] rounded-lg">
            <Link className="w-4 h-4 text-white/30 flex-shrink-0" />
            <p className="text-xs text-white/40 flex-1">Shared users will receive email access to view this document.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Version History Dialog ────────────────────────────────────────────────────

function VersionHistoryDialog({ doc, onClose }: { doc: DocDocument | null; onClose: () => void }) {
  const { data } = useDocVersions(doc?.id ?? null);
  const versions = data?.data ?? [];

  return (
    <Dialog open={doc !== null} onOpenChange={v => !v && onClose()}>
      <DialogContent className="bg-[#0d1117] border-white/[0.1] text-white max-w-md">
        <DialogHeader>
          <DialogTitle>Version History</DialogTitle>
          <DialogDescription className="text-white/40 truncate">{doc?.name}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {versions.length === 0 ? (
            <p className="text-center text-white/30 text-sm py-6">No version history</p>
          ) : versions.map((v, i) => (
            <div key={v.id} className="flex items-start gap-3 p-3 bg-white/[0.03] rounded-lg">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                ${i === 0 ? 'bg-[#2563EB]/20 text-[#2563EB]' : 'bg-white/5 text-white/40'}`}>
                v{v.version}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white">{v.changeNote ?? 'No notes'}</p>
                <p className="text-xs text-white/30 mt-0.5">{fmtFileSize(v.fileSize)} · {timeAgo(v.createdAt)}</p>
              </div>
              {i === 0 && <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 text-[10px]">Current</Badge>}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Move Dialog ───────────────────────────────────────────────────────────────

function MoveDialog({
  doc, folders, onClose,
}: { doc: DocDocument | null; folders: DocFolder[]; onClose: () => void }) {
  const { toast } = useToast();
  const move = useMoveDocDocument();
  const [folderId, setFolderId] = useState<string>('_none');

  async function handleMove() {
    if (!doc) return;
    try {
      await move.mutateAsync({ id: doc.id, folderId: folderId !== '_none' ? parseInt(folderId) : null });
      toast({ title: 'Document moved' });
      onClose();
    } catch {
      toast({ title: 'Failed to move', variant: 'destructive' });
    }
  }

  return (
    <Dialog open={doc !== null} onOpenChange={v => !v && onClose()}>
      <DialogContent className="bg-[#0d1117] border-white/[0.1] text-white max-w-sm">
        <DialogHeader>
          <DialogTitle>Move to Folder</DialogTitle>
          <DialogDescription className="text-white/40 truncate">{doc?.name}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Select value={folderId} onValueChange={setFolderId}>
            <SelectTrigger className="bg-white/[0.05] border-white/[0.1] text-white">
              <SelectValue placeholder="Select folder" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">No folder (root)</SelectItem>
              {folders.map(f => (
                <SelectItem key={f.id} value={String(f.id)}>{f.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}
              className="border-white/[0.1] bg-transparent text-white/60 hover:text-white">Cancel</Button>
            <Button onClick={handleMove} disabled={move.isPending}
              className="bg-[#2563EB] hover:bg-[#1d4ed8]">
              {move.isPending ? 'Moving…' : 'Move'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Document Row ──────────────────────────────────────────────────────────────

function DocRow({
  doc, onStar, onArchive, onShare, onHistory, onMove, onDelete, canEdit, canDelete: canDel,
}: {
  doc: DocDocument;
  onStar: () => void; onArchive: () => void;
  onShare: () => void; onHistory: () => void;
  onMove: () => void; onDelete: () => void;
  canEdit: boolean; canDelete: boolean;
}) {
  const [downloading, setDownloading] = useState(false);
  const { data: docDetail } = useDocDocument(downloading ? doc.id : null);

  function handleDownload() {
    setDownloading(true);
  }

  // Trigger download when content loads
  if (downloading && docDetail?.data?.fileContent) {
    const d       = docDetail.data;
    const content = d.fileContent as string;
    const mime    = d.mimeType ?? 'application/octet-stream';
    const binary  = atob(content);
    const bytes   = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: mime });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = d.name; a.click();
    URL.revokeObjectURL(url);
    setDownloading(false);
  }

  const folderC = folderColorMap[doc.folderColor ?? 'slate'] ?? folderColorMap.slate;

  return (
    <tr className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors group">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <FileTypeIcon type={doc.fileType} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate max-w-[260px]">{doc.name}</p>
            <p className="text-xs text-white/30">{doc.docNumber} · v{doc.version}</p>
          </div>
          {doc.isStarred && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 flex-shrink-0" />}
          {doc.isShared && <Share2 className="w-3 h-3 text-[#2563EB] flex-shrink-0" />}
        </div>
      </td>
      <td className="px-4 py-3">
        {doc.folderName ? (
          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-gradient-to-r ${folderC.bg} ${folderC.text}`}>
            <Folder className="w-3 h-3" />{doc.folderName}
          </span>
        ) : (
          <span className="text-xs text-white/20">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        {doc.tags ? (
          <div className="flex gap-1 flex-wrap">
            {doc.tags.split(',').slice(0, 2).map(t => (
              <span key={t} className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-white/[0.05] text-white/40">
                <Tag className="w-2.5 h-2.5" />{t.trim()}
              </span>
            ))}
          </div>
        ) : <span className="text-xs text-white/20">—</span>}
      </td>
      <td className="px-4 py-3 text-xs text-white/40">{timeAgo(doc.updatedAt)}</td>
      <td className="px-4 py-3 text-xs text-white/50">{fmtFileSize(doc.fileSize)}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onStar} title={doc.isStarred ? 'Unstar' : 'Star'}
            className={`p-1.5 rounded hover:bg-white/[0.07] transition-colors ${doc.isStarred ? 'text-amber-400' : 'text-white/30 hover:text-amber-400'}`}>
            <Star className={`w-3.5 h-3.5 ${doc.isStarred ? 'fill-amber-400' : ''}`} />
          </button>
          <button onClick={handleDownload} title="Download"
            className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors">
            {downloading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          </button>
          <button onClick={onShare} title="Share"
            className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-[#2563EB] transition-colors">
            <Share2 className="w-3.5 h-3.5" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors">
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[#0d1117] border-white/[0.1] text-white min-w-[160px]">
              <DropdownMenuItem onClick={onHistory} className="text-sm cursor-pointer hover:bg-white/[0.07]">
                <History className="w-3.5 h-3.5 mr-2" />Version History
              </DropdownMenuItem>
              {canEdit && (
                <DropdownMenuItem onClick={onMove} className="text-sm cursor-pointer hover:bg-white/[0.07]">
                  <Folder className="w-3.5 h-3.5 mr-2" />Move to Folder
                </DropdownMenuItem>
              )}
              {canEdit && (
                <DropdownMenuItem onClick={onArchive} className="text-sm cursor-pointer hover:bg-white/[0.07]">
                  <Archive className="w-3.5 h-3.5 mr-2" />{doc.status === 'active' ? 'Archive' : 'Restore'}
                </DropdownMenuItem>
              )}
              {canDel && (
                <>
                  <DropdownMenuSeparator className="bg-white/[0.07]" />
                  <DropdownMenuItem onClick={onDelete} className="text-sm cursor-pointer text-red-400 hover:bg-red-500/10 hover:text-red-400">
                    <Trash2 className="w-3.5 h-3.5 mr-2" />Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </td>
    </tr>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Documents() {
  const { toast } = useToast();

  // UI state
  const [tab, setTab]               = useState('all');
  const [search, setSearch]         = useState('');
  const [activeFolderId, setFolder] = useState<number | null | undefined>(undefined);
  const [filterType, setFilterType] = useState('');

  // Dialog state
  const [uploadOpen, setUploadOpen]             = useState(false);
  const [folderFormOpen, setFolderFormOpen]     = useState(false);
  const [editFolder, setEditFolder]             = useState<DocFolder | null>(null);
  const [shareDoc, setShareDoc]                 = useState<DocDocument | null>(null);
  const [historyDoc, setHistoryDoc]             = useState<DocDocument | null>(null);
  const [moveDoc, setMoveDoc]                   = useState<DocDocument | null>(null);

  // Data
  const { data: permsData } = useDocPermissions();
  const perms = permsData?.data ?? { canView: true, canCreate: true, canEdit: true, canDelete: true };

  const { data: summaryData } = useDocSummary();
  const summary = summaryData?.data;

  const { data: foldersData } = useDocFolders();
  const folders = foldersData?.data ?? [];

  const docParams = {
    search:   search || undefined,
    folderId: activeFolderId,
    fileType: filterType || undefined,
    starred:  tab === 'starred' || undefined,
    recent:   tab === 'recent' || undefined,
    shared:   tab === 'shared' || undefined,
    archived: tab === 'archived' || undefined,
  };
  // Strip undefined keys
  const cleanParams = Object.fromEntries(Object.entries(docParams).filter(([, v]) => v !== undefined));

  const { data: docsData, isLoading } = useDocDocuments(cleanParams);
  const docs = docsData?.data ?? [];
  const total = docsData?.total ?? 0;

  const deleteFolder  = useDeleteDocFolder();
  const starDoc       = useStarDocDocument();
  const archiveDoc    = useArchiveDocDocument();
  const deleteDoc     = useDeleteDocDocument();

  async function handleDeleteFolder(f: DocFolder) {
    try {
      await deleteFolder.mutateAsync(f.id);
      if (activeFolderId === f.id) setFolder(undefined);
      toast({ title: 'Folder deleted' });
    } catch {
      toast({ title: 'Failed to delete folder', variant: 'destructive' });
    }
  }

  async function handleStar(doc: DocDocument) {
    try {
      await starDoc.mutateAsync(doc.id);
    } catch {
      toast({ title: 'Failed to update', variant: 'destructive' });
    }
  }

  async function handleArchive(doc: DocDocument) {
    try {
      await archiveDoc.mutateAsync(doc.id);
      toast({ title: doc.status === 'active' ? 'Document archived' : 'Document restored' });
    } catch {
      toast({ title: 'Failed to archive', variant: 'destructive' });
    }
  }

  async function handleDelete(doc: DocDocument) {
    try {
      await deleteDoc.mutateAsync(doc.id);
      toast({ title: 'Document deleted' });
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? 'Failed to delete';
      toast({ title: msg, variant: 'destructive' });
    }
  }

  const summaryCards = [
    { label: 'Total Documents', value: summary?.totalDocs ?? 0,    icon: FileText, color: 'from-[#2563EB]/20 to-[#06B6D4]/20', text: 'text-[#2563EB]' },
    { label: 'Folders',         value: summary?.totalFolders ?? 0, icon: Folder,   color: 'from-amber-500/20 to-orange-500/20', text: 'text-amber-400' },
    { label: 'Starred',         value: summary?.starred ?? 0,      icon: Star,     color: 'from-purple-500/20 to-indigo-500/20', text: 'text-purple-400' },
    { label: 'Storage Used',    value: summary?.storageUsed ?? '0 B', icon: Archive, color: 'from-emerald-500/20 to-teal-500/20', text: 'text-emerald-400' },
  ];

  const activeFolder = folders.find(f => f.id === activeFolderId);

  return (
    <AppLayout breadcrumbs={[{ label: 'Business' }, { label: 'Documents' }]}>
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Documents</h1>
            <p className="text-white/40 text-sm mt-0.5">
              {summary ? `${summary.totalDocs} files · ${summary.storageUsed} storage used` : 'Loading…'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {perms.canCreate && (
              <>
                <Button variant="outline" size="sm" onClick={() => setFolderFormOpen(true)}
                  className="border-white/[0.1] bg-transparent text-white/60 hover:text-white hover:bg-white/[0.05]">
                  <FolderPlus className="w-3.5 h-3.5 mr-1.5" />New Folder
                </Button>
                <Button size="sm" onClick={() => setUploadOpen(true)}
                  className="bg-[#2563EB] hover:bg-[#1d4ed8]">
                  <Upload className="w-3.5 h-3.5 mr-1.5" />Upload
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {summaryCards.map(c => (
            <div key={c.label} className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-white/40">{c.label}</span>
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${c.color} flex items-center justify-center`}>
                  <c.icon className={`w-4 h-4 ${c.text}`} />
                </div>
              </div>
              <div className="text-2xl font-bold text-white">{c.value}</div>
            </div>
          ))}
        </div>

        {/* Folders Grid */}
        {folders.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-white/60">Folders</h2>
              {activeFolderId !== undefined && (
                <button onClick={() => setFolder(undefined)}
                  className="text-xs text-[#2563EB] hover:underline flex items-center gap-1">
                  <X className="w-3 h-3" />Clear filter
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {folders.map(f => {
                const c = folderColorMap[f.color] ?? folderColorMap.blue;
                const isActive = activeFolderId === f.id;
                return (
                  <div key={f.id}
                    onClick={() => setFolder(isActive ? undefined : f.id)}
                    className={`bg-[#0a0f1e] border rounded-xl p-3 cursor-pointer transition-all group relative
                      ${isActive ? `border-${f.color === 'blue' ? '[#2563EB]' : f.color}-500/40 bg-${f.color === 'blue' ? '[#2563EB]' : f.color}-500/5` : 'border-white/[0.07] hover:border-white/[0.14]'}`}>
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${c.bg} flex items-center justify-center mb-2`}>
                      <Folder className={`w-5 h-5 ${c.text}`} />
                    </div>
                    <p className="text-sm font-medium text-white truncate">{f.name}</p>
                    <p className="text-xs text-white/40 mt-0.5">{f.docCount} files · {fmtFileSize(f.totalBytes)}</p>
                    {/* Folder actions */}
                    {perms.canEdit && (
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button onClick={e => e.stopPropagation()}
                              className="p-1 rounded hover:bg-white/[0.1] text-white/30 hover:text-white/70">
                              <MoreHorizontal className="w-3.5 h-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-[#0d1117] border-white/[0.1] text-white">
                            <DropdownMenuItem onClick={e => { e.stopPropagation(); setEditFolder(f); setFolderFormOpen(true); }}
                              className="text-sm cursor-pointer hover:bg-white/[0.07]">
                              Edit
                            </DropdownMenuItem>
                            {perms.canDelete && (
                              <DropdownMenuItem onClick={e => { e.stopPropagation(); handleDeleteFolder(f); }}
                                className="text-sm cursor-pointer text-red-400 hover:bg-red-500/10 hover:text-red-400">
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Documents Table */}
        <div>
          <Tabs value={tab} onValueChange={v => { setTab(v); setFolder(undefined); }}>
            <div className="flex items-center justify-between mb-3">
              <TabsList className="bg-white/[0.04] border border-white/[0.07]">
                {[
                  { value: 'all',      label: 'All Files' },
                  { value: 'starred',  label: 'Starred' },
                  { value: 'recent',   label: 'Recent' },
                  { value: 'shared',   label: 'Shared' },
                  { value: 'archived', label: 'Archived' },
                ].map(t => (
                  <TabsTrigger key={t.value} value={t.value}
                    className="data-[state=active]:bg-[#2563EB] data-[state=active]:text-white text-white/50 text-xs">
                    {t.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              <div className="flex items-center gap-2">
                {activeFolder && (
                  <Badge className="bg-[#2563EB]/15 text-[#2563EB] border-[#2563EB]/20 text-xs flex items-center gap-1">
                    <Folder className="w-3 h-3" />{activeFolder.name}
                    <button onClick={() => setFolder(undefined)}><X className="w-3 h-3 ml-0.5" /></button>
                  </Badge>
                )}
                <Select value={filterType || '_all'} onValueChange={v => setFilterType(v === '_all' ? '' : v)}>
                  <SelectTrigger className="h-8 text-xs w-28 bg-white/[0.05] border-white/[0.1] text-white/70">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">All Types</SelectItem>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="excel">Excel</SelectItem>
                    <SelectItem value="word">Word</SelectItem>
                    <SelectItem value="image">Image</SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                  <Input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search files…"
                    className="pl-9 h-8 text-sm w-48 bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/30" />
                </div>
              </div>
            </div>

            {['all', 'starred', 'recent', 'shared', 'archived'].map(tabVal => (
              <TabsContent key={tabVal} value={tabVal}>
                {isLoading ? (
                  <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-8 text-center text-white/30 text-sm">
                    Loading documents…
                  </div>
                ) : docs.length === 0 ? (
                  <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-12 text-center">
                    <FileText className="w-12 h-12 text-white/10 mx-auto mb-3" />
                    <p className="text-white/50 font-medium">
                      {tabVal === 'starred' ? 'No starred documents' :
                       tabVal === 'recent'  ? 'No recent activity' :
                       tabVal === 'shared'  ? 'No shared documents' :
                       tabVal === 'archived'? 'Archive is empty' :
                       'No documents yet'}
                    </p>
                    <p className="text-white/30 text-sm mt-1 mb-4">
                      {tabVal === 'all' && 'Upload your first document to get started'}
                    </p>
                    {tabVal === 'all' && perms.canCreate && (
                      <Button size="sm" onClick={() => setUploadOpen(true)}
                        className="bg-[#2563EB] hover:bg-[#1d4ed8]">
                        <Upload className="w-3.5 h-3.5 mr-1.5" />Upload Document
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/[0.07]">
                          {['Name', 'Folder', 'Tags', 'Modified', 'Size', ''].map(h => (
                            <th key={h} className="px-4 py-3 text-left text-xs text-white/30 font-medium">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {docs.map(doc => (
                          <DocRow key={doc.id} doc={doc}
                            canEdit={perms.canEdit}
                            canDelete={perms.canDelete}
                            onStar={() => handleStar(doc)}
                            onArchive={() => handleArchive(doc)}
                            onShare={() => setShareDoc(doc)}
                            onHistory={() => setHistoryDoc(doc)}
                            onMove={() => setMoveDoc(doc)}
                            onDelete={() => handleDelete(doc)}
                          />
                        ))}
                      </tbody>
                    </table>
                    <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.05]">
                      <p className="text-xs text-white/30">
                        Showing {docs.length} of {total} file{total !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>

      {/* Dialogs */}
      <UploadDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        folders={folders}
        defaultFolderId={activeFolderId ?? null}
      />
      <FolderFormDialog
        open={folderFormOpen || editFolder !== null}
        onClose={() => { setFolderFormOpen(false); setEditFolder(null); }}
        initial={editFolder}
      />
      <ShareDialog doc={shareDoc} onClose={() => setShareDoc(null)} />
      <VersionHistoryDialog doc={historyDoc} onClose={() => setHistoryDoc(null)} />
      <MoveDialog doc={moveDoc} folders={folders} onClose={() => setMoveDoc(null)} />
    </AppLayout>
  );
}
