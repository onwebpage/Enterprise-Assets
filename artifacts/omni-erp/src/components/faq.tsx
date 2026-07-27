import { motion } from 'framer-motion';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const faqs = [
  {
    question: 'How long does implementation typically take?',
    answer: 'Most implementations are completed in 4-8 weeks, depending on your organization size and complexity. Our Professional Services team works closely with you to ensure a smooth transition, including data migration, user training, and process optimization.',
  },
  {
    question: 'Can OmniERP integrate with our existing systems?',
    answer: 'Yes. OmniERP offers 500+ pre-built integrations with popular business tools, plus a comprehensive REST API for custom integrations. Our Integration Hub supports real-time data sync with CRMs, payment gateways, e-commerce platforms, and legacy systems.',
  },
  {
    question: 'Is my data secure and compliant?',
    answer: 'Absolutely. OmniERP is SOC 2 Type II certified, GDPR compliant, and uses bank-grade AES-256 encryption. Data is backed up hourly across multiple geographic regions. We support SSO, 2FA, role-based access control, and maintain detailed audit logs.',
  },
  {
    question: 'What kind of support do you offer?',
    answer: 'All plans include email support with 24-hour response times. Professional plans add priority support via chat and phone. Enterprise customers receive 24/7 dedicated support with a dedicated success manager and guaranteed SLAs.',
  },
  {
    question: 'Can we customize OmniERP to our specific needs?',
    answer: 'Yes. OmniERP is highly configurable without code through our Workflow Builder and Custom Fields. For deeper customization, our API and SDK let you build custom modules, integrations, and white-label solutions. Enterprise customers can work with our Professional Services team for bespoke development.',
  },
  {
    question: 'Do you offer on-premise deployment?',
    answer: 'Yes. While we recommend our cloud infrastructure for optimal performance and security, we offer on-premise and hybrid deployment options for Enterprise customers with specific compliance or data residency requirements.',
  },
  {
    question: 'What training and onboarding do you provide?',
    answer: 'Every plan includes comprehensive documentation, video tutorials, and webinars. Professional and Enterprise plans include personalized onboarding sessions, custom training materials, and ongoing education for your team. We also offer certification programs for power users and administrators.',
  },
  {
    question: 'How does pricing scale as we grow?',
    answer: 'Our pricing is transparent and predictable. You only pay for active users and can add or remove seats at any time. Storage, API calls, and AI features are included in your plan tier. There are no surprise fees — ever.',
  },
  {
    question: 'Can we try OmniERP before committing?',
    answer: 'Yes! We offer a 14-day free trial with full access to all features (no credit card required). Our team can also provide a personalized demo tailored to your industry and use case.',
  },
  {
    question: 'What happens to our data if we decide to leave?',
    answer: "You own your data, period. We provide full data export in standard formats (CSV, JSON, SQL) at any time. If you decide to leave, we'll work with you to ensure a smooth transition and provide up to 90 days of read-only access for migration purposes.",
  },
];

export function FAQ() {
  return (
    <section className="py-24 relative">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl sm:text-5xl font-bold mb-4">
            Got questions?
            <br />
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              We've got answers.
            </span>
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="glassmorphism rounded-xl px-6 border-none"
              >
                <AccordionTrigger className="text-left hover:no-underline py-6">
                  <span className="font-semibold">{faq.question}</span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-6">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
}
