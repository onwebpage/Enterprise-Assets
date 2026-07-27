import { motion } from 'framer-motion';

const testimonials = [
  {
    quote: "OmniERP transformed how we run our manufacturing business. The level of integration and real-time visibility is unmatched. We've cut our month-end close from 15 days to just 3.",
    author: 'Rachel Martinez',
    role: 'CFO',
    company: 'Apex Manufacturing',
    initial: 'RM',
  },
  {
    quote: "The AI-powered insights have given us a competitive edge. We can now predict inventory needs with 94% accuracy, saving us hundreds of thousands in carrying costs.",
    author: 'David Chen',
    role: 'VP Operations',
    company: 'Horizon Logistics',
    initial: 'DC',
  },
  {
    quote: "We evaluated SAP, Oracle, and Salesforce. OmniERP was the only platform that felt built for this decade. The mobile experience alone justified the switch.",
    author: 'Sarah Thompson',
    role: 'CTO',
    company: 'Quantum Solutions',
    initial: 'ST',
  },
  {
    quote: "Implementation took 6 weeks instead of the 6 months our previous ERP required. The ROI was visible within the first quarter. Best enterprise software decision we've made.",
    author: 'Michael Park',
    role: 'CEO',
    company: 'Vanguard Industries',
    initial: 'MP',
  },
  {
    quote: "As a multi-national corporation, we needed something that could handle complex tax scenarios across 40 countries. OmniERP handles it effortlessly.",
    author: 'Elena Rodriguez',
    role: 'Global Controller',
    company: 'Atlas Group',
    initial: 'ER',
  },
  {
    quote: "The white-label capabilities let us offer ERP to our clients under our own brand. It's become a significant revenue stream for our consulting practice.",
    author: 'James Wilson',
    role: 'Managing Partner',
    company: 'Catalyst Consulting',
    initial: 'JW',
  },
];

export function Testimonials() {
  return (
    <section id="resources" className="py-24 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl sm:text-5xl font-bold mb-4">
            Trusted by the
            <br />
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              world's best teams.
            </span>
          </h2>
          <p className="text-xl text-muted-foreground">
            See why industry leaders choose OmniERP to power their operations.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.6 }}
              whileHover={{ y: -5 }}
              className="glassmorphism rounded-2xl p-6 hover:bg-white/10 transition-all duration-300"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-lg font-bold flex-shrink-0">
                  {testimonial.initial}
                </div>
                <div>
                  <div className="font-semibold">{testimonial.author}</div>
                  <div className="text-sm text-muted-foreground">
                    {testimonial.role}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {testimonial.company}
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                "{testimonial.quote}"
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
