/**
 * Seed Firestore with MyUrbanDaily Services & Categories
 * Usage: node scripts/seed-firestore.js
 */
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || 'AIzaSyDemoKeyForUrbanDailyFreeTier2026',
  authDomain: 'myurbandaily-458d0.firebaseapp.com',
  projectId: 'myurbandaily-458d0',
  storageBucket: 'myurbandaily-458d0.firebasestorage.app',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const CATEGORIES = [
  { id: 'cat-plumb', name: 'Plumbing', icon: 'Wrench', color: '#3b82f6', services_count: 3 },
  { id: 'cat-elec', name: 'Electrician', icon: 'Zap', color: '#f59e0b', services_count: 3 },
  { id: 'cat-clean', name: 'Cleaning', icon: 'Sparkles', color: '#10b981', services_count: 2 },
  { id: 'cat-appli', name: 'Appliance Repair', icon: 'Tv', color: '#8b5cf6', services_count: 2 },
  { id: 'cat-carp', name: 'Carpentry', icon: 'Hammer', color: '#f97316', services_count: 1 },
  { id: 'cat-paint', name: 'Painting', icon: 'Paintbrush', color: '#ec4899', services_count: 1 },
];

const SERVICES = [
  { id: 'svc-plumb-1', category_id: 'cat-plumb', name: 'Tap / Faucet Repair', description: 'Fix leaking taps, replace washers, install new faucets', price: 299, duration_min: 45, rating: 4.8, reviews_count: 312, icon: 'Wrench' },
  { id: 'svc-plumb-2', category_id: 'cat-plumb', name: 'Pipe Leak Fix', description: 'Detect and seal pipe leaks, replace damaged pipe sections', price: 499, duration_min: 60, rating: 4.7, reviews_count: 204, icon: 'Wrench' },
  { id: 'svc-plumb-3', category_id: 'cat-plumb', name: 'Bathroom Fitting', description: 'Install showerheads, bathroom accessories, flush tanks', price: 699, duration_min: 90, rating: 4.9, reviews_count: 88, icon: 'Wrench' },
  { id: 'svc-elec-1', category_id: 'cat-elec', name: 'Switch & Socket Repair', description: 'Replace broken switches, install new electrical sockets', price: 199, duration_min: 30, rating: 4.9, reviews_count: 420, icon: 'Zap' },
  { id: 'svc-elec-2', category_id: 'cat-elec', name: 'Fan Installation', description: 'Install ceiling / wall fans with full wiring and balancing', price: 399, duration_min: 45, rating: 4.8, reviews_count: 356, icon: 'Zap' },
  { id: 'svc-elec-3', category_id: 'cat-elec', name: 'MCB / Wiring Fault', description: 'Diagnose short circuits, replace MCBs, rewire sections', price: 599, duration_min: 75, rating: 4.6, reviews_count: 178, icon: 'Zap' },
  { id: 'svc-clean-1', category_id: 'cat-clean', name: 'Deep Home Cleaning', description: 'Comprehensive 2–3 BHK cleaning with eco-friendly products', price: 1299, duration_min: 180, rating: 4.9, reviews_count: 512, icon: 'Sparkles' },
  { id: 'svc-clean-2', category_id: 'cat-clean', name: 'Kitchen Deep Clean', description: 'Chimney, countertops, tiles, appliances — thorough kitchen clean', price: 799, duration_min: 120, rating: 4.8, reviews_count: 290, icon: 'Sparkles' },
  { id: 'svc-appli-1', category_id: 'cat-appli', name: 'AC Service & Gas Refill', description: 'AC cleaning, filter wash, gas top-up, performance check', price: 699, duration_min: 90, rating: 4.7, reviews_count: 445, icon: 'Tv' },
  { id: 'svc-appli-2', category_id: 'cat-appli', name: 'Washing Machine Repair', description: 'Diagnose and fix drum, motor, and electrical issues', price: 499, duration_min: 60, rating: 4.6, reviews_count: 218, icon: 'Tv' },
  { id: 'svc-carp-1', category_id: 'cat-carp', name: 'Door / Window Repair', description: 'Fix hinges, locks, handles, wood swelling and alignment', price: 349, duration_min: 45, rating: 4.7, reviews_count: 167, icon: 'Hammer' },
  { id: 'svc-paint-1', category_id: 'cat-paint', name: 'Room Painting (Per Room)', description: 'Premium interior paint, wall prep, two coats, clean finish', price: 2499, duration_min: 300, rating: 4.8, reviews_count: 94, icon: 'Paintbrush' },
];

async function seed() {
  console.log('Seeding categories...');
  for (const cat of CATEGORIES) {
    await setDoc(doc(db, 'categories', cat.id), cat);
    console.log(`  + Category: ${cat.name}`);
  }

  console.log('Seeding services...');
  for (const svc of SERVICES) {
    await setDoc(doc(db, 'services', svc.id), svc);
    console.log(`  + Service: ${svc.name}`);
  }

  console.log('Done! All services & categories seeded.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
