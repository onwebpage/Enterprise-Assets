import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/contexts/auth';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Building2, DollarSign, Users, ShoppingCart,
  Package, Factory, FolderKanban, UserCog, Receipt, CreditCard,
  BarChart3, Bot, Zap, FileText, Globe, Truck, Settings,
  Shield, CreditCard as BillingIcon, Bell, Search, ChevronDown,
  ChevronRight, Menu, X, LogOut, User, HelpCircle, Sparkles,
  Command, Sun, Moon, Maximize2, Plus, ArrowUpRight, Check,
  Building, Landmark
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const navGroups = [
  {
    label: 'Overview',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/app/dashboard' },
    ]
  },
  {
    label: 'Finance',
    items: [
      { icon: DollarSign, label: 'Financial Accounting', path: '/app/finance' },
      { icon: Landmark,  label: 'Accounts Receivable',  path: '/app/ar' },
      { icon: CreditCard, label: 'Accounts Payable',   path: '/app/ap' },
      { icon: CreditCard, label: 'Bank Reconciliation', path: '/app/banking' },
      { icon: Package,   label: 'Fixed Assets',        path: '/app/fixed-assets' },
      { icon: Receipt,   label: 'GST & Tax',           path: '/app/gst' },
    ]
  },
  {
    label: 'Operations',
    items: [
      { icon: Users, label: 'Sales & CRM', path: '/app/sales' },
      { icon: ShoppingCart, label: 'Purchase', path: '/app/purchase' },
      { icon: Package, label: 'Inventory', path: '/app/inventory' },
      { icon: Factory, label: 'Manufacturing', path: '/app/manufacturing' },
    ]
  },
  {
    label: 'Business',
    items: [
      { icon: FolderKanban, label: 'Projects', path: '/app/projects' },
      { icon: UserCog, label: 'HR & Payroll', path: '/app/hr' },
      { icon: FileText, label: 'Documents', path: '/app/documents' },
    ]
  },
  {
    label: 'Intelligence',
    items: [
      { icon: BarChart3, label: 'Reports & Analytics', path: '/app/reports' },
      { icon: Bot, label: 'AI Assistant', path: '/app/ai' },
      { icon: Zap, label: 'Workflow Automation', path: '/app/workflow' },
    ]
  },
  {
    label: 'Portals',
    items: [
      { icon: Globe, label: 'Customer Portal', path: '/app/customer-portal' },
      { icon: Truck, label: 'Vendor Portal', path: '/app/vendor-portal' },
    ]
  },
  {
    label: 'Administration',
    items: [
      { icon: Building2, label: 'Organization', path: '/app/organization' },
      { icon: User, label: 'User Management', path: '/app/users' },
      { icon: Shield, label: 'Roles & Permissions', path: '/app/roles' },
      { icon: Settings, label: 'Settings', path: '/app/settings' },
      { icon: BillingIcon, label: 'Subscription & Billing', path: '/app/billing' },
    ]
  },
];

const companies = [
  { name: 'Apex Global Inc.', plan: 'Enterprise', logo: 'AG' },
  { name: 'Meridian Corp', plan: 'Professional', logo: 'MC' },
  { name: 'Stratford Industries', plan: 'Enterprise', logo: 'SI' },
];

const notifications = [
  { id: 1, title: 'Invoice #INV-4821 paid', desc: 'Stratford Industries · $48,200', time: '2m ago', color: 'bg-emerald-500', unread: true },
  { id: 2, title: 'Low stock alert', desc: 'SKU-2841 below reorder point', time: '18m ago', color: 'bg-amber-500', unread: true },
  { id: 3, title: 'New purchase order', desc: 'PO-1092 awaiting approval', time: '1h ago', color: 'bg-[#2563EB]', unread: true },
  { id: 4, title: 'Payroll processed', desc: '342 employees · July 2026', time: '3h ago', color: 'bg-[#06B6D4]', unread: false },
  { id: 5, title: 'AI Insight ready', desc: 'Q3 revenue forecast updated', time: '5h ago', color: 'bg-purple-500', unread: false },
];

interface AppLayoutProps {
  children: React.ReactNode;
  breadcrumbs?: { label: string; path?: string }[];
}

