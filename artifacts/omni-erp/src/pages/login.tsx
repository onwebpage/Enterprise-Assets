import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { Eye, EyeOff, ArrowRight, ShieldCheck, Zap, Activity } from 'lucide-react';
import { useAuth } from '@/contexts/auth';
import BrandLogo from '@/components/BrandLogo';

const trustItems = [
  { icon: ShieldCheck, label: 'ISO 27001 Certified' },
  { icon: Zap, label: 'AI-Powered Platform' },
  { icon: Activity, label: '99.99% Uptime SLA' },
];

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const [, navigate] = useLocation();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password, rememberMe);
      navigate('/app/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-background">

      {/* ── Left brand panel ──────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[46%] xl:w-[42%] relative flex-col justify-between p-12 overflow-hidden">
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

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10"
        >
          <Link href="/" className="inline-flex items-center gap-3 group">
            <BrandLogo className="w-9 h-9 rounded-xl shadow-lg shadow-primary/20" />
            <span className="text-lg font-bold tracking-tight group-hover:text-primary transition-colors">ZorvanI ERP</span>
          </Link>
        </motion.div>

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
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5">
            <p className="text-sm font-medium text-foreground/80">Connect your workspace data</p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground/60">
              Sign in to view live finance, operations, HR, and customer records from your organization.
            </p>
          </div>
        </motion.div>

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
        <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-primary/[0.04] to-transparent pointer-events-none" />

        <div className="lg:hidden mb-10 flex items-center gap-3">
          <BrandLogo className="w-9 h-9 rounded-xl shadow-lg shadow-primary/20" />
          <span className="text-lg font-bold tracking-tight">ZorvanI ERP</span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[400px] relative z-10"
        >
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">Sign in to ZorvanI ERP</h1>
            <p className="text-sm text-muted-foreground/60">
              New to ZorvanI ERP?{' '}
              <Link href="/signup" className="text-primary hover:text-primary/80 font-medium transition-colors">
                Start a free trial
              </Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground/80">Work email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                autoComplete="email"
                className="w-full px-4 py-2.5 rounded-xl border border-border/60 bg-white/[0.03] text-sm placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/60 focus:bg-white/[0.05] focus:ring-2 focus:ring-primary/10 transition-all duration-150"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground/80">Password</label>
                <button type="button" className="text-xs text-primary/70 hover:text-primary transition-colors font-medium">
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
                  autoComplete="current-password"
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

            <label className="flex items-center gap-2.5 cursor-pointer group">
              <input type="checkbox" checked={rememberMe} onChange={event => setRememberMe(event.target.checked)} className="w-4 h-4 rounded border-border/60 bg-white/[0.03] accent-primary cursor-pointer" />
              <span className="text-sm text-muted-foreground/60 group-hover:text-muted-foreground/80 transition-colors">
                Keep me signed in for 30 days
              </span>
            </label>

            {error && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
                {error}
              </p>
            )}

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

          <div className="mt-5 text-center">
            <button className="text-xs text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors font-medium">
              Sign in with SAML SSO →
            </button>
          </div>
        </motion.div>

        <p className="absolute bottom-6 text-[11px] text-muted-foreground/30 text-center">
          © 2025 ZorvanI ERP ·{' '}
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
