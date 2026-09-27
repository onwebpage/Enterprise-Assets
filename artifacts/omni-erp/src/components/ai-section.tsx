import { motion } from "framer-motion";
import {
  Brain,
  Eye,
  Shield,
  MessageSquare,
  TrendingUp,
  Sparkles,
  Zap,
  ChevronRight,
} from "lucide-react";

const aiFeatures = [
  {
    icon: Eye,
    title: "Automated OCR",
    description:
      "Extract line-items from thousands of invoices instantly with 99.9% accuracy.",
  },
  {
    icon: TrendingUp,
    title: "Predictive Forecasting",
    description:
      "Machine learning models predict inventory shortages and cash flow dips weeks in advance.",
  },
  {
    icon: Shield,
    title: "Anomaly Detection",
    description:
      "Flag suspicious transactions, duplicate invoices, and compliance risks in real-time.",
  },
  {
    icon: Sparkles,
    title: "Generative Reports",
    description:
      "Ask for a Q3 board summary and get a fully formatted, data-backed brief in seconds.",
  },
  {
    icon: Zap,
    title: "Smart Workflows",
    description:
      "Self-healing approval chains that route requests based on historical context.",
  },
  {
    icon: MessageSquare,
    title: "Conversational ERP",
    description:
      "Interact with your entire database using natural language queries.",
  },
];

export function AISection() {
  return (
    <section className="py-24 relative bg-[#050816] overflow-hidden">
      {/* Deep teal/cyan glow */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#06B6D4]/[0.08] blur-[120px] pointer-events-none" />

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-accent/20 bg-accent/10 text-accent text-[11px] uppercase tracking-[0.15em] font-medium mb-6">
            ZorvanI ERP AI
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold mb-6 tracking-tight text-white">
            An intelligence layer that
            <br />
            actually understands your business.
          </h2>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left: Chat Mockup */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="bg-[#0a0f1e] border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl relative"
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-gradient-to-br from-[#06B6D4] to-primary flex items-center justify-center">
                  <Brain className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="text-[14px] font-semibold text-white">
                    ZorvanI ERP AI
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    System Active
                  </div>
                </div>
              </div>
            </div>

            {/* Chat Body */}
            <div className="p-5 flex flex-col gap-5 bg-[#050816]">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-white/10 shrink-0 flex items-center justify-center text-[10px] font-medium text-white">
                  JD
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm px-4 py-2.5 text-[13px] text-slate-300 max-w-[85%]">
                  Identify any compliance risks in the latest batch of European
                  invoices.
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#06B6D4] to-primary shrink-0 flex items-center justify-center">
                  <Brain className="w-3 h-3 text-white" />
                </div>
                <div className="bg-[#0a0f1e] border border-[#06B6D4]/30 shadow-[0_0_15px_rgba(6,182,212,0.1)] rounded-2xl rounded-tl-sm px-4 py-3 text-[13px] text-slate-300 max-w-[90%]">
                  <p className="mb-3 text-white font-medium">
                    Scanned 412 invoices. Found 2 potential issues:
                  </p>

                  <div className="flex flex-col gap-2 mb-3">
                    <div className="bg-white/5 border border-white/5 rounded-lg p-2.5">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-amber-400 font-mono text-[11px]">
                          INV-DE-881
                        </span>
                        <span className="text-white font-medium">€24,500</span>
                      </div>
                      <span className="text-[12px] text-slate-400">
                        Missing mandatory VAT identification number for
                        cross-border B2B service.
                      </span>
                    </div>
                    <div className="bg-white/5 border border-white/5 rounded-lg p-2.5">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-red-400 font-mono text-[11px]">
                          INV-FR-092
                        </span>
                        <span className="text-white font-medium">€12,000</span>
                      </div>
                      <span className="text-[12px] text-slate-400">
                        Vendor bank details match a previously flagged entity.
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-2">
                    <button className="px-3 py-1.5 bg-white/10 hover:bg-white/15 rounded text-[11px] font-medium text-white transition-colors">
                      Hold Payment
                    </button>
                    <button className="px-3 py-1.5 bg-white/10 hover:bg-white/15 rounded text-[11px] font-medium text-white transition-colors">
                      Request VAT ID
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Input */}
            <div className="p-4 border-t border-white/[0.06] bg-[#0a0f1e]">
              <div className="bg-white/5 border border-white/10 rounded-lg flex items-center px-3 py-2">
                <input
                  type="text"
                  placeholder="Ask ZorvanI ERP AI..."
                  className="bg-transparent border-none outline-none text-[13px] text-white w-full placeholder:text-slate-500"
                  disabled
                />
                <button className="w-6 h-6 rounded bg-[#06B6D4] flex items-center justify-center text-white shrink-0">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>

          {/* Right: Feature Grid */}
          <div className="grid sm:grid-cols-2 gap-4">
            {aiFeatures.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5 group hover:border-accent/30 transition-colors"
              >
                <div className="w-8 h-8 rounded-md bg-accent/10 text-accent flex items-center justify-center mb-3">
                  <feature.icon className="w-4 h-4" />
                </div>
                <h3 className="text-[15px] font-semibold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-[13px] text-slate-400 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
