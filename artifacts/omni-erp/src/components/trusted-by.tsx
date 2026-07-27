import { motion } from 'framer-motion';

const companies = [
  'Stratford Industries',
  'Apex Global',
  'Meridian Corp',
  'Catalyst Ventures',
  'Nexus Enterprises',
  'Horizon Tech',
  'Vanguard Systems',
  'Phoenix Manufacturing',
  'Titan Holdings',
  'Quantum Solutions',
  'Atlas Group',
  'Zenith Partners',
];

export function TrustedBy() {
  return (
    <section className="py-20 border-y border-border/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Trusted Worldwide
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold">
            Powering 10,000+ enterprises globally
          </h2>
        </motion.div>

        <div className="relative overflow-hidden">
          <div className="flex gap-8">
            <div className="flex gap-8 animate-marquee">
              {companies.map((company, index) => (
                <div
                  key={`first-${index}`}
                  className="flex-shrink-0 px-8 py-4 text-lg font-semibold text-muted-foreground/60 hover:text-foreground transition-colors whitespace-nowrap"
                >
                  {company}
                </div>
              ))}
            </div>
            <div className="flex gap-8 animate-marquee" aria-hidden="true">
              {companies.map((company, index) => (
                <div
                  key={`second-${index}`}
                  className="flex-shrink-0 px-8 py-4 text-lg font-semibold text-muted-foreground/60 hover:text-foreground transition-colors whitespace-nowrap"
                >
                  {company}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
