import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, ChevronDown, User, LogOut, Bell, Navigation, Headphones, Info, Briefcase, HelpCircle, Mic, Sparkles } from 'lucide-react';
import { BrandLogo } from '@/components/common/BrandLogo';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { NotificationDropdown } from '@/components/NotificationDropdown';
import { CustomerAiModal } from '@/components/CustomerAiModal';
import { LocationState } from '@/services/microservices/location.service';
import { cn } from '@/lib/utils';

interface HeaderProps {
  onOpenAuth: (role?: 'customer' | 'provider') => void;
  onOpenLocationDrawer: () => void;
  onRecheckGps?: () => void;
  onOpenAiConcierge?: () => void;
  locationLabel: string;
  currentLocation?: LocationState | null;
  dispatchTime?: string;
}

function parseDoorstepAddress(
  locationLabel: string,
  loc?: LocationState | null
): { primaryArea: string; detailedAddress: string; isDetecting: boolean } {
  const isDetecting =
    locationLabel.toLowerCase().includes('detecting') ||
    locationLabel.toLowerCase().includes('locating');

  if (isDetecting) {
    return {
      primaryArea: 'Detecting Location',
      detailedAddress: 'Fetching mobile GPS & street...',
      isDetecting: true,
    };
  }

  if (loc) {
    const primary =
      loc.suburb ||
      loc.locality.split(',')[0].trim() ||
      loc.street?.split(',')[0].trim() ||
      loc.city ||
      'Doorstep Service';

    let detail = loc.formattedAddress || '';
    if (!detail || detail === primary) {
      detail = [loc.street, loc.city, loc.state].filter(Boolean).join(', ');
    }
    if (!detail) {
      detail = loc.locality || 'Doorstep Delivery';
    }

    return {
      primaryArea: primary,
      detailedAddress: detail,
      isDetecting: false,
    };
  }

  if (locationLabel.includes(' - ')) {
    const [p, ...rest] = locationLabel.split(' - ');
    return {
      primaryArea: p.trim(),
      detailedAddress: rest.join(' - ').trim(),
      isDetecting: false,
    };
  }

  if (locationLabel.includes(',')) {
    const parts = locationLabel.split(',').map((s) => s.trim());
    return {
      primaryArea: parts[0],
      detailedAddress: parts.slice(1).join(', ') || parts[0],
      isDetecting: false,
    };
  }

  return {
    primaryArea: locationLabel,
    detailedAddress: locationLabel,
    isDetecting: false,
  };
}

