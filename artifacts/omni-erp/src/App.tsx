import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from '@/contexts/auth';
import { AdminAuthProvider } from '@/contexts/adminAuth';
import ProtectedRoute from '@/components/app/ProtectedRoute';
import ProtectedAdminRoute from '@/components/app/ProtectedAdminRoute';
import NotFound from '@/pages/not-found';
import Home from '@/pages/home';
import Login from '@/pages/login';
import Signup from '@/pages/signup';
import AdminLogin from '@/pages/admin-login';
import { Route, Switch, Router as WouterRouter } from 'wouter';

// App pages
import Dashboard from '@/pages/app/dashboard';
import Finance from '@/pages/app/finance';
import Purchase from '@/pages/app/purchase';
import Inventory from '@/pages/app/inventory';
import Wms from '@/pages/app/wms';
import BudgetCost from '@/pages/app/budget-cost';
import Manufacturing from '@/pages/app/manufacturing';
import Projects from '@/pages/app/projects';
import HR from '@/pages/app/hr';
import GST from '@/pages/app/gst';
import Banking from '@/pages/app/banking';
import Reports from '@/pages/app/reports';
import AIAssistant from '@/pages/app/ai-assistant';
import Workflow from '@/pages/app/workflow';
import Documents from '@/pages/app/documents';
import CustomerPortal from '@/pages/app/customer-portal';
import VendorPortal from '@/pages/app/vendor-portal';
import Organization from '@/pages/app/organization';
import UserManagement from '@/pages/app/users';
import Roles from '@/pages/app/roles';
import SettingsPage from '@/pages/app/settings';
import Billing from '@/pages/app/billing';
import AccountsReceivable from '@/pages/app/accounts-receivable';
import AccountsPayable from '@/pages/app/accounts-payable';
import FixedAssets from '@/pages/app/fixed-assets';
import EInvoicing from '@/pages/app/e-invoicing';
import EWayBill from '@/pages/app/eway-bill';
import GSTReturns from '@/pages/app/gst-returns';
import TDS from '@/pages/app/tds';
import NotificationsPage from '@/pages/app/notifications';
import AuditLogs from '@/pages/app/audit-logs';
import SaasPlatform from '@/pages/app/saas';
import AdminPanel from '@/pages/app/admin';
import OrderManagement from '@/pages/app/order-management';
import Quality from '@/pages/app/quality';
import Maintenance from '@/pages/app/maintenance';
import Expense from '@/pages/app/expense';
import Crm from '@/pages/app/crm';
import AiBi from '@/pages/app/ai-bi';
import CashTreasury from '@/pages/app/cash-treasury';
import MasterData from '@/pages/app/master-data';
import MultiEntity from '@/pages/app/multi-entity';
import SocialIntegrationsPage from '@/pages/app/social-integrations';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

