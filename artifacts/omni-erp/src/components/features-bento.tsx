import { motion } from "framer-motion";
import {
  Brain,
  Cloud,
  Receipt,
  Smartphone,
  Palette,
  Shield,
  BarChart3,
  Globe2,
  Users,
  Zap,
} from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "AI-Powered Insights",
    description:
      "Intelligent automation and predictive modeling that anticipates your business needs before they arise.",
    span: "col-span-1 md:col-span-2 row-span-2",
    isHero: true,
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description:
      "Bank-grade encryption, SOC 2 Type II compliance, and granular role-based access.",
    span: "col-span-1 md:col-span-2 row-span-1",
    isHero: false,
  },
  {
    icon: Cloud,
    title: "Cloud Native",
    description: "Built for scale and 99.99% uptime reliability.",
    span: "col-span-1 row-span-1",
    isHero: false,
  },
  {
    icon: Receipt,
    title: "Global Tax Ready",
    description: "Compliant with local tax and GST regulations.",
    span: "col-span-1 row-span-1",
    isHero: false,
  },
  {
    icon: Smartphone,
    title: "Mobile First",
    description: "Native iOS and Android companion apps.",
    span: "col-span-1 row-span-1",
    isHero: false,
  },
  {
    icon: Zap,
    title: "API First",
    description: "RESTful endpoints for custom integrations.",
    span: "col-span-1 row-span-1",
    isHero: false,
  },
  {
    icon: BarChart3,
    title: "Real-time Analytics",
    description: "Live dashboards mapping every metric.",
    span: "col-span-1 md:col-span-2 row-span-1",
    isHero: false,
  },
];

export function FeaturesBento() {
  return (
    <section className="py-24 relative bg-[#050816]">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/10 text-primary text-[11px] uppercase tracking-[0.15em] font-medium mb-6">
            Platform Capabilities
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold mb-6 tracking-tight text-white">
            Everything an enterprise needs.
            <br />
            Nothing it doesn't.
          </h2>
          <p className="text-[17px] text-slate-400 max-w-2xl mx-auto leading-relaxed">
            A cohesive suite of 20+ core modules and 240+ features, meticulously
            designed to replace a dozen fragmented tools.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 auto-rows-[200px]">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.6,
                delay: i * 0.05,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className={`relative overflow-hidden rounded-2xl bg-[#0a0f1e] border border-white/[0.07] p-6 sm:p-8 flex flex-col justify-between group cursor-default hover:border-white/15 hover:shadow-[0_0_30px_rgba(37,99,235,0.08)] transition-all ${feature.span}`}
            >
              {/* Subtle corner gradient */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[60px] group-hover:bg-primary/10 transition-colors" />

              <div>
                <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center mb-5 group-hover:bg-primary/10 group-hover:border-primary/20 transition-colors">
                  <feature.icon className="w-5 h-5 text-slate-300 group-hover:text-primary transition-colors" />
                </div>
                <h3
                  className={`font-semibold text-white mb-2 ${feature.isHero ? "text-2xl" : "text-[17px]"}`}
                >
                  {feature.title}
                </h3>
                <p
                  className={`text-slate-400 leading-relaxed ${feature.isHero ? "text-[16px] max-w-md" : "text-[14px]"}`}
                >
                  {feature.description}
                </p>
              </div>

              {feature.isHero && (
                <div className="mt-8 flex-1 w-full bg-[#050816] rounded-xl border border-white/5 relative overflow-hidden flex items-end">
                  {/* Decorative chart for hero card */}
                  <div className="w-full h-24 flex items-end gap-2 px-6 pt-4 opacity-70">
                    {[40, 60, 45, 80, 55, 90, 75, 100].map((h, j) => (
                      <div
                        key={j}
                        className="flex-1 bg-gradient-to-t from-primary/40 to-primary rounded-t-sm"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
