import { motion } from "framer-motion";

export function TrustedBy() {
  return (
    <section className="py-20 border-y border-white/[0.05] bg-[#050816]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <p className="text-[11px] uppercase tracking-[0.15em] text-slate-500 font-medium">
            Built for teams that want one source of truth
          </p>
        </div>
        <p className="mx-auto max-w-2xl text-center text-sm leading-6 text-slate-500">
          Bring your own organization, customers, transactions, inventory, and workflows into a connected operational workspace.
        </p>
      </div>
    </section>
  );
}
