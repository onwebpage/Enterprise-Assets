import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth';
import { useNotificationSummary, useNotifications, useMarkRead, useMarkAllRead, TYPE_COLORS, timeAgo } from '@/hooks/useNotifications';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Building2, DollarSign, Users, ShoppingCart,
  Package, Factory, FolderKanban, UserCog, Receipt, CreditCard,
  BarChart3, Bot, Zap, FileText, Globe, Truck, Settings,
  Shield, CreditCard as BillingIcon, Bell, Search, ChevronDown,
  ChevronRight, Menu, X, LogOut, User, HelpCircle, Sparkles,
  Command, Sun, Moon, Maximize2, Plus, ArrowUpRight, Check,
  Building, Landmark, ClipboardList, Server, ListChecks, Coins, ShieldCheck, Wrench, Brain, Database, GitBranch, Plug, MessageCircle
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
import { api, type ApiListResponse } from '@/lib/api';
import BrandLogo from '@/components/BrandLogo';

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
      { icon: DollarSign, label: 'Financial Accounting', path: '/app/finance', featureKey: 'finance' },
      { icon: Coins, label: 'Advanced Budget & Forecasting', path: '/app/budget-cost', featureKey: 'budget_cost' },
      { icon: Landmark,  label: 'Advanced Treasury Management', path: '/app/cash-treasury', featureKey: 'cash_treasury' },
      { icon: Landmark,  label: 'Accounts Receivable',  path: '/app/ar', featureKey: 'accounts_receivable' },
      { icon: CreditCard, label: 'Accounts Payable',   path: '/app/ap', featureKey: 'accounts_payable' },
      { icon: CreditCard, label: 'Bank Reconciliation', path: '/app/banking', featureKey: 'banking' },
      { icon: Package,   label: 'Fixed Assets',        path: '/app/fixed-assets', featureKey: 'fixed_assets' },
      { icon: Receipt,   label: 'GST & Tax',           path: '/app/gst', featureKey: 'gst' },
      { icon: FileText,  label: 'GST Returns',         path: '/app/gst-returns', featureKey: 'gst' },
      { icon: FileText,  label: 'TDS & TCS',           path: '/app/tds', featureKey: 'tds' },
      { icon: FileText,  label: 'E-Invoicing',         path: '/app/einvoicing', featureKey: 'einvoicing' },
      { icon: Truck,     label: 'E-Way Bill',          path: '/app/eway-bill', featureKey: 'eway_bill' },
    ]
  },
  {
    label: 'Operations',
    items: [
      { icon: Users, label: 'Advanced CRM', path: '/app/crm', featureKey: 'crm' },
      { icon: ListChecks, label: 'Order Management', path: '/app/order-management', featureKey: 'order_management' },
      { icon: ShoppingCart, label: 'Purchase', path: '/app/purchase', featureKey: 'purchase' },
      { icon: Package, label: 'Inventory', path: '/app/inventory', featureKey: 'inventory' },
      { icon: Package, label: 'Advanced WMS', path: '/app/wms' },
      { icon: Factory, label: 'Manufacturing', path: '/app/manufacturing', featureKey: 'manufacturing' },
      { icon: ShieldCheck, label: 'Quality Management', path: '/app/quality', featureKey: 'quality' },
      { icon: Wrench, label: 'Maintenance', path: '/app/maintenance', featureKey: 'maintenance' },
      { icon: Receipt, label: 'Expense Management', path: '/app/expense', featureKey: 'expense' },
    ]
  },
  {
    label: 'Business',
    items: [
      { icon: FolderKanban, label: 'Projects', path: '/app/projects', featureKey: 'projects' },
      { icon: UserCog, label: 'HR & Payroll', path: '/app/hr', featureKey: 'hr' },
      { icon: FileText, label: 'Documents', path: '/app/documents', featureKey: 'documents' },
    ]
  },
  {
    label: 'Intelligence',
    items: [
      { icon: BarChart3, label: 'Reports & Analytics', path: '/app/reports', featureKey: 'reports' },
      { icon: Bot, label: 'AI Assistant', path: '/app/ai', featureKey: 'ai' },
      { icon: Brain, label: 'AI Business Intelligence', path: '/app/ai-bi', featureKey: 'ai_bi' },
      { icon: Zap, label: 'Workflow Automation', path: '/app/workflow', featureKey: 'workflow' },
    ]
  },
  {
    label: 'Portals',
    items: [
      { icon: Globe, label: 'Customer Portal', path: '/app/customer-portal', featureKey: 'customer_portal' },
      { icon: Truck, label: 'Vendor Portal', path: '/app/vendor-portal', featureKey: 'vendor_portal' },
    ]
  },
  {
    label: 'Administration',
    items: [
      { icon: Bell, label: 'Notification & Communication Center', path: '/app/notifications', featureKey: 'notifications' },
      { icon: Building2, label: 'Organization', path: '/app/organization' },
      { icon: GitBranch, label: 'Multi-Entity Control', path: '/app/multi-entity' },
      { icon: Database, label: 'Master Data Management', path: '/app/master-data' },
      { icon: User, label: 'User Management', path: '/app/users' },
      { icon: Shield, label: 'Roles & Permissions', path: '/app/roles' },
      { icon: ClipboardList, label: 'Audit Logs', path: '/app/audit-logs' },
      { icon: Settings, label: 'Settings', path: '/app/settings' },
      { icon: BillingIcon, label: 'Subscription & Billing', path: '/app/billing', featureKey: 'billing' },
    ]
  },
  {
    label: 'SaaS',
    items: [
      { icon: Server, label: 'SaaS Platform', path: '/app/saas' },
    ]
  },
  {
    label: 'Integrations',
    items: [
      { icon: Plug, label: 'Social Media Integration', path: '/app/integrations', featureKey: 'social_media' },
      { icon: MessageCircle, label: 'WhatsApp', path: '/app/integrations/whatsapp', featureKey: 'social_media' },
    ]
  },
  {
    label: 'Super Admin',
    items: [
      { icon: Shield, label: 'Admin Panel', path: '/app/admin' },
    ]
  },
];