export default function AppLayout({ children, breadcrumbs = [] }: AppLayoutProps) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [currentCompany, setCurrentCompany] = useState(companies[0]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [unreadCount] = useState(3);
  const { user, logout } = useAuth();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === 'Escape') setSearchOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-white/[0.07] ${!sidebarOpen ? 'justify-center' : ''}`}>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2563EB] to-[#06B6D4] flex items-center justify-center flex-shrink-0">
          <Building className="w-4 h-4 text-white" />
        </div>
        <AnimatePresence>
          {sidebarOpen && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="font-bold text-white text-lg tracking-tight overflow-hidden whitespace-nowrap"
            >
              OmniERP
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Company Switcher */}
      {sidebarOpen && (
        <div className="px-3 pt-3 pb-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/[0.05] transition-colors group">
                <div className="w-7 h-7 rounded-md bg-gradient-to-br from-[#2563EB]/40 to-[#06B6D4]/40 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                  {currentCompany.logo}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium text-white truncate">{currentCompany.name}</p>
                  <p className="text-xs text-white/40">{currentCompany.plan}</p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-white/40 group-hover:text-white/70 transition-colors" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 bg-[#0a0f1e] border-white/[0.07] text-white">
              <DropdownMenuLabel className="text-white/40 text-xs">Switch Company</DropdownMenuLabel>
              {companies.map((co) => (
                <DropdownMenuItem key={co.name} onClick={() => setCurrentCompany(co)} className="hover:bg-white/[0.05] cursor-pointer">
                  <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#2563EB]/40 to-[#06B6D4]/40 flex items-center justify-center text-xs font-bold mr-2">{co.logo}</div>
                  <div className="flex-1">
                    <p className="text-sm text-white">{co.name}</p>
                    <p className="text-xs text-white/40">{co.plan}</p>
                  </div>
                  {currentCompany.name === co.name && <Check className="w-3.5 h-3.5 text-[#2563EB]" />}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator className="bg-white/[0.07]" />
              <DropdownMenuItem className="hover:bg-white/[0.05] text-white/60 cursor-pointer">
                <Plus className="w-3.5 h-3.5 mr-2" /> Add Company
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Navigation */}
      <ScrollArea className="flex-1 px-2 py-2">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-4">
            {sidebarOpen && (
              <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest px-3 mb-1">
                {group.label}
              </p>
            )}
            {group.items.map((item) => {
              const active = location === item.path || location.startsWith(item.path + '/');
              return (
                <Tooltip key={item.path} delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Link href={item.path}>
                      <motion.div
                        whileHover={{ x: 2 }}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg mb-0.5 cursor-pointer transition-all group ${
                          active
                            ? 'bg-[#2563EB]/20 text-[#2563EB] border border-[#2563EB]/20'
                            : 'text-white/50 hover:text-white hover:bg-white/[0.05]'
                        } ${!sidebarOpen ? 'justify-center' : ''}`}
                      >
                        <item.icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-[#2563EB]' : ''}`} />
                        {sidebarOpen && (
                          <span className="text-sm font-medium truncate">{item.label}</span>
                        )}
                      </motion.div>
                    </Link>
                  </TooltipTrigger>
                  {!sidebarOpen && (
                    <TooltipContent side="right" className="bg-[#0a0f1e] border-white/[0.07] text-white">
                      {item.label}
                    </TooltipContent>
                  )}
                </Tooltip>
              );
            })}
          </div>
        ))}
      </ScrollArea>

      {/* Bottom */}
      <div className="border-t border-white/[0.07] p-3">
        {sidebarOpen ? (
          <div onClick={logout} className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-white/[0.05] transition-colors cursor-pointer group">
            <Avatar className="w-7 h-7 flex-shrink-0">
              <AvatarImage src="" />
              <AvatarFallback className="bg-gradient-to-br from-[#2563EB] to-[#06B6D4] text-white text-xs font-bold">{user?.initials ?? 'U'}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.displayName ?? 'User'}</p>
              <p className="text-xs text-white/40 truncate">{user?.roleName ?? ''}</p>
            </div>
            <LogOut className="w-3.5 h-3.5 text-white/30 group-hover:text-white/60 transition-colors" />
          </div>
        ) : (
          <div className="flex justify-center">
            <Avatar className="w-7 h-7">
              <AvatarFallback className="bg-gradient-to-br from-[#2563EB] to-[#06B6D4] text-white text-xs font-bold">{user?.initials ?? 'U'}</AvatarFallback>
            </Avatar>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#050816] overflow-hidden">
      {/* Desktop Sidebar */}
      <motion.aside
        animate={{ width: sidebarOpen ? 240 : 64 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="hidden lg:flex flex-col bg-[#07091a] border-r border-white/[0.07] flex-shrink-0 overflow-hidden"
      >
        <SidebarContent />
      </motion.aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25 }}
              className="lg:hidden fixed left-0 top-0 bottom-0 w-64 bg-[#07091a] border-r border-white/[0.07] z-50 flex flex-col"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Nav */}
        <header className="flex items-center gap-3 px-4 lg:px-6 py-3 border-b border-white/[0.07] bg-[#07091a]/80 backdrop-blur-xl flex-shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (window.innerWidth >= 1024) {
                  setSidebarOpen(v => !v);
                } else {
                  setMobileOpen(v => !v);
                }
              }}
              className="p-1.5 rounded-lg hover:bg-white/[0.07] text-white/50 hover:text-white transition-colors"
            >
              <Menu className="w-4 h-4" />
            </button>

            {/* Breadcrumbs */}
            <div className="hidden md:flex items-center gap-1 text-sm">
              <Link href="/app/dashboard">
                <span className="text-white/40 hover:text-white/70 transition-colors cursor-pointer">App</span>
              </Link>
              {breadcrumbs.map((crumb, i) => (
                <span key={i} className="flex items-center gap-1">
                  <ChevronRight className="w-3.5 h-3.5 text-white/20" />
                  {crumb.path ? (
                    <Link href={crumb.path}>
                      <span className={`${i === breadcrumbs.length - 1 ? 'text-white font-medium' : 'text-white/40 hover:text-white/70'} cursor-pointer transition-colors`}>
                        {crumb.label}
                      </span>
                    </Link>
                  ) : (
                    <span className={i === breadcrumbs.length - 1 ? 'text-white font-medium' : 'text-white/40'}>
                      {crumb.label}
                    </span>
                  )}
                </span>
              ))}
            </div>
          </div>

          <div className="flex-1" />

          {/* Search */}
          <button
            onClick={() => setSearchOpen(true)}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.07] hover:bg-white/[0.07] transition-colors text-sm text-white/40 min-w-[200px]"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search...</span>
            <kbd className="ml-auto text-[10px] bg-white/[0.08] px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
          </button>

          {/* AI Button */}
          <Link href="/app/ai">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#2563EB]/20 to-[#06B6D4]/20 border border-[#2563EB]/20 hover:border-[#2563EB]/40 transition-colors text-sm text-white/70 hover:text-white">
              <Sparkles className="w-3.5 h-3.5 text-[#06B6D4]" />
              <span className="hidden sm:inline">AI</span>
            </button>
          </Link>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="relative p-1.5 rounded-lg hover:bg-white/[0.07] text-white/50 hover:text-white transition-colors">
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-[#2563EB] rounded-full" />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 bg-[#0a0f1e] border-white/[0.07] text-white p-0">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07]">
                <p className="font-semibold text-sm">Notifications</p>
                <Badge className="bg-[#2563EB]/20 text-[#2563EB] border-0 text-xs">{unreadCount} new</Badge>
              </div>
              <div className="py-1">
                {notifications.map((n) => (
                  <div key={n.id} className={`flex gap-3 px-4 py-3 hover:bg-white/[0.04] transition-colors cursor-pointer ${n.unread ? 'bg-white/[0.02]' : ''}`}>
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${n.color}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{n.title}</p>
                      <p className="text-xs text-white/40 truncate">{n.desc}</p>
                      <p className="text-xs text-white/25 mt-0.5">{n.time}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-4 py-3 border-t border-white/[0.07]">
                <button className="text-xs text-[#2563EB] hover:underline">View all notifications</button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 hover:bg-white/[0.05] rounded-lg p-1 transition-colors">
                <Avatar className="w-7 h-7">
                  <AvatarFallback className="bg-gradient-to-br from-[#2563EB] to-[#06B6D4] text-white text-xs font-bold">{user?.initials ?? 'U'}</AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 bg-[#0a0f1e] border-white/[0.07] text-white">
              <DropdownMenuLabel>
                <p className="font-semibold">{user?.displayName ?? 'User'}</p>
                <p className="text-xs text-white/40 font-normal">{user?.email ?? ''}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/[0.07]" />
              <DropdownMenuItem className="hover:bg-white/[0.05] cursor-pointer"><User className="w-3.5 h-3.5 mr-2" />Profile</DropdownMenuItem>
              <DropdownMenuItem className="hover:bg-white/[0.05] cursor-pointer"><Settings className="w-3.5 h-3.5 mr-2" />Settings</DropdownMenuItem>
              <DropdownMenuItem className="hover:bg-white/[0.05] cursor-pointer"><HelpCircle className="w-3.5 h-3.5 mr-2" />Help & Support</DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/[0.07]" />
              <DropdownMenuItem onClick={logout} className="hover:bg-white/[0.05] cursor-pointer text-red-400">
                <LogOut className="w-3.5 h-3.5 mr-2" />Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>

      {/* Search Modal */}
      <AnimatePresence>
        {searchOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => setSearchOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="fixed top-24 left-1/2 -translate-x-1/2 w-full max-w-xl z-50"
            >
              <div className="mx-4 bg-[#0a0f1e] border border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.07]">
                  <Search className="w-4 h-4 text-white/40" />
                  <input
                    autoFocus
                    placeholder="Search modules, records, actions..."
                    className="flex-1 bg-transparent text-white text-sm placeholder:text-white/30 outline-none"
                  />
                  <kbd className="text-[10px] bg-white/[0.08] px-1.5 py-0.5 rounded font-mono text-white/40">ESC</kbd>
                </div>
                <div className="p-2">
                  {navGroups.slice(0, 3).flatMap(g => g.items).map((item) => (
                    <Link key={item.path} href={item.path}>
                      <div
                        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/[0.05] cursor-pointer group"
                        onClick={() => setSearchOpen(false)}
                      >
                        <item.icon className="w-4 h-4 text-white/40 group-hover:text-[#2563EB]" />
                        <span className="text-sm text-white/70 group-hover:text-white">{item.label}</span>
                        <ArrowUpRight className="w-3 h-3 text-white/20 ml-auto group-hover:text-white/40" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
