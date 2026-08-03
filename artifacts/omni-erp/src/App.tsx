import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from '@/contexts/auth';
import ProtectedRoute from '@/components/app/ProtectedRoute';
import NotFound from '@/pages/not-found';
import Home from '@/pages/home';
import Login from '@/pages/login';
import { Route, Switch, Router as WouterRouter } from 'wouter';

// App pages
import Dashboard from '@/pages/app/dashboard';
import Finance from '@/pages/app/finance';
import Sales from '@/pages/app/sales';
import Purchase from '@/pages/app/purchase';
import Inventory from '@/pages/app/inventory';
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

      {/* Protected app routes */}
      <Route path="/app/dashboard">
        <ProtectedRoute><Dashboard /></ProtectedRoute>
      </Route>
      <Route path="/app/finance">
        <ProtectedRoute><Finance /></ProtectedRoute>
      </Route>
      <Route path="/app/sales">
        <ProtectedRoute><Sales /></ProtectedRoute>
      </Route>
      <Route path="/app/purchase">
        <ProtectedRoute><Purchase /></ProtectedRoute>
      </Route>
      <Route path="/app/inventory">
        <ProtectedRoute><Inventory /></ProtectedRoute>
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

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <AppRoutes />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
