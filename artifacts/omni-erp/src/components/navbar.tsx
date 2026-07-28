import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { motion, AnimatePresence } from "framer-motion";

const navLinks = [
  { label: "Products", href: "#products" },
  { label: "Solutions", href: "#solutions" },
  { label: "Industries", href: "#industries" },
  { label: "Pricing", href: "#pricing" },
  { label: "Resources", href: "#resources" },
  { label: "Developers", href: "#developers" },
  { label: "Company", href: "#company" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#050816]/80 backdrop-blur-xl border-b border-white/[0.06] shadow-[0_1px_0_0_rgba(255,255,255,0.06)]"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-md bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
              <div className="w-3.5 h-3.5 border-2 border-white rounded-sm rotate-45 group-hover:rotate-90 transition-transform duration-500 ease-out" />
            </div>
            <span className="text-[17px] font-bold tracking-tight text-white">
              OmniERP
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-7">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-[13px] font-medium text-slate-400 hover:text-white transition-colors duration-200"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden lg:flex items-center gap-3">
            <Link
              href="/login"
              className="text-[13px] font-medium text-slate-400 hover:text-white transition-colors px-3 py-2"
            >
              Login
            </Link>
            <a
              href="#demo"
              className="bg-transparent hover:bg-white/[0.06] text-white border border-white/15 px-4 py-2 text-[13px] font-medium rounded-lg transition-all duration-200"
            >
              Book Demo
            </a>
            <a
              href="#trial"
              className="bg-primary hover:bg-primary/90 text-white rounded-lg px-4 py-2 text-[13px] font-medium transition-all duration-200"
            >
              Start Free Trial
            </a>
          </div>

          {/* Mobile Menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild className="lg:hidden">
              <Button
                variant="ghost"
                size="icon"
                className="text-slate-400 hover:text-white hover:bg-white/5"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-full sm:w-80 bg-[#0a0f1e] border-white/10 p-6"
            >
              <div className="flex flex-col gap-6 mt-8">
                {navLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="text-[15px] font-medium text-slate-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </a>
                ))}
                <div className="flex flex-col gap-3 pt-6 border-t border-white/10">
                  <Link
                    href="/login"
                    className="w-full text-center bg-white/5 hover:bg-white/10 text-white px-4 py-2.5 text-[14px] font-medium rounded-lg transition-all"
                  >
                    Login
                  </Link>
                  <a
                    href="#demo"
                    className="w-full text-center bg-transparent border border-white/15 hover:bg-white/5 text-white px-4 py-2.5 text-[14px] font-medium rounded-lg transition-all"
                  >
                    Book Demo
                  </a>
                  <a
                    href="#trial"
                    className="w-full text-center bg-primary hover:bg-primary/90 text-white px-4 py-2.5 text-[14px] font-medium rounded-lg transition-all"
                  >
                    Start Free Trial
                  </a>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </motion.nav>
  );
}
