# Custom Banners Directory

Place your custom sliding hero images in this folder!

## How to Add Custom Banners:
1. Copy your banner image file (e.g. `festive-offer.jpg` or `solar-panel.png`) into this folder:
   `frontend/public/banners/`
2. Open `frontend/src/config/banners.ts` and add an entry:
   ```ts
   {
     id: 'festive-offer',
     image: '/banners/festive-offer.jpg',
     titleAccent: 'Festive Home Glow',
     tagline: 'Special festive maintenance package for Sagara homes',
     badge: '🎉 Festive Special',
     searchTag: 'Painting'
   }
   ```
3. The slider will instantly pick it up and cycle through your new image in the running carousel.
