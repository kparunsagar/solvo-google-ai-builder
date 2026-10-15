import React, { useState, useMemo } from 'react';
import { Search, Wrench, ShieldCheck, Clock, Star, CheckCircle } from 'lucide-react';
import { BannerItem, DEFAULT_BANNERS } from '@/config/banners';
import { DEFAULT_CATEGORIES, DEFAULT_SERVICES } from '@/lib/api';
import { cn } from '@/lib/utils';

interface HeroSliderProps {
  banners?: BannerItem[];
  locationLabel: string;
  servingBadgeText: string;
  searchQuery: string;
  onSearchChange: (val: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
  onPopularTagClick: (tag: string) => void;
  searchPlaceholder?: string;
  searchButtonText?: string;
  heroTitle?: string;
  heroTitleAccent?: string;
  heroSubtitle?: string;
  popularTagsText?: string;
}

export const HeroSlider: React.FC<HeroSliderProps> = ({
  banners = DEFAULT_BANNERS,
  locationLabel,
  servingBadgeText,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  onPopularTagClick,
  searchPlaceholder = 'Search plumber, electrician, cleaning…',
  searchButtonText = 'Search',
  heroTitle = 'Trusted Home Services,',
  heroTitleAccent = 'On Demand',
  heroSubtitle = 'Book plumbers, electricians, cleaners & more — background-verified professionals at your door in under 60 minutes.',
  popularTagsText = 'Popular: AC Service · Tap Repair · House Cleaning · Fan Install',
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);

  const trimmedQuery = searchQuery.trim().toLowerCase();
  const suggestions = useMemo(() => {
    if (trimmedQuery.length < 2) return { categories: [], services: [] };
    const categories = DEFAULT_CATEGORIES.filter((c) =>
      c.name.toLowerCase().includes(trimmedQuery)
    ).slice(0, 3);

    const services = DEFAULT_SERVICES.filter((s) => {
      const nameMatch = s.name.toLowerCase().includes(trimmedQuery);
      const descMatch = s.description?.toLowerCase().includes(trimmedQuery);
      const cat = DEFAULT_CATEGORIES.find((c) => c.id === s.category_id);
      const catMatch = cat?.name.toLowerCase().includes(trimmedQuery);
      return nameMatch || descMatch || catMatch;
    }).slice(0, 6);

    return { categories, services };
  }, [trimmedQuery]);

  return (
    <section
      className="w-full max-w-7xl mx-auto px-4 sm:px-6 pt-3 sm:pt-4 pb-1"
      aria-label="Home Services Command Center"
    >
      {/* ── 10/10 Rated Compact Brand Command Hub (Ultra-Sleek, Zero Wasted Space) ── */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 lg:p-7 border border-slate-200/80 shadow-xs relative overflow-hidden bg-gradient-to-b from-white via-white to-slate-50/30">
        
        {/* Top Row: Brand & Location (Left) + Balanced Live Assurance Metrics (Right) */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 sm:pb-5 border-b border-slate-100">
          
          {/* Left: Operational Status Beacon & Headline */}
          <div className="min-w-0 max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-slate-100/90 border border-slate-200/80 rounded-full px-3 py-0.5 text-xs font-semibold text-slate-700 w-fit mb-2 shadow-2xs">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shrink-0" />
              <span className="truncate">{servingBadgeText}</span>
            </div>

            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
              <span>{heroTitle}</span>{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600">
                {heroTitleAccent || 'On Demand'}
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
              {heroSubtitle}
            </p>
          </div>

          {/* Right: Balanced High-Value Trust Proof Metrics (Fills Desktop Void Gracefully) */}
          <div className="shrink-0 flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-2.5">
            <div className="flex-1 sm:flex-initial bg-slate-50/90 border border-slate-200/70 rounded-2xl px-3.5 py-2 text-center min-w-[95px] shadow-2xs">
              <div className="flex items-center justify-center gap-1 text-amber-500 font-extrabold text-xs sm:text-sm">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>4.9/5</span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium mt-0.5 whitespace-nowrap">
                15K+ Bookings
              </p>
            </div>

            <div className="flex-1 sm:flex-initial bg-blue-50/60 border border-blue-100/80 rounded-2xl px-3.5 py-2 text-center min-w-[95px] shadow-2xs">
              <div className="flex items-center justify-center gap-1 text-blue-600 font-extrabold text-xs sm:text-sm">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span>60-Min</span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium mt-0.5 whitespace-nowrap">
                Doorstep Dispatch
              </p>
            </div>

            <div className="flex-1 sm:flex-initial bg-emerald-50/60 border border-emerald-100/80 rounded-2xl px-3.5 py-2 text-center min-w-[95px] shadow-2xs">
              <div className="flex items-center justify-center gap-1 text-emerald-600 font-extrabold text-xs sm:text-sm">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>30-Day</span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium mt-0.5 whitespace-nowrap">
                Free Rework
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Row: Integrated High-Affordance Search Bar + Popular Quick Chips */}
        <div className="pt-3.5 sm:pt-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Integrated Search Input with Predictive Dropdown */}
          <div className="flex-1 min-w-0">
            <form onSubmit={onSearchSubmit} className="relative z-40">
              <div className="bg-slate-50/90 border border-slate-200 hover:border-slate-300 focus-within:border-blue-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/10 rounded-2xl p-1.5 pl-3.5 flex items-center gap-2 transition-all shadow-2xs">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 250)}
                  onChange={(e) => {
                    onSearchChange(e.target.value);
                    setShowSuggestions(true);
                  }}
                  placeholder={searchPlaceholder}
                  className="w-full bg-transparent text-slate-900 text-xs sm:text-sm font-medium placeholder-slate-400 focus:outline-hidden py-1.5"
                />
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold px-4 sm:px-6 py-2.5 rounded-xl transition-all shadow-sm hover:shadow cursor-pointer shrink-0 text-xs sm:text-sm flex items-center gap-1.5"
                >
                  <span>{searchButtonText}</span>
                </button>
              </div>

              {/* ── Autocomplete Keyword Suggestions Dropdown ── */}
              {showSuggestions && (suggestions.categories.length > 0 || suggestions.services.length > 0) && (
                <div
                  className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 text-left divide-y divide-slate-100 max-h-80 overflow-y-auto"
                  onMouseDown={(e) => e.preventDefault()}
                >
                  {/* Categories Match */}
                  {suggestions.categories.length > 0 && (
                    <div className="p-2 bg-slate-50/70">
                      <p className="text-[10px] font-black uppercase text-slate-400 px-2 py-1 tracking-wider">
                        Matching Categories
                      </p>
                      {suggestions.categories.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            onSearchChange(cat.name);
                            setShowSuggestions(false);
                            onPopularTagClick(cat.name);
                          }}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-blue-50 text-left transition text-xs font-bold text-slate-800 cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <Wrench className="w-3.5 h-3.5 text-blue-600" />
                            <span>{cat.name}</span>
                          </div>
                          <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                            Category
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Services Match */}
                  {suggestions.services.length > 0 && (
                    <div className="p-2">
                      <p className="text-[10px] font-black uppercase text-slate-400 px-2 py-1 tracking-wider">
                        Suggested Doorstep Services
                      </p>
                      {suggestions.services.map((svc) => (
                        <button
                          key={svc.id}
                          type="button"
                          onClick={() => {
                            onSearchChange(svc.name);
                            setShowSuggestions(false);
                            onPopularTagClick(svc.name);
                          }}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-50 text-left transition group cursor-pointer"
                        >
                          <div>
                            <p className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition">
                              {svc.name}
                            </p>
                            <p className="text-[11px] text-slate-500 line-clamp-1">
                              {svc.description}
                            </p>
                          </div>
                          <div className="text-right shrink-0 ml-3">
                            <span className="text-xs font-black text-slate-900 bg-slate-100 px-2 py-1 rounded-lg">
                              ₹{svc.price}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </form>
          </div>

          {/* Popular Quick Chips + Verified Pro Indicator */}
          <div className="flex flex-wrap items-center gap-1.5 shrink-0 text-xs">
            <span className="text-slate-400 font-medium text-[11px] mr-0.5">Popular:</span>
            {['AC Service', 'Tap Repair', 'House Cleaning', 'Fan Install'].map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => onPopularTagClick(tag)}
                className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 border border-slate-200/60 text-slate-600 transition-all cursor-pointer text-[11px] font-medium"
              >
                {tag}
              </button>
            ))}
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100/90 border border-slate-200/70 rounded-xl px-2.5 py-1 ml-1">
              <CheckCircle className="w-3 h-3 text-emerald-500" />
              <span>Background-Verified Pros</span>
            </span>
          </div>

        </div>

      </div>
    </section>
  );
};
