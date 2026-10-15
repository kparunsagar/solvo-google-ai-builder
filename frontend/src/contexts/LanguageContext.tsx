import React, { createContext, useContext, useState, useEffect } from 'react';

export type LanguageCode = 'en' | 'kn' | 'hi' | 'ta' | 'te';

export interface LanguageOption {
  code: LanguageCode;
  name: string;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', flag: '🇮🇳' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी', flag: '🇮🇳' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳' }
];

// ─── Embedded Localizations for Zero-Latency & Offline Fallback ──────────────
export const BUNDLED_TRANSLATIONS: Record<LanguageCode, Record<string, string>> = {
  en: {
    'app.name': 'SOLVO',
    'app.tagline': 'Instant Home Services & Repairs',
    'nav.home': 'Home',
    'nav.services': 'Services',
    'nav.bookings': 'Bookings',
    'nav.profile': 'Profile',
    'nav.job_desk': 'Job Desk',
    'nav.kyc': 'KYC',
    'nav.technician': 'Technician Portal',
    'header.join_technician': 'Join as Technician',
    'header.customer_portal': 'Customer Portal',
    'header.technician_pro': 'Technician Pro',
    'header.my_profile': 'My Profile',
    'header.sign_out': 'Sign Out',
    'header.detecting_location': 'Detecting location…',
    'header.select_language': 'Language',

    'home.browse_services': 'Browse Services',
    'home.services_across_categories': '50+ services across 6 categories',
    'home.view_all': 'View all',
    'home.popular_services': 'Popular Right Now',
    'home.most_booked': 'Most booked in Sagara this week',
    'home.see_all': 'See all',
    'home.hero_title': 'Trusted Home Services,',
    'home.hero_title_accent': 'On Demand',
    'home.hero_subtitle': 'Book plumbers, electricians, cleaners & more — background-verified professionals at your door in under 60 minutes.',
    'home.serving_badge': 'Trusted Hyperlocal Home Services Platform',
    'home.search_placeholder': 'Search plumber, electrician, cleaning…',
    'home.search_button': 'Search',
    'home.popular_tags': 'Popular: AC Service · Tap Repair · House Cleaning · Fan Install',

    'services.all_services': 'All Services',
    'services.services_available': 'services available near you',
    'services.all': 'All',
    'services.search_placeholder': 'Search services…',

    'category.cat-plumb': 'Plumbing',
    'category.cat-elec': 'Electrician',
    'category.cat-clean': 'Cleaning',
    'category.cat-appli': 'Appliance Repair',
    'category.cat-motor': 'Motor Service',
    'category.cat-laundry': 'Laundry',
    'category.cat-carp': 'Carpentry',
    'category.cat-paint': 'Painting',

    'trade.Plumbing & Sanitary': 'Plumbing & Sanitary',
    'trade.Electrical & Wiring': 'Electrical & Wiring',
    'trade.Deep Home Cleaning': 'Deep Home Cleaning',
    'trade.AC & Appliance Service': 'AC & Appliance Service',
    'trade.Automobile & Motor Care': 'Automobile & Motor Care',
    'trade.Laundry & Dry Cleaning': 'Laundry & Dry Cleaning',
    'trade.Carpentry & Furniture': 'Carpentry & Furniture',
    'trade.Interior Painting': 'Interior Painting',
    'trade.General Home Services': 'General Home Services',

    'service.svc-motor-1.name': 'Car Express Foam & Underbody Pressure Wash',
    'service.svc-motor-1.desc': 'High-pressure underbody rinse, active pH-neutral snow foam bath, tyre dressing, exterior dry & interior vacuuming',
    'service.svc-motor-2.name': 'Bike Deep Foam Wash & Chain Lubrication',
    'service.svc-motor-2.desc': 'Full mud & grime removal, active snow foam bath, air pressure blowout, and Motul chain degreasing & lube',
    'service.svc-motor-3.name': 'Complete Car Interior & AC Vent Detailing',
    'service.svc-motor-3.desc': 'Deep upholstery foam extraction, dashboard polish, roof lining steam clean & germicidal AC duct fogging',
    'service.svc-motor-4.name': 'Two-Wheeler Comprehensive Service & Oil Change',
    'service.svc-motor-4.desc': 'Premium 4T engine oil replacement, spark plug cleaning, carburettor/FI tuning, brake inspection & 18-point checkup',

    'service.svc-laund-1.name': 'Wash & Fold (Daily Wear — Per Kg)',
    'service.svc-laund-1.desc': 'Hygienic enzyme wash, fabric softener treatment, tumble dry & neat flat fold (Minimum order 3 kg)',
    'service.svc-laund-2.name': 'Wash & Industrial Steam Iron (Per Kg)',
    'service.svc-laund-2.desc': 'Antibacterial deep wash followed by crisp, wrinkle-free steam pressing on premium cardboard hangers',
    'service.svc-laund-3.name': 'Premium Suit, Blazer & Silk Saree Dry Cleaning',
    'service.svc-laund-3.desc': 'Eco-solvent perchloroethylene-free gentle dry cleaning for festive wear, blazers, silks, and heavy woolens',
    'service.svc-laund-4.name': 'Sneaker Spa & Shoe Laundry',
    'service.svc-laund-4.desc': 'Deep midsole whitening, mesh/suede upper stain extraction, antibacterial deodorizing & lace revival',

    'service.svc-plumb-1.name': 'Tap / Faucet Repair',
    'service.svc-plumb-1.desc': 'Fix leaking taps, replace washers, install new faucets',
    'service.srv_plumber_general.name': 'Plumber — General Plumbing & Leak Repair',
    'service.srv_plumber_general.desc': 'Complete doorstep plumbing, tap repair, pipe leak fixing and water pressure restoration',
    'service.svc-plumb-2.name': 'Pipe Leak Fix',
    'service.svc-plumb-2.desc': 'Detect and seal pipe leaks, replace damaged pipe sections',
    'service.svc-plumb-3.name': 'Bathroom Fitting',
    'service.svc-plumb-3.desc': 'Install showerheads, bathroom accessories, flush tanks',

    'service.svc-elec-1.name': 'Switch & Socket Repair',
    'service.svc-elec-1.desc': 'Replace broken switches, install new electrical sockets',
    'service.srv_electrician_general.name': 'Electrician — General Repair & Fan Servicing',
    'service.srv_electrician_general.desc': 'Ceiling fan capacitor repair, MCB troubleshooting, switchboard fixing, short circuit repair',
    'service.svc-elec-2.name': 'Fan Installation',
    'service.svc-elec-2.desc': 'Install ceiling / wall fans with full wiring and balancing',
    'service.svc-elec-3.name': 'MCB / Wiring Fault',
    'service.svc-elec-3.desc': 'Diagnose short circuits, replace MCBs, rewire sections',

    'service.svc-clean-1.name': 'Deep Home Cleaning',
    'service.svc-clean-1.desc': 'Comprehensive 2–3 BHK cleaning with eco-friendly products',
    'service.srv_cleaning_deep.name': 'Home Deep Cleaning & Bathroom Descaling',
    'service.srv_cleaning_deep.desc': 'Deep floor tile scrubbing, bathroom scale elimination, kitchen grease removal',
    'service.svc-clean-2.name': 'Kitchen Deep Clean',
    'service.svc-clean-2.desc': 'Chimney, countertops, tiles, appliances — thorough kitchen clean',

    'service.svc-appli-1.name': 'AC Service & Gas Refill',
    'service.svc-appli-1.desc': 'AC cleaning, filter wash, gas top-up, performance check',
    'service.srv_ac_repair.name': 'AC Servicing, Deep Cleaning & Repair',
    'service.srv_ac_repair.desc': 'Air conditioner cooling repair, refrigerant leak check, capacitor replacement',
    'service.svc-appli-2.name': 'Washing Machine Repair',
    'service.svc-appli-2.desc': 'Diagnose and fix drum, motor, and electrical issues',
    'service.srv_appliance_repair.name': 'RO Water Purifier & Appliance Repair',
    'service.srv_appliance_repair.desc': 'Water purifier filter replacement, washing machine, geyser, microwave repairs',

    'service.svc-carp-1.name': 'Door / Window Repair',
    'service.svc-carp-1.desc': 'Fix hinges, locks, handles, wood swelling and alignment',
    'service.svc-paint-1.name': 'Room Painting (Per Room)',
    'service.svc-paint-1.desc': 'Premium interior paint, wall prep, two coats, clean finish',

    'bookings.title': 'My Bookings',
    'bookings.active': 'Active Bookings',
    'bookings.history': 'History',
    'bookings.in_pool': 'In Public Dispatch Pool',
    'bookings.finding_tech': 'Finding Verified Professional...',
    'bookings.pool_desc': 'Your request is active in the Sagara verified partner pool. Any approved technician can accept it.',
    'bookings.assigned_tech': 'Assigned Technician',
    'bookings.call_tech': 'Call Technician',
    'bookings.doorstep_otp': 'Doorstep Verification OTP',
    'bookings.otp_desc': 'Share this 4-digit code with your technician upon arrival to verify physical presence and start work.',
    'bookings.cancel': 'Cancel Booking',
    'bookings.paid': 'Paid',
    'bookings.payment_due': 'Payment Due',
    'bookings.pay_online': 'Pay Online (Razorpay)',

    'status.pending': 'Request Placed',
    'status.accepted': 'Technician Assigned',
    'status.en_route': 'Technician En Route',
    'status.in_progress': 'Work In Progress',
    'status.completed': 'Completed',
    'status.cancelled': 'Cancelled',

    'technician.workbench_title': 'Technician Pro Workbench',
    'technician.accepting_orders': 'Accepting Orders',
    'technician.go_offline': 'Go Offline',
    'technician.go_online': 'Go Online',
    'technician.active_job_desk': 'Active Job Desk',
    'technician.available_requests': 'Available Customer Requests',
    'technician.payout': 'Payout',
    'technician.accept_job': 'Accept Job Offer',
    'technician.finish_active_first': 'Finish Active Job First',
    'technician.my_jobs': 'My Accepted Jobs',
    'technician.current_active_job': 'Current Active Job',
    'technician.booking_id': 'Booking ID',
    'technician.skill_match': 'Skill Match',
    'technician.dismiss': 'Dismiss',
    'technician.verify_otp': 'Verify Customer OTP & Start Job',
    'technician.enter_otp': 'Enter 4-Digit OTP',
    'technician.suspended_heading': 'Account Suspended — All Active Jobs Returned to Public Pool',
    'technician.suspended_body': 'Because your KYC verification was rejected by a KYC Tech Specialist, you have been automatically unassigned from all active customer bookings. Each job offer has been returned to the public dispatch pool for other verified technicians to accept.',
    'technician.kyc_rejected_alert': 'KYC Rejected: Biometric Face Recapture Required',

    'common.loading': 'Loading...',
    'common.submit': 'Submit',
    'common.close': 'Close',
    'common.confirm': 'Confirm',
    'common.onwards': 'onwards',
    'common.book_now': 'Book Now'
  },
  kn: {
    'app.name': 'ಸಾಲ್ವೊ (SOLVO)',
    'app.tagline': 'ಮನೆ ಬಾಗಿಲಿಗೆ ತ್ವರಿತ ಸೇವೆಗಳು ಮತ್ತು ರಿಪೇರಿ',
    'nav.home': 'ಮುಖಪುಟ',
    'nav.services': 'ಸೇವೆಗಳು',
    'nav.bookings': 'ಬುಕಿಂಗ್‌ಗಳು',
    'nav.profile': 'ಪ್ರೊಫೈಲ್',
    'nav.job_desk': 'ಕೆಲಸದ ಡೆಸ್ಕ್',
    'nav.kyc': 'ಕೆವೈಸಿ (KYC)',
    'nav.technician': 'ಟೆಕ್ನಿಷಿಯನ್ ಪೋರ್ಟಲ್',
    'header.join_technician': 'ಟೆಕ್ನಿಷಿಯನ್ ಆಗಿ ಸೇರಿ',
    'header.customer_portal': 'ಗ್ರಾಹಕರ ಪೋರ್ಟಲ್',
    'header.technician_pro': 'ಟೆಕ್ನಿಷಿಯನ್ ಪ್ರೊ',
    'header.my_profile': 'ನನ್ನ ಪ್ರೊಫೈಲ್',
    'header.sign_out': 'ಲಾಗ್ ಔಟ್',
    'header.detecting_location': 'ಸ್ಥಳ ಪತ್ತೆ ಮಾಡಲಾಗುತ್ತಿದೆ…',
    'header.select_language': 'ಭಾಷೆ',

    'home.browse_services': 'ಸೇವೆಗಳನ್ನು ವೀಕ್ಷಿಸಿ',
    'home.services_across_categories': '6 ವಿಭಾಗಗಳಲ್ಲಿ 50+ ಸೇವೆಗಳು ಲಭ್ಯವಿದೆ',
    'home.view_all': 'ಎಲ್ಲವನ್ನೂ ವೀಕ್ಷಿಸಿ',
    'home.popular_services': 'ಈಗ ಜನಪ್ರಿಯವಾಗಿರುವ ಸೇವೆಗಳು',
    'home.most_booked': 'ಈ ವಾರ ಸಾಗರದಲ್ಲಿ ಹೆಚ್ಚು ಬುಕ್ ಮಾಡಲಾದ ಸೇವೆಗಳು',
    'home.see_all': 'ಎಲ್ಲವನ್ನೂ ನೋಡಿ',
    'home.hero_title': 'ವಿಶ್ವಾಸಾರ್ಹ ಗೃಹ ಸೇವೆಗಳು,',
    'home.hero_title_accent': 'ನಿಮ್ಮ ಬಾಗಿಲಲ್ಲೇ',
    'home.hero_subtitle': 'ಪ್ಲಂಬರ್‌ಗಳು, ಎಲೆಕ್ಟ್ರಿಷಿಯನ್‌ಗಳು, ಕ್ಲೀನರ್‌ಗಳನ್ನು ಬುಕ್ ಮಾಡಿ — 60 ನಿಮಿಷಗಳಲ್ಲಿ ಪರಿಶೀಲಿಸಿದ ವೃತ್ತಿಪರರು ನಿಮ್ಮ ಮನೆಗೆ.',
    'home.serving_badge': 'ವಿಶ್ವಾಸಾರ್ಹ ಹೈಪರ್‌ಲೋಕಲ್ ಗೃಹ ಸೇವಾ ವೇದಿಕೆ',
    'home.search_placeholder': 'ಪ್ಲಂಬರ್, ಎಲೆಕ್ಟ್ರಿಷಿಯನ್, ಕ್ಲೀನಿಂಗ್ ಹುಡುಕಿ…',
    'home.search_button': 'ಹುಡುಕಿ',
    'home.popular_tags': 'ಜನಪ್ರಿಯ: ಎಸಿ ಸರ್ವಿಸ್ · ನಲ್ಲಿ ರಿಪೇರಿ · ಮನೆ ಸ್ವಚ್ಛತೆ · ಫ್ಯಾನ್ ಅಳವಡಿಕೆ',

    'services.all_services': 'ಎಲ್ಲಾ ಸೇವೆಗಳು',
    'services.services_available': 'ನಿಮ್ಮ ಹತ್ತಿರ ಲಭ್ಯವಿರುವ ಸೇವೆಗಳು',
    'services.all': 'ಎಲ್ಲವೂ',
    'services.search_placeholder': 'ಸೇವೆಗಳನ್ನು ಹುಡುಕಿ…',

    'category.cat-plumb': 'ಪ್ಲಂಬಿಂಗ್ (ಕೊಳಾಯಿ ಕೆಲಸ)',
    'category.cat-elec': 'ಎಲೆಕ್ಟ್ರಿಷಿಯನ್ (ವಿದ್ಯುತ್)',
    'category.cat-clean': 'ಮನೆ ಸ್ವಚ್ಛತೆ (ಕ್ಲೀನಿಂಗ್)',
    'category.cat-appli': 'ಉಪಕರಣ ದುರಸ್ತಿ',
    'category.cat-motor': 'ಮೋಟಾರ್ ಸರ್ವೀಸ್ (ಕಾರ್ & ಬೈಕ್ ವಾಶ್)',
    'category.cat-laundry': 'ಲಾಂಡ್ರಿ & ಡ್ರೈ ಕ್ಲೀನಿಂಗ್',
    'category.cat-carp': 'ಬಡಗಿ ಕೆಲಸ (ಕಾರ್ಪೆಂಟ್ರಿ)',
    'category.cat-paint': 'ಪೇಂಟಿಂಗ್ (ಬಣ್ಣ ಬಳಿಯುವುದು)',

    'trade.Plumbing & Sanitary': 'ಪ್ಲಂಬಿಂಗ್ ಮತ್ತು ಸ್ಯಾನಿಟರಿ',
    'trade.Electrical & Wiring': 'ವಿದ್ಯುತ್ ಮತ್ತು ವೈರಿಂಗ್',
    'trade.Deep Home Cleaning': 'ಸಂಪೂರ್ಣ ಮನೆ ಸ್ವಚ್ಛತೆ',
    'trade.AC & Appliance Service': 'ಎಸಿ & ಗೃಹೋಪಯೋಗಿ ಉಪಕರಣ ಸೇವೆ',
    'trade.Automobile & Motor Care': 'ಆಟೋಮೊಬೈಲ್ ಮತ್ತು ಮೋಟಾರ್ ಕೇರ್',
    'trade.Laundry & Dry Cleaning': 'ಲಾಂಡ್ರಿ ಮತ್ತು ಡ್ರೈ ಕ್ಲೀನಿಂಗ್',
    'trade.Carpentry & Furniture': 'ಕಾರ್ಪೆಂಟ್ರಿ ಮತ್ತು ಪೀಠೋಪಕರಣ',
    'trade.Interior Painting': 'ಆಂತರಿಕ ಪೇಂಟಿಂಗ್',
    'trade.General Home Services': 'ಸಾಮಾನ್ಯ ಗೃಹ ಸೇವೆಗಳು',

    'service.svc-motor-1.name': 'ಕಾರ್ ಫೋಮ್ & ಅಂಡರ್‌ಬಾಡಿ ವಾಶ್ (Car Wash)',
    'service.svc-motor-1.desc': 'ಹೈ-ಪ್ರೆಶರ್ ಅಂಡರ್‌ಬಾಡಿ ವಾಟರ್ ವಾಶ್, ಆಕ್ಟಿವ್ ಸ್ನೋ ಫೋಮ್ ಬಾತ್, ಟೈರ್ ಡ್ರೆಸ್ಸಿಂಗ್ ಮತ್ತು ವ್ಯಾಕ್ಯೂಮ್',
    'service.svc-motor-2.name': 'ಬೈಕ್ ಡೀಪ್ ಫೋಮ್ ವಾಶ್ & ಚೈನ್ ಲ್ಯೂಬ್ (Bike Wash)',
    'service.svc-motor-2.desc': 'ಸಂಪೂರ್ಣ ಕೊಳೆ ತೆಗೆಯುವಿಕೆ, ಫೋಮ್ ವಾಶ್, ಏರ್ ಬ್ಲೋವರ್ ಮತ್ತು ಮೊಟುಲ್ ಚೈನ್ ಲ್ಯೂಬ್ರಿಕೇಷನ್',
    'service.svc-motor-3.name': 'ಕಾರ್ ಇಂಟೀರಿಯರ್ & ಎಸಿ ಡೀಟೇಲಿಂಗ್',
    'service.svc-motor-3.desc': 'ಆಸನಗಳ ಫೋಮ್ ಕ್ಲೀನಿಂಗ್, ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ ಪಾಲಿಶ್, ರೂಫ್ ಲೈನಿಂಗ್ ಸ್ಟೀಮ್ ಮತ್ತು ಎಸಿ ಡಕ್ಟ್ ಶುದ್ಧೀಕರಣ',
    'service.svc-motor-4.name': 'ದ್ವಿಚಕ್ರ ವಾಹನ ಸರ್ವೀಸ್ & ಆಯಿಲ್ ಚೇಂಜ್',
    'service.svc-motor-4.desc': 'ಪ್ರೀಮಿಯಂ 4T ಎಂಜಿನ್ ಆಯಿಲ್ ಬದಲಾವಣೆ, ಸ್ಪಾರ್ಕ್ ಪ್ಲಗ್ ಕ್ಲೀನ್, ಬ್ರೇಕ್ ತಪಾಸಣೆ ಮತ್ತು 18-ಪಾಯಿಂಟ್ ಚೆಕಪ್',

    'service.svc-laund-1.name': 'ವಾಶ್ & ಫೋಲ್ಡ್ (ದೈನಂದಿನ ಬಟ್ಟೆ — ಕೆಜಿಗೆ)',
    'service.svc-laund-1.desc': 'ನೈರ್ಮಲ್ಯ ಡಿಟರ್ಜೆಂಟ್ ವಾಶ್, ಫ್ಯಾಬ್ರಿಕ್ ಸಾಫ್ಟನರ್ ಮತ್ತು ಅಚ್ಚುಕಟ್ಟಾದ ಫೋಲ್ಡ್ (ಕನಿಷ್ಠ 3 ಕೆಜಿ)',
    'service.svc-laund-2.name': 'ವಾಶ್ & ಇಂಡಸ್ಟ್ರಿಯಲ್ ಸ್ಟೀಮ್ ಐರನ್ (ಕೆಜಿಗೆ)',
    'service.svc-laund-2.desc': 'ಆಳವಾದ ವಾಶ್ ನಂತರ ಹ್ಯಾಂಗರ್‌ಗಳ ಮೇಲೆ ಸುಕ್ಕು-ಮುಕ್ತ ಪ್ರೀಮಿಯಂ ಸ್ಟೀಮ್ ಪ್ರೆಸ್ಸಿಂಗ್',
    'service.svc-laund-3.name': 'ಪ್ರೀಮಿಯಂ ಸೂಟ್, ಬ್ಲೇಜರ್ & ರೇಷ್ಮೆ ಸೀರೆ ಡ್ರೈ ಕ್ಲೀನಿಂಗ್',
    'service.svc-laund-3.desc': 'ರೇಷ್ಮೆ ಸೀರೆಗಳು, ಬ್ಲೇಜರ್‌ಗಳು ಮತ್ತು ಉಲ್ಲನ್ ಬಟ್ಟೆಗಳಿಗೆ ಇಕೋ-ಸಾಲ್ವೆಂಟ್ ಜೆಂಟಲ್ ಡ್ರೈ ಕ್ಲೀನ್',
    'service.svc-laund-4.name': 'ಸ್ನೀಕರ್ ಸ್ಪಾ & ಶೂ ಲಾಂಡ್ರಿ (Shoe Spa)',
    'service.svc-laund-4.desc': 'ಶೂ ಮಿಡ್‌ಸೋಲ್ ವೈಟ್ನಿಂಗ್, ಕಲೆ ನಿವಾರಣೆ, ಆಂಟಿಬ್ಯಾಕ್ಟೀರಿಯಲ್ ಡಿಯೋಡರೈಸರ್ & ಲೇಸ್ ಕ್ಲೀನಿಂಗ್',

    'service.svc-plumb-1.name': 'ನಲ್ಲಿ / ಟ್ಯಾಪ್ ದುರಸ್ತಿ (Tap Repair)',
    'service.svc-plumb-1.desc': 'ಸೋರುತ್ತಿರುವ ನಲ್ಲಿ ದುರಸ್ತಿ, ವಾಷರ್ ಬದಲಿ, ಹೊಸ ನಲ್ಲಿ ಅಳವಡಿಕೆ',
    'service.srv_plumber_general.name': 'ಪ್ಲಂಬರ್ — ಸಾಮಾನ್ಯ ಪ್ಲಂಬಿಂಗ್ & ಸೋರಿಕೆ ದುರಸ್ತಿ',
    'service.srv_plumber_general.desc': 'ಮನೆ ಬಾಗಿಲಲ್ಲೇ ಪ್ಲಂಬಿಂಗ್, ಟ್ಯಾಪ್ ರಿಪೇರಿ, ಪೈಪ್ ಸೋರಿಕೆ ಸರಿಪಡಿಸುವಿಕೆ ಮತ್ತು ನೀರಿನ ಒತ್ತಡ ಮರುಸ್ಥಾಪನೆ',
    'service.svc-plumb-2.name': 'ಪೈಪ್ ಸೋರಿಕೆ ಸರಿಪಡಿಸುವಿಕೆ (Pipe Leak Fix)',
    'service.svc-plumb-2.desc': 'ಪೈಪ್ ಸೋರಿಕೆಯನ್ನು ಪತ್ತೆಹಚ್ಚಿ ಸರಿಪಡಿಸುವುದು, ಹಾನಿಗೊಳಗಾದ ಪೈಪ್ ಬದಲಿ',
    'service.svc-plumb-3.name': 'ಬಾತ್‌ರೂಮ್ ಫಿಟ್ಟಿಂಗ್ಸ್ (Bathroom Fitting)',
    'service.svc-plumb-3.desc': 'ಶವರ್ ಹೆಡ್‌ಗಳು, ಸ್ನಾನಗೃಹ ಪರಿಕರಗಳು, ಫ್ಲಶ್ ಟ್ಯಾಂಕ್‌ಗಳ ಅಳವಡಿಕೆ',

    'service.svc-elec-1.name': 'ಸ್ವಿಚ್ & ಸಾಕೆಟ್ ದುರಸ್ತಿ (Switch & Socket)',
    'service.svc-elec-1.desc': 'ಮುರಿದ ಸ್ವಿಚ್‌ಗಳ ಬದಲಿ, ಹೊಸ ವಿದ್ಯುತ್ ಸಾಕೆಟ್‌ಗಳ ಅಳವಡಿಕೆ',
    'service.srv_electrician_general.name': 'ಎಲೆಕ್ಟ್ರಿಷಿಯನ್ — ಸಾಮಾನ್ಯ ರಿಪೇರಿ & ಫ್ಯಾನ್ ಸರ್ವಿಸಿಂಗ್',
    'service.srv_electrician_general.desc': 'ಸೀಲಿಂಗ್ ಫ್ಯಾನ್ ಕೆಪಾಸಿಟರ್ ರಿಪೇರಿ, ಎಂಸಿಬಿ ದೋಷ ನಿವಾರಣೆ, ಸ್ವಿಚ್‌ಬೋರ್ಡ್ ದುರಸ್ತಿ, ಶಾರ್ಟ್ ಸರ್ಕ್ಯೂಟ್ ಸರಿಪಡಿಸುವಿಕೆ',
    'service.svc-elec-2.name': 'ಫ್ಯಾನ್ ಅಳವಡಿಕೆ (Fan Installation)',
    'service.svc-elec-2.desc': 'ವೈರಿಂಗ್ ಮತ್ತು ಬ್ಯಾಲೆನ್ಸಿಂಗ್‌ನೊಂದಿಗೆ ಸೀಲಿಂಗ್ / ಗೋಡೆ ಫ್ಯಾನ್ ಅಳವಡಿಕೆ',
    'service.svc-elec-3.name': 'ಎಂಸಿಬಿ / ವೈರಿಂಗ್ ದೋಷ (MCB / Wiring Fault)',
    'service.svc-elec-3.desc': 'ಶಾರ್ಟ್ ಸರ್ಕ್ಯೂಟ್ ತಪಾಸಣೆ, ಎಂಸಿಬಿ ಬದಲಿ, ವೈರಿಂಗ್ ರಿಪೇರಿ',

    'service.svc-clean-1.name': 'ಸಂಪೂರ್ಣ ಮನೆ ಸ್ವಚ್ಛತೆ (Deep Home Cleaning)',
    'service.svc-clean-1.desc': 'ಪರಿಸರ ಸ್ನೇಹಿ ಉತ್ಪನ್ನಗಳೊಂದಿಗೆ ಸಂಪೂರ್ಣ 2-3 BHK ಮನೆ ಸ್ವಚ್ಛತೆ',
    'service.srv_cleaning_deep.name': 'ಆಳವಾದ ಮನೆ ಸ್ವಚ್ಛತೆ & ಬಾತ್‌ರೂಮ್ ಡಿಸ್ಕೇಲಿಂಗ್',
    'service.srv_cleaning_deep.desc': 'ನೆಲದ ಟೈಲ್ಸ್ ಸ್ಕ್ರಬ್ಬಿಂಗ್, ಬಾತ್‌ರೂಮ್ ಕಲೆಗಳ ನಿವಾರಣೆ, ಅಡುಗೆಮನೆಯ ಜಿಡ್ಡು ತೆಗೆಯುವುದು',
    'service.svc-clean-2.name': 'ಅಡುಗೆಮನೆ ಆಳವಾದ ಸ್ವಚ್ಛತೆ (Kitchen Deep Clean)',
    'service.svc-clean-2.desc': 'ಚಿಮಣಿ, ಕೌಂಟರ್‌ಟಾಪ್, ಟೈಲ್ಸ್, ಉಪಕರಣಗಳ ಸಂಪೂರ್ಣ ಅಡುಗೆಮನೆ ಸ್ವಚ್ಛತೆ',

    'service.svc-appli-1.name': 'ಎಸಿ ಸರ್ವಿಸ್ & ಗ್ಯಾಸ್ ಮರುಪೂರಣ (AC Service)',
    'service.svc-appli-1.desc': 'ಎಸಿ ಕ್ಲೀನಿಂಗ್, ಫಿಲ್ಟರ್ ವಾಶ್, ಗ್ಯಾಸ್ ಟಾಪ್-ಅಪ್, ಕೂಲಿಂಗ್ ತಪಾಸಣೆ',
    'service.srv_ac_repair.name': 'ಎಸಿ ಸರ್ವಿಸಿಂಗ್, ಡೀಪ್ ಕ್ಲೀನಿಂಗ್ & ರಿಪೇರಿ',
    'service.srv_ac_repair.desc': 'ಏರ್ ಕಂಡಿಷನರ್ ಕೂಲಿಂಗ್ ದುರಸ್ತಿ, ಶೀತಕ ಸೋರಿಕೆ ಪರಿಶೀಲನೆ, ಕೆಪಾಸಿಟರ್ ಬದಲಿ',
    'service.svc-appli-2.name': 'ವಾಷಿಂಗ್ ಮಷಿನ್ ರಿಪೇರಿ (Washing Machine)',
    'service.svc-appli-2.desc': 'ಡ್ರಮ್, ಮೋಟಾರ್ ಮತ್ತು ವಿದ್ಯುತ್ ಸಮಸ್ಯೆಗಳ ತಪಾಸಣೆ ಮತ್ತು ದುರಸ್ತಿ',
    'service.srv_appliance_repair.name': 'ಆರ್‌ಒ ವಾಟರ್ ಪ್ಯೂರಿಫೈಯರ್ & ಉಪಕರಣ ದುರಸ್ತಿ',
    'service.srv_appliance_repair.desc': 'ವಾಟರ್ ಪ್ಯೂರಿಫೈಯರ್ ಫಿಲ್ಟರ್ ಬದಲಿ, ಗೀಸರ್, ಮೈಕ್ರೋವೇವ್ ರಿಪೇರಿ',

    'service.svc-carp-1.name': 'ಬಾಗಿಲು / ಕಿಟಕಿ ದುರಸ್ತಿ (Door / Window Repair)',
    'service.svc-carp-1.desc': 'ಹಿಂಜ್, ಲಾಕ್, ಹ್ಯಾಂಡಲ್, ಮರದ ಉಬ್ಬುವಿಕೆ ಮತ್ತು ಜೋಡಣೆ ಸರಿಪಡಿಸುವಿಕೆ',
    'service.svc-paint-1.name': 'ಕೋಣೆ ಪೇಂಟಿಂಗ್ (Room Painting)',
    'service.svc-paint-1.desc': 'ಪ್ರೀಮಿಯಂ ಆಂತರಿಕ ಪೇಂಟ್, ವಾಲ್ ಪ್ರೆಪ್, ಎರಡು ಕೋಟ್, ಅತ್ಯುತ್ತಮ ಫಿನಿಶ್',

    'bookings.title': 'ನನ್ನ ಬುಕಿಂಗ್‌ಗಳು',
    'bookings.active': 'ಸಕ್ರಿಯ ಬುಕಿಂಗ್‌ಗಳು',
    'bookings.history': 'ಹಿಂದಿನ ಇತಿಹಾಸ',
    'bookings.in_pool': 'ಸಾರ್ವಜನಿಕ ಡಿಸ್ಪ್ಯಾಚ್ ಪೂಲ್‌ನಲ್ಲಿದೆ',
    'bookings.finding_tech': 'ಪರಿಶೀಲಿಸಿದ ವೃತ್ತಿಪರರನ್ನು ಹುಡುಕಲಾಗುತ್ತಿದೆ...',
    'bookings.pool_desc': 'ನಿಮ್ಮ ವಿನಂತಿಯು ಸಾಗರ ಪರಿಶೀಲಿತ ಪಾಲುದಾರ ಪೂಲ್‌ನಲ್ಲಿ ಸಕ್ರಿಯವಾಗಿದೆ. ಯಾವುದೇ ಅನುಮೋದಿತ ಟೆಕ್ನಿಷಿಯನ್ ಇದನ್ನು ಸ್ವೀಕರಿಸಬಹುದು.',
    'bookings.assigned_tech': 'ನಿಯೋಜಿತ ಟೆಕ್ನಿಷಿಯನ್',
    'bookings.call_tech': 'ಟೆಕ್ನಿಷಿಯನ್‌ಗೆ ಕರೆ ಮಾಡಿ',
    'bookings.doorstep_otp': 'ಡೋರ್‌ಸ್ಟೆಪ್ ಪರಿಶೀಲನೆ OTP',
    'bookings.otp_desc': 'ಟೆಕ್ನಿಷಿಯನ್ ನಿಮ್ಮ ಮನೆಗೆ ತಲುಪಿದ ನಂತರ ಭೌತಿಕ ಉಪಸ್ಥಿತಿಯನ್ನು ದೃಢೀಕರಿಸಿ ಕೆಲಸ ಪ್ರಾರಂಭಿಸಲು ಈ 4-ಅಂಕಿಯ ಕೋಡ್ ಅನ್ನು ಹಂಚಿಕೊಳ್ಳಿ.',
    'bookings.cancel': 'ಬುಕಿಂಗ್ ರದ್ದುಮಾಡಿ',
    'bookings.paid': 'ಪಾವತಿಸಲಾಗಿದೆ',
    'bookings.payment_due': 'ಪಾವತಿ ಬಾಕಿ',
    'bookings.pay_online': 'ಆನ್‌ಲೈನ್ ಪಾವತಿ (Razorpay)',

    'status.pending': 'ವಿನಂತಿ ಸಲ್ಲಿಸಲಾಗಿದೆ',
    'status.accepted': 'ಟೆಕ್ನಿಷಿಯನ್ ನಿಯೋಜಿಸಲಾಗಿದೆ',
    'status.en_route': 'ಟೆಕ್ನಿಷಿಯನ್ ದಾರಿಯಲ್ಲಿದ್ದಾರೆ',
    'status.in_progress': 'ಕೆಲಸ ಪ್ರಗತಿಯಲ್ಲಿದೆ',
    'status.completed': 'ಪೂರ್ಣಗೊಂಡಿದೆ',
    'status.cancelled': 'ರದ್ದುಗೊಳಿಸಲಾಗಿದೆ',

    'technician.workbench_title': 'ಟೆಕ್ನಿಷಿಯನ್ ಪ್ರೊ ವರ್ಕ್‌ಬೆಂಚ್',
    'technician.accepting_orders': 'ಆರ್ಡರ್‌ಗಳನ್ನು ಸ್ವೀಕರಿಸಲಾಗುತ್ತಿದೆ',
    'technician.go_offline': 'ಆಫ್‌ಲೈನ್‌ಗೆ ಹೋಗಿ',
    'technician.go_online': 'ಆನ್‌ಲೈನ್‌ಗೆ ಹೋಗಿ',
    'technician.active_job_desk': 'ಸಕ್ರಿಯ ಕೆಲಸದ ಡೆಸ್ಕ್',
    'technician.available_requests': 'ಲಭ್ಯವಿರುವ ಗ್ರಾಹಕರ ವಿನಂತಿಗಳು',
    'technician.payout': 'ಗಳಿಕೆ / ಪಾವತಿ',
    'technician.accept_job': 'ಕೆಲಸದ ಆಫರ್ ಸ್ವೀಕರಿಸಿ',
    'technician.finish_active_first': 'ಮೊದಲು ಸಕ್ರಿಯ ಕೆಲಸ ಮುಗಿಸಿ',
    'technician.my_jobs': 'ನನ್ನ ಒಪ್ಪಿಕೊಂಡ ಕೆಲಸಗಳು',
    'technician.current_active_job': 'ಪ್ರಸ್ತುತ ಸಕ್ರಿಯ ಕೆಲಸ',
    'technician.booking_id': 'ಬುಕಿಂಗ್ ಐಡಿ',
    'technician.skill_match': 'ಕೌಶಲ್ಯ ಹೊಂದಾಣಿಕೆ',
    'technician.dismiss': 'ತಿರಸ್ಕರಿಸಿ',
    'technician.verify_otp': 'ಗ್ರಾಹಕರ OTP ಪರಿಶೀಲಿಸಿ & ಕೆಲಸ ಆರಂಭಿಸಿ',
    'technician.enter_otp': '4-ಅಂಕಿಯ OTP ನಮೂದಿಸಿ',
    'technician.suspended_heading': 'ಖಾತೆ ಅಮಾನತು — ಎಲ್ಲಾ ಸಕ್ರಿಯ ಕೆಲಸಗಳನ್ನು ಸಾರ್ವಜನಿಕ ಪೂಲ್‌ಗೆ ಹಿಂತಿರುಗಿಸಲಾಗಿದೆ',
    'technician.suspended_body': 'ನಿಮ್ಮ KYC ಪರಿಶೀಲನೆಯನ್ನು KYC ತಜ್ಞರು ತಿರಸ್ಕರಿಸಿದ ಕಾರಣ, ಎಲ್ಲಾ ಸಕ್ರಿಯ ಗ್ರಾಹಕ ಬುಕಿಂಗ್‌ಗಳಿಂದ ನಿಮ್ಮನ್ನು ಸ್ವಯಂಚಾಲಿತವಾಗಿ ತೆಗೆದುಹಾಕಲಾಗಿದೆ. ಇತರ ಪರಿಶೀಲಿತ ಟೆಕ್ನಿಷಿಯನ್‌ಗಳು ಇವುಗಳನ್ನು ಸ್ವೀಕರಿಸಬಹುದು.',
    'technician.kyc_rejected_alert': 'KYC ತಿರಸ್ಕರಿಸಲಾಗಿದೆ: ಬಯೋಮೆಟ್ರಿಕ್ ಮುಖ ಮರು-ಚಿತ್ರೀಕರಣ ಅಗತ್ಯವಿದೆ',

    'common.loading': 'ಲೋಡ್ ಆಗುತ್ತಿದೆ...',
    'common.submit': 'ಸಲ್ಲಿಸಿ',
    'common.close': 'ಮುಚ್ಚಿ',
    'common.confirm': 'ದೃಢೀಕರಿಸಿ',
    'common.onwards': 'ಇಂದ ಆರಂಭ',
    'common.book_now': 'ಈಗಲೇ ಬುಕ್ ಮಾಡಿ'
  },
  hi: {
    'app.name': 'सॉल्वो (SOLVO)',
    'app.tagline': 'डोरस्टेप होम सर्विसेज और रिपेयर',
    'nav.home': 'होम',
    'nav.services': 'सेवाएं',
    'nav.bookings': 'बुकिंग्स',
    'nav.profile': 'प्रोफ़ाइल',
    'nav.job_desk': 'जॉब डेस्क',
    'nav.kyc': 'केवाईसी (KYC)',
    'nav.technician': 'तकनीशियन पोर्टल',
    'header.join_technician': 'तकनीशियन बनें',
    'header.customer_portal': 'ग्राहक पोर्टल',
    'header.technician_pro': 'तकनीशियन प्रो',
    'header.my_profile': 'मेरी प्रोफ़ाइल',
    'header.sign_out': 'लॉग आउट',
    'header.detecting_location': 'स्थान का पता लगाया जा रहा है…',
    'header.select_language': 'भाषा',

    'home.browse_services': 'सेवाएं देखें',
    'home.services_across_categories': '6 श्रेणियों में 50+ सेवाएं उपलब्ध',
    'home.view_all': 'सभी देखें',
    'home.popular_services': 'अभी लोकप्रिय सेवाएं',
    'home.most_booked': 'इस सप्ताह सागरा में सबसे अधिक बुक की गई',
    'home.see_all': 'सभी देखें',
    'home.hero_title': 'विश्वसनीय गृह सेवाएं,',
    'home.hero_title_accent': 'मांग पर',
    'home.hero_subtitle': 'प्लंबर, इलेक्ट्रीशियन, क्लीनर बुक करें — 60 मिनट में सत्यापित पेशेवर आपके दरवाजे पर।',
    'home.serving_badge': 'विश्वसनीय हाइपरलोकल होम सर्विसेज प्लेटफॉर्म',
    'home.search_placeholder': 'प्लंबर, इलेक्ट्रीशियन, सफाई खोजें…',
    'home.search_button': 'खोजें',

    'services.all_services': 'सभी सेवाएं',
    'services.services_available': 'आपके पास उपलब्ध सेवाएं',
    'services.all': 'सभी',
    'services.search_placeholder': 'सेवाएं खोजें…',

    'category.cat-plumb': 'प्लंबिंग (नलसाजी)',
    'category.cat-elec': 'इलेक्ट्रीशियन (बिजली)',
    'category.cat-clean': 'सफाई (क्लीनिंग)',
    'category.cat-appli': 'उपकरण मरम्मत',
    'category.cat-carp': 'बढ़ईगीरी (कारपेंटर)',
    'category.cat-paint': 'पेंटिंग (रंग-रोगन)',

    'trade.Plumbing & Sanitary': 'प्लंबिंग और सैनिटरी',
    'trade.Electrical & Wiring': 'विद्युत और वायरिंग',
    'trade.Deep Home Cleaning': 'गहरी घर की सफाई',
    'trade.AC & Appliance Service': 'एसी और उपकरण सेवा',
    'trade.Carpentry & Furniture': 'बढ़ईगीरी और फर्नीचर',
    'trade.Interior Painting': 'आंतरिक पेंटिंग',
    'trade.General Home Services': 'सामान्य गृह सेवाएं',

    'service.svc-plumb-1.name': 'नल / फव्वारा मरम्मत (Tap Repair)',
    'service.svc-plumb-1.desc': 'लीक नल ठीक करें, वॉशर बदलें, नए नल लगाएं',
    'service.srv_plumber_general.name': 'प्लंबर — सामान्य प्लंबिंग और रिसाव मरम्मत',
    'service.srv_plumber_general.desc': 'घर पर प्लंबिंग, नल मरम्मत, पाइप रिसाव सुधार और जल दबाव बहाली',
    'service.svc-plumb-2.name': 'पाइप रिसाव समाधान (Pipe Leak Fix)',
    'service.svc-plumb-2.desc': 'पाइप रिसाव का पता लगाएं और सील करें, क्षतिग्रस्त पाइप बदलें',
    'service.svc-plumb-3.name': 'बाथरूम फिटिंग (Bathroom Fitting)',
    'service.svc-plumb-3.desc': 'शावरहेड, बाथरूम सहायक उपकरण, फ्लश टैंक लगाएं',

    'service.svc-elec-1.name': 'स्विच और सॉकेट मरम्मत (Switch & Socket)',
    'service.svc-elec-1.desc': 'टूटे हुए स्विच बदलें, नए बिजली सॉकेट लगाएं',
    'service.srv_electrician_general.name': 'इलेक्ट्रीशियन — सामान्य मरम्मत और पंखा सर्विसिंग',
    'service.srv_electrician_general.desc': 'सीलिंग फैन कैपेसिटर, एमसीबी समस्या निवारण, स्विचबोर्ड मरम्मत, शॉर्ट सर्किट सुधार',
    'service.svc-elec-2.name': 'पंखा इंस्टॉलेशन (Fan Installation)',
    'service.svc-elec-2.desc': 'पूरी वायरिंग और बैलेंसिंग के साथ पंखा लगाएं',
    'service.svc-elec-3.name': 'एमसीबी / वायरिंग खराबी (MCB / Wiring Fault)',
    'service.svc-elec-3.desc': 'शॉर्ट सर्किट निदान, एमसीबी बदलना, वायरिंग ठीक करना',

    'service.svc-clean-1.name': 'गहरी घर की सफाई (Deep Home Cleaning)',
    'service.svc-clean-1.desc': 'पर्यावरण-अनुकूल उत्पादों के साथ व्यापक 2-3 बीएचके सफाई',
    'service.srv_cleaning_deep.name': 'गहरी घर सफाई और बाथरूम स्केलिंग',
    'service.srv_cleaning_deep.desc': 'फर्श टाइल्स स्क्रबिंग, बाथरूम स्केल हटाना, रसोई की चिकनाई हटाना',
    'service.svc-clean-2.name': 'रसोई की गहरी सफाई (Kitchen Deep Clean)',
    'service.svc-clean-2.desc': 'चिमनी, काउंटरटॉप, टाइल्स, उपकरण — पूरी रसोई सफाई',

    'service.svc-appli-1.name': 'एसी सर्विस और गैस रिफिल (AC Service)',
    'service.svc-appli-1.desc': 'एसी सफाई, फिल्टर वॉश, गैस टॉप-अप, कूलिंग जांच',
    'service.srv_ac_repair.name': 'एसी सर्विसिंग, गहरी सफाई और मरम्मत',
    'service.srv_ac_repair.desc': 'एयर कंडीशनर कूलिंग मरम्मत, गैस रिसाव जांच, कैपेसिटर बदलना',
    'service.svc-appli-2.name': 'वाशिंग मशीन मरम्मत (Washing Machine)',
    'service.svc-appli-2.desc': 'ड्रम, मोटर और बिजली की समस्याओं का निदान और समाधान',
    'service.srv_appliance_repair.name': 'आरओ वाटर प्यूरीफायर और उपकरण मरम्मत',
    'service.srv_appliance_repair.desc': 'वाटर प्यूरीफायर फिल्टर बदलना, गीजर, माइक्रोवेव मरम्मत',

    'service.svc-carp-1.name': 'दरवाजा / खिड़की मरम्मत (Door / Window)',
    'service.svc-carp-1.desc': 'कब्जे, ताले, हैंडल और लकड़ी की सूजन संरेखण ठीक करें',
    'service.svc-paint-1.name': 'कमरा पेंटिंग (Room Painting)',
    'service.svc-paint-1.desc': 'प्रीमियम आंतरिक पेंट, वॉल प्रेप, दो कोट, बेहतरीन फिनिश',

    'bookings.title': 'मेरी बुकिंग्स',
    'bookings.active': 'सक्रिय बुकिंग्स',
    'bookings.history': 'इतिहास',
    'bookings.in_pool': 'सार्वजनिक प्रेषण पूल में',
    'bookings.finding_tech': 'सत्यापित पेशेवर खोजे जा रहे हैं...',
    'bookings.pool_desc': 'आपका अनुरोध सागरा सत्यापित पार्टनर पूल में सक्रिय है। कोई भी अनुमोदित तकनीशियन इसे स्वीकार कर सकता है।',
    'bookings.assigned_tech': 'असाइन किया गया तकनीशियन',
    'bookings.call_tech': 'तकनीशियन को कॉल करें',
    'bookings.doorstep_otp': 'डोरस्टेप सत्यापन ओटीपी',
    'bookings.otp_desc': 'काम शुरू करने और भौतिक उपस्थिति सत्यापित करने के लिए तकनीशियन के आने पर यह 4-अंकीय कोड साझा करें।',
    'bookings.cancel': 'बुकिंग रद्द करें',
    'bookings.paid': 'भुगतान किया गया',
    'bookings.payment_due': 'भुगतान शेष',
    'bookings.pay_online': 'ऑनलाइन भुगतान करें (Razorpay)',

    'status.pending': 'अनुरोध दर्ज किया गया',
    'status.accepted': 'तकनीशियन नियुक्त',
    'status.en_route': 'तकनीशियन रास्ते में है',
    'status.in_progress': 'कार्य प्रगति पर है',
    'status.completed': 'पूर्ण हुआ',
    'status.cancelled': 'रद्द हुआ',

    'technician.workbench_title': 'तकनीशियन प्रो कार्यक्षेत्र',
    'technician.accepting_orders': 'ऑर्डर स्वीकार किए जा रहे हैं',
    'technician.go_offline': 'ऑफ़लाइन जाएं',
    'technician.go_online': 'ऑनलाइन जाएं',
    'technician.active_job_desk': 'सक्रिय कार्य डेस्क',
    'technician.available_requests': 'उपलब्ध ग्राहक अनुरोध',
    'technician.payout': 'कमाई / भुगतान',
    'technician.accept_job': 'जॉब ऑफर स्वीकार करें',
    'technician.finish_active_first': 'पहले सक्रिय कार्य पूरा करें',
    'technician.my_jobs': 'मेरी स्वीकृत नौकरियां',
    'technician.current_active_job': 'वर्तमान सक्रिय कार्य',
    'technician.booking_id': 'बुकिंग आईडी',
    'technician.skill_match': 'कौशल मिलान',
    'technician.dismiss': 'खारिज करें',
    'technician.verify_otp': 'ग्राहक ओटीपी सत्यापित करें और काम शुरू करें',
    'technician.enter_otp': '4-अंकीय ओटीपी दर्ज करें',
    'technician.suspended_heading': 'खाता निलंबित — सभी सक्रिय कार्य सार्वजनिक पूल में वापस कर दिए गए',
    'technician.suspended_body': 'केवाईसी अस्वीकार होने के कारण, आपको सभी चल रही बुकिंग से हटा दिया गया है।',
    'technician.kyc_rejected_alert': 'केवाईसी अस्वीकृत: बायोमेट्रिक चेहरा पुनः कैप्चर आवश्यक',

    'common.loading': 'लोड हो रहा है...',
    'common.submit': 'जमा करें',
    'common.close': 'बंद करें',
    'common.confirm': 'पुष्टि करें',
    'common.onwards': 'से शुरू',
    'common.book_now': 'अभी बुक करें'
  },
  ta: {
    'app.name': 'சால்வோ (SOLVO)',
    'app.tagline': 'உடனடி வீட்டுச் சேவைகள் மற்றும் பழுதுபார்ப்பு',
    'nav.home': 'முகப்பு',
    'nav.services': 'சேவைகள்',
    'nav.bookings': 'முன்பதிவுகள்',
    'nav.profile': 'சுயவிவரம்',
    'nav.job_desk': 'வேலை மேசை',
    'nav.kyc': 'கேஒய்சி (KYC)',
    'nav.technician': 'தொழில்நுட்ப வல்லுநர் போர்டல்',
    'header.join_technician': 'தொழில்நுட்ப வல்லுநராக சேரவும்',
    'header.customer_portal': 'வாடிக்கையாளர் போர்டல்',
    'header.technician_pro': 'டெக்னீஷியன் ப்ரோ',
    'header.my_profile': 'என் சுயவிவரம்',
    'header.sign_out': 'வெளியேறு',
    'header.detecting_location': 'இடம் கண்டறியப்படுகிறது…',
    'header.select_language': 'மொழி',

    'home.browse_services': 'சேவைகளை உலாவுக',
    'home.services_across_categories': '6 பிரிவுகளில் 50+ சேவைகள்',
    'home.view_all': 'அனைத்தையும் காண்க',
    'home.popular_services': 'பிரபலமான சேவைகள்',
    'home.most_booked': 'இந்த வாரம் சாகராவில் அதிகம் முன்பதிவு செய்யப்பட்டது',
    'home.see_all': 'அனைத்தையும் காண்க',
    'home.hero_title': 'நம்பகமான வீட்டுச் சேவைகள்,',
    'home.hero_title_accent': 'உங்கள் வாசலில்',
    'home.hero_subtitle': 'பிளம்பர்கள், எலக்ட்ரீஷியன்கள், கிளீனர்களை முன்பதிவு செய்யுங்கள் — 60 நிமிடங்களில் சரிபார்க்கப்பட்ட நிபுணர்கள்.',
    'home.serving_badge': 'நம்பகமான ஹைப்பர்லோகல் வீட்டு சேவைகள் தளம்',
    'home.search_placeholder': 'பிளம்பர், எலக்ட்ரீஷியன், சுத்தம் தேடுங்கள்…',
    'home.search_button': 'தேடு',

    'services.all_services': 'அனைத்து சேவைகள்',
    'services.services_available': 'சேவைகள் கிடைக்கின்றன',
    'services.all': 'அனைத்தும்',
    'services.search_placeholder': 'சேவைகளைத் தேடுங்கள்…',

    'category.cat-plumb': 'பிளம்பிங் (குழாய் வேலை)',
    'category.cat-elec': 'எலக்ட்ரீஷியன் (மின் வேலை)',
    'category.cat-clean': 'சுத்தம் (கிளீனிங்)',
    'category.cat-appli': 'பயன்பாட்டு பழுது',
    'category.cat-carp': 'தச்சு வேலை (கார்பெண்டர்)',
    'category.cat-paint': 'வண்ணம் பூசுதல் (பெயிண்டிங்)',

    'trade.Plumbing & Sanitary': 'பிளம்பிங் மற்றும் சுகாதாரப் பணி',
    'trade.Electrical & Wiring': 'மின் மற்றும் வயரிங்',
    'trade.Deep Home Cleaning': 'ஆழமான வீட்டு சுத்தம்',
    'trade.AC & Appliance Service': 'ஏசி மற்றும் உபகரண சேவை',
    'trade.Carpentry & Furniture': 'தச்சு மற்றும் மரச்சாமான்கள்',
    'trade.Interior Painting': 'உட்புற வண்ணம் பூசுதல்',
    'trade.General Home Services': 'பொது வீட்டுச் சேவைகள்',

    'service.svc-plumb-1.name': 'குழாய் / டேப் பழுது (Tap Repair)',
    'service.svc-plumb-1.desc': 'கசியும் குழாய்களை சரிசெய்தல், வாஷர்களை மாற்றுதல்',
    'service.srv_plumber_general.name': 'பிளம்பர் — பொது பிளம்பிங் & கசிவு பழுது',
    'service.srv_plumber_general.desc': 'வீட்டு வாசலில் பிளம்பிங், குழாய் பழுது, குழாய் கசிவு சரிசெய்தல்',
    'service.svc-plumb-2.name': 'குழாய் கசிவு சரிசெய்தல் (Pipe Leak Fix)',
    'service.svc-plumb-2.desc': 'குழாய் கசிவுகளைக் கண்டறிந்து சீல் செய்தல்',
    'service.svc-plumb-3.name': 'குளியலறை பொருத்துதல் (Bathroom Fitting)',
    'service.svc-plumb-3.desc': 'ஷவர், குளியலறை பாகங்கள் நிறுவுதல்',

    'service.svc-elec-1.name': 'சுவிட்ச் மற்றும் சாக்கெட் பழுது',
    'service.svc-elec-1.desc': 'உடைந்த சுவிட்சுகளை மாற்றுதல், புதிய சாக்கெட்டுகள்',
    'service.srv_electrician_general.name': 'எலக்ட்ரீஷியன் — பொது பழுது மற்றும் மின்விசிறி சேவை',
    'service.srv_electrician_general.desc': 'மின்விசிறி மின்தேக்கி, சுவிட்ச்போர்டு பழுது, ஷார்ட் சர்க்யூட் சரிசெய்தல்',
    'service.svc-elec-2.name': 'மின்விசிறி நிறுவல் (Fan Installation)',
    'service.svc-elec-2.desc': 'வயரிங் மற்றும் சமநிலையுடன் மின்விசிறி நிறுவுதல்',
    'service.svc-elec-3.name': 'எம்சிபி / வயரிங் கோளாறு (MCB / Wiring Fault)',
    'service.svc-elec-3.desc': 'ஷார்ட் சர்க்யூட் கண்டறிதல், எம்சிபி மாற்றுதல்',

    'service.svc-clean-1.name': 'ஆழமான வீட்டு சுத்தம் (Deep Cleaning)',
    'service.svc-clean-1.desc': 'சுற்றுச்சூழல் நட்பு தயாரிப்புகளுடன் 2-3 BHK சுத்தம்',
    'service.srv_cleaning_deep.name': 'ஆழமான சுத்தம் & குளியலறை டெஸ்கேலிங்',
    'service.srv_cleaning_deep.desc': 'தரை ஓடுகள் தேய்த்தல், குளியலறை கறை நீக்குதல்',
    'service.svc-clean-2.name': 'சமையலறை ஆழமான சுத்தம்',
    'service.svc-clean-2.desc': 'புகைபோக்கி, கவுண்டர்டாப், ஓடுகள் முழுமையான சுத்தம்',

    'service.svc-appli-1.name': 'ஏசி சேவை & எரிவாயு நிரப்புதல்',
    'service.svc-appli-1.desc': 'ஏசி சுத்தம், வடிகட்டி கழுவுதல், வாயு நிரப்புதல்',
    'service.srv_ac_repair.name': 'ஏசி பழுது மற்றும் சேவை',
    'service.srv_ac_repair.desc': 'ஏர் கண்டிஷனர் கூலிங் பழுது, வாயு கசிவு சரிபார்த்தல்',
    'service.svc-appli-2.name': 'சலவை இயந்திரம் பழுது (Washing Machine)',
    'service.svc-appli-2.desc': 'டிரம், மோட்டார் மற்றும் மின் சிக்கல்களை சரிசெய்தல்',
    'service.srv_appliance_repair.name': 'RO நீர் சுத்திகரிப்பான் & உபகரண பழுது',
    'service.srv_appliance_repair.desc': 'வடிகட்டி மாற்றுதல், வாஷிங் மெஷின், கீசர் பழுது',

    'service.svc-carp-1.name': 'கதவு / ஜன்னல் பழுது',
    'service.svc-carp-1.desc': 'பூட்டுகள், கைப்பிடிகள், மர வீக்கம் சரிசெய்தல்',
    'service.svc-paint-1.name': 'அறை வண்ணம் பூசுதல் (Room Painting)',
    'service.svc-paint-1.desc': 'பிரீமியம் உட்புற பெயிண்ட், இரண்டு அடுக்கு பூச்சு',

    'bookings.title': 'என் முன்பதிவுகள்',
    'bookings.active': 'செயலில் உள்ள முன்பதிவுகள்',
    'bookings.history': 'வரலாறு',
    'bookings.in_pool': 'பொது விநியோகக் குழுவில் உள்ளது',
    'bookings.finding_tech': 'சரிபார்க்கப்பட்ட நிபுணரைத் தேடுகிறது...',
    'bookings.pool_desc': 'உங்கள் கோரிக்கை சாகரா சரிபார்க்கப்பட்ட பார்ட்னர் பூலில் செயலில் உள்ளது. அங்கீகரிக்கப்பட்ட எந்தவொரு தொழில்நுட்ப வல்லுநரும் இதை ஏற்கலாம்.',
    'bookings.assigned_tech': 'ஒதுக்கப்பட்ட தொழில்நுட்ப வல்லுநர்',
    'bookings.call_tech': 'தொழில்நுட்ப வல்லுநரை அழைக்கவும்',
    'bookings.doorstep_otp': 'வீட்டு வாசலில் சரிபார்ப்பு OTP',
    'bookings.otp_desc': 'பணியைத் தொடங்க தொழில்நுட்ப வல்லுநர் வந்தவுடன் இந்த 4 இலக்க குறியீட்டைப் பகிரவும்.',
    'bookings.cancel': 'முன்பதிவை ரத்து செய்',
    'bookings.paid': 'செலுத்தப்பட்டது',
    'bookings.payment_due': 'நிலுவைத் தொகை',
    'bookings.pay_online': 'ஆன்லைனில் பணம் செலுத்துங்கள் (Razorpay)',

    'status.pending': 'கோரிக்கை வைக்கப்பட்டது',
    'status.accepted': 'தொழில்நுட்ப வல்லுநர் நியமிக்கப்பட்டார்',
    'status.en_route': 'தொழில்நுட்ப வல்லுநர் வழியில் உள்ளார்',
    'status.in_progress': 'பணி நடைபெறுகிறது',
    'status.completed': 'நிறைவடைந்தது',
    'status.cancelled': 'ரத்து செய்யப்பட்டது',

    'technician.workbench_title': 'தொழில்நுட்ப வல்லுநர் பணித்தளம்',
    'technician.accepting_orders': 'ஆர்டர்கள் ஏற்கப்படுகின்றன',
    'technician.go_offline': 'ஆஃப்லைனுக்குச் செல்லவும்',
    'technician.go_online': 'ஆன்லைனுக்கு வாருங்கள்',
    'technician.active_job_desk': 'செயலில் உள்ள பணி மேசை',
    'technician.available_requests': 'கிடைக்கக்கூடிய வாடிக்கையாளர் கோரிக்கைகள்',
    'technician.payout': 'வருவாய் / ஊதியம்',
    'technician.accept_job': 'வேலை வாய்ப்பை ஏற்கவும்',
    'technician.finish_active_first': 'முதலில் செயலில் உள்ள வேலையை முடிக்கவும்',
    'technician.my_jobs': 'என் ஏற்றுக்கொள்ளப்பட்ட வேலைகள்',
    'technician.current_active_job': 'தற்போதைய செயலில் உள்ள வேலை',
    'technician.booking_id': 'முன்பதிவு ஐடி',
    'technician.skill_match': 'திறன் பொருத்தம்',
    'technician.dismiss': 'நிராகரி',
    'technician.verify_otp': 'வாடிக்கையாளர் OTP ஐ சரிபார்த்து வேலையைத் தொடங்குங்கள்',
    'technician.enter_otp': '4 இலக்க OTP ஐ உள்ளிடவும்',
    'technician.suspended_heading': 'கணக்கு இடைநிறுத்தப்பட்டது — அனைத்து செயலில் உள்ள வேலைகளும் பொதுக் குழுவிற்கு மாற்றப்பட்டன',
    'technician.suspended_body': 'KYC நிராகரிக்கப்பட்டதால், நீங்கள் அனைத்து செயலில் உள்ள முன்பதிவுகளிலிருந்தும் நீக்கப்பட்டுள்ளீர்கள்.',
    'technician.kyc_rejected_alert': 'KYC நிராகரிக்கப்பட்டது: பயோமெட்ரிக் முகம் மீண்டும் புகைப்படம் எடுக்கப்பட வேண்டும்',

    'common.loading': 'ஏற்றுகிறது...',
    'common.submit': 'சமர்ப்பி',
    'common.close': 'மூடு',
    'common.confirm': 'உறுதி செய்',
    'common.onwards': 'முதல்',
    'common.book_now': 'இப்போதே முன்பதிவு செய்க'
  },
  te: {
    'app.name': 'సాల్వో (SOLVO)',
    'app.tagline': 'తక్షణ గృహ సేవలు మరియు మరమ్మతులు',
    'nav.home': 'హోమ్',
    'nav.services': 'సేవలు',
    'nav.bookings': 'బుకింగ్స్',
    'nav.profile': 'ప్రొఫైల్',
    'nav.job_desk': 'జాబ్ డెస్క్',
    'nav.kyc': 'కేవైసీ (KYC)',
    'nav.technician': 'టెక్నీషియన్ పోర్టల్',
    'header.join_technician': 'టెక్నీషియన్‌గా చేరండి',
    'header.customer_portal': 'కస్టమర్ పోర్టల్',
    'header.technician_pro': 'టెక్నీషియన్ ప్రో',
    'header.my_profile': 'నా ప్రొఫైల్',
    'header.sign_out': 'లాగ్ అవుట్',
    'header.detecting_location': 'లొకేషన్ గుర్తించబడుతోంది…',
    'header.select_language': 'భాష',

    'home.browse_services': 'సేవలను బ్రౌజ్ చేయండి',
    'home.services_across_categories': '6 విభాగాలలో 50+ సేవలు',
    'home.view_all': 'అన్నీ చూడండి',
    'home.popular_services': 'ప్రస్తుతం ప్రజాదరణ పొందినవి',
    'home.most_booked': 'ఈ వారం సాగరాలో ఎక్కువగా బుక్ చేయబడినవి',
    'home.see_all': 'అన్నీ చూడండి',
    'home.hero_title': 'నమ్మకమైన గృహ సేవలు,',
    'home.hero_title_accent': 'మీ ముంగిటకే',
    'home.hero_subtitle': 'ప్లంబర్లు, ఎలక్ట్రీషియన్లు, క్లీనర్లను బుక్ చేసుకోండి — 60 నిమిషాల్లో ధృవీకరించబడిన నిపుణులు.',
    'home.serving_badge': 'విశ్వసనీయ హైపర్‌లోకల్ గృహ సేవల ప్లాట్‌ఫారమ్',
    'home.search_placeholder': 'ప్లంబర్, ఎలక్ట్రీషియన్, క్లీనింగ్ కోసం శోధించండి…',
    'home.search_button': 'శోధించండి',

    'services.all_services': 'అన్ని సేవలు',
    'services.services_available': 'సేవలు అందుబాటులో ఉన్నాయి',
    'services.all': 'అన్నీ',
    'services.search_placeholder': 'సేవల కోసం శోధించండి…',

    'category.cat-plumb': 'ప్లంబింగ్ (పైపుల పని)',
    'category.cat-elec': 'ఎలక్ట్రీషియన్ (విద్యుత్)',
    'category.cat-clean': 'శుభ్రత (క్లీనింగ్)',
    'category.cat-appli': 'ఉపకరణాల మరమ్మతు',
    'category.cat-carp': 'వడ్రంగి పని (కార్పెంట్రీ)',
    'category.cat-paint': 'పెయింటింగ్ (రంగులు వేయుట)',

    'trade.Plumbing & Sanitary': 'ప్లంబింగ్ మరియు శానిటరీ',
    'trade.Electrical & Wiring': 'ఎలక్ట్రికల్ మరియు వైరింగ్',
    'trade.Deep Home Cleaning': 'డీప్ హోమ్ క్లీనింగ్',
    'trade.AC & Appliance Service': 'ఏసీ మరియు ఉపకరణాల సేవ',
    'trade.Carpentry & Furniture': 'కార్పెంట్రీ మరియు ఫర్నిచర్',
    'trade.Interior Painting': 'ఇంటీరియర్ పెయింటింగ్',
    'trade.General Home Services': 'సాధారణ గృహ సేవలు',

    'service.svc-plumb-1.name': 'ట్యాప్ / కుళాయి మరమ్మతు (Tap Repair)',
    'service.svc-plumb-1.desc': 'లీక్ అవుతున్న ట్యాప్‌లను సరిచేయడం, వాషర్ల మార్పిడి',
    'service.srv_plumber_general.name': 'ప్లంబర్ — సాధారణ ప్లంబింగ్ & లీక్ మరమ్మతు',
    'service.srv_plumber_general.desc': 'డోర్‌స్టెప్ ప్లంబింగ్, ట్యాప్ రిపేర్, పైప్ లీక్ ఫిక్సింగ్',
    'service.svc-plumb-2.name': 'పైప్ లీక్ పరిష్కారం (Pipe Leak Fix)',
    'service.svc-plumb-2.desc': 'పైపు లీకేజీలను గుర్తించి సరిచేయడం',
    'service.svc-plumb-3.name': 'బాత్రూమ్ ఫిట్టింగ్ (Bathroom Fitting)',
    'service.svc-plumb-3.desc': 'షవర్ హెడ్స్, బాత్రూమ్ ఉపకరణాల అమరిక',

    'service.svc-elec-1.name': 'స్విచ్ మరియు సాకెట్ మరమ్మతు',
    'service.svc-elec-1.desc': 'విరిగిన స్విచ్‌ల మార్పిడి, కొత్త సాకెట్ల అమరిక',
    'service.srv_electrician_general.name': 'ఎలక్ట్రీషియన్ — సాధారణ మరమ్మతులు & ఫ్యాన్ సర్వీసింగ్',
    'service.srv_electrician_general.desc': 'సీలింగ్ ఫ్యాన్ కెపాసిటర్, ఎంసీబీ సమస్యల నివారణ, షార్ట్ సర్క్యూట్ మరమ్మతు',
    'service.svc-elec-2.name': 'ఫ్యాన్ ఇన్‌స్టాలేషన్ (Fan Installation)',
    'service.svc-elec-2.desc': 'వైరింగ్ మరియు బ్యాలెన్సింగ్‌తో ఫ్యాన్ అమరిక',
    'service.svc-elec-3.name': 'ఎంసీబీ / వైరింగ్ లోపం (MCB / Wiring Fault)',
    'service.svc-elec-3.desc': 'షార్ట్ సర్క్యూట్ డయాగ్నోసిస్, ఎంసీబీ మార్పిడి',

    'service.svc-clean-1.name': 'పూర్తి ఇంటి శుభ్రత (Deep Home Cleaning)',
    'service.svc-clean-1.desc': 'పర్యావరణ అనుకూల ఉత్పత్తులతో 2-3 BHK శుభ్రత',
    'service.srv_cleaning_deep.name': 'డీప్ క్లీనింగ్ & బాత్రూమ్ డెస్కేలింగ్',
    'service.srv_cleaning_deep.desc': 'ఫ్లోర్ టైల్స్ స్క్రబ్బింగ్, బాత్రూమ్ మరకల తొలగింపు',
    'service.svc-clean-2.name': 'కిచెన్ డీప్ క్లీన్ (Kitchen Deep Clean)',
    'service.svc-clean-2.desc': 'చిమ్నీ, కౌంటర్‌టాప్‌లు, టైల్స్ సంపూర్ణ శుభ్రత',

    'service.svc-appli-1.name': 'ఏసీ సర్వీస్ & గ్యాస్ రీఫిల్',
    'service.svc-appli-1.desc': 'ఏసీ క్లీనింగ్, ఫిల్టర్ వాష్, గ్యాస్ టాప్-అప్',
    'service.srv_ac_repair.name': 'ఏసీ సర్వీసింగ్, క్లీనింగ్ & రిపేర్',
    'service.srv_ac_repair.desc': 'ఎయిర్ కండీషనర్ కూలింగ్ మరమ్మతు, గ్యాస్ లీక్ చెక్',
    'service.svc-appli-2.name': 'వాషింగ్ మెషిన్ మరమ్మతు (Washing Machine)',
    'service.svc-appli-2.desc': 'డ్రమ్, మోటార్ మరియు విద్యుత్ సమస్యల పరిష్కారం',
    'service.srv_appliance_repair.name': 'RO వాటర్ ప్యూరిఫైయర్ & ఉపకరణాల రిపేర్',
    'service.srv_appliance_repair.desc': 'ఫిల్టర్ రీప్లేస్‌మెంట్, గీజర్, మైక్రోవేవ్ మరమ్మతులు',

    'service.svc-carp-1.name': 'తలుపు / కిటికీ మరమ్మతు',
    'service.svc-carp-1.desc': 'తాళాలు, హ్యాండిల్స్, చెక్క ఉబ్బడం సరిచేయుట',
    'service.svc-paint-1.name': 'గది పెయింటింగ్ (Room Painting)',
    'service.svc-paint-1.desc': 'ప్రీమియం ఇంటీరియర్ పెయింట్, రెండు కోట్లు, చక్కని ముగింపు',

    'bookings.title': 'నా బుకింగ్స్',
    'bookings.active': 'యాక్టివ్ బుకింగ్స్',
    'bookings.history': 'చరిత్ర',
    'bookings.in_pool': 'పబ్లిక్ డిస్పాచ్ పూల్‌లో ఉంది',
    'bookings.finding_tech': 'ధృవీకరించబడిన నిపుణుడిని శోధిస్తోంది...',
    'bookings.pool_desc': 'మీ అభ్యర్థన సాగరా ధృవీకరించబడిన భాగస్వామి పూల్‌లో యాక్టివ్‌గా ఉంది. ఆమోదించబడిన ఏ టెక్నీషియన్ అయినా దీన్ని స్వీకరించవచ్చు.',
    'bookings.assigned_tech': 'కేటాయించిన టెక్నీషియన్',
    'bookings.call_tech': 'టెక్నీషియన్‌కు కాల్ చేయండి',
    'bookings.doorstep_otp': 'డోర్‌స్టెప్ ధృవీకరణ OTP',
    'bookings.otp_desc': 'పనిని ప్రారంభించడానికి టెక్నీషియన్ వచ్చినప్పుడు ఈ 4-అంకెల కోడ్‌ను షేర్ చేయండి.',
    'bookings.cancel': 'బుకింగ్ రద్దు చేయండి',
    'bookings.paid': 'చెల్లించబడింది',
    'bookings.payment_due': 'చెల్లించాల్సిన మొత్తం',
    'bookings.pay_online': 'ఆన్‌లైన్ చెల్లింపు (Razorpay)',

    'status.pending': 'అభ్యర్థన పంపబడింది',
    'status.accepted': 'టెక్నీషియన్ కేటాయించబడ్డారు',
    'status.en_route': 'టెక్నీషియన్ వస్తున్నారు',
    'status.in_progress': 'పని పురోగతిలో ఉంది',
    'status.completed': 'పూర్తయింది',
    'status.cancelled': 'రద్దు చేయబడింది',

    'technician.workbench_title': 'టెక్నీషియన్ ప్రో వర్క్‌బెంచ్',
    'technician.accepting_orders': 'ఆర్డర్‌లు స్వీకరించబడుతున్నాయి',
    'technician.go_offline': 'ఆఫ్‌లైన్‌కు వెళ్లండి',
    'technician.go_online': 'ఆన్‌లైన్‌లోకి రండి',
    'technician.active_job_desk': 'యాక్టివ్ జాబ్ డెస్క్',
    'technician.available_requests': 'అందుబాటులో ఉన్న కస్టమర్ అభ్యర్థనలు',
    'technician.payout': 'సంపాదన / చెల్లింపు',
    'technician.accept_job': 'జాబ్ ఆఫర్‌ను అంగీకరించండి',
    'technician.finish_active_first': 'ముందుగా యాక్టివ్ పనిని పూర్తి చేయండి',
    'technician.my_jobs': 'నా అంగీకరించిన పనులు',
    'technician.current_active_job': 'ప్రస్తుత యాక్టివ్ పని',
    'technician.booking_id': 'బుకింగ్ ఐడీ',
    'technician.skill_match': 'నైపుణ్యం సరిపోలిక',
    'technician.dismiss': 'తీసివేయండి',
    'technician.verify_otp': 'కస్టమర్ OTP ని ధృవీకరించి పనిని ప్రారంభించండి',
    'technician.enter_otp': '4-అంకెల OTP ని నమోదు చేయండి',
    'technician.suspended_heading': 'ఖాతా సస్పెండ్ చేయబడింది — అన్ని పనులు పబ్లిక్ పూల్‌కు తిరిగి ఇవ్వబడ్డాయి',
    'technician.suspended_body': 'KYC తిరస్కరించబడినందున, కొనసాగుతున్న అన్ని బుకింగ్‌ల నుండి మీరు తొలగించబడ్డారు.',
    'technician.kyc_rejected_alert': 'KYC తిరస్కరించబడింది: బయోమెట్రిక్ ముఖం మళ్లీ తీయవలసి ఉంది',

    'common.loading': 'లోడ్ అవుతోంది...',
    'common.submit': 'సమర్పించండి',
    'common.close': 'మూసివేయండి',
    'common.confirm': 'నిర్ధారించండి',
    'common.onwards': 'నుండి',
    'common.book_now': 'ఇప్పుడే బుక్ చేయండి'
  }
};

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: string, defaultText?: string) => string;
  languages: LanguageOption[];
  getLocalizedServiceName: (serviceId: string, fallback?: string) => string;
  getLocalizedServiceDesc: (serviceId: string, fallback?: string) => string;
  getLocalizedCategoryName: (categoryId: string, fallback?: string) => string;
  getLocalizedTradeName: (trade: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (key, defaultText) => defaultText || key,
  languages: SUPPORTED_LANGUAGES,
  getLocalizedServiceName: (id, fallback) => fallback || id,
  getLocalizedServiceDesc: (id, fallback) => fallback || '',
  getLocalizedCategoryName: (id, fallback) => fallback || id,
  getLocalizedTradeName: (trade) => trade
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    try {
      const saved = localStorage.getItem('mud_language') as LanguageCode;
      if (saved && ['en', 'kn', 'hi', 'ta', 'te'].includes(saved)) {
        return saved;
      }
    } catch {}
    return 'en';
  });

  const [remoteTranslations, setRemoteTranslations] = useState<Record<string, string>>({});

  // Sync with language microservice if reachable
  useEffect(() => {
    const fetchRemote = async () => {
      try {
        const serviceUrl = (import.meta as any).env?.VITE_LANGUAGE_SERVICE_URL || 'http://localhost:8000';
        const res = await fetch(`${serviceUrl}/api/translations/${language}`, {
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(3000)
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.translations) {
            setRemoteTranslations(data.translations);
          }
        }
      } catch {
        // Fallback to bundled translations silently without interruption
      }
    };
    fetchRemote();
  }, [language]);

  const setLanguage = (lang: LanguageCode) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('mud_language', lang);
      document.documentElement.lang = lang;
      window.dispatchEvent(new CustomEvent('mud_language_changed', { detail: { language: lang } }));
    } catch {}
  };

  const t = (key: string, defaultText?: string): string => {
    // 1. Check remote microservice cache
    if (remoteTranslations && remoteTranslations[key]) {
      return remoteTranslations[key];
    }
    // 2. Check bundled translations for active language
    const currentPack = BUNDLED_TRANSLATIONS[language];
    if (currentPack && currentPack[key]) {
      return currentPack[key];
    }
    // 3. Fallback to English bundled translations
    const enPack = BUNDLED_TRANSLATIONS.en;
    if (enPack && enPack[key]) {
      return enPack[key];
    }
    // 4. Fallback to passed defaultText or key
    return defaultText || key;
  };

  const getLocalizedServiceName = (serviceId: string, fallback?: string): string => {
    if (!serviceId) return fallback || '';
    const key = `service.${serviceId}.name`;
    return t(key, fallback || serviceId);
  };

  const getLocalizedServiceDesc = (serviceId: string, fallback?: string): string => {
    if (!serviceId) return fallback || '';
    const key = `service.${serviceId}.desc`;
    return t(key, fallback || '');
  };

  const getLocalizedCategoryName = (categoryId: string, fallback?: string): string => {
    if (!categoryId) return fallback || '';
    const key = `category.${categoryId}`;
    return t(key, fallback || categoryId);
  };

  const getLocalizedTradeName = (trade: string): string => {
    if (!trade) return 'General Home Services';
    const key = `trade.${trade}`;
    return t(key, trade);
  };

  return (
    <LanguageContext.Provider value={{
      language,
      setLanguage,
      t,
      languages: SUPPORTED_LANGUAGES,
      getLocalizedServiceName,
      getLocalizedServiceDesc,
      getLocalizedCategoryName,
      getLocalizedTradeName
    }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