export const Header: React.FC<HeaderProps> = ({
  onOpenAuth,
  onOpenLocationDrawer,
  onRecheckGps,
  onOpenAiConcierge,
  locationLabel,
  currentLocation,
  dispatchTime = '45 minutes',
}) => {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);

  const addressInfo = parseDoorstepAddress(locationLabel, currentLocation);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate('/');
  };

  const isProvider = user?.role === 'provider';
  const homeRoute = isProvider ? '/technician' : '/';

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full bg-white transition-shadow duration-200',
        scrolled ? 'shadow-md' : 'border-b border-slate-100'
      )}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left Section: Brand Logo + Quick-Commerce Doorstep Location Selector */}
        <div className="flex items-center gap-3 sm:gap-6 min-w-0">
          <Link to={homeRoute} className="shrink-0" onClick={() => setMenuOpen(false)}>
            <BrandLogo size="md" />
          </Link>

          {/* Quick-Commerce 2-Line Doorstep Location Bar */}
          <div className="flex flex-col justify-end min-w-0">
            {/* Top Line: Dispatch Time & Lightning Bolt */}
            <h2 className="flex items-center gap-1 leading-none text-[#332060]" data-testid="delivery-time">
              <svg
                className="shrink-0 w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#332060] fill-current"
                viewBox="0 0 18 18"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  clipRule="evenodd"
                  fillRule="evenodd"
                  d="M7.98138 16.4155C7.85073 16.4704 7.66705 16.4987 7.47551 16.4169C7.28396 16.3352 7.17726 16.183 7.12654 16.0507C7.08296 15.937 7.07589 15.8285 7.07426 15.7635C7.07123 15.6424 7.08686 15.4909 7.10083 15.3554C7.12458 15.1249 7.1856 14.5325 7.4265 14.0763C7.66258 13.6293 8.02672 13.4116 8.39763 13.1899C8.42398 13.1741 8.45037 13.1584 8.47672 13.1423C8.61462 13.0579 8.74953 12.9751 8.87274 12.8797C9.37953 12.4872 9.77457 11.9547 9.99127 11.3444C10.2223 10.6938 10.2198 9.98603 9.98392 9.33702C9.74805 8.68802 9.29413 8.14022 8.69784 7.78508C8.25709 7.5226 7.75167 7.37798 7.23485 7.3685C7.21484 7.36832 6.70295 7.36832 6.19502 7.51341 5.75338 7.77708C5.15545 8.13401 4.70014 8.68364 4.46467 9.33504C4.2292 9.98644 4.22869 10.6966 4.46323 11.3486C4.68067 11.9531 5.07471 12.4795 5.57866 12.8687C5.97251 13.1296 6.42555 13.411 7.02117 14.0886C7.26002 14.5501 7.31754 15.148 7.33615 15.3443C7.35249 15.5137 7.36675 15.6609 7.36377 15.777C7.36219 15.8384 7.35562 15.9392 7.31505 16.0427C7.26629 16.1672 7.16853 16.3093 6.99307 16.3869C6.81761 16.4645 6.64963 16.4402 6.52981 16.3912C6.40228 16.3392 6.27533 16.2415 6.13606 16.1044C5.58661 15.4055 5.07185 14.5885 4.52044 12.6074C4.30154 11.4172 4.38048 10.187 4.74797 9.03403C5.11545 7.88102 5.75782 6.84714 6.61334 6.0315C7.46886 5.21586 8.50493 4.64903 9.62228 4.38549C10.7396 4.12196 11.8967 4.17173 12.9829 4.52994C14.0691 4.88815 15.0438 5.54124 15.8137 6.42674C16.5835 7.31224 17.1197 8.39665 17.3712 9.57609C17.6227 10.7555 17.5799 11.9846 17.2468 13.1458C16.9138 14.307 16.3032 15.3567 15.4735 16.1947C14.5901 16.9197 13.8217 17.1044 13.1415 16.7531C12.9083 16.0526 13.2452 15.375 13.2452 15.375C13.2452 15.375 14.8698 13.5684 14.8698 11.3486C14.8698 9.12874 13.2452 7.32213 13.2452 7.32213L7.98138 16.4155Z"
                />
              </svg>
              <span className="text-[12px] sm:text-[15px] font-black tracking-tight text-[#332060]">
                {addressInfo.isDetecting ? 'Detecting...' : `${dispatchTime}`}
              </span>
            </h2>

            {/* Bottom Line: 2-Part Doorstep Address Button */}
            <div className="mt-0.5">
              <button
                type="button"
                onClick={onOpenLocationDrawer}
                className="relative flex cursor-pointer items-center border-none bg-transparent p-0 text-left group hover:opacity-85 transition-opacity"
                aria-label="Change doorstep delivery location"
                data-testid="delivery-location-btn"
              >
                {addressInfo.isDetecting ? (
                  <span className="flex items-center gap-1.5 text-[11px] sm:text-xs text-blue-600 animate-pulse font-medium">
                    <Navigation className="w-3 h-3 animate-spin shrink-0" />
                    <span className="truncate max-w-[150px] sm:max-w-[200px]">Locating doorstep GPS...</span>
                  </span>
                ) : (
                  <>
                    <span className="max-w-[130px] xs:max-w-[180px] sm:max-w-[240px] md:max-w-[320px] lg:max-w-[420px] truncate text-[11px] sm:text-[13px] md:text-[14px] font-extrabold capitalize text-slate-900">
                      {addressInfo.primaryArea}
                    </span>
                    <span className="text-[11px] sm:text-[13px] md:text-[14px] font-normal text-slate-400 shrink-0">
                      &nbsp;-&nbsp;
                    </span>
                    <span className="max-w-[130px] xs:max-w-[180px] sm:max-w-[260px] md:max-w-[360px] lg:max-w-[500px] truncate text-[11px] sm:text-[13px] md:text-[14px] font-medium text-[#707685]">
                      {addressInfo.detailedAddress}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-700 shrink-0 ml-1 group-hover:translate-y-0.5 transition-transform" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Multilingual Switcher placed prominently at top */}
          <LanguageSwitcher />

          {/* Indic AI Concierge (Voice & Chat Assistant) */}
          {user && user.role === 'customer' && (
            <button
              type="button"
              onClick={() => onOpenAiConcierge ? onOpenAiConcierge() : setVoiceModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer border border-purple-400/30"
              title="AI Concierge — Voice Booking & Diagnostic Chat"
              data-testid="voice-booking-btn"
              aria-label="AI Concierge Voice Booking Assistant"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse shrink-0" />
              <Mic className="w-3 h-3 text-white/90 shrink-0" />
              <span className="hidden sm:inline font-extrabold tracking-tight">AI Concierge</span>
              <span className="sr-only">Voice Booking</span>
            </button>
          )}

          {user ? (
            <>
              {/* Notification Bell with Unread Badge */}
              <div className="relative">
                <button
                  onClick={() => {
                    setNotifOpen(!notifOpen);
                    setMenuOpen(false);
                  }}
                  className="relative p-2 rounded-full hover:bg-slate-100 transition-colors"
                  title="Notifications"
                >
                  <Bell className="w-5 h-5 text-slate-600" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-blue-600 text-white text-[10px] font-extrabold flex items-center justify-center rounded-full px-1 shadow-sm animate-pulse">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                <NotificationDropdown
                  isOpen={notifOpen}
                  onClose={() => setNotifOpen(false)}
                />
              </div>

              <div className="relative">
                <button
                  onClick={() => {
                    setMenuOpen(!menuOpen);
                    setNotifOpen(false);
                  }}
                  className="flex items-center gap-2 py-1.5 pl-2 pr-3 rounded-full hover:bg-slate-100 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm uppercase overflow-hidden border border-slate-200">
                    {user.avatar?.startsWith('http') || user.avatar?.startsWith('data:') ? (
                      <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                    ) : user.avatar ? (
                      <span className="text-base">{user.avatar}</span>
                    ) : (
                      user.name.charAt(0)
                    )}
                  </div>
                  <span className="text-sm font-medium text-slate-800 hidden md:block max-w-[100px] truncate">
                    {user.name.split(' ')[0]}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden md:block" />
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50">
                    <div className="px-4 py-3 border-b border-slate-100">
                      <p className="font-semibold text-slate-900 text-sm truncate">{user.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{user.email || user.phone}</p>
                      <span className={cn(
                        'inline-flex items-center mt-1.5 px-2 py-0.5 rounded-full text-xs font-bold',
                        isProvider ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                      )}>
                        {isProvider ? 'Technician Pro' : 'Customer'}
                      </span>
                    </div>

                    <button
                      onClick={() => { navigate('/profile'); setMenuOpen(false); }}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <User className="w-4 h-4 text-slate-500" />
                      {t('header.my_profile', 'My Profile')}
                    </button>

                    <button
                      onClick={() => {
                        navigate(isProvider ? '/technician?tab=tickets' : '/bookings?tab=tickets');
                        setMenuOpen(false);
                      }}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <Headphones className="w-4 h-4 text-blue-600" />
                      <span>{t('header.my_tickets', 'My Support Tickets')}</span>
                    </button>

                    <div className="border-t border-slate-100 my-1 pt-1">
                      <button
                        onClick={() => { navigate('/about'); setMenuOpen(false); }}
                        className="flex items-center gap-3 w-full px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <Info className="w-3.5 h-3.5 text-slate-500" />
                        <span>About SOLVO</span>
                      </button>

                      <button
                        onClick={() => { navigate('/partner'); setMenuOpen(false); }}
                        className="flex items-center gap-3 w-full px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <Briefcase className="w-3.5 h-3.5 text-slate-500" />
                        <span>Partner With Us</span>
                      </button>

                      <button
                        onClick={() => { navigate('/contact'); setMenuOpen(false); }}
                        className="flex items-center gap-3 w-full px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                        <span>Help & Support</span>
                      </button>
                    </div>

                    <div className="border-t border-slate-100 mt-1 pt-1">
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        {t('header.sign_out', 'Sign Out')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <button
              onClick={() => onOpenAuth('customer')}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-full transition-colors shadow-sm"
            >
              Login / Sign Up
            </button>
          )}
        </div>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
      )}

      {/* Indic AI Concierge (Voice & Chat Multimodal Assistant) Modal */}
      {user && user.role === 'customer' && !onOpenAiConcierge && (
        <CustomerAiModal
          isOpen={voiceModalOpen}
          onClose={() => setVoiceModalOpen(false)}
          currentLocation={currentLocation}
        />
      )}
    </header>
  );
};
