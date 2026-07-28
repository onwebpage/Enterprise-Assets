import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Folder, Upload, Download, Search, Filter, MoreHorizontal, Plus, Eye, Share2, Trash2, Star, Clock, Tag, File, FileImage, FileSpreadsheet, Archive } from 'lucide-react';
import AppLayout from '@/components/app/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const folders = [
  { name: 'Contracts', count: 48, size: '284 MB', icon: FileText, color: 'text-[#2563EB]', bg: 'from-[#2563EB]/20 to-[#2563EB]/5' },
  { name: 'Invoices', count: 1284, size: '1.2 GB', icon: FileSpreadsheet, color: 'text-emerald-400', bg: 'from-emerald-500/20 to-emerald-500/5' },
  { name: 'HR Documents', count: 342, size: '840 MB', icon: Folder, color: 'text-amber-400', bg: 'from-amber-500/20 to-amber-500/5' },
  { name: 'Financial Reports', count: 124, size: '620 MB', icon: FileText, color: 'text-[#06B6D4]', bg: 'from-[#06B6D4]/20 to-[#06B6D4]/5' },
  { name: 'Product Assets', count: 891, size: '4.8 GB', icon: FileImage, color: 'text-purple-400', bg: 'from-purple-500/20 to-purple-500/5' },
  { name: 'Compliance', count: 67, size: '340 MB', icon: Archive, color: 'text-rose-400', bg: 'from-rose-500/20 to-rose-500/5' },
];

const documents = [
  { id: 'DOC-1081', name: 'Stratford Industries Master Agreement.pdf', folder: 'Contracts', size: '2.4 MB', modified: 'Jul 25, 2026', modifiedBy: 'James D.', type: 'PDF', starred: true },
  { id: 'DOC-1080', name: 'Q2 2026 Financial Report.xlsx', folder: 'Financial Reports', size: '1.8 MB', modified: 'Jul 20, 2026', modifiedBy: 'Sarah K.', type: 'Excel', starred: true },
  { id: 'DOC-1079', name: 'Employee Handbook v3.2.pdf', folder: 'HR Documents', size: '4.1 MB', modified: 'Jul 18, 2026', modifiedBy: 'HR Team', type: 'PDF', starred: false },
  { id: 'DOC-1078', name: 'Product Catalog 2026.pdf', folder: 'Product Assets', size: '18.2 MB', modified: 'Jul 15, 2026', modifiedBy: 'Marketing', type: 'PDF', starred: false },
  { id: 'DOC-1077', name: 'Vendor Agreement — TechParts.docx', folder: 'Contracts', size: '892 KB', modified: 'Jul 12, 2026', modifiedBy: 'Mike R.', type: 'Word', starred: false },
  { id: 'DOC-1076', name: 'GST Compliance Checklist FY26.pdf', folder: 'Compliance', size: '1.1 MB', modified: 'Jul 10, 2026', modifiedBy: 'Finance', type: 'PDF', starred: true },
];

const typeIcon = (type: string) => {
  switch (type) {
    case 'PDF': return <div className="w-7 h-7 rounded-lg bg-red-500/15 border border-red-500/20 flex items-center justify-center"><FileText className="w-3.5 h-3.5 text-red-400" /></div>;
    case 'Excel': return <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center"><FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" /></div>;
    case 'Word': return <div className="w-7 h-7 rounded-lg bg-[#2563EB]/15 border border-[#2563EB]/20 flex items-center justify-center"><FileText className="w-3.5 h-3.5 text-[#2563EB]" /></div>;
    default: return <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center"><File className="w-3.5 h-3.5 text-white/40" /></div>;
  }
};

