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

const doubled = [...companies, ...companies];

export function TrustedBy() {
  return (
    <section className="py-20 border-y border-border/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-2">
            Trusted Worldwide
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold">
            Powering 10,000+ enterprises globally
          </h2>
        </div>

        <div className="relative overflow-hidden">
          {/* Fade edges */}
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-r from-background to-transparent" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-l from-background to-transparent" />

          <div className="flex gap-0 animate-marquee">
            {doubled.map((company, index) => (
              <div
                key={index}
                className="flex-shrink-0 px-8 py-4 text-base font-medium text-muted-foreground/50 hover:text-muted-foreground transition-colors duration-200 whitespace-nowrap"
              >
                {company}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
