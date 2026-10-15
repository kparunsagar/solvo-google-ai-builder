import React, { useEffect } from 'react';
import { Sparkles, X, ShieldCheck, Clock, CreditCard, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface WelcomeGreetingModalProps {
  isOpen: boolean;
  userName: string;
  userEmail: string;
  onClose: () => void;
}

export const WelcomeGreetingModal: React.FC<WelcomeGreetingModalProps> = ({
  isOpen,
  userName,
  userEmail,
  onClose
}) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen && userEmail) {
      // Mark as seen permanently in localStorage so returning logins NEVER see this modal again
      try {
        localStorage.setItem(`mud_welcome_shown_${userEmail.trim().toLowerCase()}`, 'true');
      } catch {}
    }
  }, [isOpen, userEmail]);

  if (!isOpen) return null;

  const firstName = userName.split(' ')[0] || 'Friend';

  const handleExplore = () => {
    if (userEmail) {
      try {
        localStorage.setItem(`mud_welcome_shown_${userEmail.trim().toLowerCase()}`, 'true');
      } catch {}
    }
    onClose();
    navigate('/services');
  };

  const handleClose = () => {
    if (userEmail) {
      try {
        localStorage.setItem(`mud_welcome_shown_${userEmail.trim().toLowerCase()}`, 'true');
      } catch {}
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors z-10 cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Top Celebration Banner */}
        <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-sky-600 p-7 text-center text-white relative overflow-hidden">
          {/* Subtle decorative circles */}
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="absolute -left-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-black uppercase tracking-wider mb-3 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Account Activated</span>
          </div>

          <div className="w-16 h-16 rounded-2xl bg-white text-blue-600 flex items-center justify-center mx-auto mb-3 shadow-xl shadow-blue-900/30">
            <CheckCircle2 className="w-8 h-8 text-blue-600" />
          </div>

          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
            Welcome, {firstName}! 🎉
          </h2>

          <p className="text-xs sm:text-sm text-blue-100 mt-2 max-w-sm mx-auto leading-relaxed">
            Your trusted doorstep home services platform across Sagara Taluk.
          </p>
        </div>

        {/* Body Content */}
        <div className="p-6 sm:p-7 space-y-5">
          {/* 4 Pillars Grid */}
          <div className="grid grid-cols-2 gap-3 text-left">
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5">
              <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>45-Min Arrival</span>
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Doorstep delivery in Sagara</p>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5">
              <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Verified Pros</span>
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Aadhaar & photo-verified</p>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5">
              <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-purple-600" />
                <span>Pay After Service</span>
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Zero advance fee required</p>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5">
              <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>30-Day Guarantee</span>
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Free rework warranty</p>
            </div>
          </div>

          {/* Action CTA */}
          <button
            type="button"
            onClick={handleExplore}
            className="w-full py-3.5 px-5 bg-blue-600 hover:bg-blue-700 text-white font-black text-sm rounded-2xl shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Explore Services & Book Now</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
