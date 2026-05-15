import React, { useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Eye, EyeOff } from 'lucide-react';
import { apiFetch, ApiError } from '../services/core';
import { refreshAuthSession } from '../lib/auth/session';

const JAKARTA = "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif";
const MONO = "'Geist Mono', ui-monospace, SFMono-Regular, monospace";

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const navState = location.state as { from?: string; reason?: 'expired' } | null;
  const redirectTo = navState?.from ?? '/';
  const sessionExpired = navState?.reason === 'expired';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const pageRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = pageRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - rect.left}px`);
    el.style.setProperty('--my', `${e.clientY - rect.top}px`);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: { email?: string; password?: string } = {};
    if (!email) nextErrors.email = 'Email is required';
    if (!password) nextErrors.password = 'Password is required';
    else if (password.length < 4) nextErrors.password = 'Password must be at least 4 characters';
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      await apiFetch('/auth/login', { method: 'POST', body: { email, password } });
      await refreshAuthSession();
      navigate(redirectTo, { replace: true });
    } catch (err) {
      const msg = err instanceof ApiError && err.status === 401
        ? 'Invalid email or password'
        : err instanceof Error ? err.message : 'Login failed';
      setErrors({ form: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleSSO = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigate(redirectTo, { replace: true });
    }, 600);
  };

  return (
    <div
      ref={pageRef}
      onMouseMove={handleMouseMove}
      className="relative flex min-h-screen overflow-hidden bg-[#0A0A0A] text-white"
      style={{ fontFamily: JAKARTA }}
    >
      {/* Ambient violet→blue radial glows (Kanopy signature, with OIS blue) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(60% 50% at 18% 25%, rgba(31,79,212,0.22), transparent 70%),
            radial-gradient(50% 40% at 85% 80%, rgba(11,165,236,0.14), transparent 70%),
            radial-gradient(40% 30% at 50% 110%, rgba(31,79,212,0.18), transparent 70%)
          `,
        }}
      />

      {/* Cursor-following soft glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(420px circle at var(--mx, 50%) var(--my, 50%), rgba(31,79,212,0.12), transparent 65%)`,
          transition: 'background 0.1s linear',
        }}
      />

      {/* Subtle grid lines */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.045]"
        style={{
          backgroundImage:
            'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '56px 56px',
        }}
      />

      {/* Grain overlay (kills flat-gradient AI look) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.035] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.7'/></svg>\")",
        }}
      />

      {/* Hairline beam dividers */}
      <div aria-hidden className="pointer-events-none absolute top-0 left-0 right-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(31,79,212,0.5), transparent)' }} />
      <div aria-hidden className="pointer-events-none absolute bottom-0 left-0 right-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(31,79,212,0.35), transparent)' }} />

      {/* ───────── LEFT: BRAND ───────── */}
      <aside className="relative z-10 hidden lg:flex w-[48%] flex-col justify-between p-[60px]">
        {/* Top mono micro-label */}
        <div className="ois-fade-up flex items-center justify-between text-[11px] tracking-[0.18em]"
             style={{ fontFamily: MONO, color: '#A1A1AA', animationDelay: '0ms' }}>
          <span>/ ENTERPRISE NODE v4.12.0 /</span>
          <span className="flex items-center gap-2">
            <span className="relative inline-flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#12B76A] opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#12B76A]" />
            </span>
            ALL SYSTEMS OPERATIONAL
          </span>
        </div>

        {/* Wordmark + headline */}
        <div className="relative">
          <div className="ois-fade-up mb-5" style={{ animationDelay: '80ms' }}>
            <div className="ois-shimmer-text text-[44px] font-[800] leading-none tracking-[-0.04em]">
              [OIS]
            </div>
          </div>

          <h1 className="ois-fade-up text-[56px] font-[700] leading-[1.02] tracking-[-0.035em] max-w-[560px]"
              style={{ animationDelay: '160ms' }}>
            The operational<br />
            <span className="bg-clip-text text-transparent"
                  style={{ backgroundImage: 'linear-gradient(85deg, #1F4FD4 4%, #0BA5EC 60%, #FFFFFF 110%)' }}>
              nerve center
            </span>
            <br />for modern IT.
          </h1>

          <p className="ois-fade-up mt-8 max-w-[440px] text-[16px] leading-[1.55] text-[#A1A1AA]"
             style={{ animationDelay: '240ms' }}>
            One surface for every signal, ticket, and change. ITIL 4 aligned, real-time, and built for teams that ship.
          </p>

          {/* Mono feature labels */}
          <ul className="ois-fade-up mt-10 flex flex-wrap gap-x-3 gap-y-2"
              style={{ animationDelay: '320ms', fontFamily: MONO }}>
            {['ITIL 4 ALIGNED', 'REAL-TIME CORRELATION', 'NATIVE ON-CALL'].map((t) => (
              <li key={t}
                  className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[10.5px] tracking-[0.16em] text-[#D4D4D8]">
                / {t} /
              </li>
            ))}
          </ul>
        </div>

        {/* Footer mono strip */}
        <div className="ois-fade-in flex items-center justify-between text-[11px] tracking-[0.14em] text-[#71717A]"
             style={{ fontFamily: MONO, animationDelay: '480ms' }}>
          <span>© 2026 · OMNI INTELLIGENCE CORP</span>
          <span>UPTIME 99.98%</span>
        </div>
      </aside>

      {/* ───────── RIGHT: FORM ───────── */}
      <main className="relative z-10 flex flex-1 items-center justify-center p-8 lg:p-[60px]">
        <div className="w-full max-w-[420px]">

          {/* Mono micro-label */}
          <div className="ois-fade-up mb-5 flex items-center gap-2 text-[11px] tracking-[0.18em] text-[#71717A]"
               style={{ fontFamily: MONO, animationDelay: '60ms' }}>
            <span className="h-px w-6 bg-[#1F4FD4]" />
            <span>/ SECURE SIGN-IN /</span>
          </div>

          <div className="ois-fade-up mb-10" style={{ animationDelay: '120ms' }}>
            <h2 className="text-[40px] font-[700] leading-none tracking-[-0.03em] text-white">Sign in.</h2>
            <p className="mt-3 text-[15px] text-[#A1A1AA]">Continue to your workspace.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {sessionExpired && !errors.form && (
              <div className="ois-err-in rounded-[10px] border border-[#F79009]/40 bg-[#F79009]/10 px-4 py-3 text-[13px] text-[#FDB022]">
                Your session expired. Sign in again to continue.
              </div>
            )}
            {errors.form && (
              <div className="ois-err-in rounded-[10px] border border-[#F04438]/40 bg-[#F04438]/10 px-4 py-3 text-[13px] text-[#FDA29B]">
                {errors.form}
              </div>
            )}

            <div className="ois-fade-up space-y-2" style={{ animationDelay: '180ms' }}>
              <label className="text-[11px] font-[500] tracking-[0.16em] text-[#A1A1AA]" style={{ fontFamily: MONO }}>
                / EMAIL
              </label>
              <Input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={errors.email}
                className="h-[46px] rounded-[10px] border-[#262626] bg-[#0F0F10] px-4 text-white placeholder:text-[#52525B] focus:border-[#1F4FD4] focus:ring-2 focus:ring-[#1F4FD4]/30"
              />
            </div>

            <div className="ois-fade-up space-y-2" style={{ animationDelay: '240ms' }}>
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-[500] tracking-[0.16em] text-[#A1A1AA]" style={{ fontFamily: MONO }}>
                  / PASSWORD
                </label>
                <button type="button" className="text-[12px] text-[#A1A1AA] transition-colors hover:text-white">
                  Forgot?
                </button>
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  error={errors.password}
                  className="h-[46px] rounded-[10px] border-[#262626] bg-[#0F0F10] px-4 pr-11 text-white placeholder:text-[#52525B] focus:border-[#1F4FD4] focus:ring-2 focus:ring-[#1F4FD4]/30"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#52525B] transition-colors hover:text-[#D4D4D8]"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <label className="ois-fade-up flex cursor-pointer items-center gap-2 text-[13px] text-[#A1A1AA]"
                   style={{ animationDelay: '300ms' }}>
              <input
                type="checkbox"
                defaultChecked
                className="h-4 w-4 rounded border-[#262626] bg-[#0F0F10] text-[#1F4FD4] focus:ring-[#1F4FD4]/40"
              />
              Keep me signed in on this device
            </label>

            <div className="ois-fade-up pt-2" style={{ animationDelay: '360ms' }}>
              <button
                type="submit"
                disabled={loading}
                className="group relative h-[50px] w-full overflow-hidden rounded-[10px] text-[15px] font-[600] text-white transition-transform duration-150 active:scale-[0.99] disabled:opacity-70"
                style={{ background: 'linear-gradient(85deg, #1F4FD4 4%, #0A0A0A 104%)' }}
              >
                <span className="absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                      style={{ background: 'linear-gradient(85deg, #2A5DE8 4%, #1A1A1A 104%)' }} />
                <span className="absolute inset-x-0 bottom-0 h-px"
                      style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)' }} />
                <span className="relative">{loading ? 'Signing in…' : 'Sign in →'}</span>
              </button>
            </div>

            <div className="ois-fade-in relative my-6 flex items-center" style={{ animationDelay: '440ms' }}>
              <div className="flex-1 border-t border-[#1F1F1F]" />
              <span className="mx-4 text-[10.5px] tracking-[0.2em] text-[#52525B]" style={{ fontFamily: MONO }}>
                OR
              </span>
              <div className="flex-1 border-t border-[#1F1F1F]" />
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleSSO}
              className="ois-fade-up h-[46px] w-full gap-2 rounded-[10px] border-[#262626] bg-[#0F0F10] text-[14px] font-[600] text-[#E4E4E7] transition-colors duration-150 hover:border-[#3F3F46] hover:bg-[#1A1A1A] hover:text-white"
              style={{ animationDelay: '500ms' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 5C13.66 5 15 6.34 15 8C15 9.66 13.66 11 12 11C10.34 11 9 9.66 9 8C9 6.34 10.34 5 12 5ZM12 19.2C9.5 19.2 7.29 17.92 6 15.98C6.03 13.99 10 12.9 12 12.9C13.99 12.9 17.97 13.99 18 15.98C16.71 17.92 14.5 19.2 12 19.2Z" fill="currentColor"/>
              </svg>
              Continue with SSO
            </Button>
          </form>

          <p className="ois-fade-in mt-10 text-center text-[13px] text-[#71717A]" style={{ animationDelay: '580ms' }}>
            Trouble signing in?{' '}
            <button className="font-[600] text-[#D4D4D8] transition-colors hover:text-white">
              Reach IT Support →
            </button>
          </p>
        </div>
      </main>
    </div>
  );
};