export default function Documents() {
  const [tab, setTab] = useState('all');
  return (
    <AppLayout breadcrumbs={[{ label: 'Business' }, { label: 'Documents' }]}>
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold text-white">Documents</h1><p className="text-white/40 text-sm mt-0.5">2,756 files · 8.1 GB storage used</p></div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="border-white/[0.1] bg-transparent text-white/60 hover:text-white hover:bg-white/[0.05]"><Upload className="w-3.5 h-3.5 mr-1.5" />Upload</Button>
            <Button size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8]"><Plus className="w-3.5 h-3.5 mr-1.5" />New Folder</Button>
          </div>
        </div>

        {/* Folders */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {folders.map((f, i) => (
            <motion.div key={f.name} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-4 hover:border-white/[0.15] transition-all cursor-pointer group">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${f.bg} flex items-center justify-center mb-3 group-hover:scale-105 transition-transform`}>
                <f.icon className={`w-5 h-5 ${f.color}`} />
              </div>
              <p className="text-sm font-semibold text-white truncate">{f.name}</p>
              <p className="text-xs text-white/40 mt-0.5">{f.count} files</p>
              <p className="text-xs text-white/25">{f.size}</p>
            </motion.div>
          ))}
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <div className="flex items-center justify-between">
            <TabsList className="bg-white/[0.04] border border-white/[0.07]">
              {['all', 'starred', 'recent', 'shared'].map(t => (
                <TabsTrigger key={t} value={t} className="data-[state=active]:bg-[#2563EB] data-[state=active]:text-white text-white/50 capitalize">{t}</TabsTrigger>
              ))}
            </TabsList>
            <div className="flex items-center gap-2">
              <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" /><Input placeholder="Search documents..." className="pl-9 bg-white/[0.04] border-white/[0.07] text-white placeholder:text-white/30 h-8 text-sm w-52" /></div>
              <Button variant="outline" size="sm" className="border-white/[0.1] bg-transparent text-white/60 hover:text-white hover:bg-white/[0.05]"><Filter className="w-3.5 h-3.5 mr-1.5" />Filter</Button>
            </div>
          </div>

          {['all', 'starred', 'recent', 'shared'].map(tabVal => (
            <TabsContent key={tabVal} value={tabVal} className="mt-4">
              <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead><tr className="border-b border-white/[0.05]">{['Name', 'Folder', 'Modified', 'Modified By', 'Size', ''].map(h => (<th key={h} className="text-left text-xs font-medium text-white/30 px-4 py-3">{h}</th>))}</tr></thead>
                  <tbody>
                    {documents.filter(d => tabVal === 'starred' ? d.starred : true).map((doc) => (
                      <tr key={doc.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors group">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {typeIcon(doc.type)}
                            <div>
                              <p className="text-sm font-medium text-white truncate max-w-[280px]">{doc.name}</p>
                              <p className="text-xs text-white/30">{doc.id}</p>
                            </div>
                            {doc.starred && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 ml-1" />}
                          </div>
                        </td>
                        <td className="px-4 py-3"><Badge className="bg-white/5 text-white/50 border-white/10 text-xs">{doc.folder}</Badge></td>
                        <td className="px-4 py-3 text-sm text-white/40">{doc.modified}</td>
                        <td className="px-4 py-3 text-sm text-white/50">{doc.modifiedBy}</td>
                        <td className="px-4 py-3 text-sm text-white/40">{doc.size}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors"><Eye className="w-3.5 h-3.5" /></button>
                            <button className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors"><Download className="w-3.5 h-3.5" /></button>
                            <button className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors"><Share2 className="w-3.5 h-3.5" /></button>
                            <button className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.05]">
                  <p className="text-xs text-white/30">Showing {documents.filter(d => tabVal === 'starred' ? d.starred : true).length} of 2,756 files</p>
                  <div className="flex items-center gap-1">{[1, 2, 3, '...', 460].map((p, i) => (<button key={i} className={`w-7 h-7 rounded text-xs ${p === 1 ? 'bg-[#2563EB] text-white' : 'text-white/40 hover:bg-white/[0.05]'}`}>{p}</button>))}</div>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </AppLayout>
  );
}
