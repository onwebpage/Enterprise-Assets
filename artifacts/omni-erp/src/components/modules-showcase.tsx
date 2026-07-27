import { motion } from 'framer-motion';
import {
  Building2, DollarSign, ShoppingCart, Package, Warehouse, Factory,
  FolderKanban, Users2, FileText, CreditCard, BarChart4, Brain,
  Workflow, Cloud, Puzzle, Smartphone, FileCheck, UserCircle2,
  Lock, Star
} from 'lucide-react';
import { ArrowRight } from 'lucide-react';

const modules = [
  { icon: Building2, title: 'Organization Management', description: 'Multi-entity structure and hierarchy' },
  { icon: DollarSign, title: 'Financial Accounting', description: 'Complete GL, AP, AR, and reconciliation' },
  { icon: ShoppingCart, title: 'Sales & CRM', description: 'Lead-to-cash automation and customer insights' },
  { icon: Package, title: 'Purchase', description: 'Procurement, PO management, and vendor portal' },
  { icon: Warehouse, title: 'Inventory', description: 'Real-time stock tracking and warehouse management' },
  { icon: Factory, title: 'Manufacturing', description: 'BOM, work orders, and production planning' },
  { icon: FolderKanban, title: 'Projects', description: 'Task management, time tracking, and billing' },
  { icon: Users2, title: 'HRMS', description: 'Payroll, attendance, leave, and performance' },
  { icon: FileText, title: 'GST', description: 'Automated tax calculation and filing' },
  { icon: CreditCard, title: 'Banking', description: 'Payment processing and reconciliation' },
  { icon: BarChart4, title: 'Reports', description: 'Advanced analytics and custom dashboards' },
  { icon: Brain, title: 'AI', description: 'Predictive insights and automation' },
  { icon: Workflow, title: 'Workflow', description: 'Custom approval chains and automation' },
  { icon: Cloud, title: 'SaaS', description: 'Multi-tenant architecture with isolation' },
  { icon: Puzzle, title: 'Integrations', description: '500+ pre-built connectors' },
  { icon: Smartphone, title: 'Mobile Apps', description: 'Native iOS and Android applications' },
  { icon: FileCheck, title: 'Documents', description: 'OCR, e-signature, and version control' },
  { icon: UserCircle2, title: 'Customer Portal', description: 'Self-service portals and white-labeling' },
  { icon: Lock, title: 'Security', description: 'SSO, 2FA, audit logs, and compliance' },
  { icon: Star, title: 'Enterprise Features', description: 'Advanced customization and dedicated support' },
];

export function ModulesShowcase() {
  return (
    <section id="products" className="py-24 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl sm:text-5xl font-bold mb-4">
            Everything your business needs.
            <br />
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              In one platform.
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            20 integrated modules working seamlessly together. No more data silos.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {modules.map((module, index) => (
            <motion.div
              key={module.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.03, duration: 0.6 }}
              whileHover={{ y: -3 }}
              className="group cursor-pointer"
            >
              <div className="h-full glassmorphism rounded-xl p-6 hover:bg-white/10 transition-all duration-300 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-accent/0 group-hover:from-primary/10 group-hover:to-accent/10 transition-all duration-300" />
                
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 group-hover:from-primary group-hover:to-accent flex items-center justify-center mb-4 transition-all duration-300">
                    <module.icon className="w-6 h-6 text-primary group-hover:text-white transition-colors" />
                  </div>
                  
                  <h3 className="text-base font-semibold mb-2">{module.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{module.description}</p>
                  
                  <div className="flex items-center text-sm text-primary group-hover:text-accent transition-colors">
                    <span>View Details</span>
                    <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
