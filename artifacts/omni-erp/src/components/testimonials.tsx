import { motion } from "framer-motion";

const testimonials = [
  {
    company: "Apex Manufacturing",
    metric: "47% faster month-end close",
    quote:
      "OmniERP transformed how we run our manufacturing business. The level of integration and real-time visibility is unmatched.",
    author: "Rachel Martinez",
    role: "CFO",
    initial: "RM",
  },
  {
    company: "Horizon Logistics",
    metric: "$850k saved in carrying costs",
    quote:
      "The AI-powered insights have given us a competitive edge. We can now predict inventory needs with 94% accuracy.",
    author: "David Chen",
    role: "VP Operations",
    initial: "DC",
  },
  {
    company: "Quantum Solutions",
    metric: "Zero downtime migration",
    quote:
      "We evaluated SAP, Oracle, and Salesforce. OmniERP was the only platform that felt built for this decade. The mobile experience alone justified the switch.",
    author: "Sarah Thompson",
    role: "CTO",
    initial: "ST",
  },
  {
    company: "Vanguard Industries",
    metric: "6-week implementation time",
    quote:
      "Implementation took 6 weeks instead of the 6 months our previous ERP required. The ROI was visible within the first quarter.",
    author: "Michael Park",
    role: "CEO",
    initial: "MP",
  },
  {
    company: "Atlas Group",
    metric: "Active in 40+ countries",
    quote:
      "As a multi-national corporation, we needed something that could handle complex tax scenarios across borders. OmniERP handles it effortlessly.",
    author: "Elena Rodriguez",
    role: "Global Controller",
    initial: "ER",
  },
  {
    company: "Catalyst Consulting",
    metric: "14 new white-label deployments",
    quote:
      "The white-label capabilities let us offer ERP to our clients under our own brand. It's become a significant revenue stream for our practice.",
    author: "James Wilson",
    role: "Managing Partner",
    initial: "JW",
  },
];

export function Testimonials() {
  return (
    <section id="resources" className="py-24 relative bg-[#050816]">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/10 text-primary text-[11px] uppercase tracking-[0.15em] font-medium mb-6">
            Enterprise Case Studies
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold mb-4 tracking-tight text-white">
            Trusted by the world's
            <br />
            most demanding teams.
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.6,
                delay: i * 0.1,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
              className="bg-[#0a0f1e] border border-white/[0.07] border-l-[3px] border-l-primary rounded-xl p-8 flex flex-col h-full"
            >
              <div className="flex items-start justify-between mb-6">
                <h3 className="text-2xl font-bold text-white tracking-tight">
                  {t.company}
                </h3>
                <div className="text-[12px] font-semibold text-green-400 bg-green-400/10 px-3 py-1 rounded-full">
                  {t.metric}
                </div>
              </div>

              <p className="text-[16px] text-slate-300 leading-relaxed mb-8 italic flex-1">
                "{t.quote}"
              </p>

              <div className="flex items-center gap-4 mt-auto">
                <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[12px] font-bold text-slate-300">
                  {t.initial}
                </div>
                <div>
                  <div className="text-[14px] font-semibold text-white">
                    {t.author}
                  </div>
                  <div className="text-[13px] text-slate-500">{t.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