interface AppLayoutProps {
  children: React.ReactNode;
  /**
   * For app-like screens (e.g. chat) that manage their own scrolling: the content
   * area is sized to exactly the space above the mobile bottom navigation and
   * does not scroll itself.
   */
  fillHeight?: boolean;
  breadcrumbs?: { label: string; path?: string }[];
}

export default function AppLayout({ children, breadcrumbs = [], fillHeight = false }: AppLayoutProps) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { user, logout } = useAuth();
  const { data: organizations = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => api.get<ApiListResponse<{ id: number; name: string; currency: string | null }>>('/organizations'),
    select: response => response.data,
  });
  const { data: notifSummary } = useNotificationSummary();
  const { data: notifList } = useNotifications({ filter: 'all', limit: 5 });
  const { data: featureAccess = {} } = useQuery<Record<string, boolean>>({
    queryKey: ['saas-feature-access'],
    queryFn: () => api.get<{ success: boolean; data: Record<string, boolean> }>('/saas/features/access').then(response => response.data),
    staleTime: 30_000,
  });
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();
  const unreadCount = notifSummary?.unread ?? 0;
  const recentNotifs = notifList?.data ?? [];
  const currentOrganization = organizations.find(org => org.id === user?.orgId) ?? {
    id: user?.orgId ?? 0,
    name: user?.orgId ? `Organization ${user.orgId}` : 'Current organization',
    currency: null,
  };
  const organizationPlan = {
    plan: user?.roleName || 'Workspace',
    logo: user?.initials || 'OR',
  };
  const mobileNav = [
    { icon: LayoutDashboard, label: 'Home', path: '/app/dashboard' },
    { icon: DollarSign, label: 'Finance', path: '/app/finance' },
    { icon: ShoppingCart, label: 'Operations', path: '/app/purchase' },
    { icon: Bell, label: 'Alerts', path: '/app/notifications' },
  ];

  const switchOrganization = async (organizationId: number) => {
    await api.post('/organizations/switch', { organizationId });
    localStorage.setItem('active_organization_id', String(organizationId));
    window.location.reload();
  };

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
        <BrandLogo className="w-8 h-8 rounded-lg flex-shrink-0" />
        <AnimatePresence>
          {sidebarOpen && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="font-bold text-white text-lg tracking-tight overflow-hidden whitespace-nowrap"
            >
              ZorvanI ERP
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Company Switcher */}
      {sidebarOpen && (
        <div className="px-3 pt-3 pb-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-white/[0.05]">
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-[#2563EB]/40 to-[#06B6D4]/40 text-xs font-bold text-white">
              {organizationPlan.logo}
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-sm font-medium text-white">{currentOrganization.name}</p>
              <p className="text-xs text-white/40">{organizationPlan.plan}</p>
            </div>
                <ChevronDown className="h-4 w-4 text-white/40" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64 border-white/[0.1] bg-[#0a0f1e] text-white">
              <DropdownMenuLabel className="text-white/40">Your companies</DropdownMenuLabel>
              {organizations.map(organization => (
                <DropdownMenuItem key={organization.id} onClick={() => void switchOrganization(organization.id)} className="gap-2 focus:bg-white/[0.08] focus:text-white">
                  <Building2 className="h-4 w-4 text-[#06B6D4]" />
                  <span className="truncate">{organization.name}</span>
                  {organization.id === currentOrganization.id && <Check className="ml-auto h-4 w-4 text-emerald-400" />}
                </DropdownMenuItem>
              ))}
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
            {group.items.filter(item => !item.featureKey || featureAccess[item.featureKey] !== false).map((item) => {
              const active = location === item.path || location.startsWith(item.path + '/');
              return (
                <Tooltip key={item.path} delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Link href={item.path} onClick={() => setMobileOpen(false)}>
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
    <div className="app-shell flex bg-[#050816] overflow-hidden">
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
              className="lg:hidden fixed left-0 top-0 bottom-0 w-[min(86vw,340px)] bg-[#07091a] border-r border-white/[0.07] z-50 flex flex-col shadow-2xl"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Nav */}
        <header className="sticky top-0 z-30 flex min-h-14 items-center gap-3 border-b border-white/[0.07] bg-[#07091a]/90 px-3 py-2 backdrop-blur-xl lg:px-6 lg:py-3">
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
            <div className="flex min-w-0 items-center gap-2 md:hidden">
              <BrandLogo className="h-8 w-8 flex-shrink-0 rounded-lg" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{breadcrumbs.at(-1)?.label ?? 'Dashboard'}</p>
                <p className="truncate text-[10px] text-white/35">{currentOrganization.name}</p>
              </div>
            </div>
          </div>

          <div className="flex-1" />

          {/* Search */}
          <button
            onClick={() => setSearchOpen(true)}
            className="hidden min-w-[200px] items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.04] px-3 py-1.5 text-sm text-white/40 transition-colors hover:bg-white/[0.07] md:flex"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search...</span>
            <kbd className="ml-auto text-[10px] bg-white/[0.08] px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
          </button>
          <button
            onClick={() => setSearchOpen(true)}
            aria-label="Search modules and records"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-white/55 transition-colors hover:bg-white/[0.07] hover:text-white md:hidden"
          >
            <Search className="h-4 w-4" />
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
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <>
                      <Badge className="bg-[#2563EB]/20 text-[#2563EB] border-0 text-xs">{unreadCount} new</Badge>
                      <button
                        onClick={() => markAllRead.mutate()}
                        className="text-[10px] text-white/30 hover:text-white/60 transition-colors"
                        title="Mark all as read"
                      >
                        Mark all read
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="py-1">
                {recentNotifs.length === 0 ? (
                  <div className="px-4 py-6 text-center text-xs text-white/30">No notifications</div>
                ) : (
                  recentNotifs.map((n) => (
                    <div
                      key={n.id}
                      className={`flex gap-3 px-4 py-3 hover:bg-white/[0.04] transition-colors cursor-pointer ${!n.read ? 'bg-white/[0.02]' : ''}`}
                      onClick={() => { if (!n.read) markRead.mutate(n.id); }}
                    >
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!n.read ? (TYPE_COLORS[n.type] ?? 'bg-[#2563EB]') : 'bg-white/10'}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${!n.read ? 'text-white' : 'text-white/60'}`}>{n.title}</p>
                        {n.body && <p className="text-xs text-white/40 truncate">{n.body}</p>}
                        <p className="text-xs text-white/25 mt-0.5">{timeAgo(n.createdAt)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="px-4 py-3 border-t border-white/[0.07]">
                <Link href="/app/notifications">
                  <button className="text-xs text-[#2563EB] hover:underline">View all notifications</button>
                </Link>
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
        {/* The bottom navigation is visible below lg, so its clearance must apply below lg too. */}
        <main className={`app-content flex-1 min-h-0 overflow-auto pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0${fillHeight ? ' app-content-fill' : ''}`}>
          {children}
        </main>
      </div>

      {/* Mobile app navigation. The drawer above remains the complete module index. */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-white/[0.08] bg-[#07091a]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        {mobileNav.map((item) => {
          const active = location === item.path || location.startsWith(item.path + '/');
          return (
            <Link key={item.path} href={item.path} className={`flex min-h-16 flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors ${active ? 'text-[#60a5fa]' : 'text-white/40 hover:text-white'}`}>
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <button onClick={() => setMobileOpen(true)} className="flex min-h-16 flex-col items-center justify-center gap-1 text-[10px] font-medium text-white/40 hover:text-white" aria-label="Open all ERP modules">
          <Menu className="h-5 w-5" />
          <span>Modules</span>
        </button>
      </nav>

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
