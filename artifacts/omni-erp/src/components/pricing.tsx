import { useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Link } from "wouter";

const plans = [
  {
    name: "Starter",
    price: { monthly: 490, yearly: 390 },
    description: "Core operational tools for growing mid-market companies.",
    features: [
      "Up to 25 core users",
      "Financial Accounting & GL",
      "Basic Inventory Management",
      "Standard Reporting",
      "Email Support (24hr SLA)",
    ],
    cta: "Start Free Trial",
    popular: false,
  },
  {
    name: "Professional",
    price: { monthly: 1290, yearly: 990 },
    description: "The complete command center for scaling enterprises.",
    features: [
      "Up to 100 core users",
      "All Core Modules + Manufacturing",
      "Advanced AI Insights",
      "Custom Workflows & API Access",
      "Priority Support (4hr SLA)",
    ],
    cta: "Start Free Trial",
    popular: true,
  },
  {
    name: "Enterprise",
    price: { monthly: null, yearly: null },
    description: "Custom solutions for complex global organizations.",
    features: [
      "Unlimited users",
      "Multi-Entity & Multi-Currency",
      "Dedicated AI Models",
      "On-Premise Deployment Option",
      "Dedicated Success Manager",
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

const comparisonFeatures = [
  {
    name: "Core Users Included",
    starter: "25",
    pro: "100",
    enterprise: "Custom",
  },
  {
    name: "Data Storage",
    starter: "100 GB",
    pro: "1 TB",
    enterprise: "Unlimited",
  },
  { name: "Core Modules", starter: true, pro: true, enterprise: true },
  { name: "API Access", starter: false, pro: true, enterprise: true },
  { name: "AI Features", starter: false, pro: true, enterprise: true },
  { name: "Custom Workflows", starter: false, pro: true, enterprise: true },
  {
    name: "Multi-Entity Support",
    starter: false,
    pro: false,
    enterprise: true,
  },
  { name: "SLA Guarantee", starter: false, pro: false, enterprise: true },
];

export function Pricing() {
  const [isYearly, setIsYearly] = useState(true);

  return (
    <section id="pricing" className="py-24 relative bg-[#050816]">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/10 text-primary text-[11px] uppercase tracking-[0.15em] font-medium mb-6">
            Predictable Pricing
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold mb-6 text-white tracking-tight">
            Enterprise software doesn't
            <br />
            mean hidden fees.
          </h2>

          <div className="inline-flex items-center gap-1 bg-[#0a0f1e] border border-white/[0.07] p-1 rounded-lg mt-4">
            <button
              onClick={() => setIsYearly(false)}
              className={`px-5 py-2 text-[13px] font-medium rounded-md transition-colors ${!isYearly ? "bg-white/10 text-white" : "text-slate-400 hover:text-white"}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsYearly(true)}
              className={`px-5 py-2 text-[13px] font-medium rounded-md transition-colors flex items-center gap-2 ${isYearly ? "bg-white/10 text-white" : "text-slate-400 hover:text-white"}`}
            >
              Annually
              <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded uppercase tracking-wider">
                Save 20%
              </span>
            </button>
          </div>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-20">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.6,
                delay: i * 0.1,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
              className={`relative bg-[#0a0f1e] border rounded-2xl p-8 flex flex-col ${
                plan.popular
                  ? "border-primary/50 shadow-[0_0_40px_rgba(37,99,235,0.1)] -translate-y-2"
                  : "border-white/[0.07]"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                  Most Popular
                </div>
              )}

              <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
              <p className="text-[14px] text-slate-400 mb-6 h-10">
                {plan.description}
              </p>

              <div className="mb-8">
                {plan.price.monthly !== null ? (
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-white tabular-nums tracking-tight">
                      ₹{isYearly ? plan.price.yearly : plan.price.monthly}
                    </span>
                    <span className="text-slate-500 text-[14px]">/mo</span>
                  </div>
                ) : (
                  <div className="text-4xl font-bold text-white tracking-tight">
                    Custom
                  </div>
                )}
              </div>

              {plan.cta === "Start Free Trial" ? (
                <Link
                  href="/signup"
                  className={`w-full py-3 rounded-lg text-[14px] font-medium transition-colors mb-8 text-center ${
                    plan.popular
                      ? "bg-primary hover:bg-primary/90 text-white"
                      : "bg-white/5 hover:bg-white/10 text-white border border-white/10"
                  }`}
                >
                  {plan.cta}
                </Link>
              ) : (
                <button
                  className={`w-full py-3 rounded-lg text-[14px] font-medium transition-colors mb-8 ${
                    plan.popular
                      ? "bg-primary hover:bg-primary/90 text-white"
                      : "bg-white/5 hover:bg-white/10 text-white border border-white/10"
                  }`}
                >
                  {plan.cta}
                </button>
              )}

              <div className="flex flex-col gap-3 mt-auto">
                <div className="text-[12px] font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Includes:
                </div>
                {plan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span className="text-[14px] text-slate-400 leading-snug">
                      {feature}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Feature Comparison */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="bg-[#0a0f1e] border border-white/[0.07] rounded-2xl overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="p-6 text-[13px] font-semibold text-white uppercase tracking-wider w-1/3">
                    Feature Comparison
                  </th>
                  <th className="p-6 text-[13px] font-semibold text-white text-center w-[22%]">
                    Starter
                  </th>
                  <th className="p-6 text-[13px] font-semibold text-white text-center w-[22%]">
                    Professional
                  </th>
                  <th className="p-6 text-[13px] font-semibold text-white text-center w-[22%]">
                    Enterprise
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {comparisonFeatures.map((row, i) => (
                  <tr
                    key={i}
                    className={
                      i % 2 === 0 ? "bg-white/[0.02]" : "bg-transparent"
                    }
                  >
                    <td className="p-4 px-6 text-[14px] text-slate-300 font-medium">
                      {row.name}
                    </td>

                    <td className="p-4 text-center">
                      {typeof row.starter === "boolean" ? (
                        row.starter ? (
                          <Check className="w-4 h-4 text-primary mx-auto" />
                        ) : (
                          <span className="text-slate-600">—</span>
                        )
                      ) : (
                        <span className="text-[13px] text-slate-400">
                          {row.starter}
                        </span>
                      )}
                    </td>

                    <td className="p-4 text-center">
                      {typeof row.pro === "boolean" ? (
                        row.pro ? (
                          <Check className="w-4 h-4 text-primary mx-auto" />
                        ) : (
                          <span className="text-slate-600">—</span>
                        )
                      ) : (
                        <span className="text-[13px] text-slate-400">
                          {row.pro}
                        </span>
                      )}
                    </td>

                    <td className="p-4 text-center">
                      {typeof row.enterprise === "boolean" ? (
                        row.enterprise ? (
                          <Check className="w-4 h-4 text-primary mx-auto" />
                        ) : (
                          <span className="text-slate-600">—</span>
                        )
                      ) : (
                        <span className="text-[13px] text-slate-400">
                          {row.enterprise}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
