import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardBody } from '../components/ui/Card';
import { CheckCircle2, Eye, EyeOff, ShieldCheck, Globe, Zap } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { apiFetch, ApiError } from '../services/core';
import { refreshAuthSession } from '../lib/auth/session';

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
    <div className="flex min-h-screen bg-ois-bg">
      {/* Left Panel: Brand & Marketing */}
      <div className="hidden lg:flex w-[45%] bg-[linear-gradient(135deg,#1F4FD4_0%,#0BA5EC_100%)] relative overflow-hidden items-start justify-between flex-col p-[60px] text-white">
        {/* Abstract Grid Pattern Overlay */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ 
          backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }} />
        
        <div className="relative z-10 w-full">
          <div className="mb-2">
            <div className="text-[32px] font-[800] tracking-[-1px] mb-2 leading-none">
              [OIS]
            </div>
            <div className="text-[14px] font-[600] tracking-[0.1em] uppercase mb-3 opacity-90">
              Omni Intelligence Suite
            </div>
          </div>

          <p className="text-[18px] opacity-90 mb-10 leading-[1.4] max-w-sm">
            Unified ITSM, observability,<br />and intelligence.
          </p>

          <div className="w-[40px] h-[4px] bg-white/30 mb-10" />

          <ul className="space-y-5">
            <FeatureItem text="ITIL 4 aligned" />
            <FeatureItem text="Real-time correlation" />
            <FeatureItem text="Native on-call & status" />
          </ul>
        </div>

        <div className="relative z-10 text-[12px] opacity-60">
          © 2024 Omni Intelligence Corp. Enterprise Node v4.12.0
        </div>
      </div>

      {/* Right Panel: Login Form */}
      <div className="flex-1 flex items-center justify-center p-[60px] bg-white">
        <div className="w-full max-w-[400px]">
          <div className="mb-8">
            <h1 className="text-[28px] font-[700] text-[#111827] mb-2">Welcome to OIS</h1>
            <p className="text-[16px] text-[#6B7280]">Sign in to your workspace</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {sessionExpired && !errors.form && (
              <div className="rounded-[8px] border border-[#FEC84B] bg-[#FFFAEB] px-4 py-3 text-[14px] text-[#B54708]">
                Your session expired. Please sign in again to pick up where you left off.
              </div>
            )}
            {errors.form && (
              <div className="rounded-[8px] border border-[#FDA29B] bg-[#FEF3F2] px-4 py-3 text-[14px] text-[#B42318]">
                {errors.form}
              </div>
            )}
            <div className="space-y-2">
              <label className="text-[14px] font-[600] text-[#374151]">Email</label>
              <Input 
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={errors.email}
                className="h-[44px] px-4 rounded-[8px] border-[#D1D5DB] focus:border-ois-primary focus:ring-4 focus:ring-ois-primary/10"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[14px] font-[600] text-[#374151]">Password</label>
              <div className="relative">
                <Input 
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  error={errors.password}
                  className="h-[44px] px-4 rounded-[8px] border-[#D1D5DB] focus:border-ois-primary focus:ring-4 focus:ring-ois-primary/10"
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#4B5563]"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-[14px]">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" className="w-[16px] h-[16px] rounded border-[#D1D5DB] text-ois-primary focus:ring-ois-primary/10" defaultChecked />
                <span className="text-[#4B5563]">Remember me</span>
              </label>
              <button type="button" className="text-ois-primary font-[600] hover:underline">Forgot?</button>
            </div>

            <Button type="submit" className="w-full h-[48px] text-[16px] font-[600] shadow-none" loading={loading}>
              Sign in
            </Button>

            <div className="relative flex items-center my-6">
              <div className="flex-1 border-t border-[#E5E7EB]"></div>
              <span className="mx-4 text-[14px] text-[#9CA3AF]">or</span>
              <div className="flex-1 border-t border-[#E5E7EB]"></div>
            </div>

            <Button type="button" variant="outline" className="w-full h-[44px] text-[14px] font-[600] gap-2 border-[#D1D5DB] text-[#374151]" onClick={handleSSO}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 5C13.66 5 15 6.34 15 8C15 9.66 13.66 11 12 11C10.34 11 9 9.66 9 8C9 6.34 10.34 5 12 5ZM12 19.2C9.5 19.2 7.29 17.92 6 15.98C6.03 13.99 10 12.9 12 12.9C13.99 12.9 17.97 13.99 18 15.98C16.71 17.92 14.5 19.2 12 19.2Z" fill="#4B5563"/>
              </svg>
              Continue with SSO
            </Button>
          </form>

          <p className="mt-[32px] text-center text-[14px] text-[#6B7280]">
            Need help? <button className="text-ois-primary font-[500] hover:underline">Contact IT Support.</button>
          </p>
        </div>
      </div>
    </div>
  );
};

const FeatureItem: React.FC<{ text: string }> = ({ text }) => (
  <li className="flex items-center text-[16px] opacity-85">
    <svg className="mr-3 shrink-0" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="10" r="10" fill="white" fillOpacity="0.2"/>
      <path d="M6 10L9 13L14 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
    {text}
  </li>
);
