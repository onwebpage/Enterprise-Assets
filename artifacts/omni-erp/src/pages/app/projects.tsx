import { useState } from 'react';
import { motion } from 'framer-motion';
import { FolderKanban, Clock, CheckCircle, Users, Plus, Download, Filter, Search, MoreHorizontal, Calendar, TrendingUp, Target, AlertCircle } from 'lucide-react';
import AppLayout from '@/components/app/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const projects = [
  { id: 'PRJ-041', name: 'ERP Phase 2 Rollout', client: 'Stratford Industries', budget: 248000, spent: 186000, progress: 75, status: 'on_track', team: ['JD', 'SK', 'MR'], due: 'Sep 30, 2026', tasks: 84, done: 63 },
  { id: 'PRJ-040', name: 'Cloud Migration', client: 'Apex Global', budget: 185000, spent: 74000, progress: 40, status: 'at_risk', team: ['AP', 'TB'], due: 'Oct 15, 2026', tasks: 52, done: 21 },
  { id: 'PRJ-039', name: 'HRMS Implementation', client: 'BlueSky Tech', budget: 94500, spent: 94500, progress: 100, status: 'completed', team: ['JD'], due: 'Jul 15, 2026', tasks: 38, done: 38 },
  { id: 'PRJ-038', name: 'Supply Chain Analytics', client: 'Meridian Corp', budget: 67200, spent: 12000, progress: 18, status: 'on_track', team: ['SK', 'AP', 'TB', 'JD'], due: 'Dec 1, 2026', tasks: 41, done: 7 },
  { id: 'PRJ-037', name: 'Manufacturing MES', client: 'Nexus Logistics', budget: 312000, spent: 0, progress: 0, status: 'planned', team: ['MR'], due: 'Jan 15, 2027', tasks: 0, done: 0 },
];

const kanbanTasks = {
  todo: [
    { id: 'T-192', title: 'Design data migration scripts', assignee: 'JD', priority: 'high' },
    { id: 'T-191', title: 'UAT environment setup', assignee: 'MR', priority: 'medium' },
    { id: 'T-190', title: 'Training material preparation', assignee: 'SK', priority: 'low' },
  ],
  inProgress: [
    { id: 'T-189', title: 'Module integration testing', assignee: 'AP', priority: 'high' },
    { id: 'T-188', title: 'Performance benchmarking', assignee: 'TB', priority: 'medium' },
  ],
  review: [
    { id: 'T-187', title: 'Security audit findings', assignee: 'JD', priority: 'high' },
  ],
  done: [
    { id: 'T-186', title: 'Requirements gathering', assignee: 'SK', priority: 'medium' },
    { id: 'T-185', title: 'Architecture design doc', assignee: 'MR', priority: 'high' },
  ],
};

const statusStyle: Record<string, string> = {
  on_track: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  at_risk: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  completed: 'bg-[#06B6D4]/15 text-[#06B6D4] border-[#06B6D4]/20',
  planned: 'bg-white/5 text-white/50 border-white/10',
  delayed: 'bg-red-500/15 text-red-400 border-red-500/20',
};

const priorityColor: Record<string, string> = {
  high: 'border-l-red-400',
  medium: 'border-l-amber-400',
  low: 'border-l-white/20',
};

