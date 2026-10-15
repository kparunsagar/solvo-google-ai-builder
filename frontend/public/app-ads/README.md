# MyUrbanDaily Booking Page Promotional Ads Directory

This directory stores high-resolution promotional banner images and service creatives displayed in the **My Bookings (`/bookings`)** page rolling ads billboard and offer popups.

---

## 📍 Image Location on Disk
All promotional ad images must be placed directly in:
```
frontend/public/app-ads/
```
Files placed here are automatically served at the public URL path:
```
/app-ads/<your-image-filename>
```
*(e.g., `/app-ads/ac-jet-service.jpg`, `/app-ads/festive-offer.png`)*

---

## 🎨 Recommended Image Specifications
- **Recommended Aspect Ratio**: `16:9` (e.g., `1280x720` or `1920x1080`) or `4:3`
- **Supported Formats**: `.jpg`, `.jpeg`, `.png`, `.webp`, `.svg`
- **Image Subject**: High-quality, authentic home repair or service photography (Electricians, Plumbers, AC servicing, House cleaning, etc.) with clean composition.

---

## 🛠️ How to Add or Replace an Ad

### Option 1: Replace an Existing Image
Simply replace any of the default images with your new photo using the same filename:
- `ac-jet-service.jpg` — Air Conditioner jet servicing & cleaning ad
- `electrician-repair.jpg` — Electrician diagnostics & wiring ad
- `plumbing-leak.jpg` — Plumbing tap & pipe leakage repair ad
- `safecare-amc.jpg` — SafeCare AMC annual home maintenance ad

### Option 2: Add a Brand New Ad Card & Popup
1. Copy your new image into this directory (e.g. `festive-cleaning.jpg`).
2. Open [`frontend/src/data/app-ads.ts`](file:///d:/Users/Downloads/Urban%20Company/frontend/src/data/app-ads.ts).
3. Add a new ad object into the `BUILTIN_APP_ADS` array:
```ts
{
  id: 'festive_cleaning',
  badge: 'FESTIVE DEEP CLEAN',
  partnerName: 'MyUrbanDaily',
  partnerLogoText: 'SPECIAL CLEANING',
  headline: 'Full Home Deep Cleaning & Sanitization',
  subhead: 'Kitchen degreasing, bathroom descaling & sofa shampooing',
  highlightTag: 'Flat 25% OFF • Weekend Slots Available',
  ctaText: 'BOOK CLEANING',
  finePrint: 'Eco-friendly cleaning agents & certified housekeepers',
  gradient: 'from-emerald-600 via-teal-700 to-slate-950',
  accentColor: '#10b981',
  visualType: 'card',
  offerCode: 'FESTIVE25',
  image: '/app-ads/festive-cleaning.jpg',
  perks: [
    'Deep stain extraction with hospital-grade disinfectants',
    'Kitchen chimney, oven & countertop grease removal',
    'Bathroom tile descaling & mirror polishing',
    '100% Satisfaction or free re-clean guarantee'
  ]
}
```
4. Save the file. The auto-cycling carousel on `/bookings` will instantly include your new ad and popup!

### Option 3: Browser Dynamic Override (No Rebuild Needed)
You can dynamically push image URLs into the carousel in the browser via JavaScript / DevTools:
```js
localStorage.setItem('mud_custom_ad_photos', JSON.stringify([
  '/app-ads/my-custom-photo.jpg'
]));
```
Refreshing `/bookings` will prioritize your custom photos at the front of the carousel.
