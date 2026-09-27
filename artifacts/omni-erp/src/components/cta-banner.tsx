import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "wouter";

export function CTABanner() {
  return (
    <section className="py-24 relative bg-[#050816] overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-[#050816] to-accent/20" />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-primary/20 blur-[150px] pointer-events-none" />

      <div className="relative z-10 max-w-[800px] mx-auto px-4 sm:px-6 lg:px-8 text-center border border-white/[0.08] bg-[#0a0f1e]/80 backdrop-blur-xl rounded-3xl p-12 sm:p-20 shadow-2xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <h2 className="text-4xl sm:text-5xl lg:text-[56px] font-bold mb-6 text-white tracking-tight leading-[1.1]">
            Ready to upgrade your
            <br />
            enterprise operations?
          </h2>
          <p className="text-[17px] text-slate-400 mb-10 max-w-xl mx-auto leading-relaxed">
            Join 10,000+ businesses running on ZorvanI ERP. Start your free trial
            today — full access, no credit card required.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="bg-primary hover:bg-primary/90 text-white rounded-lg px-8 py-4 text-[15px] font-semibold transition-all w-full sm:w-auto inline-flex items-center justify-center gap-2"
            >
              Start Free Trial
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#demo"
              className="bg-[#050816] hover:bg-white/5 text-white border border-white/15 rounded-lg px-8 py-4 text-[15px] font-semibold transition-all w-full sm:w-auto text-center"
            >
              Contact Sales
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
