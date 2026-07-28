import { useState } from 'react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { Eye, EyeOff, ArrowRight, ShieldCheck, Zap, Activity } from 'lucide-react';

const trustItems = [
  { icon: ShieldCheck, label: 'ISO 27001 Certified' },
  { icon: Zap, label: 'AI-Powered Platform' },
  { icon: Activity, label: '99.99% Uptime SLA' },
];

const testimonial = {
  quote: "OmniERP transformed how we operate. We consolidated six systems into one and cut reporting time by 80%.",
  name: "Sarah Okonkwo",
  title: "CFO, Stratford Industries",
  initials: "SO",
};

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => setLoading(false), 1800);
  }

  return (
    <div className="min-h-screen flex bg-background">

      {/* ── Left brand panel ──────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[46%] xl:w-[42%] relative flex-col justify-between p-12 overflow-hidden">
        {/* Background layers */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.15] via-transparent to-accent/[0.08]" />
        <div className="absolute top-0 left-0 w-96 h-96 rounded-full bg-primary/10 blur-[100px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-accent/[0.08] blur-[80px] translate-x-1/4 translate-y-1/4 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-border/60 to-transparent" />

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10"
        >
          <Link href="/" className="inline-flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="8" height="8" rx="1.5" fill="white" fillOpacity="0.9" />
                <rect x="13" y="3" width="8" height="8" rx="1.5" fill="white" fillOpacity="0.5" />
                <rect x="3" y="13" width="8" height="8" rx="1.5" fill="white" fillOpacity="0.5" />
                <rect x="13" y="13" width="8" height="8" rx="1.5" fill="white" fillOpacity="0.9" />
              </svg>
            </div>
            <span className="text-lg font-bold tracking-tight group-hover:text-primary transition-colors">OmniERP</span>
          </Link>
        </motion.div>

        {/* Center content */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10"
        >
          <p className="text-xs font-semibold text-primary/70 uppercase tracking-widest mb-4">
            Enterprise Operating System
          </p>
          <h2 className="text-3xl xl:text-4xl font-bold leading-[1.12] tracking-tight mb-6">
            Your entire business,<br />unified in one place.
          </h2>
          <p className="text-sm text-muted-foreground/70 leading-relaxed max-w-sm mb-10">
            Finance, operations, HR, supply chain, and CRM — all connected, all intelligent, all in real time.
          </p>

          {/* Testimonial */}
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5">
            <div className="flex gap-0.5 mb-3">
              {[...Array(5)].map((_, i) => (
                <svg key={i} width="12" height="12" viewBox="0 0 12 12" fill="hsl(221,83%,53%)">
                  <path d="M6 1l1.3 2.6L10 4.1 8 6l.5 2.9L6 7.5l-2.5 1.4L4 6 2 4.1l2.7-.5z" />
                </svg>
              ))}
            </div>
            <p className="text-sm text-foreground/80 leading-relaxed mb-4 italic">
              "{testimonial.quote}"
            </p>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/60 to-accent/60 flex items-center justify-center text-xs font-bold">
                {testimonial.initials}
              </div>
              <div>
                <div className="text-xs font-semibold">{testimonial.name}</div>
                <div className="text-[11px] text-muted-foreground/50">{testimonial.title}</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Trust badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="relative z-10 flex items-center gap-4"
        >
          {trustItems.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-1.5 text-[11px] text-muted-foreground/40">
              <Icon className="w-3 h-3 text-primary/50" strokeWidth={2} />
              {label}
            </div>
          ))}
        </motion.div>
      </div>

      {/* ── Right form panel ──────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 sm:px-10 py-12 relative">
        {/* Subtle top glow */}
        <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-primary/[0.04] to-transparent pointer-events-none" />

        {/* Mobile logo */}
        <div className="lg:hidden mb-10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="8" height="8" rx="1.5" fill="white" fillOpacity="0.9" />
              <rect x="13" y="3" width="8" height="8" rx="1.5" fill="white" fillOpacity="0.5" />
              <rect x="3" y="13" width="8" height="8" rx="1.5" fill="white" fillOpacity="0.5" />
              <rect x="13" y="13" width="8" height="8" rx="1.5" fill="white" fillOpacity="0.9" />
            </svg>
          </div>
          <span className="text-lg font-bold tracking-tight">OmniERP</span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[400px] relative z-10"
        >
          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">Sign in to OmniERP</h1>
            <p className="text-sm text-muted-foreground/60">
              New to OmniERP?{' '}
              <Link href="/" className="text-primary hover:text-primary/80 font-medium transition-colors">
                Start a free trial
              </Link>
            </p>
          </div>

          {/* SSO button */}
          <button className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border border-border/60 bg-white/[0.03] hover:bg-white/[0.06] hover:border-border transition-all duration-150 text-sm font-medium mb-4">
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.909-2.259c-.806.54-1.837.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <button className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border border-border/60 bg-white/[0.03] hover:bg-white/[0.06] hover:border-border transition-all duration-150 text-sm font-medium mb-6">
            <svg width="18" height="18" viewBox="0 0 21 21" fill="none">
              <path d="M10.5 0C4.7 0 0 4.7 0 10.5S4.7 21 10.5 21 21 16.3 21 10.5 16.3 0 10.5 0zm4.5 14.4H6V6.6h9v7.8z" fill="#00A4EF"/>
            </svg>
            Continue with Microsoft
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-border/50" />
            <span className="text-xs text-muted-foreground/40 font-medium">or sign in with email</span>
            <div className="flex-1 h-px bg-border/50" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground/80">Work email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-border/60 bg-white/[0.03] text-sm placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/60 focus:bg-white/[0.05] focus:ring-2 focus:ring-primary/10 transition-all duration-150"
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground/80">Password</label>
                <button
                  type="button"
                  className="text-xs text-primary/70 hover:text-primary transition-colors font-medium"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  required
                  className="w-full px-4 py-2.5 pr-11 rounded-xl border border-border/60 bg-white/[0.03] text-sm placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/60 focus:bg-white/[0.05] focus:ring-2 focus:ring-primary/10 transition-all duration-150"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <label className="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-border/60 bg-white/[0.03] accent-primary cursor-pointer"
              />
              <span className="text-sm text-muted-foreground/60 group-hover:text-muted-foreground/80 transition-colors">
                Keep me signed in for 30 days
              </span>
            </label>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.01 }}
              whileTap={{ scale: loading ? 1 : 0.99 }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-white font-semibold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-150 mt-1"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Signing in…
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
                </>
              )}
            </motion.button>
          </form>

          {/* SSO enterprise link */}
          <div className="mt-5 text-center">
            <button className="text-xs text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors font-medium">
              Sign in with SAML SSO →
            </button>
          </div>
        </motion.div>

        {/* Footer */}
        <p className="absolute bottom-6 text-[11px] text-muted-foreground/30 text-center">
          © 2025 OmniERP Inc. ·{' '}
          <span className="hover:text-muted-foreground/50 cursor-pointer transition-colors">Privacy</span>
          {' · '}
          <span className="hover:text-muted-foreground/50 cursor-pointer transition-colors">Terms</span>
          {' · '}
          <span className="hover:text-muted-foreground/50 cursor-pointer transition-colors">Security</span>
        </p>
      </div>

    </div>
  );
}