function AppRoutes() {
  return (
    <Switch>
      {/* Public */}
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/admin-login" component={AdminLogin} />

      {/* Protected app routes */}
      <Route path="/app/dashboard">
        <ProtectedRoute><Dashboard /></ProtectedRoute>
      </Route>
      <Route path="/app/finance">
        <ProtectedRoute><Finance /></ProtectedRoute>
      </Route>
      <Route path="/app/sales">
        <ProtectedRoute><OrderManagement /></ProtectedRoute>
      </Route>
      <Route path="/app/purchase">
        <ProtectedRoute><Purchase /></ProtectedRoute>
      </Route>
      <Route path="/app/order-management">
        <ProtectedRoute><OrderManagement /></ProtectedRoute>
      </Route>
      <Route path="/app/quality">
        <ProtectedRoute><Quality /></ProtectedRoute>
      </Route>
      <Route path="/app/maintenance">
        <ProtectedRoute><Maintenance /></ProtectedRoute>
      </Route>
      <Route path="/app/expense">
        <ProtectedRoute><Expense /></ProtectedRoute>
      </Route>
      <Route path="/app/crm">
        <ProtectedRoute><Crm /></ProtectedRoute>
      </Route>
      <Route path="/app/ai-bi">
        <ProtectedRoute><AiBi /></ProtectedRoute>
      </Route>
      <Route path="/app/cash-treasury">
        <ProtectedRoute><CashTreasury /></ProtectedRoute>
      </Route>
      <Route path="/app/inventory">
        <ProtectedRoute><Inventory /></ProtectedRoute>
      </Route>
      <Route path="/app/wms">
        <ProtectedRoute><Wms /></ProtectedRoute>
      </Route>
      <Route path="/app/budget-cost">
        <ProtectedRoute><BudgetCost /></ProtectedRoute>
      </Route>
      <Route path="/app/manufacturing">
        <ProtectedRoute><Manufacturing /></ProtectedRoute>
      </Route>
      <Route path="/app/projects">
        <ProtectedRoute><Projects /></ProtectedRoute>
      </Route>
      <Route path="/app/hr">
        <ProtectedRoute><HR /></ProtectedRoute>
      </Route>
      <Route path="/app/gst">
        <ProtectedRoute><GST /></ProtectedRoute>
      </Route>
      <Route path="/app/banking">
        <ProtectedRoute><Banking /></ProtectedRoute>
      </Route>
      <Route path="/app/reports">
        <ProtectedRoute><Reports /></ProtectedRoute>
      </Route>
      <Route path="/app/ai">
        <ProtectedRoute><AIAssistant /></ProtectedRoute>
      </Route>
      <Route path="/app/workflow">
        <ProtectedRoute><Workflow /></ProtectedRoute>
      </Route>
      <Route path="/app/documents">
        <ProtectedRoute><Documents /></ProtectedRoute>
      </Route>
      <Route path="/app/customer-portal">
        <ProtectedRoute><CustomerPortal /></ProtectedRoute>
      </Route>
      <Route path="/app/vendor-portal">
        <ProtectedRoute><VendorPortal /></ProtectedRoute>
      </Route>
      <Route path="/app/organization">
        <ProtectedRoute><Organization /></ProtectedRoute>
      </Route>
      <Route path="/app/users">
        <ProtectedRoute><UserManagement /></ProtectedRoute>
      </Route>
      <Route path="/app/roles">
        <ProtectedRoute><Roles /></ProtectedRoute>
      </Route>
      <Route path="/app/settings">
        <ProtectedRoute><SettingsPage /></ProtectedRoute>
      </Route>
      <Route path="/app/billing">
        <ProtectedRoute><Billing /></ProtectedRoute>
      </Route>
      <Route path="/app/master-data">
        <ProtectedRoute><MasterData /></ProtectedRoute>
      </Route>
      <Route path="/app/multi-entity">
        <ProtectedRoute><MultiEntity /></ProtectedRoute>
      </Route>
      <Route path="/app/ar">
        <ProtectedRoute><AccountsReceivable /></ProtectedRoute>
      </Route>
      <Route path="/app/ap">
        <ProtectedRoute><AccountsPayable /></ProtectedRoute>
      </Route>
      <Route path="/app/fixed-assets">
        <ProtectedRoute><FixedAssets /></ProtectedRoute>
      </Route>
      <Route path="/app/einvoicing">
        <ProtectedRoute><EInvoicing /></ProtectedRoute>
      </Route>
      <Route path="/app/eway-bill">
        <ProtectedRoute><EWayBill /></ProtectedRoute>
      </Route>
      <Route path="/app/gst-returns">
        <ProtectedRoute><GSTReturns /></ProtectedRoute>
      </Route>
      <Route path="/app/tds">
        <ProtectedRoute><TDS /></ProtectedRoute>
      </Route>
      <Route path="/app/notifications">
        <ProtectedRoute><NotificationsPage /></ProtectedRoute>
      </Route>
      <Route path="/app/audit-logs">
        <ProtectedRoute><AuditLogs /></ProtectedRoute>
      </Route>
      <Route path="/app/saas">
        <ProtectedRoute><SaasPlatform /></ProtectedRoute>
      </Route>
      <Route path="/app/integrations">
        <ProtectedRoute><SocialIntegrationsPage /></ProtectedRoute>
      </Route>

      {/* Super Admin Panel — only requires admin token, independent of ERP login */}
      <Route path="/app/admin">
        <ProtectedAdminRoute>
          <AdminPanel />
        </ProtectedAdminRoute>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AdminAuthProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
              <AppRoutes />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </AdminAuthProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;