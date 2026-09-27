import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";

const faqs = [
  {
    question: "How long does implementation typically take?",
    answer:
      "Most implementations are completed in 4-8 weeks, depending on your organization size and complexity. Our Professional Services team works closely with you to ensure a smooth transition, including data migration, user training, and process optimization.",
  },
  {
    question: "Can ZorvanI ERP integrate with our existing systems?",
    answer:
      "Yes. ZorvanI ERP offers 500+ pre-built integrations with popular business tools, plus a comprehensive REST API for custom integrations. Our Integration Hub supports real-time data sync with CRMs, payment gateways, e-commerce platforms, and legacy systems.",
  },
  {
    question: "Is my data secure and compliant?",
    answer:
      "Absolutely. ZorvanI ERP is SOC 2 Type II certified, GDPR compliant, and uses bank-grade AES-256 encryption. Data is backed up hourly across multiple geographic regions. We support SSO, 2FA, role-based access control, and maintain detailed audit logs.",
  },
  {
    question: "What kind of support do you offer?",
    answer:
      "All plans include email support with 24-hour response times. Professional plans add priority support via chat and phone. Enterprise customers receive 24/7 dedicated support with a dedicated success manager and guaranteed SLAs.",
  },
  {
    question: "Can we customize ZorvanI ERP to our specific needs?",
    answer:
      "Yes. ZorvanI ERP is highly configurable without code through our Workflow Builder and Custom Fields. For deeper customization, our API and SDK let you build custom modules, integrations, and white-label solutions. Enterprise customers can work with our Professional Services team for bespoke development.",
  },
  {
    question: "Do you offer on-premise deployment?",
    answer:
      "Yes. While we recommend our cloud infrastructure for optimal performance and security, we offer on-premise and hybrid deployment options for Enterprise customers with specific compliance or data residency requirements.",
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="py-24 relative bg-[#050816]">
      <div className="max-w-[800px] mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="mb-12"
        >
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-white mb-4">
            Frequently Asked Questions
          </h2>
        </motion.div>

        <div className="border-t border-white/[0.06]">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className="border-b border-white/[0.06]"
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="w-full py-6 flex items-center justify-between text-left group"
                >
                  <span
                    className={`text-[17px] font-semibold transition-colors ${isOpen ? "text-primary" : "text-white group-hover:text-primary"}`}
                  >
                    {faq.question}
                  </span>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${isOpen ? "border-primary bg-primary/10 text-primary rotate-45" : "border-white/10 bg-transparent text-slate-400 group-hover:border-white/20"}`}
                  >
                    <Plus className="w-4 h-4" />
                  </div>
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{
                        duration: 0.3,
                        ease: [0.25, 0.46, 0.45, 0.94],
                      }}
                      className="overflow-hidden"
                    >
                      <p className="pb-6 text-[15px] text-slate-400 leading-relaxed max-w-[90%]">
                        {faq.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
