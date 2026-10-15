import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  Star,
  Clock,
  Lock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  Wrench,
  Zap,
  Sparkles,
  Tv,
  Hammer,
  Paintbrush,
  Car,
  Bike,
  Shirt,
  PackageCheck,
  X,
  Layers,
  Check,
  BadgePercent
} from 'lucide-react';
import { api, DEFAULT_CATEGORIES, DEFAULT_SERVICES } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { AuthModal } from '@/components/auth/AuthModal';
import { cn, formatCurrency } from '@/lib/utils';

const ICON_MAP: Record<string, React.ElementType> = {
  Wrench,
  Zap,
  Sparkles,
  Tv,
  Hammer,
  Paintbrush,
  Car,
  Bike,
  Shirt,
  PackageCheck
};

const CATEGORY_DETAILS: Record<string, { summary: string; highlights: string[] }> = {
  'cat-plumb': {
    summary: 'Tap repairs, pipe leaks, sanitary fittings & bathroom plumbing',
    highlights: ['Faucet & washbasin repairs', 'Pipe leakage & water blockage', 'Flush tanks & shower fittings']
  },
  'cat-elec': {
    summary: 'Ceiling fans, switchboards, MCB short-circuits & home rewiring',
    highlights: ['Fan repair & installation', 'Socket & switch replacement', 'MCB faults & wiring diagnostics']
  },
  'cat-clean': {
    summary: 'Deep home scrubbing, bathroom descaling & kitchen grease removal',
    highlights: ['2-3 BHK deep home cleaning', 'Intense bathroom scale elimination', 'Kitchen counter & chimney degrease']
  },
  'cat-appli': {
    summary: 'AC servicing, washing machines, RO purifiers & home appliances',
    highlights: ['AC gas refill & filter wash', 'Washing machine drum & motor fixes', 'RO purifier filter replacement']
  },
  'cat-motor': {
    summary: 'Car & bike foam wash, express detailing & bay slot reservation at verified service centers',
    highlights: ['Zero-queue service station bay reservations', 'High pressure snow foam & underbody wash', 'Complete car interior extraction & bike service']
  },
  'cat-laundry': {
    summary: 'Doorstep pickup & delivery: wash & fold, steam ironing, premium dry cleaning & sneaker spa',
    highlights: ['Hygienic enzyme wash & neat fold (per kg)', 'Crisp industrial steam pressing', 'Silk saree & suit dry cleaning (24-48h turnaround)']
  },
  'cat-carp': {
    summary: 'Door & window alignment, lock fittings, furniture fixes & woodwork',
    highlights: ['Door latch & lock repair', 'Hinges, swelling & frame alignment', 'Furniture assembly & custom fixes']
  },
  'cat-paint': {
    summary: 'Interior room painting, waterproof primer coats & touch-ups',
    highlights: ['Smooth wall preparation', 'Premium emulsion paint application', 'Spot touch-ups & leakproofing']
  }
};

const SERVICE_MODES = [
  { id: 'ALL', label: 'All Modes' },
  { id: 'DOORSTEP', label: 'Doorstep Repairs' },
  { id: 'STATION_SLOT', label: 'Service Bay Stations' },
  { id: 'PICKUP_DELIVERY', label: 'Pickup & Delivery' }
];

