import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { ArrowRight, Eye, EyeOff, ShieldCheck, Zap, Activity } from 'lucide-react';
import { useAuth } from '@/contexts/auth';

const trustItems = [
  { icon: ShieldCheck, label: 'ISO 27001 Certified' },
  { icon: Zap, label: 'AI-Powered Platform' },
  { icon: Activity, label: '99.99% Uptime SLA' },
];

export default function Signup() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { register } = useAuth();
  const [, navigate] = useLocation();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        companyName: companyName.trim(),
        email: email.trim(),
        password,
      });
      navigate('/app/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create your account');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-background">
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
            Start building a<br />smarter business today.
          </h2>
          <p className="text-sm text-muted-foreground/70 leading-relaxed max-w-sm">
            Create your workspace and bring finance, operations, HR, supply chain, and CRM together in one intelligent platform.
          </p>
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

      <div className="flex-1 flex flex-col items-center justify-center px-6 sm:px-10 py-12 relative">
        <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-primary/[0.04] to-transparent pointer-events-none" />

        <div className="lg:hidden mb-8 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
            <div className="w-4 h-4 border-2 border-white rounded-sm rotate-45" />
          </div>
          <span className="text-lg font-bold tracking-tight">OmniERP</span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[440px] relative z-10"
        >
          <div className="mb-7">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">Create your OmniERP account</h1>
            <p className="text-sm text-muted-foreground/60">
              Already have an account?{' '}
              <Link href="/login" className="text-primary hover:text-primary/80 font-medium transition-colors">
                Sign in
              </Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="first-name" className="text-sm font-medium text-foreground/80">First name</label>
                <input
                  id="first-name"
                  type="text"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  placeholder="James"
                  required
                  autoComplete="given-name"
                  className="w-full px-4 py-2.5 rounded-xl border border-border/60 bg-white/[0.03] text-sm placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/60 focus:bg-white/[0.05] focus:ring-2 focus:ring-primary/10 transition-all duration-150"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="last-name" className="text-sm font-medium text-foreground/80">Last name</label>
                <input
                  id="last-name"
                  type="text"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  placeholder="Doyle"
                  required
                  autoComplete="family-name"
                  className="w-full px-4 py-2.5 rounded-xl border border-border/60 bg-white/[0.03] text-sm placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/60 focus:bg-white/[0.05] focus:ring-2 focus:ring-primary/10 transition-all duration-150"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="company-name" className="text-sm font-medium text-foreground/80">
                Company name <span className="text-muted-foreground/40 font-normal">(optional)</span>
              </label>
              <input
                id="company-name"
                type="text"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                placeholder="Acme Inc."
                autoComplete="organization"
                className="w-full px-4 py-2.5 rounded-xl border border-border/60 bg-white/[0.03] text-sm placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/60 focus:bg-white/[0.05] focus:ring-2 focus:ring-primary/10 transition-all duration-150"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="signup-email" className="text-sm font-medium text-foreground/80">Work email</label>
              <input
                id="signup-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                autoComplete="email"
                className="w-full px-4 py-2.5 rounded-xl border border-border/60 bg-white/[0.03] text-sm placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/60 focus:bg-white/[0.05] focus:ring-2 focus:ring-primary/10 transition-all duration-150"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="signup-password" className="text-sm font-medium text-foreground/80">Password</label>
                <div className="relative">
                  <input
                    id="signup-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="8+ characters"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="w-full px-4 py-2.5 pr-10 rounded-xl border border-border/60 bg-white/[0.03] text-sm placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/60 focus:bg-white/[0.05] focus:ring-2 focus:ring-primary/10 transition-all duration-150"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="confirm-password" className="text-sm font-medium text-foreground/80">Confirm password</label>
                <input
                  id="confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="w-full px-4 py-2.5 rounded-xl border border-border/60 bg-white/[0.03] text-sm placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/60 focus:bg-white/[0.05] focus:ring-2 focus:ring-primary/10 transition-all duration-150"
                />
              </div>
            </div>

            {error && (
              <p role="alert" className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
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
              {loading ? 'Creating account…' : <>Create account <ArrowRight className="w-4 h-4" strokeWidth={2.5} /></>}
            </motion.button>
          </form>

          <p className="text-[11px] text-muted-foreground/40 text-center leading-relaxed mt-5">
            By creating an account, you agree to OmniERP&apos;s Terms of Service and Privacy Policy.
          </p>
        </motion.div>

        <p className="absolute bottom-6 text-[11px] text-muted-foreground/30 text-center">
          © 2025 OmniERP Inc. · Privacy · Terms · Security
        </p>
      </div>
    </div>
  );
}