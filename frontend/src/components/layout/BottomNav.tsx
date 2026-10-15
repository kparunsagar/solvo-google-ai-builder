import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Search, ClipboardList, User, Wrench, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

const CUSTOMER_NAV = [
  { to: '/', icon: Home, key: 'nav.home', defaultLabel: 'Home' },
  { to: '/services', icon: Search, key: 'nav.services', defaultLabel: 'Services' },
  { to: '/bookings', icon: ClipboardList, key: 'nav.bookings', defaultLabel: 'Bookings' },
  { to: '/profile', icon: User, key: 'nav.profile', defaultLabel: 'Profile' },
];

const TECHNICIAN_NAV = [
  { to: '/technician', icon: Wrench, key: 'nav.job_desk', defaultLabel: 'Job Desk' },
  { to: '/kyc', icon: ShieldCheck, key: 'nav.kyc', defaultLabel: 'KYC' },
  { to: '/profile', icon: User, key: 'nav.profile', defaultLabel: 'Profile' },
];

export const BottomNav: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const isProvider = user?.role === 'provider';
  const navItems = isProvider ? TECHNICIAN_NAV : CUSTOMER_NAV;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 safe-area-pb sm:hidden">
      <div className="flex items-stretch h-16">
        {navItems.map(({ to, icon: Icon, key, defaultLabel }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/' || to === '/technician'}
            className={({ isActive }) =>
              cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors',
                isActive ? (isProvider ? 'text-purple-600' : 'text-blue-600') : 'text-slate-500 hover:text-slate-700'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={cn('w-5 h-5', isActive ? (isProvider ? 'text-purple-600' : 'text-blue-600') : 'text-slate-400')} />
                <span className="truncate max-w-[70px] text-[11px]">{t(key, defaultLabel)}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};


