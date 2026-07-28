import { motion } from "framer-motion";

const companies = [
  "Stratford Industries",
  "Apex Global",
  "Meridian Corp",
  "Catalyst Ventures",
  "Nexus Enterprises",
  "Horizon Tech",
  "Vanguard Systems",
  "Phoenix Manufacturing",
  "Titan Holdings",
  "Quantum Solutions",
  "Atlas Group",
  "Zenith Partners",
];

const doubled = [...companies, ...companies];

export function TrustedBy() {
  return (
    <section className="py-20 border-y border-white/[0.05] bg-[#050816]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <p className="text-[11px] uppercase tracking-[0.15em] text-slate-500 font-medium">
            Trusted by 2,400+ enterprise teams worldwide
          </p>
        </div>

        <div className="relative overflow-hidden flex flex-col gap-6">
          {/* Fade edges */}
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-32 z-10 bg-gradient-to-r from-[#050816] to-transparent" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-32 z-10 bg-gradient-to-l from-[#050816] to-transparent" />

          {/* Top Row - Scrolls Left */}
          <div className="flex gap-4 animate-marquee">
            {doubled.map((company, index) => (
              <div
                key={`top-${index}`}
                className="flex-shrink-0 px-5 py-2.5 border border-white/10 bg-white/[0.03] rounded-full flex items-center justify-center"
              >
                <span className="text-[14px] font-medium text-slate-400 whitespace-nowrap">
                  {company}
                </span>
              </div>
            ))}
          </div>

          {/* Bottom Row - Scrolls Right */}
          <div
            className="flex gap-4 animate-marquee"
            style={{ animationDirection: "reverse", animationDuration: "45s" }}
          >
            {doubled.map((company, index) => (
              <div
                key={`bottom-${index}`}
                className="flex-shrink-0 px-5 py-2.5 border border-white/10 bg-white/[0.03] rounded-full flex items-center justify-center"
              >
                <span className="text-[14px] font-medium text-slate-400 whitespace-nowrap">
                  {company}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
