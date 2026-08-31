import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { Menu, ChevronDown, Building2, HeartPulse, ShoppingCart, Factory, Truck, Landmark, Code2, BookOpen, Terminal, Puzzle, Shield, LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth, type AuthUser } from "@/contexts/auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const industriesItems = [
  { icon: Factory, label: "Manufacturing", desc: "End-to-end production control" },
  { icon: HeartPulse, label: "Healthcare", desc: "Compliance-ready operations" },
  { icon: ShoppingCart, label: "Retail & eCommerce", desc: "Unified commerce platform" },
  { icon: Truck, label: "Logistics", desc: "Supply chain visibility" },
  { icon: Landmark, label: "Financial Services", desc: "Regulated finance workflows" },
  { icon: Building2, label: "Real Estate", desc: "Asset & lease management" },
];

const developerItems = [
  { icon: Code2, label: "API Reference", desc: "Full REST & GraphQL docs" },
  { icon: Terminal, label: "SDKs & Libraries", desc: "JS, Python, Java, Go" },
  { icon: Puzzle, label: "Integrations", desc: "500+ connectors" },
  { icon: BookOpen, label: "Documentation", desc: "Guides & tutorials" },
  { icon: Shield, label: "Security", desc: "Auth, RBAC & compliance" },
  { icon: LifeBuoy, label: "Support Portal", desc: "Enterprise SLAs" },
];

const simpleLinks = [
  { label: "Products", href: "#products" },
  { label: "Solutions", href: "#solutions" },
  { label: "Pricing", href: "#pricing" },
  { label: "Resources", href: "#resources" },
  { label: "Company", href: "#company" },
];

function PublicProfileMenu({ user, logout, mobile = false }: {
  user: AuthUser;
  logout: () => void;
  mobile?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Open profile menu"
          className={mobile
            ? "w-full flex items-center gap-3 bg-white/5 hover:bg-white/10 text-white px-4 py-2.5 text-[14px] font-medium rounded-lg transition-all"
            : "flex items-center gap-2 hover:bg-white/[0.06] rounded-lg p-1.5 transition-colors"}
        >
          <Avatar className="w-7 h-7">
            <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-xs font-bold">
              {user.initials}
            </AvatarFallback>
          </Avatar>
          {mobile && (
            <span className="flex-1 text-left truncate">
              {user.displayName}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-[#0a0f1e] border-white/[0.08] text-white">
        <DropdownMenuLabel>
          <p className="font-semibold truncate">{user.displayName}</p>
          <p className="text-xs text-white/40 font-normal truncate">{user.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/[0.08]" />
        <DropdownMenuItem asChild className="hover:bg-white/[0.05] cursor-pointer">
          <Link href="/app/dashboard">Open dashboard</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="hover:bg-white/[0.05] cursor-pointer">
          <Link href="/app/settings">Account settings</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-white/[0.08]" />
        <DropdownMenuItem onClick={logout} className="hover:bg-white/[0.05] cursor-pointer text-red-400">
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DropdownMenu({
  label,
  items,
}: {
  label: string;
  items: { icon: React.ElementType; label: string; desc: string }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        className="flex items-center gap-1 text-[13px] font-medium text-slate-400 hover:text-white transition-colors duration-200 py-2"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {label}
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-72 rounded-xl border border-white/[0.08] bg-[#0a0f1e]/95 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] p-2 z-50"
          >
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.label}
                  href="#"
                  onClick={(e) => { e.preventDefault(); setOpen(false); }}
                  className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.05] transition-colors group"
                >
                  <div className="mt-0.5 w-7 h-7 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                    <Icon className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div>
                    <div className="text-[13px] font-medium text-white leading-tight">
                      {item.label}
                    </div>
                    <div className="text-[12px] text-slate-500 mt-0.5 leading-tight">
                      {item.desc}
                    </div>
                  </div>
                </a>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
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
          <div className="hidden lg:flex items-center gap-6">
            {simpleLinks.slice(0, 2).map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-[13px] font-medium text-slate-400 hover:text-white transition-colors duration-200"
              >
                {link.label}
              </a>
            ))}
            <DropdownMenu label="Industries" items={industriesItems} />
            <a
              href="#pricing"
              className="text-[13px] font-medium text-slate-400 hover:text-white transition-colors duration-200"
            >
              Pricing
            </a>
            <a
              href="#resources"
              className="text-[13px] font-medium text-slate-400 hover:text-white transition-colors duration-200"
            >
              Resources
            </a>
            <DropdownMenu label="Developers" items={developerItems} />
            <a
              href="#company"
              className="text-[13px] font-medium text-slate-400 hover:text-white transition-colors duration-200"
            >
              Company
            </a>
          </div>

          {/* Desktop CTA */}
          <div className="hidden lg:flex items-center gap-3">
            {user ? (
              <PublicProfileMenu user={user} logout={logout} />
            ) : (
              <>
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
                <Link
                  href="/signup"
                  className="bg-primary hover:bg-primary/90 text-white rounded-lg px-4 py-2 text-[13px] font-medium transition-all duration-200"
                >
                  Start Free Trial
                </Link>
              </>
            )}
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
              className="w-full sm:w-80 bg-[#0a0f1e] border-white/10 p-6 overflow-y-auto"
            >
              <div className="flex flex-col gap-1 mt-8">
                {["Products", "Solutions", "Pricing", "Resources", "Company"].map((label) => (
                  <a
                    key={label}
                    href={`#${label.toLowerCase()}`}
                    onClick={() => setMobileOpen(false)}
                    className="text-[15px] font-medium text-slate-400 hover:text-white transition-colors px-2 py-3 rounded-lg hover:bg-white/[0.04]"
                  >
                    {label}
                  </a>
                ))}

                {/* Industries mobile group */}
                <div className="pt-1">
                  <div className="text-[11px] uppercase tracking-[0.12em] text-slate-600 font-medium px-2 py-2">
                    Industries
                  </div>
                  {industriesItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <a
                        key={item.label}
                        href="#"
                        onClick={(e) => { e.preventDefault(); setMobileOpen(false); }}
                        className="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-white/[0.04] transition-colors"
                      >
                        <Icon className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="text-[14px] text-slate-400 hover:text-white transition-colors">
                          {item.label}
                        </span>
                      </a>
                    );
                  })}
                </div>

                {/* Developers mobile group */}
                <div className="pt-1">
                  <div className="text-[11px] uppercase tracking-[0.12em] text-slate-600 font-medium px-2 py-2">
                    Developers
                  </div>
                  {developerItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <a
                        key={item.label}
                        href="#"
                        onClick={(e) => { e.preventDefault(); setMobileOpen(false); }}
                        className="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-white/[0.04] transition-colors"
                      >
                        <Icon className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="text-[14px] text-slate-400 hover:text-white transition-colors">
                          {item.label}
                        </span>
                      </a>
                    );
                  })}
                </div>

                <div className="flex flex-col gap-3 pt-6 mt-2 border-t border-white/10">
                  {user ? (
                    <PublicProfileMenu user={user} logout={logout} mobile />
                  ) : (
                    <>
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
                      <Link
                        href="/signup"
                        className="w-full text-center bg-primary hover:bg-primary/90 text-white px-4 py-2.5 text-[14px] font-medium rounded-lg transition-all"
                      >
                        Start Free Trial
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </motion.nav>
  );
}
