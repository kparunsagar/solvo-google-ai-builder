import React, { useState, useCallback } from 'react';
import { CheckCircle, Loader2, AlertCircle, ArrowRight } from 'lucide-react';
import { OtpInput } from './OtpInput';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { clearAppCache } from '@/lib/cache';

type Step = 'credential' | 'otp';

interface LoginFormProps {
  defaultRole: 'customer' | 'provider';
  onSuccess: () => void;
  onSwitchToSignup?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ defaultRole, onSuccess }) => {
  const { login } = useAuth();
  const [step, setStep] = useState<Step>('credential');
  const [phone, setPhone] = useState<string>(() => (typeof localStorage !== 'undefined' ? localStorage.getItem('mud_remembered_phone') || '' : ''));
  const [otp, setOtp] = useState('');
  const [name, setName] = useState<string>(() => (typeof localStorage !== 'undefined' ? localStorage.getItem('mud_remembered_name') || '' : ''));
  const [role, setRole] = useState<'customer' | 'provider'>(defaultRole);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);

  const startCountdown = () => {
    setCountdown(30);
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      const { token, user } = await api.loginWithGoogle(role);
      if (user.name) localStorage.setItem('mud_remembered_name', user.name);
      if (user.email) localStorage.setItem('mud_remembered_email', user.email);
      if (user.phone) localStorage.setItem('mud_remembered_phone', user.phone);
      login(token, user);
      onSuccess();
    } catch (err: any) {
      console.warn('[Auth] Google sign-in warning:', err);
      let userMsg = 'Google sign-in could not be completed. Please try again or use your mobile number below.';
      if (err?.code === 'auth/popup-closed-by-user') {
        userMsg = 'Google sign-in window was closed before completing.';
      } else if (err?.code === 'auth/popup-blocked') {
        userMsg = 'Sign-in popup was blocked by browser. Please enable popups or use mobile OTP below.';
      } else if (err?.code === 'auth/cancelled-popup-request') {
        userMsg = 'Sign-in request already in progress. Please wait a moment.';
      } else if (err?.code === 'auth/unauthorized-domain' || (err?.message && err.message.includes('unauthorized-domain'))) {
        userMsg = 'Domain authorization updated. Please refresh the page to sign in, or use Mobile OTP below.';
      } else if (err?.message) {
        userMsg = err.message.replace(/^Firebase:\s*(?:Error\s*)?(?:\((.*?)\))?:?\s*/i, '$1');
      }
      setError(userMsg);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSendOtp = useCallback(async () => {
    setError('');
    const target = phone.trim().replace(/\D/g, '').slice(-10);
    if (!/^\d{10}$/.test(target)) {
      return setError('Please enter a valid 10-digit mobile number');
    }

    // Persist remembered credentials
    localStorage.setItem('mud_remembered_phone', target);
    localStorage.setItem('mud_remembered_method', 'phone');
    if (name.trim()) {
      localStorage.setItem('mud_remembered_name', name.trim());
    }

    setLoading(true);
    try {
      await api.sendOtp(target, 'phone');
      setStep('otp');
      startCountdown();
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch verification code');
    } finally {
      setLoading(false);
    }
  }, [phone, name]);

  const handleVerifyOtp = useCallback(async () => {
    if (otp.length < 6) return setError('Please enter the full 6-digit verification code');
    setError('');
    setLoading(true);
    try {
      const target = phone.trim().replace(/\D/g, '').slice(-10);
      const { token, user } = await api.verifyOtp(target, otp, role, name || undefined);
      if (user.name) localStorage.setItem('mud_remembered_name', user.name);
      if (user.email) localStorage.setItem('mud_remembered_email', user.email);
      if (user.phone) localStorage.setItem('mud_remembered_phone', user.phone);
      login(token, user);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Invalid verification code. Please check and try again.');
    } finally {
      setLoading(false);
    }
  }, [phone, otp, role, name, login, onSuccess]);

  return (
    <div className="space-y-4">
      {/* Role Switcher: Customer vs Technician Pro */}
      <div className="grid grid-cols-2 p-1 bg-slate-100/90 rounded-2xl text-xs font-bold border border-slate-200/60 mb-1">
        <button
          type="button"
          onClick={() => {
            setRole('customer');
            setError('');
          }}
          className={cn(
            'py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5',
            role === 'customer'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
              : 'text-slate-500 hover:text-slate-800'
          )}
        >
          <span>🛒</span>
          <span>Customer Login</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setRole('provider');
            setError('');
          }}
          className={cn(
            'py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5',
            role === 'provider'
              ? 'bg-white text-purple-700 shadow-sm border border-purple-200/60'
              : 'text-slate-500 hover:text-slate-800'
          )}
        >
          <span>🔧</span>
          <span>Technician Pro</span>
        </button>
      </div>

      {step === 'credential' && (
        <>
          {/* 1-Click Google Sign In */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-4 border border-slate-200 hover:border-slate-300 rounded-2xl bg-white text-slate-800 text-sm font-bold shadow-xs hover:bg-slate-50 transition cursor-pointer"
          >
            {googleLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            ) : (
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.25 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.99 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.25 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
            )}
            <span>Continue with Google</span>
          </button>

          {/* Clean Divider */}
          <div className="flex items-center gap-3 my-2">
            <div className="h-px bg-slate-200 flex-1" />
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">or sign in with mobile</span>
            <div className="h-px bg-slate-200 flex-1" />
          </div>

          {/* Mobile Number Input */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              Mobile Number
            </label>
            <div className="flex items-center border-2 border-slate-200 focus-within:border-blue-600 rounded-2xl bg-white px-3.5 py-3 transition-colors shadow-xs">
              <span className="font-extrabold text-slate-900 text-sm mr-2 flex items-center gap-1 border-r border-slate-200 pr-2.5">
                <span>🇮🇳</span> +91
              </span>
              <input
                type="tel"
                maxLength={10}
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value.replace(/\D/g, ''));
                  setError('');
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleSendOtp()}
                placeholder="Enter 10-digit mobile number"
                className="w-full text-base font-bold text-slate-900 focus:outline-none placeholder-slate-400"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-xs font-semibold bg-red-50 p-2.5 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Continue Button */}
          <button
            type="button"
            onClick={handleSendOtp}
            disabled={loading || phone.trim().replace(/\D/g, '').length < 10}
            className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-extrabold py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-md transition-all text-sm cursor-pointer"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {loading ? 'Sending Verification Code…' : 'Get Verification Code'}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>

          {/* Quick Cache Reset / Troubleshoot Link */}
          <div className="text-center pt-1">
            <button
              type="button"
              onClick={() => clearAppCache({ reload: true })}
              className="text-[11px] text-slate-400 hover:text-purple-600 hover:underline transition-colors cursor-pointer"
              title="Clear cached session and reload fresh app"
            >
              Having trouble? Clear cache & reload
            </button>
          </div>
        </>
      )}

      {step === 'otp' && (
        <>
          <div className="text-center pt-2 space-y-1">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto text-purple-700 mb-2">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-slate-900">Enter Verification Code</h3>
            <p className="text-xs text-slate-500">
              Code sent to <strong className="text-slate-900">+91 {phone}</strong>
            </p>
            <button
              type="button"
              onClick={() => {
                setStep('credential');
                setOtp('');
                setError('');
              }}
              className="text-xs font-bold text-purple-600 hover:underline inline-block pt-1 cursor-pointer"
            >
              Change mobile number
            </button>
          </div>

          <div className="py-2">
            <OtpInput value={otp} onChange={setOtp} disabled={loading} />
          </div>

          {/* Optional Name for new profiles */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Your Name (Optional)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-purple-600 focus:outline-none"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-xs font-semibold bg-red-50 p-2.5 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleVerifyOtp}
            disabled={loading || otp.length < 6}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 disabled:opacity-50 text-white font-extrabold py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-md transition-all text-sm cursor-pointer"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            {loading ? 'Verifying…' : 'Verify & Sign In'}
          </button>

          <div className="flex items-center justify-between text-xs pt-1">
            <button
              type="button"
              onClick={handleSendOtp}
              disabled={countdown > 0 || loading}
              className="text-purple-600 font-bold hover:underline disabled:text-slate-400 disabled:no-underline cursor-pointer"
            >
              {countdown > 0 ? `Resend code in ${countdown}s` : 'Resend verification code'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};
