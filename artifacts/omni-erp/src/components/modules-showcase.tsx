import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  DollarSign,
  ShoppingCart,
  Package,
  Warehouse,
  Factory,
  FolderKanban,
  Users2,
  FileText,
  CreditCard,
  BarChart4,
  Brain,
  Workflow,
  Cloud,
  Puzzle,
  Smartphone,
  FileCheck,
  UserCircle2,
  Lock,
  Star,
  ArrowRight,
} from "lucide-react";

const categories = [
  { id: "finance", label: "Finance & Accounting" },
  { id: "operations", label: "Operations & SCM" },
  { id: "hr", label: "Human Resources" },
  { id: "crm", label: "Sales & CRM" },
  { id: "tech", label: "Platform & Tech" },
];

const modulesMap: Record<
  string,
  { icon: any; title: string; description: string }[]
> = {
  finance: [
    {
      icon: DollarSign,
      title: "Financial Accounting",
      description: "Complete GL, AP, AR, and reconciliation",
    },
    {
      icon: FileText,
      title: "Tax & Compliance",
      description: "Automated tax calculation and filing",
    },
    {
      icon: CreditCard,
      title: "Banking",
      description: "Payment processing and reconciliation",
    },
    {
      icon: BarChart4,
      title: "Financial Reports",
      description: "Advanced analytics and custom dashboards",
    },
    {
      icon: Building2,
      title: "Multi-Entity",
      description: "Cross-organization structure and hierarchy",
    },
    {
      icon: Workflow,
      title: "Approvals",
      description: "Custom financial approval chains",
    },
  ],
  operations: [
    {
      icon: Warehouse,
      title: "Inventory",
      description: "Real-time stock tracking and warehouse management",
    },
    {
      icon: Package,
      title: "Procurement",
      description: "PO management and vendor portal",
    },
    {
      icon: Factory,
      title: "Manufacturing",
      description: "BOM, work orders, and production planning",
    },
    {
      icon: FolderKanban,
      title: "Projects",
      description: "Task management, time tracking, and billing",
    },
    {
      icon: FileCheck,
      title: "Quality Control",
      description: "Inspection workflows and compliance",
    },
    {
      icon: Puzzle,
      title: "Logistics",
      description: "Fleet and delivery tracking",
    },
  ],
  hr: [
    {
      icon: Users2,
      title: "Core HR",
      description: "Employee records, attendance, and leave",
    },
    {
      icon: DollarSign,
      title: "Payroll",
      description: "Automated global payroll processing",
    },
    {
      icon: Star,
      title: "Performance",
      description: "Reviews, goals, and appraisals",
    },
    {
      icon: UserCircle2,
      title: "Self-Service",
      description: "Employee portal and document access",
    },
  ],
  crm: [
    {
      icon: ShoppingCart,
      title: "Sales Automation",
      description: "Lead-to-cash workflow",
    },
    {
      icon: Users2,
      title: "Lead Management",
      description: "Scoring, routing, and tracking",
    },
    {
      icon: UserCircle2,
      title: "Customer Portal",
      description: "Self-service billing and support",
    },
    {
      icon: Smartphone,
      title: "Field Sales",
      description: "Mobile app for on-the-go reps",
    },
  ],
  tech: [
    {
      icon: Brain,
      title: "AI Engine",
      description: "Predictive insights and automation",
    },
    {
      icon: Cloud,
      title: "Cloud Infrastructure",
      description: "Multi-tenant architecture",
    },
    {
      icon: Lock,
      title: "Security Center",
      description: "SSO, 2FA, and audit logs",
    },
    {
      icon: Puzzle,
      title: "Integrations",
      description: "500+ pre-built connectors via API",
    },
  ],
};

export function ModulesShowcase() {
  const [activeTab, setActiveTab] = useState("finance");

  return (
    <section
      id="products"
      className="py-24 bg-[#050816] relative border-t border-white/[0.05]"
    >
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/10 text-primary text-[11px] uppercase tracking-[0.15em] font-medium mb-6">
            Unified Ecosystem
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold mb-4 text-white tracking-tight">
            Every department.
            <br />
            One source of truth.
          </h2>
        </motion.div>

        <div className="grid lg:grid-cols-[300px_1fr] gap-12 items-start">
          {/* Left: Tabs */}
          <div className="flex flex-col gap-2 relative">
            <div className="absolute left-0 top-0 bottom-0 w-px bg-white/10" />

            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveTab(category.id)}
                className={`relative pl-6 py-4 text-left transition-colors duration-200 group ${
                  activeTab === category.id
                    ? "text-white"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {activeTab === category.id && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute left-0 top-0 bottom-0 w-[2px] bg-primary"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <span className="text-[16px] font-semibold">
                  {category.label}
                </span>
              </button>
            ))}
          </div>

          {/* Right: Module Grid */}
          <div className="min-h-[400px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="grid sm:grid-cols-2 gap-4"
              >
                {modulesMap[activeTab]?.map((module, i) => (
                  <div
                    key={i}
                    className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-6 hover:border-white/15 transition-colors group cursor-default"
                  >
                    <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center mb-4 group-hover:bg-primary/10 group-hover:border-primary/20 transition-colors">
                      <module.icon className="w-5 h-5 text-slate-300 group-hover:text-primary transition-colors" />
                    </div>
                    <h3 className="text-[16px] font-semibold text-white mb-2">
                      {module.title}
                    </h3>
                    <p className="text-[14px] text-slate-400 leading-relaxed">
                      {module.description}
                    </p>
                  </div>
                ))}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
