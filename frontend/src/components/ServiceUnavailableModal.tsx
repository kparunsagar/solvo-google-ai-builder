import React, { useState, useEffect } from 'react';
import { BellRing, Check, X, Sparkles, Navigation, Crosshair, Wrench, ShieldCheck, Briefcase } from 'lucide-react';
import { LocationState, locationService } from '@/services/microservices/location.service';

interface ServiceUnavailableModalProps {
  isOpen: boolean;
  location: LocationState | null;
  onClose: () => void;
  onExploreDemo?: () => void;
  onOpenLocationDrawer?: () => void;
  onRecheckGps?: () => void;
  userRole?: 'customer' | 'technician' | 'provider';
}

export const ServiceUnavailableModal: React.FC<ServiceUnavailableModalProps> = ({
  isOpen,
  location,
  onClose,
  onExploreDemo,
  onOpenLocationDrawer,
  onRecheckGps,
  userRole = 'customer'
}) => {
  const isTechnician = userRole === 'technician' || userRole === 'provider';
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [name, setName] = useState('');
  const [trade, setTrade] = useState('Electrician & Wiring');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen || !location) return null;

  const cityName = location.city || location.locality?.split(',')[0] || 'your city';
  const fullPlaceName = location.city
    ? `${location.city}, ${location.state || 'Karnataka'}`
    : location.locality || 'your area';

  const markDismissed = () => {
    try {
      sessionStorage.setItem('mud_unserviceable_dismissed', 'true');
      localStorage.setItem('mud_unserviceable_dismissed', 'true');
    } catch {}
  };

  const handleDismiss = () => {
    markDismissed();
    onClose();
  };

  const handleExplore = () => {
    markDismissed();
    if (onExploreDemo) {
      onExploreDemo();
    } else {
      onClose();
    }
  };

  const handleOpenDrawer = () => {
    markDismissed();
    onClose();
    if (onOpenLocationDrawer) {
      onOpenLocationDrawer();
    }
  };

  const handleRecheck = () => {
    if (onRecheckGps) {
      onRecheckGps();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) return;

    setIsSubmitting(true);
    try {
      await locationService.registerExpansionWaitlist({
        email: email.trim(),
        mobile: mobile.trim(),
        name: isTechnician ? name.trim() : undefined,
        tradeCategory: isTechnician ? trade : undefined,
        role: isTechnician ? 'technician' : 'customer',
        city: location.city || cityName,
        locality: location.locality,
        state: location.state,
        postalCode: location.postalCode,
        lat: location.lat,
        lng: location.lng
      });
      setSubmittedEmail(email.trim());
      setIsSubmitted(true);
      markDismissed();
    } catch (err) {
      console.warn('Waitlist submission failed:', err);
      setSubmittedEmail(email.trim());
      setIsSubmitted(true);
      markDismissed();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-xs transition-opacity duration-200"
      onClick={handleDismiss}
      role="dialog"
      aria-modal="true"
      aria-labelledby="expansion-modal-title"
    >
      {/* Compact Sheet / Modal Card */}
      <div
        className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-100 flex flex-col max-h-[85dvh] sm:max-h-[85vh] overflow-hidden animate-slide-up sm:animate-scale-in"
        onClick={(e) => e.stopPropagation()}
        style={{
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 12px)',
        }}
      >
        {/* Mobile Drag Indicator */}
        <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto my-2 sm:hidden shrink-0" />

        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 sm:px-5 pt-1 pb-2.5 border-b border-slate-100 shrink-0">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-extrabold uppercase tracking-wide">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            <span>{isTechnician ? 'Partner Expansion Zone' : 'Expansion Zone'}</span>
          </div>

          {/* Touch-Friendly Close Button */}
          <button
            type="button"
            onClick={handleDismiss}
            className="w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-600 transition-colors cursor-pointer touch-manipulation"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Scrollable Compact Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 overscroll-contain">
          <div>
            <h3 id="expansion-modal-title" className="text-base sm:text-lg font-black text-slate-900 leading-snug">
              {isTechnician ? `Partner operations expanding to ${cityName} soon!` : `We're expanding to ${cityName} soon!`}
            </h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Detected Location: <strong className="text-slate-800">{fullPlaceName}</strong>
            </p>
            <div className="mt-2 text-[11px] text-amber-900 bg-amber-50/80 border border-amber-200/60 rounded-xl p-2.5 leading-relaxed">
              ⚡ Doorstep operations are currently active in{' '}
              <span className="font-bold text-slate-900">Bengaluru</span>,{' '}
              <span className="font-bold text-slate-900">Sagara</span>,{' '}
              <span className="font-bold text-slate-900">Hosanagara</span> &amp;{' '}
              <span className="font-bold text-slate-900">Honnali</span>.
            </div>
          </div>

          {/* Action Row */}
          <div className="grid grid-cols-2 gap-2">
            {onRecheckGps ? (
              <button
                type="button"
                onClick={handleRecheck}
                className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation"
              >
                <Crosshair className="w-3.5 h-3.5 shrink-0" />
                <span>Re-check GPS</span>
              </button>
            ) : onOpenLocationDrawer ? (
              <button
                type="button"
                onClick={handleOpenDrawer}
                className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation"
              >
                <Navigation className="w-3.5 h-3.5 shrink-0" />
                <span>Select Active Hub</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleDismiss}
                className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation"
              >
                <Check className="w-3.5 h-3.5 shrink-0" />
                <span>Understood</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExplore}
              className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>{isTechnician ? 'Partner Dashboard' : 'Explore Catalog'}</span>
            </button>
          </div>

          {/* Expansion Registration Form */}
          {isSubmitted ? (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
              <span>
                Pre-registration saved for <strong className="underline">{submittedEmail}</strong>! We will notify you immediately upon launching in {cityName}.
              </span>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3 space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                {isTechnician ? <Briefcase className="w-3.5 h-3.5 text-indigo-600" /> : <BellRing className="w-3.5 h-3.5 text-blue-600" />}
                <span>
                  {isTechnician
                    ? `Pre-Register as Founding Partner in ${cityName}`
                    : `Get VIP ₹200 launch credit for ${cityName}`}
                </span>
              </div>

              <form onSubmit={handleSubmit} className="space-y-2">
                {isTechnician && (
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your full name"
                      className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <select
                      value={trade}
                      onChange={(e) => setTrade(e.target.value)}
                      className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700"
                    >
                      <option value="Electrician & Wiring">Electrician</option>
                      <option value="Plumbing & Sanitary">Plumbing</option>
                      <option value="Appliance & AC Repair">Appliance & AC</option>
                      <option value="Carpentry & Woodwork">Carpentry</option>
                      <option value="Cleaning & Pest Control">Cleaning</option>
                    </select>
                  </div>
                )}

                <div className="flex gap-1.5">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter email for launch invite"
                    className="flex-1 min-w-0 px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <input
                    type="tel"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="Mobile (optional)"
                    className="w-28 px-2.5 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50 cursor-pointer touch-manipulation flex items-center justify-center gap-1.5"
                >
                  {isSubmitting ? (
                    'Saving details…'
                  ) : (
                    <>
                      <BellRing className="w-3.5 h-3.5" />
                      <span>{isTechnician ? `Register as Partner in ${cityName}` : 'Notify Me Upon Launch'}</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Dismiss Link */}
          <div className="text-center pt-0.5">
            <button
              type="button"
              onClick={handleDismiss}
              className="text-xs text-slate-500 hover:text-slate-800 font-medium underline-offset-2 hover:underline transition-colors cursor-pointer touch-manipulation p-1"
            >
              Dismiss &amp; continue to app
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
