export interface BannerItem {
  id: string;
  image: string;
  titleAccent: string;
  tagline: string;
  badge: string;
  searchTag: string;
}

/**
 * ─── Hero Banner Registry ───────────────────────────────────────────────────
 * Add any custom banners here!
 *
 * HOW TO ADD CUSTOM BANNERS:
 * 1. Place your image in 'frontend/public/banners/my-banner.jpg'
 * 2. Add an entry to the DEFAULT_BANNERS array below:
 *    {
 *      id: 'my-custom-service',
 *      image: '/banners/my-banner.jpg',
 *      titleAccent: 'My Custom Service',
 *      tagline: 'Expert doorstep service in under 60 minutes',
 *      badge: '✨ Trending in Sagara',
 *      searchTag: 'Custom Service'
 *    }
 */
export const DEFAULT_BANNERS: BannerItem[] = [
  {
    id: 'banner-electrician',
    image: '/banners/banner-1-electrician.jpg',
    titleAccent: 'Verified Electricians',
    tagline: 'Powering safety with verified wiring & switchboard masters',
    badge: '⚡ 60-Min Emergency Response',
    searchTag: 'Electrician'
  },
  {
    id: 'banner-plumbing',
    image: '/banners/banner-2-plumbing.jpg',
    titleAccent: 'Master Plumbers',
    tagline: 'Precision leak-fixing, pipe fitting & sanitary installations',
    badge: '🚰 Guaranteed 30-Day Warranty',
    searchTag: 'Plumbing'
  },
  {
    id: 'banner-ac-repair',
    image: '/banners/banner-3-ac-repair.jpg',
    titleAccent: 'AC & Appliance Care',
    tagline: 'Deep jet-foam cleaning, gas top-up & cooling optimization',
    badge: '❄️ Trusted Cooling Specialists',
    searchTag: 'AC Service'
  },
  {
    id: 'banner-cleaning',
    image: '/banners/banner-4-cleaning.jpg',
    titleAccent: 'Deep Home Sanitization',
    tagline: 'Hospital-grade eco-cleaning for kitchens, bathrooms & sofas',
    badge: '✨ 100% Eco-Safe Cleaning',
    searchTag: 'House Cleaning'
  },
  {
    id: 'banner-motor',
    image: '/banners/banner-1-electrician.jpg',
    titleAccent: 'Motor Service & Detailing',
    tagline: 'Instant service center bay slot booking — Zero waiting in line',
    badge: '🚗 Zero-Queue Bay Guarantee',
    searchTag: 'Motor Service'
  },
  {
    id: 'banner-laundry',
    image: '/banners/banner-4-cleaning.jpg',
    titleAccent: 'Fabric & Sneaker Spa',
    tagline: 'Hygienic wash, steam press & premium dry cleaning at your door',
    badge: '🧺 Free Doorstep Pickup',
    searchTag: 'Laundry'
  }
];

