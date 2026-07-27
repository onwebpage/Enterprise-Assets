import { Link } from 'wouter';
import { Twitter, Linkedin, Github, Youtube } from 'lucide-react';
import { Button } from '@/components/ui/button';

const footerLinks = {
  Products: [
    { label: 'Financial Accounting', href: '#' },
    { label: 'Sales & CRM', href: '#' },
    { label: 'Inventory Management', href: '#' },
    { label: 'Manufacturing', href: '#' },
    { label: 'HRMS', href: '#' },
    { label: 'AI Features', href: '#' },
  ],
  Solutions: [
    { label: 'Small Business', href: '#' },
    { label: 'Mid-Market', href: '#' },
    { label: 'Enterprise', href: '#' },
    { label: 'By Industry', href: '#' },
    { label: 'White Label', href: '#' },
  ],
  Resources: [
    { label: 'Documentation', href: '#' },
    { label: 'API Reference', href: '#' },
    { label: 'Blog', href: '#' },
    { label: 'Case Studies', href: '#' },
    { label: 'Webinars', href: '#' },
    { label: 'Support', href: '#' },
  ],
  Legal: [
    { label: 'Privacy Policy', href: '#' },
    { label: 'Terms of Service', href: '#' },
    { label: 'Security', href: '#' },
    { label: 'Compliance', href: '#' },
    { label: 'GDPR', href: '#' },
  ],
  Support: [
    { label: 'Help Center', href: '#' },
    { label: 'Contact Us', href: '#' },
    { label: 'System Status', href: '#' },
    { label: 'Report a Bug', href: '#' },
    { label: 'Feature Requests', href: '#' },
  ],
};

export function Footer() {
  return (
    <footer id="company" className="border-t border-border/50 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 mb-12">
          {/* Logo & Newsletter */}
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-4 group">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 17L12 22L22 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 12L12 17L22 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="text-xl font-bold">OmniERP</span>
            </Link>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs">
              The all-in-one enterprise operating system that modern businesses deserve.
            </p>
            
            <div className="flex flex-col gap-2 mb-4">
              <label className="text-sm font-medium">Subscribe to our newsletter</label>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="your@email.com"
                  className="flex-1 px-4 py-2 rounded-lg glassmorphism text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <Button size="sm" className="gradient-primary">
                  Subscribe
                </Button>
              </div>
            </div>
          </div>

          {/* Link Columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="font-semibold mb-4 text-sm">{category}</h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
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
        <div className="pt-8 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © 2024 OmniERP Technologies, Inc. All rights reserved.
          </p>
          
          <div className="flex items-center gap-4">
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 rounded-lg glassmorphism flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/10 transition-all"
            >
              <Twitter className="w-4 h-4" />
            </a>
            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 rounded-lg glassmorphism flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/10 transition-all"
            >
              <Linkedin className="w-4 h-4" />
            </a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 rounded-lg glassmorphism flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/10 transition-all"
            >
              <Github className="w-4 h-4" />
            </a>
            <a
              href="https://youtube.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 rounded-lg glassmorphism flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/10 transition-all"
            >
              <Youtube className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
