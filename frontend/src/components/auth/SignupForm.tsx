import React, { useState } from 'react';
import { User, Phone, Mail, MapPin, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { OtpInput } from './OtpInput';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface SignupFormProps {
  defaultRole: 'customer' | 'provider';
  onSuccess: () => void;
  onSwitchToLogin: () => void;
}

export const SignupForm: React.FC<SignupFormProps> = ({ defaultRole, onSuccess, onSwitchToLogin }) => {
  const { login } = useAuth();
  const [role, setRole] = useState<'customer' | 'provider'>(defaultRole);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpMethod, setOtpMethod] = useState<'email' | 'phone'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);

  const startCountdown = () => {
    setCountdown(60);
    const t = setInterval(() => {
      setCountdown(c => { if (c <= 1) { clearInterval(t); return 0; } return c - 1; });
    }, 1000);
  };

  const handleSendOtp = async () => {
    setError('');
    if (!name.trim()) return setError('Full name is required');
    if (!email.trim()) return setError('Email address is mandatory');
    if (!/\S+@\S+\.\S+/.test(email.trim())) return setError('Please enter a valid email address (e.g. user@gmail.com)');
    const cleanPhone = phone.trim().replace(/\D/g, '').slice(-10);
    if (!cleanPhone) return setError('10-digit mobile number is mandatory');
    if (!/^\d{10}$/.test(cleanPhone)) return setError('Please enter a valid 10-digit mobile number');

    const credential = email.trim();
    const method = 'email';
    setOtpMethod(method);

    setLoading(true);
    try {
      await api.sendOtp(credential, method);
      setOtpSent(true);
      startCountdown();
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    if (otp.length < 6) return setError('Enter the 6-digit OTP');
    setError('');
    setLoading(true);
    try {
      const credential = email.trim();
      const cleanPhone = phone.trim().replace(/\D/g, '').slice(-10);
      const { token, user } = await api.verifyOtp(credential, otp, role, name.trim(), address.trim());
      // Save mandatory phone number if user was created
      if (cleanPhone && user) {
        user.phone = cleanPhone;
        try {
          localStorage.setItem('mud_active_user', JSON.stringify(user));
          localStorage.setItem('mud_remembered_phone', cleanPhone);
          const { savePeopleData } = await import('@/lib/peopledata');
          await savePeopleData({
            userId: user.id,
            fullName: user.name,
            displayName: user.name,
            email: user.email,
            phone: cleanPhone,
            role: user.role,
            address: user.address,
            kycStatus: user.kyc_status
          });
        } catch {}
      }
      login(token, user);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Invalid OTP');
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Role selector */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
        {(['customer', 'provider'] as const).map(r => (
          <button
            key={r}
            onClick={() => setRole(r)}
            className={cn(
              'py-2 rounded-lg text-sm font-semibold transition-all',
              role === r ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            )}
          >
            {r === 'customer' ? '👤 Customer' : '🔧 Technician'}
          </button>
        ))}
      </div>

      {/* Basic Info */}
      {!otpSent && (
        <>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name *</label>
            <div className="relative">
              <User className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ramesh Hegde"
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Gmail Address *</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@gmail.com"
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Mobile Number (10 digits) *</label>
            <div className="relative">
              <Phone className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
              <input
                type="tel"
                required
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="9845XXXXXX"
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Home Address</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Gandhi Nagar, Sagara"
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <button
            onClick={handleSendOtp}
            disabled={loading || !name.trim() || !email.trim() || !phone.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {loading ? 'Sending Verification Code…' : 'Send Verification Code'}
          </button>
        </>
      )}

      {otpSent && (
        <>
          <div className="text-center">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              {otpMethod === 'email'
                ? <Mail className="w-7 h-7 text-green-600" />
                : <Phone className="w-7 h-7 text-green-600" />}
            </div>
            <p className="text-sm text-slate-700">Verification code sent to <strong>{email || phone}</strong></p>
          </div>

          <OtpInput value={otp} onChange={setOtp} disabled={loading} />

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <button
            onClick={handleSignup}
            disabled={loading || otp.length < 6}
            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            {loading ? 'Creating Account…' : 'Create Account'}
          </button>

          <button
            onClick={() => { setOtpSent(false); setOtp(''); setError(''); }}
            className="w-full text-center text-sm text-slate-500 hover:text-slate-700"
          >
            ← Edit my details
          </button>
        </>
      )}

      <p className="text-center text-xs text-slate-500 pt-1">
        Already registered?{' '}
        <button onClick={onSwitchToLogin} className="text-blue-600 hover:underline font-medium">
          Sign In
        </button>
      </p>
    </div>
  );
};
