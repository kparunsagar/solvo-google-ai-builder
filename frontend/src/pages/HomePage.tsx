import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Star, ShieldCheck, Clock, ChevronRight, ArrowRight,
  Wrench, Zap, Sparkles, Tv, Hammer, Paintbrush, CheckCircle, Lock,
  Car, Bike, Shirt, PackageCheck
} from 'lucide-react';
import { api, DEFAULT_CATEGORIES, DEFAULT_SERVICES } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { AuthModal } from '@/components/auth/AuthModal';
import { HeroSlider } from '@/components/HeroSlider';
import { cn, formatCurrency } from '@/lib/utils';

const ICON_MAP: Record<string, React.ElementType> = {
  Wrench, Zap, Sparkles, Tv, Hammer, Paintbrush, Car, Bike, Shirt, PackageCheck
};

const TRUST_BADGES = [
  { icon: ShieldCheck, label: 'Background Verified', desc: 'Aadhaar & photo-verified' },
  { icon: CheckCircle, label: '30-Day Free Rework', desc: 'Quality warranty on every booking' },
  { icon: Clock, label: 'Fast Response', desc: 'Direct dispatch to nearby technicians' },
  { icon: Wrench, label: 'Transparent Pricing', desc: 'Upfront rates & no hidden fees' },
];