export const ServicesPage: React.FC = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();
  const { t, getLocalizedCategoryName, getLocalizedServiceName, getLocalizedServiceDesc } = useLanguage();

  const [categories, setCategories] = useState<any[]>(() => DEFAULT_CATEGORIES);
  const [services, setServices] = useState<any[]>(() => (user ? DEFAULT_SERVICES : []));
  const [selectedCat, setSelectedCat] = useState<string>(params.get('category') || '');
  const [query, setQuery] = useState(params.get('q') || '');
  const [selectedMode, setSelectedMode] = useState<string>('ALL');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  const trimmedQuery = query.trim().toLowerCase();
  const suggestions = useMemo(() => {
    if (trimmedQuery.length < 2) return { categories: [], services: [] };
    const matchedCategories = (categories.length > 0 ? categories : DEFAULT_CATEGORIES).filter((c) =>
      c.name.toLowerCase().includes(trimmedQuery)
    ).slice(0, 4);

    const pool = services.length > 0 ? services : DEFAULT_SERVICES;
    const matchedServices = pool.filter((s: any) => {
      const nameMatch = (s.name || '').toLowerCase().includes(trimmedQuery);
      const descMatch = (s.description || '').toLowerCase().includes(trimmedQuery);
      return nameMatch || descMatch;
    }).slice(0, 6);

    return { categories: matchedCategories, services: matchedServices };
  }, [trimmedQuery, categories, services]);

  useEffect(() => {
    api.getCategories().then(setCategories).catch(console.error);
  }, []);

  useEffect(() => {
    // Keep URL parameter in sync if selected category or query changes
    const currentParam = params.get('category') || '';
    if (currentParam !== selectedCat) {
      setSelectedCat(currentParam);
    }
    const currentQ = params.get('q') || '';
    if (currentQ !== query) {
      setQuery(currentQ);
    }
  }, [params]);

  useEffect(() => {
    // Only fetch services when user is authenticated, protecting catalog rates
    if (user) {
      setLoading(true);
      api.getServices(selectedCat || undefined, query || undefined)
        .then(setServices)
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setServices([]);
      setLoading(false);
    }
  }, [user, selectedCat, query]);

  const handleCategorySelect = (catId: string) => {
    if (selectedCat === catId) {
      setSelectedCat('');
      setParams({});
    } else {
      setSelectedCat(catId);
      setParams({ category: catId });
    }
  };

  const handleBook = (svc: any) => {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    navigate(`/book/${svc.id}`);
  };

  const selectedCategoryObj = categories.find((c) => c.id === selectedCat);
  const selectedCategoryName = selectedCategoryObj
    ? getLocalizedCategoryName(selectedCategoryObj.id, selectedCategoryObj.name)
    : '';

  const getCategoryCount = (catId: string) => {
    return DEFAULT_SERVICES.filter((s) => s.category_id === catId).length;
  };

  const getCategorySummary = (cat: any) => {
    return CATEGORY_DETAILS[cat.id]?.summary || cat.description || 'Verified doorstep & expert technician service';
  };

  const getCategoryHighlights = (cat: any) => {
    if (CATEGORY_DETAILS[cat.id]?.highlights && CATEGORY_DETAILS[cat.id].highlights.length > 0) {
      return CATEGORY_DETAILS[cat.id].highlights;
    }
    const matching = DEFAULT_SERVICES.filter((s) => s.category_id === cat.id);
    if (matching.length > 0) {
      return matching.slice(0, 3).map((s) => s.name);
    }
    return ['Verified professionals', 'Transparent pricing', '30-day rework warranty'];
  };

  const getServiceModeBadge = (catId?: string) => {
    const cat = categories.find((c) => c.id === catId);
    if (cat?.service_mode === 'STATION_SLOT') {
      return { label: 'Station Bay Slot', bg: 'bg-sky-50 text-sky-700 border-sky-200' };
    }
    if (cat?.service_mode === 'PICKUP_DELIVERY') {
      return { label: 'Pickup & Drop', bg: 'bg-pink-50 text-pink-700 border-pink-200' };
    }
    return { label: 'Doorstep Service', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
  };

  // Filter categories for logged-out search & mode
  const filteredCategories = categories.filter((cat) => {
    if (selectedMode !== 'ALL' && cat.service_mode !== selectedMode) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    const nameMatch = (cat.name || '').toLowerCase().includes(q);
    const details = CATEGORY_DETAILS[cat.id];
    const detailsMatch =
      details?.summary.toLowerCase().includes(q) ||
      details?.highlights.some((h) => h.toLowerCase().includes(q));
    return nameMatch || detailsMatch;
  });

  const renderServiceCard = (svc: any, cat?: any) => {
    const Icon = ICON_MAP[svc.icon] || Wrench;
    const catObj = cat || categories.find((c) => c.id === svc.category_id);
    const modeInfo = getServiceModeBadge(svc.category_id);

    return (
      <div
        key={svc.id}
        className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all overflow-hidden flex flex-col justify-between group"
      >
        <div>
          <div
            className="h-1.5"
            style={{ backgroundColor: catObj?.color || '#2563eb' }}
          />
          <div className="p-5">
            <div className="flex items-start gap-3 mb-3">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform"
                style={{ backgroundColor: `${catObj?.color || '#2563eb'}18` }}
              >
                <Icon className="w-5 h-5" style={{ color: catObj?.color || '#2563eb' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={cn('text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded border', modeInfo.bg)}>
                    {modeInfo.label}
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 text-sm leading-snug group-hover:text-blue-600 transition-colors">
                  {getLocalizedServiceName(svc.id, svc.name)}
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">
                  {getLocalizedServiceDesc(svc.id, svc.description)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 mb-2 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <strong className="text-slate-700">{svc.rating}</strong> ({svc.reviews_count})
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {svc.duration_min} min
              </span>
            </div>
          </div>
        </div>

        <div className="px-5 pb-5 pt-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
          <div>
            <span className="text-xl font-black text-slate-900">{formatCurrency(svc.price)}</span>
            <span className="text-[11px] text-slate-400 block -mt-0.5">Fixed rate</span>
          </div>
          <button
            onClick={() => handleBook(svc)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <span>{t('common.book_now', 'Book Now')}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-24">
      {/* ── Compact Header & Reassurance Badges ─────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3 mb-4">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
            {user
              ? (selectedCategoryName || t('services.all_services', 'All Services'))
              : (selectedCategoryName ? `Browse ${selectedCategoryName}` : t('home.browse_services', 'Browse Services'))}
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            {user
              ? `${services.length} ${t('services.services_available', 'services available near you')}`
              : 'Select a category below to explore verified services and transparent rates.'}
          </p>
        </div>

        {/* Reassurance Badges */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 font-medium">
          <span className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-lg">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>30-Day Free Rework Warranty</span>
          </span>
          <span className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-lg">
            <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>45-Minute Doorstep Arrival</span>
          </span>
          <span className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-lg">
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
            <span>100% Background-Checked Pros</span>
          </span>
        </div>
      </div>

      {/* ── Search & Mode Unified Dock ──────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 mb-3.5 z-30 relative">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={query}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 250)}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowSuggestions(true);
            }}
            placeholder={
              user
                ? t('services.search_placeholder', 'Search services (e.g., Plumber, AC, Fan)…')
                : 'Search service categories (Plumbing, Electrician, Cleaning…)'
            }
            className="w-full pl-10 pr-9 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-xs"
          />

          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                const p = new URLSearchParams(params);
                p.delete('q');
                setParams(p);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

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
                  {suggestions.categories.map((cat: any) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        handleCategorySelect(cat.id);
                        setQuery(cat.name);
                        setShowSuggestions(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-blue-50 text-left transition text-xs font-bold text-slate-800 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Wrench className="w-3.5 h-3.5 text-blue-600" />
                        <span>{getLocalizedCategoryName(cat.id, cat.name)}</span>
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
                    Suggested Services
                  </p>
                  {suggestions.services.map((svc: any) => (
                    <button
                      key={svc.id}
                      type="button"
                      onClick={() => {
                        setQuery(svc.name);
                        setShowSuggestions(false);
                        if (user) {
                          handleBook(svc);
                        } else {
                          if (svc.category_id) handleCategorySelect(svc.category_id);
                        }
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-50 text-left transition group cursor-pointer"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition">
                          {svc.name}
                        </p>
                        {svc.description && (
                          <p className="text-[11px] text-slate-500 line-clamp-1">
                            {svc.description}
                          </p>
                        )}
                      </div>
                      {svc.price ? (
                        <div className="text-right shrink-0 ml-3">
                          <span className="text-xs font-black text-slate-900 bg-slate-100 px-2 py-1 rounded-lg">
                            ₹{svc.price}
                          </span>
                        </div>
                      ) : null}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mode Selector - Segmented Glass Control */}
        <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 shrink-0 overflow-x-auto scrollbar-none">
          {SERVICE_MODES.map((mode) => {
            const isActive = selectedMode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => setSelectedMode(mode.id)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer',
                  isActive
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                )}
              >
                <span>{mode.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Category Chips ──────────────────────────────────────────────────── */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-5 scrollbar-none">
        <button
          onClick={() => handleCategorySelect('')}
          className={cn(
            'shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer',
            !selectedCat
              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
          )}
        >
          <span>{t('services.all', 'All Categories')}</span>
          <span className={cn(
            'text-[10px] px-1.5 py-0.2 rounded-full font-bold',
            !selectedCat ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
          )}>
            {categories.length}
          </span>
        </button>
        {categories.map((cat) => {
          const Icon = ICON_MAP[cat.icon] || Wrench;
          const isSelected = selectedCat === cat.id;
          const count = getCategoryCount(cat.id);
          return (
            <button
              key={cat.id}
              onClick={() => handleCategorySelect(cat.id)}
              className={cn(
                'shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer',
                isSelected
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{getLocalizedCategoryName(cat.id, cat.name)}</span>
              {count > 0 && (
                <span className={cn(
                  'text-[10px] px-1.5 py-0.2 rounded-full font-bold',
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Logged In vs Logged Out Content ─────────────────────────────────── */}
      {user ? (
        /* ────────────── AUTHENTICATED CUSTOMER: Real-time Services & Pricing ────────────── */
        loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-slate-100 rounded-2xl h-48 animate-pulse" />
            ))}
          </div>
        ) : services.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 p-8">
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-slate-700 font-bold text-base">No services found</p>
            <p className="text-slate-400 text-sm mt-1">Try a different category, mode, or search term</p>
          </div>
        ) : selectedCat || query ? (
          /* Single category or search query results */
          <div className="space-y-6">
            {selectedCategoryObj && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100/80 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                    style={{ backgroundColor: `${selectedCategoryObj.color || '#2563eb'}20` }}
                  >
                    {React.createElement(ICON_MAP[selectedCategoryObj.icon] || Wrench, {
                      className: 'w-6 h-6',
                      style: { color: selectedCategoryObj.color || '#2563eb' }
                    })}
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900">
                      {getLocalizedCategoryName(selectedCategoryObj.id, selectedCategoryObj.name)}
                    </h2>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {getCategorySummary(selectedCategoryObj)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleCategorySelect('')}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-white px-3 py-1.5 rounded-xl border border-blue-200 transition shrink-0 cursor-pointer"
                >
                  Show All Categories
                </button>
              </div>
            )}

            {query && (
              <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-600">
                <span>Found <strong>{services.length}</strong> services matching "<strong>{query}</strong>"</span>
                <button
                  onClick={() => {
                    setQuery('');
                    const p = new URLSearchParams(params);
                    p.delete('q');
                    setParams(p);
                  }}
                  className="font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
                >
                  Clear search
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.map((svc) => renderServiceCard(svc, selectedCategoryObj))}
            </div>
          </div>
        ) : (
          /* Multi-Category Living Product Catalog (Grouped by Category like Apple/Stripe) */
          <div className="space-y-12">
            {categories.map((cat) => {
              if (selectedMode !== 'ALL' && cat.service_mode !== selectedMode) return null;
              const catServices = services.filter((s) => s.category_id === cat.id);
              if (catServices.length === 0) return null;
              const Icon = ICON_MAP[cat.icon] || Wrench;
              const modeInfo = getServiceModeBadge(cat.id);

              return (
                <section key={cat.id} className="scroll-mt-6">
                  {/* Category Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                        style={{ backgroundColor: `${cat.color || '#2563eb'}18` }}
                      >
                        <Icon className="w-5 h-5" style={{ color: cat.color || '#2563eb' }} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
                            {getLocalizedCategoryName(cat.id, cat.name)}
                          </h2>
                          <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-md border', modeInfo.bg)}>
                            {modeInfo.label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                          {getCategorySummary(cat)}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleCategorySelect(cat.id)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50/60 hover:bg-blue-100/60 px-3 py-1.5 rounded-xl transition self-start sm:self-auto cursor-pointer"
                    >
                      <span>Focus {getLocalizedCategoryName(cat.id, cat.name)} ({catServices.length})</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Services Grid for this Category */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {catServices.map((svc) => renderServiceCard(svc, cat))}
                  </div>
                </section>
              );
            })}
          </div>
        )
      ) : (
        /* ────────────── LOGGED OUT VISITOR: Browse Categories (No Pricing Leaks) ────────────── */
        <div className="space-y-8">

          {/* Selected Category Deep Dive (When a specific category is chosen) */}
          {selectedCategoryObj ? (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-8">
              <div className="flex items-start gap-4 mb-6">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 shadow-sm"
                  style={{ backgroundColor: `${selectedCategoryObj.color || '#2563eb'}18` }}
                >
                  {React.createElement(ICON_MAP[selectedCategoryObj.icon] || Wrench, {
                    className: 'w-8 h-8',
                    style: { color: selectedCategoryObj.color || '#2563eb' }
                  })}
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-slate-900">
                    {getLocalizedCategoryName(selectedCategoryObj.id, selectedCategoryObj.name)}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    {getCategorySummary(selectedCategoryObj)}
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Services Covered in this Category
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {getCategoryHighlights(selectedCategoryObj).map((highlight, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 flex items-center gap-2.5 text-xs font-semibold text-slate-700"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>{highlight}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                    <Lock className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h5 className="font-bold text-sm text-slate-900">Individual Services & Pricing Hidden</h5>
                    <p className="text-xs text-slate-500">Sign in to view exact fixed prices, technician ratings, and book doorstep dispatch.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    onClick={() => handleCategorySelect('')}
                    className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-white transition-colors cursor-pointer"
                  >
                    View All Categories
                  </button>
                  <button
                    onClick={() => setAuthOpen(true)}
                    className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-sm cursor-pointer"
                  >
                    Sign In to View Rates
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Browse All Categories Grid */
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900">Available Service Categories</h3>
                <span className="text-xs font-semibold text-slate-500">{filteredCategories.length} Categories</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredCategories.map((cat) => {
                  const Icon = ICON_MAP[cat.icon] || Wrench;
                  const summary = getCategorySummary(cat);
                  const highlights = getCategoryHighlights(cat);
                  const modeInfo = getServiceModeBadge(cat.id);

                  return (
                    <div
                      key={cat.id}
                      onClick={() => handleCategorySelect(cat.id)}
                      className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all overflow-hidden flex flex-col justify-between group cursor-pointer"
                    >
                      <div className="p-5">
                        <div className="flex items-start gap-3.5 mb-3.5">
                          <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform"
                            style={{ backgroundColor: `${cat.color || '#2563eb'}18` }}
                          >
                            <Icon className="w-6 h-6" style={{ color: cat.color || '#2563eb' }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className={cn('text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded border', modeInfo.bg)}>
                                {modeInfo.label}
                              </span>
                            </div>
                            <h4 className="font-extrabold text-slate-900 text-base">
                              {getLocalizedCategoryName(cat.id, cat.name)}
                            </h4>
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                              {summary}
                            </p>
                          </div>
                        </div>

                        {highlights && highlights.length > 0 && (
                          <div className="space-y-1.5 my-3 pt-3 border-t border-slate-100 text-xs text-slate-600">
                            {highlights.map((h, i) => (
                              <div key={i} className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                                <span className="truncate">{h}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="px-5 pb-4 pt-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500">
                          {getCategoryCount(cat.id) > 0 ? `${getCategoryCount(cat.id)} services available` : 'Verified Services'}
                        </span>
                        <div className="text-xs font-bold text-blue-600 group-hover:text-blue-700 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                          <span>Explore Category</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Customer Login Modal */}
      <AuthModal
        isOpen={authOpen}
        defaultRole="customer"
        onClose={() => setAuthOpen(false)}
      />
    </div>
  );
};
