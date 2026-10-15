import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { LoginForm } from './LoginForm';
import { cn } from '@/lib/utils';

interface AuthModalProps {
  isOpen: boolean;
  defaultRole?: 'customer' | 'provider';
  onClose: () => void;
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  defaultRole = 'customer',
  onClose,
  onSuccess,
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  if (!isOpen) return null;

  const handleSuccess = () => {
    onSuccess?.();
    onClose();
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4"
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" />

      {/* Modal Card */}
      <div className={cn(
        'relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl z-10 border border-slate-100',
        'animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200'
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-2">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Welcome to SOLVO
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Sign in with your Google account or mobile number
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Unified Login & Instant Registration Form (Google OR Mobile OTP) */}
        <div className="p-6 pt-2 max-h-[80vh] overflow-y-auto">
          <LoginForm
            defaultRole={defaultRole}
            onSuccess={handleSuccess}
          />
        </div>

        {/* Footer strip */}
        <div className="px-6 pb-6 text-center border-t border-slate-50 pt-3">
          <p className="text-xs text-slate-400">
            By continuing, you agree to our{' '}
            <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-600 font-medium">Terms</a>
            {' & '}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-600 font-medium">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
};