const HOW_IT_WORKS = [
  { step: '01', title: 'Search Service', desc: 'Pick from 50+ categories — plumbing, electrical, cleaning & more' },
  { step: '02', title: 'Book in 30 sec', desc: 'Choose your slot, confirm your address, done' },
  { step: '03', title: 'Expert at Door', desc: 'Verified technician arrives on time, job done right' },
];

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, getLocalizedCategoryName, getLocalizedServiceName, getLocalizedServiceDesc } = useLanguage();
  const [categories, setCategories] = useState<any[]>(() => DEFAULT_CATEGORIES);
  const [popularServices, setPopularServices] = useState<any[]>(() => DEFAULT_SERVICES.slice(0, 6));
  const [searchQuery, setSearchQuery] = useState('');
  const [authOpen, setAuthOpen] = useState(false);
  const [authRole, setAuthRole] = useState<'customer' | 'provider'>('customer');

  useEffect(() => {
    api.getCategories().then(setCategories).catch(console.error);
    api.getServices().then(svcs => setPopularServices(svcs.slice(0, 6))).catch(console.error);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      if (!user) {
        setAuthRole('customer');
        setAuthOpen(true);
        return;
      }
      navigate(`/services?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleCategoryClick = (cat: any) => {
    navigate(`/services?category=${cat.id}`);
  };

  const handleBookNow = (svc: any) => {
    if (!user) {
      setAuthRole('customer');
      setAuthOpen(true);
      return;
    }
    navigate(`/book/${svc.id}`);
  };

  return (
    <div className="min-h-screen bg-slate-50/50">

      {/* ── Dynamic AI Sliding Hero Banners ─────────────────────────────── */}
      <HeroSlider
        locationLabel={t('home.serving_badge', 'Trusted Hyperlocal Home Services Platform')}
        servingBadgeText={t('home.serving_badge', 'Trusted Hyperlocal Home Services Platform')}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchSubmit={handleSearch}
        onPopularTagClick={(tag) => {
          if (!user) {
            setAuthRole('customer');
            setAuthOpen(true);
            return;
          }
          navigate(`/services?q=${encodeURIComponent(tag)}`);
        }}
        searchPlaceholder={t('home.search_placeholder', 'Search plumber, electrician, cleaning…')}
        searchButtonText={t('home.search_button', 'Search')}
        heroTitle={t('home.hero_title', 'Trusted Home Services,')}
        heroTitleAccent={t('home.hero_title_accent', 'On Demand')}
        heroSubtitle={t('home.hero_subtitle', 'Book plumbers, electricians, cleaners & more — background-verified professionals at your door in under 60 minutes.')}
        popularTagsText={t('home.popular_tags', 'Popular: AC Service · Tap Repair · House Cleaning · Fan Install')}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-3 sm:pt-4 pb-14 space-y-6 sm:space-y-7 relative z-10">

        {/* ── Service Categories (Positioned immediately below hero for 1-click booking) ── */}
        {categories.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3 sm:mb-3.5">
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">{t('home.browse_services', 'Browse Services')}</h2>
                <p className="text-xs text-slate-500 mt-0.5">{categories.length}+ categories · Plumbing, Electrician, Cleaning, Motor & Laundry</p>
              </div>
              <button
                onClick={() => navigate('/services')}
                className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer transition-colors"
              >
                {t('home.view_all', 'View all')} <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-8 gap-2.5 sm:gap-3">
              {categories.map((cat) => {
                const Icon = ICON_MAP[cat.icon] || Wrench;
                return (
                  <button
                    key={cat.id}
                    onClick={() => handleCategoryClick(cat)}
                    className="group flex flex-col items-center justify-center gap-2 p-3 sm:p-3.5 bg-white rounded-2xl border border-slate-100 shadow-2xs hover:shadow-md hover:border-blue-200/80 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer text-center"
                  >
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 group-hover:scale-110 shadow-2xs"
                      style={{ backgroundColor: `${cat.color}15` }}
                    >
                      <Icon className="w-5 h-5" style={{ color: cat.color }} />
                    </div>
                    <span className="text-xs font-bold text-slate-800 group-hover:text-blue-600 text-center leading-tight transition-colors">
                      {getLocalizedCategoryName(cat.id, cat.name)}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Trust & Quality Assurance Strip ─────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          {TRUST_BADGES.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="bg-white rounded-2xl p-3 sm:p-3.5 border border-slate-100 shadow-2xs flex items-center gap-3 hover:shadow-xs transition-all">
              <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-xs sm:text-sm text-slate-900 leading-tight">{label}</p>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug line-clamp-1">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Conditional Section: Popular Services (Logged In) vs Member Unlock Gate (Before Login) ── */}
        {user ? (
          /* LOGGED IN CUSTOMER: Visible Popular Services with Pricing & Booking */
          popularServices.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">{t('home.popular_services', 'Popular Right Now')}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">{t('home.most_booked', 'Most booked in your area this week')}</p>
                </div>
                <button
                  onClick={() => navigate('/services')}
                  className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                >
                  {t('home.see_all', 'See all')} <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {popularServices.map(svc => {
                  const Icon = ICON_MAP[svc.icon] || Wrench;
                  return (
                    <div
                      key={svc.id}
                      className="bg-white rounded-2xl border border-slate-100 shadow-2xs hover:shadow-md transition-all overflow-hidden group"
                    >
                      <div className="h-1.5 bg-gradient-to-r from-blue-500 to-indigo-500" />
                      <div className="p-4">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                            <Icon className="w-4.5 h-4.5 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-slate-900 text-sm truncate">
                              {getLocalizedServiceName(svc.id, svc.name)}
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                              {getLocalizedServiceDesc(svc.id, svc.description)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-base font-extrabold text-slate-900">{formatCurrency(svc.price)}</span>
                            <span className="text-[11px] text-slate-500 ml-1">{t('common.onwards', 'onwards')}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                            <span className="font-medium">{svc.rating}</span>
                            <span>({svc.reviews_count})</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100">
                          <span className="flex items-center gap-1 text-xs text-slate-500">
                            <Clock className="w-3.5 h-3.5" />
                            {svc.duration_min} min
                          </span>
                          <button
                            onClick={() => handleBookNow(svc)}
                            className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
                          >
                            {t('common.book_now', 'Book Now')} <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )
        ) : (
          /* BEFORE LOGIN: Innovative Ultra-Compact Action Bar (Razor-thin, Zero Wasted Space) */
          <section className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-xl p-2.5 sm:px-4 sm:py-2.5 border border-slate-800 shadow-xs relative overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-2.5 sm:gap-3">
              <div className="flex items-center gap-2.5 min-w-0 w-full md:w-auto">
                <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-400/30 text-blue-400 flex items-center justify-center shrink-0">
                  <Lock className="w-3.5 h-3.5" />
                </div>
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <h3 className="text-xs sm:text-sm font-extrabold text-white tracking-tight whitespace-nowrap">
                    Login to View Available Services & Transparent Pricing
                  </h3>
                  <span className="hidden xl:inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    ⚡ 45-Min Dispatch · Zero Advance COD
                  </span>
                </div>
              </div>

              <button
                onClick={() => { setAuthRole('customer'); setAuthOpen(true); }}
                className="w-full md:w-auto px-4 py-1.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-xs transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer whitespace-nowrap"
              >
                <span>Continue with Google / Mobile</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </section>
        )}

        {/* ── How It Works ─────────────────────────────────────────────────── */}
        <section className="bg-gradient-to-br from-slate-50 to-blue-50/50 rounded-2xl p-5 sm:p-6 border border-slate-100">
          <div className="text-center mb-5">
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">How It Works</h2>
            <p className="text-xs text-slate-500 mt-0.5">Book certified doorstep service in 3 simple steps</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            {HOW_IT_WORKS.map(({ step, title, desc }) => (
              <div key={step} className="flex flex-col items-center text-center p-2">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-extrabold text-sm mb-2 shadow-2xs">
                  {step}
                </div>
                <h3 className="font-bold text-slate-900 text-sm mb-0.5">{title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed max-w-xs">{desc}</p>
              </div>
            ))}
          </div>
        </section>



      </div>

      <AuthModal
        isOpen={authOpen}
        defaultRole={authRole}
        onClose={() => setAuthOpen(false)}
      />

    </div>
  );
};
