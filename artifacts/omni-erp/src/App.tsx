import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
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

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      {/* Public */}
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />

      {/* App — authenticated UI */}
      <Route path="/app/dashboard" component={Dashboard} />
      <Route path="/app/finance" component={Finance} />
      <Route path="/app/sales" component={Sales} />
      <Route path="/app/purchase" component={Purchase} />
      <Route path="/app/inventory" component={Inventory} />
      <Route path="/app/manufacturing" component={Manufacturing} />
      <Route path="/app/projects" component={Projects} />
      <Route path="/app/hr" component={HR} />
      <Route path="/app/gst" component={GST} />
      <Route path="/app/banking" component={Banking} />
      <Route path="/app/reports" component={Reports} />
      <Route path="/app/ai" component={AIAssistant} />
      <Route path="/app/workflow" component={Workflow} />
      <Route path="/app/documents" component={Documents} />
      <Route path="/app/customer-portal" component={CustomerPortal} />
      <Route path="/app/vendor-portal" component={VendorPortal} />
      <Route path="/app/organization" component={Organization} />
      <Route path="/app/users" component={UserManagement} />
      <Route path="/app/roles" component={Roles} />
      <Route path="/app/settings" component={SettingsPage} />
      <Route path="/app/billing" component={Billing} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
