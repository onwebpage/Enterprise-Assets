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
import WhatsappPage from '@/pages/app/whatsapp';
import QrCodeGenerator from '@/pages/app/qr-code-generator';
import BarcodeGenerator from '@/pages/app/barcode-generator';
import GSTCalculator from '@/pages/app/gst-calculator';
import EMICalculator from '@/pages/app/emi-calculator';
import CurrencyConverter from '@/pages/app/currency-converter';
import PDFMerger from '@/pages/app/pdf-merger';
import PDFSplitter from '@/pages/app/pdf-splitter';
import ImageCompressor from '@/pages/app/image-compressor';
import ExcelToPDF from '@/pages/app/excel-to-pdf';
import PasswordGenerator from '@/pages/app/password-generator';
import TimeZoneConverter from '@/pages/app/time-zone-converter';
import { LegalPage } from '@/pages/legal';

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
      <Route path="/legal/privacy-policy"><LegalPage slug="privacy-policy" /></Route>
      <Route path="/legal/terms-conditions"><LegalPage slug="terms-conditions" /></Route>
      <Route path="/legal/refund-cancellation"><LegalPage slug="refund-cancellation" /></Route>
      <Route path="/legal/cookie-policy"><LegalPage slug="cookie-policy" /></Route>
      <Route path="/legal/data-processing-agreement"><LegalPage slug="data-processing-agreement" /></Route>
      <Route path="/legal/security-policy"><LegalPage slug="security-policy" /></Route>
      <Route path="/legal/acceptable-use"><LegalPage slug="acceptable-use" /></Route>
      <Route path="/legal/service-level-agreement"><LegalPage slug="service-level-agreement" /></Route>
      <Route path="/legal/disclaimer"><LegalPage slug="disclaimer" /></Route>
      <Route path="/legal/grievance-redressal"><LegalPage slug="grievance-redressal" /></Route>
      <Route path="/legal/intellectual-property"><LegalPage slug="intellectual-property" /></Route>
      <Route path="/legal/legal-notice-contact"><LegalPage slug="legal-notice-contact" /></Route>

      {/* Protected app routes */}
      <Route path="/app/dashboard">
        <ProtectedRoute><Dashboard /></ProtectedRoute>
      </Route>
      <Route path="/app/finance">
        <ProtectedRoute featureKey="finance"><Finance /></ProtectedRoute>
      </Route>
      <Route path="/app/sales">
        <ProtectedRoute featureKey="order_management"><OrderManagement /></ProtectedRoute>
      </Route>
      <Route path="/app/purchase">
        <ProtectedRoute featureKey="purchase"><Purchase /></ProtectedRoute>
      </Route>
      <Route path="/app/order-management">
        <ProtectedRoute featureKey="order_management"><OrderManagement /></ProtectedRoute>
      </Route>
      <Route path="/app/quality">
        <ProtectedRoute featureKey="quality"><Quality /></ProtectedRoute>
      </Route>
      <Route path="/app/maintenance">
        <ProtectedRoute featureKey="maintenance"><Maintenance /></ProtectedRoute>
      </Route>
      <Route path="/app/expense">
        <ProtectedRoute featureKey="expense"><Expense /></ProtectedRoute>
      </Route>
      <Route path="/app/crm">
        <ProtectedRoute featureKey="crm"><Crm /></ProtectedRoute>
      </Route>
      <Route path="/app/ai-bi">
        <ProtectedRoute featureKey="ai_bi"><AiBi /></ProtectedRoute>
      </Route>
      <Route path="/app/cash-treasury">
        <ProtectedRoute featureKey="cash_treasury"><CashTreasury /></ProtectedRoute>
      </Route>
      <Route path="/app/inventory">
        <ProtectedRoute featureKey="inventory"><Inventory /></ProtectedRoute>
      </Route>
      <Route path="/app/wms">
        <ProtectedRoute featureKey="wms"><Wms /></ProtectedRoute>
      </Route>
      <Route path="/app/budget-cost">
        <ProtectedRoute featureKey="budget_cost"><BudgetCost /></ProtectedRoute>
      </Route>
      <Route path="/app/manufacturing">
        <ProtectedRoute featureKey="manufacturing"><Manufacturing /></ProtectedRoute>
      </Route>
      <Route path="/app/projects">
        <ProtectedRoute featureKey="projects"><Projects /></ProtectedRoute>
      </Route>
      <Route path="/app/hr">
        <ProtectedRoute featureKey="hr"><HR /></ProtectedRoute>
      </Route>
      <Route path="/app/gst">
        <ProtectedRoute featureKey="gst"><GST /></ProtectedRoute>
      </Route>
      <Route path="/app/banking">
        <ProtectedRoute featureKey="banking"><Banking /></ProtectedRoute>
      </Route>
      <Route path="/app/reports">
        <ProtectedRoute featureKey="reports"><Reports /></ProtectedRoute>
      </Route>
      <Route path="/app/ai">
        <ProtectedRoute featureKey="ai"><AIAssistant /></ProtectedRoute>
      </Route>
      <Route path="/app/workflow">
        <ProtectedRoute featureKey="workflow"><Workflow /></ProtectedRoute>
      </Route>
      <Route path="/app/documents">
        <ProtectedRoute featureKey="documents"><Documents /></ProtectedRoute>
      </Route>
      <Route path="/app/documents/pdf-merger">
        <ProtectedRoute featureKey="documents"><PDFMerger /></ProtectedRoute>
      </Route>
      <Route path="/app/documents/pdf-splitter">
        <ProtectedRoute featureKey="documents"><PDFSplitter /></ProtectedRoute>
      </Route>
      <Route path="/app/documents/image-compressor">
        <ProtectedRoute featureKey="documents"><ImageCompressor /></ProtectedRoute>
      </Route>
      <Route path="/app/documents/excel-to-pdf">
        <ProtectedRoute featureKey="documents"><ExcelToPDF /></ProtectedRoute>
      </Route>
      <Route path="/app/customer-portal">
        <ProtectedRoute featureKey="customer_portal"><CustomerPortal /></ProtectedRoute>
      </Route>
      <Route path="/app/vendor-portal">
        <ProtectedRoute featureKey="vendor_portal"><VendorPortal /></ProtectedRoute>
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
      <Route path="/app/settings/password-generator">
        <ProtectedRoute><PasswordGenerator /></ProtectedRoute>
      </Route>
      <Route path="/app/billing">
        <ProtectedRoute featureKey="billing"><Billing /></ProtectedRoute>
      </Route>
      <Route path="/app/master-data">
        <ProtectedRoute featureKey="master_data"><MasterData /></ProtectedRoute>
      </Route>
      <Route path="/app/multi-entity">
        <ProtectedRoute featureKey="multi_entity"><MultiEntity /></ProtectedRoute>
      </Route>
      <Route path="/app/ar">
        <ProtectedRoute featureKey="accounts_receivable"><AccountsReceivable /></ProtectedRoute>
      </Route>
      <Route path="/app/ap">
        <ProtectedRoute featureKey="accounts_payable"><AccountsPayable /></ProtectedRoute>
      </Route>
      <Route path="/app/fixed-assets">
        <ProtectedRoute featureKey="fixed_assets"><FixedAssets /></ProtectedRoute>
      </Route>
      <Route path="/app/einvoicing">
        <ProtectedRoute featureKey="einvoicing"><EInvoicing /></ProtectedRoute>
      </Route>
      <Route path="/app/eway-bill">
        <ProtectedRoute featureKey="eway_bill"><EWayBill /></ProtectedRoute>
      </Route>
      <Route path="/app/gst-returns">
        <ProtectedRoute featureKey="gst"><GSTReturns /></ProtectedRoute>
      </Route>
      <Route path="/app/tds">
        <ProtectedRoute featureKey="tds"><TDS /></ProtectedRoute>
      </Route>
      <Route path="/app/notifications">
        <ProtectedRoute featureKey="notifications"><NotificationsPage /></ProtectedRoute>
      </Route>
      <Route path="/app/audit-logs">
        <ProtectedRoute><AuditLogs /></ProtectedRoute>
      </Route>
      <Route path="/app/saas">
        <ProtectedRoute><SaasPlatform /></ProtectedRoute>
      </Route>
      <Route path="/app/integrations">
        <ProtectedRoute featureKey="social_media"><SocialIntegrationsPage /></ProtectedRoute>
      </Route>
      <Route path="/app/integrations/whatsapp">
        <ProtectedRoute featureKey="social_media"><WhatsappPage /></ProtectedRoute>
      </Route>
      <Route path="/app/tools/qr-code-generator">
        <ProtectedRoute><QrCodeGenerator /></ProtectedRoute>
      </Route>
      <Route path="/app/tools/time-zone-converter">
        <ProtectedRoute><TimeZoneConverter /></ProtectedRoute>
      </Route>
      <Route path="/app/inventory/barcode-generator">
        <ProtectedRoute featureKey="inventory"><BarcodeGenerator /></ProtectedRoute>
      </Route>
      <Route path="/app/finance/gst-calculator">
        <ProtectedRoute featureKey="finance"><GSTCalculator /></ProtectedRoute>
      </Route>
      <Route path="/app/finance/emi-calculator">
        <ProtectedRoute featureKey="finance"><EMICalculator /></ProtectedRoute>
      </Route>
      <Route path="/app/finance/currency-converter">
        <ProtectedRoute featureKey="finance"><CurrencyConverter /></ProtectedRoute>
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