export default function Projects() {
  const [tab, setTab] = useState('list');
  return (
    <AppLayout breadcrumbs={[{ label: 'Business' }, { label: 'Projects' }]}>
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold text-white">Projects</h1><p className="text-white/40 text-sm mt-0.5">5 projects · $907K total budget · 4 active</p></div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="border-white/[0.1] bg-transparent text-white/60 hover:text-white hover:bg-white/[0.05]"><Download className="w-3.5 h-3.5 mr-1.5" />Export</Button>
            <Button size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8]"><Plus className="w-3.5 h-3.5 mr-1.5" />New Project</Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Active Projects', value: '4', sub: '1 at risk', icon: FolderKanban, color: 'text-[#2563EB]', bg: 'from-[#2563EB]/20 to-[#2563EB]/5' },
            { label: 'Total Budget', value: '$907K', sub: '$366K remaining', icon: Target, color: 'text-emerald-400', bg: 'from-emerald-500/20 to-emerald-500/5' },
            { label: 'Open Tasks', value: '215', sub: '92 in progress', icon: CheckCircle, color: 'text-[#06B6D4]', bg: 'from-[#06B6D4]/20 to-[#06B6D4]/5' },
            { label: 'Team Members', value: '12', sub: 'Across all projects', icon: Users, color: 'text-amber-400', bg: 'from-amber-500/20 to-amber-500/5' },
          ].map((k, i) => (
            <motion.div key={k.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-4 hover:border-white/[0.12] transition-all">
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${k.bg} flex items-center justify-center mb-3`}><k.icon className={`w-4 h-4 ${k.color}`} /></div>
              <p className="text-xl font-bold text-white">{k.value}</p><p className="text-xs text-white/40 mt-0.5">{k.label}</p><p className="text-xs text-white/25 mt-0.5">{k.sub}</p>
            </motion.div>
          ))}
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <div className="flex items-center justify-between">
            <TabsList className="bg-white/[0.04] border border-white/[0.07]">
              {['list', 'kanban', 'timeline'].map(t => (
                <TabsTrigger key={t} value={t} className="data-[state=active]:bg-[#2563EB] data-[state=active]:text-white text-white/50 capitalize">{t}</TabsTrigger>
              ))}
            </TabsList>
            <div className="flex items-center gap-2">
              <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" /><Input placeholder="Search projects..." className="pl-9 bg-white/[0.04] border-white/[0.07] text-white placeholder:text-white/30 h-8 text-sm w-48" /></div>
              <Button variant="outline" size="sm" className="border-white/[0.1] bg-transparent text-white/60 hover:text-white hover:bg-white/[0.05]"><Filter className="w-3.5 h-3.5 mr-1.5" />Filter</Button>
            </div>
          </div>

          <TabsContent value="list" className="mt-4 space-y-3">
            {projects.map((p) => (
              <div key={p.id} className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-4 hover:border-white/[0.12] transition-all cursor-pointer">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-[#2563EB] font-mono">{p.id}</span>
                      <Badge className={`text-[10px] border ${statusStyle[p.status]} px-2 py-0`}>{p.status.replace('_', ' ')}</Badge>
                    </div>
                    <h3 className="font-semibold text-white">{p.name}</h3>
                    <p className="text-xs text-white/40 mt-0.5">{p.client} · Due {p.due}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <div className="flex -space-x-1.5">
                      {p.team.slice(0, 3).map((m) => (
                        <Avatar key={m} className="w-6 h-6 border border-[#0a0f1e]">
                          <AvatarFallback className="bg-gradient-to-br from-[#2563EB]/40 to-[#06B6D4]/40 text-white text-[8px] font-bold">{m}</AvatarFallback>
                        </Avatar>
                      ))}
                      {p.team.length > 3 && <div className="w-6 h-6 rounded-full bg-white/[0.08] border border-[#0a0f1e] flex items-center justify-center text-[8px] text-white/50">+{p.team.length - 3}</div>}
                    </div>
                    <button className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors"><MoreHorizontal className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 mb-3">
                  <div><p className="text-xs text-white/30 mb-0.5">Budget</p><p className="text-sm font-semibold text-white">${p.budget.toLocaleString()}</p></div>
                  <div><p className="text-xs text-white/30 mb-0.5">Spent</p><p className="text-sm font-semibold text-white">${p.spent.toLocaleString()}</p></div>
                  <div><p className="text-xs text-white/30 mb-0.5">Tasks</p><p className="text-sm font-semibold text-white">{p.done}/{p.tasks}</p></div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-white/30">Progress</span>
                    <span className="text-xs font-semibold text-white">{p.progress}%</span>
                  </div>
                  <Progress value={p.progress} className="h-1.5 bg-white/[0.07]" />
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="kanban" className="mt-4">
            <div className="grid grid-cols-4 gap-4">
              {Object.entries(kanbanTasks).map(([col, tasks]) => (
                <div key={col} className="bg-white/[0.02] rounded-xl p-3">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-white/60 capitalize">{col.replace(/([A-Z])/g, ' $1')}</h4>
                    <span className="text-xs bg-white/[0.07] text-white/40 px-2 py-0.5 rounded-full">{tasks.length}</span>
                  </div>
                  <div className="space-y-2">
                    {tasks.map((task) => (
                      <div key={task.id} className={`bg-[#0a0f1e] border border-white/[0.07] border-l-2 ${priorityColor[task.priority]} rounded-lg p-3 cursor-pointer hover:border-white/[0.12] transition-all`}>
                        <p className="text-xs text-white/80 mb-2">{task.title}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-white/30 font-mono">{task.id}</span>
                          <Avatar className="w-5 h-5"><AvatarFallback className="bg-gradient-to-br from-[#2563EB]/40 to-[#06B6D4]/40 text-white text-[8px] font-bold">{task.assignee}</AvatarFallback></Avatar>
                        </div>
                      </div>
                    ))}
                    <button className="w-full p-2 rounded-lg border border-dashed border-white/[0.08] text-white/20 hover:border-white/[0.15] hover:text-white/40 transition-colors text-xs flex items-center justify-center gap-1">
                      <Plus className="w-3 h-3" /> Add task
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="timeline" className="mt-4">
            <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-8 text-center">
              <Calendar className="w-12 h-12 text-white/20 mx-auto mb-3" /><p className="text-white/50 font-medium">Gantt Timeline View</p>
              <p className="text-white/30 text-sm mt-1">Interactive timeline for 5 active projects</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
