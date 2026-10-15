import { db, DatabaseState, CategoryRecord, ServiceRecord, UserRecord, ProviderRecord, CustomerAddressRecord } from './database.js';

export function seedDatabase(): void {
  console.log('[Seed] Seeding realistic Sagara Local Services data...');

  const categories: CategoryRecord[] = [
    {
      id: 'cat-plumbing',
      slug: 'plumbing',
      name: 'Plumbing Services',
      name_kn: 'ಪ್ಲಂಬಿಂಗ್ ಸೇವೆಗಳು',
      icon: 'Wrench',
      description: 'Pipe leaks, tap repairs, sanitary fixtures, water tank and drainage repair',
      base_inspection_fee: 149,
      is_active: true,
      display_order: 1
    },
    {
      id: 'cat-electrical',
      slug: 'electrical',
      name: 'Electrical Works',
      name_kn: 'ವಿದ್ಯುತ್ ಕಾಮಗಾರಿ',
      icon: 'Zap',
      description: 'Switchboards, fan & light fixes, short circuit diagnosis, wiring & inverters',
      base_inspection_fee: 149,
      is_active: true,
      display_order: 2
    },
    {
      id: 'cat-cleaning',
      slug: 'cleaning',
      name: 'Deep Cleaning',
      name_kn: 'ಮನೆ ಆಳವಾದ ಸ್ವಚ್ಛತೆ',
      icon: 'Sparkles',
      description: 'Bathroom deep cleaning, kitchen sanitization, water sump & tank wash',
      base_inspection_fee: 299,
      is_active: true,
      display_order: 3
    },
    {
      id: 'cat-appliance',
      slug: 'appliance',
      name: 'Appliance Repair',
      name_kn: 'ಗೃಹೋಪಯೋಗಿ ವಸ್ತುಗಳ ದುರಸ್ತಿ',
      icon: 'Tv',
      description: 'AC servicing, refrigerator, washing machine, microwave & geyser repair',
      base_inspection_fee: 199,
      is_active: true,
      display_order: 4
    },
    {
      id: 'cat-carpentry',
      slug: 'carpentry',
      name: 'Carpentry & Woodwork',
      name_kn: 'ಬಡಗಿ / ಮರಗೆಲಸ',
      icon: 'Hammer',
      description: 'Door locks, cupboard repairs, wooden furniture assembly, mesh fixing',
      base_inspection_fee: 149,
      is_active: true,
      display_order: 5
    },
    {
      id: 'cat-painting',
      slug: 'painting',
      name: 'Painting & Waterproofing',
      name_kn: 'ಪೇಂಟಿಂಗ್ ಮತ್ತು ವಾಟರ್‌ಪ್ರೂಫಿಂಗ್',
      icon: 'Paintbrush',
      description: 'Wall touch-ups, single-room repaints, monsoon dampness & waterproofing',
      base_inspection_fee: 249,
      is_active: true,
      display_order: 6
    }
  ];

  const services: ServiceRecord[] = [
    // Plumbing
    {
      id: 'srv-plumb-tap',
      category_id: 'cat-plumbing',
      name: 'Tap / Mixer Repair & Replacement',
      name_kn: 'ನಲ್ಲಿ / ಮಿಕ್ಸರ್ ದುರಸ್ತಿ ಮತ್ತು ಬದಲಿ',
      description: 'Fix leaking taps, bib taps, shower mixer valves or install new fitting',
      base_price: 199,
      unit: 'fixture',
      estimated_duration_mins: 45,
      included_tasks: ['Fault inspection', 'Washer / cartridge replacement', 'Sealing with Teflon tape', 'Leak check'],
      excluded_tasks: ['Cost of new brass tap/mixer (can be added by technician)'],
      warranty_days: 30,
      is_popular: true,
      is_active: true
    },
    {
      id: 'srv-plumb-leak',
      category_id: 'cat-plumbing',
      name: 'Concealed Pipe Leakage Detection & Fix',
      name_kn: 'ಒಳಪೈಪ್ ಸೋರಿಕೆ ಪತ್ತೆ ಮತ್ತು ಪರಿಹಾರ',
      description: 'Thorough diagnosis of seepage, joint breaks and rapid pipe repair',
      base_price: 349,
      unit: 'point',
      estimated_duration_mins: 90,
      included_tasks: ['Acoustic / pressure leak detection', 'PVC joint cutting & joining', 'Water flow test'],
      excluded_tasks: ['Masonry plastering / tiling finishing'],
      warranty_days: 60,
      is_popular: true,
      is_active: true
    },
    {
      id: 'srv-plumb-tank',
      category_id: 'cat-plumbing',
      name: 'Overhead Water Tank Cleaning (Up to 1000L)',
      name_kn: 'ಓವರ್‌ಹೆಡ್ ನೀರಿನ ತೊಟ್ಟಿ ಸ್ವಚ್ಛತೆ (1000L)',
      description: 'Complete de-sludging, high-pressure scrubbing and UV/chlorine disinfectant',
      base_price: 499,
      unit: 'tank',
      estimated_duration_mins: 75,
      included_tasks: ['Sludge drainage', 'Antimicrobial scrubbing', 'UV/bleaching treatment', 'Pipe de-clogging'],
      excluded_tasks: ['Plumbing line alterations'],
      warranty_days: 30,
      is_popular: false,
      is_active: true
    },

    // Electrical
    {
      id: 'srv-elec-fan',
      category_id: 'cat-electrical',
      name: 'Ceiling Fan Repair or Installation',
      name_kn: 'ಸೀಲಿಂಗ್ ಫ್ಯಾನ್ ದುರಸ್ತಿ ಅಥವಾ ಅಳವಡಿಕೆ',
      description: 'Fix wobbling, noise, capacitor replacement, or fresh installation with anchor',
      base_price: 199,
      unit: 'fan',
      estimated_duration_mins: 40,
      included_tasks: ['Capacitor testing', 'Blade balancing', 'Motor winding resistance check', 'Safe mounting'],
      excluded_tasks: ['Cost of new fan or replacement capacitor'],
      warranty_days: 30,
      is_popular: true,
      is_active: true
    },
    {
      id: 'srv-elec-switch',
      category_id: 'cat-electrical',
      name: 'Switchboard & MCB Troubleshooting',
      name_kn: 'ಸ್ವಿಚ್‌ಬೋರ್ಡ್ ಮತ್ತು ಎಂಸಿಬಿ ದುರಸ್ತಿ',
      description: 'Resolve tripping MCB, burnt switches, sparking sockets, fuse replacement',
      base_price: 249,
      unit: 'board',
      estimated_duration_mins: 60,
      included_tasks: ['Voltage & neutral testing', 'Earthing check', 'Tightening loose terminations'],
      excluded_tasks: ['Cost of new modular switches or MCB'],
      warranty_days: 30,
      is_popular: true,
      is_active: true
    },
    {
      id: 'srv-elec-inverter',
      category_id: 'cat-electrical',
      name: 'Home Inverter Wiring & Battery Checkup',
      name_kn: 'ಇನ್ವರ್ಟರ್ ವೈರಿಂಗ್ ಮತ್ತು ಬ್ಯಾಟರಿ ತಪಾಸಣೆ',
      description: 'Backup line wiring, acid gravity test, terminal descaling and bypass installation',
      base_price: 399,
      unit: 'setup',
      estimated_duration_mins: 75,
      included_tasks: ['Battery voltage & specific gravity check', 'Terminal grease application', 'Auto-cutoff check'],
      excluded_tasks: ['Distilled water purchase or new battery'],
      warranty_days: 45,
      is_popular: false,
      is_active: true
    },

    // Deep Cleaning
    {
      id: 'srv-clean-bath',
      category_id: 'cat-cleaning',
      name: 'Intense Bathroom Deep Scrub & Descaling',
      name_kn: 'ಸ್ನಾನಗೃಹ ಆಳವಾದ ಸ್ವಚ್ಛತೆ',
      description: 'Acid-free hard-water tile descaling, commode sanitizing, mirror & chrome polishing',
      base_price: 399,
      unit: 'bathroom',
      estimated_duration_mins: 90,
      included_tasks: ['Tile grout scrubbing', 'Chrome fixture descaling', 'Drain anti-bacterial treatment'],
      excluded_tasks: ['Grout re-filling'],
      warranty_days: 15,
      is_popular: true,
      is_active: true
    },
    {
      id: 'srv-clean-home',
      category_id: 'cat-cleaning',
      name: 'Full Home Festive Deep Cleaning (1BHK/2BHK)',
      name_kn: 'ಸಂಪೂರ್ಣ ಮನೆ ಆಳವಾದ ಸ್ವಚ್ಛತೆ',
      description: 'Comprehensive dusting, floor buffing, cobweb removal, doors, fans & window tracks',
      base_price: 1299,
      unit: 'home',
      estimated_duration_mins: 240,
      included_tasks: ['Industrial vacuuming', 'Floor scrubbing machine wash', 'Window track scraping'],
      excluded_tasks: ['Terrace washing or sofa shampooing'],
      warranty_days: 15,
      is_popular: true,
      is_active: true
    },

    // Appliance
    {
      id: 'srv-app-geyser',
      category_id: 'cat-appliance',
      name: 'Water Heater / Geyser Service & Anode Check',
      name_kn: 'ಗೀಸರ್ ಸರ್ವೀಸ್ ಮತ್ತು ಅಳವಡಿಕೆ',
      description: 'Descaling heating coil, thermostat calibration, safety valve test and leak check',
      base_price: 299,
      unit: 'geyser',
      estimated_duration_mins: 60,
      included_tasks: ['Tank sediment drain', 'Coil descaling', 'Thermostat auto-cut safety check'],
      excluded_tasks: ['Replacement coil / magnesium anode cost'],
      warranty_days: 30,
      is_popular: true,
      is_active: true
    },
    {
      id: 'srv-app-washing',
      category_id: 'cat-appliance',
      name: 'Washing Machine Diagnosis & Drum Cleaning',
      name_kn: 'ವಾಷಿಂಗ್ ಮೆಷಿನ್ ರಿಪೇರಿ ಮತ್ತು ಸರ್ವೀಸ್',
      description: 'Fix spinning failure, drainage errors, water inlet leakage, drum vibration',
      base_price: 349,
      unit: 'machine',
      estimated_duration_mins: 75,
      included_tasks: ['Motor belt check', 'Pulsator / drum descaling', 'Inlet solenoid test'],
      excluded_tasks: ['PCB board repair or major motor rewind'],
      warranty_days: 30,
      is_popular: true,
      is_active: true
    },

    // Carpentry
    {
      id: 'srv-carp-lock',
      category_id: 'cat-carpentry',
      name: 'Main Door Lock & Handle Installation',
      name_kn: 'ಮುಖ್ಯ ಬಾಗಿಲಿನ ಲಾಕ್ ಮತ್ತು ಹಿಡಿಕೆ ಅಳವಡಿಕೆ',
      description: 'Chiseling, fitting mortise or digital locks, latch alignment for smooth latching',
      base_price: 249,
      unit: 'door',
      estimated_duration_mins: 50,
      included_tasks: ['Precise mortise cutting', 'Latch striking plate alignment', 'Key smoothness check'],
      excluded_tasks: ['Cost of lock hardware'],
      warranty_days: 45,
      is_popular: false,
      is_active: true
    }
  ];

  const users: UserRecord[] = [
    // Customers
    {
      id: 'usr-cust-1',
      phone: '9845123456',
      email: 'ramesh.hegde@example.com',
      name: 'Ramesh Hegde',
      role: 'customer',
      password_hash: 'hashed_password_mock',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      preferred_language: 'kn',
      created_at: new Date(Date.now() - 30 * 86400000).toISOString()
    },
    {
      id: 'usr-cust-2',
      phone: '9448987654',
      email: 'deepa.rao@example.com',
      name: 'Deepa Rao',
      role: 'customer',
      password_hash: 'hashed_password_mock',
      avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      preferred_language: 'en',
      created_at: new Date(Date.now() - 20 * 86400000).toISOString()
    },

    // Verified Service Providers
    {
      id: 'usr-prov-1',
      phone: '9844011223',
      email: 'manjunath.plumber@sagara.local',
      name: 'Manjunath K',
      role: 'provider',
      password_hash: 'hashed_password_mock',
      avatar_url: 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=150&auto=format&fit=crop&q=80',
      preferred_language: 'kn',
      created_at: new Date(Date.now() - 90 * 86400000).toISOString()
    },
    {
      id: 'usr-prov-2',
      phone: '9448022334',
      email: 'suresh.electrician@sagara.local',
      name: 'Suresh Bhat',
      role: 'provider',
      password_hash: 'hashed_password_mock',
      avatar_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
      preferred_language: 'kn',
      created_at: new Date(Date.now() - 75 * 86400000).toISOString()
    },
    {
      id: 'usr-prov-3',
      phone: '9741033445',
      email: 'anitha.cleaning@sagara.local',
      name: 'Anitha Hegde',
      role: 'provider',
      password_hash: 'hashed_password_mock',
      avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      preferred_language: 'kn',
      created_at: new Date(Date.now() - 60 * 86400000).toISOString()
    },
    {
      id: 'usr-prov-4',
      phone: '9632044556',
      email: 'raghavendra.appliances@sagara.local',
      name: 'Raghavendra Naik',
      role: 'provider',
      password_hash: 'hashed_password_mock',
      avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      preferred_language: 'en',
      created_at: new Date(Date.now() - 45 * 86400000).toISOString()
    },
    // Pending KYC Provider (For Admin Approval Demo)
    {
      id: 'usr-prov-pending',
      phone: '9900055667',
      email: 'ramesh.gowda@sagara.local',
      name: 'Ramesh Gowda',
      role: 'provider',
      password_hash: 'hashed_password_mock',
      avatar_url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
      preferred_language: 'kn',
      created_at: new Date(Date.now() - 2 * 86400000).toISOString()
    },

    // Admin
    {
      id: 'usr-admin-1',
      phone: '9880000001',
      email: 'admin@sagara.services',
      name: 'Sagara Admin Ops',
      role: 'admin',
      password_hash: 'hashed_password_mock',
      avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
      preferred_language: 'en',
      created_at: new Date(Date.now() - 180 * 86400000).toISOString()
    }
  ];

  const providers: ProviderRecord[] = [
    {
      id: 'prov-1',
      user_id: 'usr-prov-1',
      bio: 'Experienced Master Plumber with 12+ years experience across Sagara town, Keladi and Anandapuram. Specialized in CPVC leak repairs, sanitary fittings and booster pumps.',
      trade_categories: ['cat-plumbing'],
      kyc_status: 'verified',
      kyc_documents: {
        aadhaar_url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&q=80',
        trade_license_url: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=400&q=80',
        photo_url: 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=150&q=80'
      },
      aadhaar_number: 'XXXX-XXXX-4821',
      trade_license_number: 'KA-SHIV-PLUMB-2018-992',
      rating: 4.92,
      total_reviews: 134,
      is_available: true,
      is_online: true,
      current_lat: 14.1670, // Near Gandhi Nagar, Sagara
      current_lng: 75.0298,
      service_radius_km: 15,
      bank_account_info: {
        account_number: '•••• 7789',
        ifsc: 'KARB0000720',
        bank_name: 'Karnataka Bank Sagara Main Branch'
      },
      total_earnings: 42800,
      pending_payout: 3450,
      created_at: new Date(Date.now() - 90 * 86400000).toISOString()
    },
    {
      id: 'prov-2',
      user_id: 'usr-prov-2',
      bio: 'PWD Licensed Wireman (Grade 1). Expert in 3-phase wiring, fan rewind, MCB tripping resolution and solar/inverter setups in Sagara and Jog Road area.',
      trade_categories: ['cat-electrical'],
      kyc_status: 'verified',
      kyc_documents: {
        aadhaar_url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&q=80',
        trade_license_url: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=400&q=80',
        photo_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&q=80'
      },
      aadhaar_number: 'XXXX-XXXX-6192',
      trade_license_number: 'KA-ELEC-LIC-09182',
      rating: 4.86,
      total_reviews: 98,
      is_available: true,
      is_online: true,
      current_lat: 14.1750, // Near Keladi Road
      current_lng: 75.0340,
      service_radius_km: 15,
      bank_account_info: {
        account_number: '•••• 2314',
        ifsc: 'SBIN0000912',
        bank_name: 'SBI Sagara B.H. Road Branch'
      },
      total_earnings: 38200,
      pending_payout: 2890,
      created_at: new Date(Date.now() - 75 * 86400000).toISOString()
    },
    {
      id: 'prov-3',
      user_id: 'usr-prov-3',
      bio: 'Leading eco-friendly sanitization & deep cleaning team in Sagara. Uses skin-safe hospital grade disinfectants and motorized tile cleaners.',
      trade_categories: ['cat-cleaning'],
      kyc_status: 'verified',
      kyc_documents: {
        aadhaar_url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&q=80',
        trade_license_url: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=400&q=80',
        photo_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&q=80'
      },
      aadhaar_number: 'XXXX-XXXX-3349',
      trade_license_number: 'SAGA-CMC-CLEAN-2021',
      rating: 4.95,
      total_reviews: 142,
      is_available: true,
      is_online: true,
      current_lat: 14.1590, // Vinobha Nagar
      current_lng: 75.0360,
      service_radius_km: 15,
      bank_account_info: {
        account_number: '•••• 9011',
        ifsc: 'CNRB0001889',
        bank_name: 'Canara Bank Sagara Town'
      },
      total_earnings: 51200,
      pending_payout: 4100,
      created_at: new Date(Date.now() - 60 * 86400000).toISOString()
    },
    {
      id: 'prov-4',
      user_id: 'usr-prov-4',
      bio: 'Specialized technician for Samsung, LG, Whirlpool appliances & Daikin ACs. 9+ years authorized service center background.',
      trade_categories: ['cat-appliance'],
      kyc_status: 'verified',
      kyc_documents: {
        aadhaar_url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&q=80',
        trade_license_url: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=400&q=80',
        photo_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&q=80'
      },
      aadhaar_number: 'XXXX-XXXX-8821',
      trade_license_number: 'HVAC-CERT-55201',
      rating: 4.88,
      total_reviews: 84,
      is_available: true,
      is_online: true,
      current_lat: 14.1685, // B.H. Road Market
      current_lng: 75.0280,
      service_radius_km: 15,
      bank_account_info: {
        account_number: '•••• 4552',
        ifsc: 'BARB0SAGARA',
        bank_name: 'Bank of Baroda Sagara'
      },
      total_earnings: 29400,
      pending_payout: 1850,
      created_at: new Date(Date.now() - 45 * 86400000).toISOString()
    },

    // PENDING KYC Provider for Admin review
    {
      id: 'prov-pending',
      user_id: 'usr-prov-pending',
      bio: 'ITI-Trained Electrician looking to join Sagara marketplace. Ready for domestic wiring and pump repair jobs.',
      trade_categories: ['cat-electrical'],
      kyc_status: 'pending',
      kyc_documents: {
        aadhaar_url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&q=80',
        trade_license_url: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=400&q=80',
        photo_url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&q=80'
      },
      aadhaar_number: 'XXXX-XXXX-9912',
      trade_license_number: 'ITI-SHIV-ELEC-2023',
      rating: 5.0,
      total_reviews: 0,
      is_available: true,
      is_online: false,
      current_lat: 14.1620, // Subhash Nagar
      current_lng: 75.0250,
      service_radius_km: 10,
      bank_account_info: {
        account_number: '•••• 1289',
        ifsc: 'KARB0000720',
        bank_name: 'Karnataka Bank Sagara'
      },
      total_earnings: 0,
      pending_payout: 0,
      created_at: new Date(Date.now() - 2 * 86400000).toISOString()
    }
  ];

  const customer_addresses: CustomerAddressRecord[] = [
    {
      id: 'addr-1',
      user_id: 'usr-cust-1',
      label: 'Home',
      locality: 'Gandhi Nagar, Sagara',
      landmark: 'Near Raghavendra Swamy Temple',
      full_address: 'House #42/B, 2nd Cross, Gandhi Nagar, Sagara, Karnataka 577401',
      lat: 14.1670,
      lng: 75.0298,
      is_default: true,
      created_at: new Date(Date.now() - 30 * 86400000).toISOString()
    },
    {
      id: 'addr-2',
      user_id: 'usr-cust-1',
      label: 'Arecanut Plantation Farmhouse',
      locality: 'Keladi Road, Sagara',
      landmark: 'Near Keladi Rameshwara Heritage Gate',
      full_address: 'Venkateshwara Farm, Keladi Road, Sagara, Karnataka 577401',
      lat: 14.1780,
      lng: 75.0350,
      is_default: false,
      created_at: new Date(Date.now() - 15 * 86400000).toISOString()
    },
    {
      id: 'addr-3',
      user_id: 'usr-cust-2',
      label: 'Home',
      locality: 'Vinobha Nagar, Sagara',
      landmark: 'Opposite Government Junior College',
      full_address: 'Plot 12, Vinobha Nagar Main Road, Sagara, Karnataka 577401',
      lat: 14.1590,
      lng: 75.0360,
      is_default: true,
      created_at: new Date(Date.now() - 20 * 86400000).toISOString()
    }
  ];

  const newState: DatabaseState = {
    users,
    providers,
    customer_addresses,
    service_categories: categories,
    services,
    bookings: [],
    booking_events: [],
    payments: [],
    reviews: [],
    receipts: [],
    coupons: [
      {
        id: 'coup-welcome50',
        code: 'WELCOME50',
        discount_type: 'fixed',
        value: 50,
        min_order_paise: 29900,
        max_discount_paise: 5000,
        expires_at: '2030-12-31T23:59:59.000Z',
        usage_limit: 10000,
        per_user_limit: 1,
        times_used: 0,
        is_active: true,
        description: 'Flat ₹50 off on local services above ₹299'
      },
      {
        id: 'coup-festive100',
        code: 'FESTIVE100',
        discount_type: 'fixed',
        value: 100,
        min_order_paise: 49900,
        max_discount_paise: 10000,
        expires_at: '2030-12-31T23:59:59.000Z',
        usage_limit: 5000,
        per_user_limit: 2,
        times_used: 0,
        is_active: true,
        description: 'Flat ₹100 off on services above ₹499'
      },
      {
        id: 'coup-sagara10',
        code: 'SAGARA10',
        discount_type: 'percentage',
        value: 10,
        min_order_paise: 29900,
        max_discount_paise: 15000,
        expires_at: '2030-12-31T23:59:59.000Z',
        usage_limit: 5000,
        per_user_limit: 5,
        times_used: 0,
        is_active: true,
        description: '10% off up to ₹150 for Sagara residents'
      },
      {
        id: 'coup-expired',
        code: 'EXPIRED20',
        discount_type: 'fixed',
        value: 20,
        min_order_paise: 10000,
        expires_at: '2020-01-01T00:00:00.000Z',
        usage_limit: 100,
        per_user_limit: 1,
        times_used: 0,
        is_active: true,
        description: 'Expired test coupon'
      },
      {
        id: 'coup-capped',
        code: 'CAPPEDMAX',
        discount_type: 'fixed',
        value: 30,
        min_order_paise: 10000,
        expires_at: '2030-12-31T23:59:59.000Z',
        usage_limit: 1,
        per_user_limit: 1,
        times_used: 1,
        is_active: true,
        description: 'Fully used global limit test coupon'
      }
    ],
    coupon_redemptions: [],
    settlement_ledger: [],
    manual_reviews: [],
    ip_rate_limits: [],
    processed_events: [],
    audit_logs: [
      {
        id: 'audit-init-1',
        actor_id: 'usr-admin-1',
        actor_role: 'admin',
        action: 'MARKETPLACE_INITIALIZED',
        entity_type: 'system',
        entity_id: 'sagara-platform',
        details: { region: 'Sagara, Karnataka 577401', active_services: services.length },
        ip_address: '127.0.0.1',
        timestamp: new Date().toISOString()
      }
    ]
  };

  db.reset(newState);
  console.log(`[Seed] Seeded ${categories.length} categories, ${services.length} services, ${providers.length} providers, ${users.length} users.`);
}

// Auto seed if executed directly
if (process.argv[1]?.includes('seed')) {
  seedDatabase();
}
