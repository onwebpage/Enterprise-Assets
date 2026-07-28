import { Link } from "wouter";
import { Twitter, Linkedin, Github } from "lucide-react";

const footerLinks = {
  Products: [
    { label: "Financial Accounting", href: "#" },
    { label: "Sales & CRM", href: "#" },
    { label: "Inventory Management", href: "#" },
    { label: "Manufacturing", href: "#" },
    { label: "HRMS", href: "#" },
    { label: "AI Features", href: "#" },
  ],
  Solutions: [
    { label: "Small Business", href: "#" },
    { label: "Mid-Market", href: "#" },
    { label: "Enterprise", href: "#" },
    { label: "By Industry", href: "#" },
    { label: "White Label", href: "#" },
  ],
  Resources: [
    { label: "Documentation", href: "#" },
    { label: "API Reference", href: "#" },
    { label: "Blog", href: "#" },
    { label: "Case Studies", href: "#" },
    { label: "Webinars", href: "#" },
    { label: "Support", href: "#" },
  ],
  Company: [
    { label: "About Us", href: "#" },
    { label: "Careers", href: "#" },
    { label: "Security", href: "#" },
    { label: "Privacy Policy", href: "#" },
    { label: "Terms of Service", href: "#" },
  ],
};

export function Footer() {
  return (
    <footer
      id="company"
      className="border-t border-white/[0.05] bg-[#050816] pt-20 pb-10"
    >
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-12 mb-16">
          {/* Brand & Newsletter */}
          <div className="col-span-2 md:col-span-2">
            <Link href="/" className="flex items-center gap-2.5 mb-6 group">
              <div className="w-7 h-7 rounded bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <div className="w-2.5 h-2.5 border border-white rounded-sm rotate-45" />
              </div>
              <span className="text-[18px] font-bold text-white tracking-tight">
                OmniERP
              </span>
            </Link>
            <p className="text-[14px] text-slate-400 mb-8 max-w-sm leading-relaxed">
              The comprehensive enterprise operating system built for the scale
              and complexity of modern business.
            </p>

            <div className="space-y-3 max-w-sm">
              <div className="text-[12px] font-semibold text-white uppercase tracking-wider">
                Subscribe to our newsletter
              </div>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="name@company.com"
                  className="flex-1 bg-[#0a0f1e] border border-white/10 rounded-lg px-4 py-2.5 text-[14px] text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
                />
                <button className="bg-primary hover:bg-primary/90 text-white px-4 py-2.5 rounded-lg text-[14px] font-medium transition-colors">
                  Subscribe
                </button>
              </div>
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category} className="col-span-1">
              <h3 className="text-[13px] font-semibold text-white mb-5 uppercase tracking-wider">
                {category}
              </h3>
              <ul className="space-y-3.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-[14px] text-slate-400 hover:text-white transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/[0.05] flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[13px] text-slate-500">
            © {new Date().getFullYear()} OmniERP Technologies, Inc. All rights
            reserved.
          </p>

          <div className="flex items-center gap-5">
            <a
              href="#"
              className="text-slate-500 hover:text-white transition-colors"
            >
              <Twitter className="w-4 h-4" />
            </a>
            <a
              href="#"
              className="text-slate-500 hover:text-white transition-colors"
            >
              <Linkedin className="w-4 h-4" />
            </a>
            <a
              href="#"
              className="text-slate-500 hover:text-white transition-colors"
            >
              <Github className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
