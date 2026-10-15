// SOLVO Application-Only Ads Engine
// Strictly internal platform features, warranties, and custom photo banners
// Zero third-party ads (No external bank cards, commercial brands, or outside ads)

export interface AppAd {
  id: string;
  badge: string;
  partnerName: string;
  partnerLogoText: string;
  headline: string;
  subhead: string;
  highlightTag: string;
  ctaText: string;
  finePrint: string;
  gradient: string;
  accentColor: string;
  visualType: 'card' | 'shield' | 'travel' | 'appliance';
  offerCode: string;
  perks: string[];
  image?: string; // Optional custom photo from public/app-ads/ or uploaded assets
}

// ─── Default In-App Promotional Features ─────────────────────────────────────
export const BUILTIN_APP_ADS: AppAd[] = [
  {
    id: 'safecare_amc',
    badge: 'ANNUAL MAINTENANCE CONTRACT',
    partnerName: 'SOLVO',
    partnerLogoText: 'SAFECARE AMC',
    headline: 'Zero repair bills for 1 full year',
    subhead: 'Unlimited free electrician, plumbing & appliance checkups',
    highlightTag: 'Starting at ₹99/month • Zero visit fee',
    ctaText: 'EXPLORE SAFECARE',
    finePrint: 'Free replacement parts coverage up to ₹5,000',
    gradient: 'from-[#1e40af] via-[#1d4ed8] to-[#0f172a]',
    accentColor: '#3b82f6',
    visualType: 'shield',
    offerCode: 'SAFECARE99',
    image: '/app-ads/safecare-amc.jpg',
    perks: [
      'Unlimited free doorstep visits 365 days a year',
      'Free bi-annual AC deep jet-service & gas top-up',
      'Priority 30-minute emergency dispatch guarantee',
      '100% genuine OEM spare parts warranty'
    ]
  },
  {
    id: 'ac_jet_service',
    badge: 'SUMMER COOLING BOOST',
    partnerName: 'SOLVO',
    partnerLogoText: 'AC JET REPAIR',
    headline: 'AC Foam Jet Servicing & Cooling Boost',
    subhead: 'Deep coil wash with 2x cooling efficiency and free refrigerant check',
    highlightTag: 'Flat ₹150 OFF • Doorstep in 60 Mins',
    ctaText: 'BOOK AC SERVICE',
    finePrint: '30-Day Free Cooling Warranty & doorstep safety seal',
    gradient: 'from-[#0891b2] via-[#0284c7] to-[#0f172a]',
    accentColor: '#06b6d4',
    visualType: 'appliance',
    offerCode: 'COOLJET150',
    image: '/app-ads/ac-jet-service.jpg',
    perks: [
      'High-pressure indoor & outdoor unit foam jet cleaning',
      'Refrigerant gas pressure & airflow speed inspection',
      'Eliminates mold, dust & bad odors completely',
      '30-Day Cooling Guarantee included'
    ]
  },
  {
    id: 'electrician_repair',
    badge: 'RAPID 60-MIN ARRIVAL',
    partnerName: 'SOLVO',
    partnerLogoText: 'PRO ELECTRICIAN',
    headline: 'Verified Electrician at your Door',
    subhead: 'Switchboards, fan capacitors, MCB tripping & emergency wiring',
    highlightTag: 'Starting at ₹149 • Standard Rate Card',
    ctaText: 'BOOK ELECTRICIAN',
    finePrint: 'Aadhaar KYC verified & background checked technicians only',
    gradient: 'from-[#d97706] via-[#b45309] to-[#0f172a]',
    accentColor: '#f59e0b',
    visualType: 'card',
    offerCode: 'VOLT50',
    image: '/app-ads/electrician-repair.jpg',
    perks: [
      'Insulated safety tools & digital multimeter diagnostics',
      'Zero middleman markup with standard digital rates',
      'Aadhaar-verified & KYC cleared electricians',
      '30-Day Free Rework Warranty on all electrical jobs'
    ]
  },
  {
    id: 'plumbing_leak',
    badge: '100% LEAK-FREE GUARANTEE',
    partnerName: 'SOLVO',
    partnerLogoText: 'EXPERT PLUMBER',
    headline: 'Zero Tap Drip & Precision Plumbing',
    subhead: 'Tap replacement, concealed pipe leakage fixing & drain unclogging',
    highlightTag: 'Same-Day Doorstep Resolution • No Hidden Charges',
    ctaText: 'BOOK PLUMBER',
    finePrint: '30-Day Free Rework Warranty on all plumbing jobs',
    gradient: 'from-[#0f766e] via-[#047857] to-[#0f172a]',
    accentColor: '#0d9488',
    visualType: 'shield',
    offerCode: 'PLUMB50',
    image: '/app-ads/plumbing-leak.jpg',
    perks: [
      'Pristine water-safe repair & branded pipe fittings',
      'Zero mess cleanup guarantee after job completion',
      'Direct digital labor rates with upfront bill upload',
      '30-Day Free Rework Protection included'
    ]
  },
  {
    id: 'whistleblower_shield',
    badge: 'HONEST PRICING SHIELD',
    partnerName: 'SOLVO',
    partnerLogoText: 'WHISTLEBLOWER',
    headline: 'Zero middleman price inflation',
    subhead: 'Get 20% instant discount if quoted offline prices',
    highlightTag: 'Standardized labor rate card across all trades',
    ctaText: 'REPORT & SAVE 20%',
    finePrint: 'Protecting customers & honest technicians alike',
    gradient: 'from-[#ea580c] via-[#c2410c] to-[#1e1035]',
    accentColor: '#f97316',
    visualType: 'card',
    offerCode: 'SHIELD20',
    image: '/app-ads/safecare-amc.jpg',
    perks: [
      'Strictly transparent rate card with zero hidden fees',
      'Fixed 10% parts markup cap with digital bill upload',
      '20% cashback if any bypass attempt is reported',
      'Full escrow protection until service is marked done'
    ]
  }
];

// Helper to get active ads, incorporating any custom user-added photos
export function getActiveAppAds(): AppAd[] {
  if (typeof window === 'undefined') return BUILTIN_APP_ADS;

  try {
    const customPhotosJson = localStorage.getItem('mud_custom_ad_photos');
    if (customPhotosJson) {
      const customPhotos: string[] = JSON.parse(customPhotosJson);
      if (Array.isArray(customPhotos) && customPhotos.length > 0) {
        const photoAds: AppAd[] = customPhotos.map((url, idx) => ({
          id: `custom_photo_${idx}`,
          badge: 'SOLVO PROMO',
          partnerName: 'SOLVO',
          partnerLogoText: 'SPECIAL OFFER',
          headline: 'Exclusive Doorstep Service Special',
          subhead: 'Verified professionals at fixed transparent rates',
          highlightTag: 'Limited Time App Offer',
          ctaText: 'BOOK NOW',
          finePrint: 'Valid across Bengaluru, Sagara & Karnataka hubs',
          gradient: 'from-[#1e293b] via-[#0f172a] to-[#020617]',
          accentColor: '#38bdf8',
          visualType: 'card',
          offerCode: 'URBANPROMO',
          image: url,
          perks: [
            'Direct doorstep dispatch in 60 minutes',
            '30-Day Free Rework Warranty',
            'Aadhaar KYC verified technicians'
          ]
        }));
        return [...photoAds, ...BUILTIN_APP_ADS];
      }
    }
  } catch {}

  return BUILTIN_APP_ADS;
}
