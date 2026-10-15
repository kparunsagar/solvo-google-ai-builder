export interface SagaraLocality {
  id: string;
  name: string;
  name_kn: string;
  landmark: string;
  lat: number;
  lng: number;
  pincode: string;
  region: 'sagara' | 'hosanagara' | 'honnali' | 'bengaluru';
  regionName: string;
  regionNameKn: string;
}

export interface RegionHubConfig {
  id: 'sagara' | 'hosanagara' | 'honnali' | 'bengaluru';
  name: string;
  nameKn: string;
  district: string;
  pincode: string;
  center: { lat: number; lng: number };
  defaultZoom: number;
  landmarks: string[];
}

export const REGION_HUBS: Record<'sagara' | 'hosanagara' | 'honnali' | 'bengaluru', RegionHubConfig> = {
  bengaluru: {
    id: 'bengaluru',
    name: 'Bengaluru',
    nameKn: 'ಬೆಂಗಳೂರು',
    district: 'Bengaluru Urban',
    pincode: '560001',
    center: { lat: 12.9716, lng: 77.5946 },
    defaultZoom: 12,
    landmarks: ['MG Road Metro Station', 'Indiranagar 100ft Road', 'Koramangala Sony World Signal', 'Whitefield ITPL', 'HSR Layout BDA Complex']
  },
  sagara: {
    id: 'sagara',
    name: 'Sagara',
    nameKn: 'ಸಾಗರ',
    district: 'Shivamogga',
    pincode: '577401',
    center: { lat: 14.1670, lng: 75.0298 },
    defaultZoom: 14,
    landmarks: ['Rotary Circle', 'Keladi Heritage Gate', 'Marikamba Temple', 'CMC Sagara']
  },
  hosanagara: {
    id: 'hosanagara',
    name: 'Hosanagara',
    nameKn: 'ಹೊಸನಗರ',
    district: 'Shivamogga',
    pincode: '577418',
    center: { lat: 13.9190, lng: 75.0670 },
    defaultZoom: 14,
    landmarks: ['KSRTC Bus Stand', 'Mini Vidhana Soudha', 'Nagar Fort (Bidanur)', 'Sharavathi Backwater']
  },
  honnali: {
    id: 'honnali',
    name: 'Honnali',
    nameKn: 'ಹೊನ್ನಾಳಿ',
    district: 'Davanagere / Shivamogga Border',
    pincode: '577217',
    center: { lat: 14.2443, lng: 75.6425 },
    defaultZoom: 14,
    landmarks: ['Tungabhadra River Bridge', 'Honnali Bus Stand', 'TB Circle', 'Durgigudi']
  }
};

export const SAGARA_ONLY_LOCALITIES: SagaraLocality[] = [
  {
    id: 'gandhi-nagar',
    name: 'Gandhi Nagar',
    name_kn: 'ಗಾಂಧಿ ನಗರ',
    landmark: 'Near Raghavendra Swamy Temple / Rotary Circle',
    lat: 14.1670,
    lng: 75.0298,
    pincode: '577401',
    region: 'sagara',
    regionName: 'Sagara',
    regionNameKn: 'ಸಾಗರ'
  },
  {
    id: 'keladi-road',
    name: 'Keladi Road',
    name_kn: 'ಕೆಳದಿ ರಸ್ತೆ',
    landmark: 'Near Keladi Rameshwara Heritage Gate',
    lat: 14.1750,
    lng: 75.0340,
    pincode: '577401',
    region: 'sagara',
    regionName: 'Sagara',
    regionNameKn: 'ಸಾಗರ'
  },
  {
    id: 'vinobha-nagar',
    name: 'Vinobha Nagar',
    name_kn: 'ವಿನೋಬಾ ನಗರ',
    landmark: 'Opp. Government Junior College',
    lat: 14.1590,
    lng: 75.0360,
    pincode: '577401',
    region: 'sagara',
    regionName: 'Sagara',
    regionNameKn: 'ಸಾಗರ'
  },
  {
    id: 'subhash-nagar',
    name: 'Subhash Nagar',
    name_kn: 'ಸುಭಾಷ್ ನಗರ',
    landmark: 'Behind City Municipal Council (CMC)',
    lat: 14.1620,
    lng: 75.0250,
    pincode: '577401',
    region: 'sagara',
    regionName: 'Sagara',
    regionNameKn: 'ಸಾಗರ'
  },
  {
    id: 'bh-road',
    name: 'B.H. Road / Main Market',
    name_kn: 'ಬಿ.ಹೆಚ್. ರಸ್ತೆ / ಮಾರುಕಟ್ಟೆ',
    landmark: 'Near Sagara KSRTC Bus Stand',
    lat: 14.1685,
    lng: 75.0280,
    pincode: '577401',
    region: 'sagara',
    regionName: 'Sagara',
    regionNameKn: 'ಸಾಗರ'
  },
  {
    id: 'jog-road',
    name: 'Jog Falls Road',
    name_kn: 'ಜೋಗ್ ರಸ್ತೆ',
    landmark: 'Near Marikamba Temple Entrance',
    lat: 14.1800,
    lng: 75.0180,
    pincode: '577401',
    region: 'sagara',
    regionName: 'Sagara',
    regionNameKn: 'ಸಾಗರ'
  },
  {
    id: 'nehru-nagar',
    name: 'Nehru Nagar',
    name_kn: 'ನೆಹರು ನಗರ',
    landmark: 'Near LB College Ground',
    lat: 14.1650,
    lng: 75.0420,
    pincode: '577401',
    region: 'sagara',
    regionName: 'Sagara',
    regionNameKn: 'ಸಾಗರ'
  },
  {
    id: 'holebagilu-road',
    name: 'Holebagilu Road',
    name_kn: 'ಹೊಳೆಬಾಗಿಲು ರಸ್ತೆ',
    landmark: 'Near Varada River Bridge',
    lat: 14.1520,
    lng: 75.0150,
    pincode: '577401',
    region: 'sagara',
    regionName: 'Sagara',
    regionNameKn: 'ಸಾಗರ'
  }
];

export const HOSANAGARA_LOCALITIES: SagaraLocality[] = [
  {
    id: 'hn-market',
    name: 'Main Market / Bus Stand Road',
    name_kn: 'ಮುಖ್ಯ ಮಾರುಕಟ್ಟೆ / ಬಸ್ ನಿಲ್ದಾಣ ರಸ್ತೆ',
    landmark: 'Near KSRTC Bus Stand Hosanagara',
    lat: 13.9190,
    lng: 75.0670,
    pincode: '577418',
    region: 'hosanagara',
    regionName: 'Hosanagara',
    regionNameKn: 'ಹೊಸನಗರ'
  },
  {
    id: 'hn-riponpet-rd',
    name: 'Riponpet Road',
    name_kn: 'ರಿಪನ್‌ಪೇಟೆ ರಸ್ತೆ',
    landmark: 'Near Taluk Office / Mini Vidhana Soudha',
    lat: 13.9210,
    lng: 75.0710,
    pincode: '577418',
    region: 'hosanagara',
    regionName: 'Hosanagara',
    regionNameKn: 'ಹೊಸನಗರ'
  },
  {
    id: 'hn-kerehalli-rd',
    name: 'Kerehalli Road',
    name_kn: 'ಕೆರೆಹಳ್ಳಿ ರಸ್ತೆ',
    landmark: 'Near Govt First Grade College Hosanagara',
    lat: 13.9140,
    lng: 75.0620,
    pincode: '577418',
    region: 'hosanagara',
    regionName: 'Hosanagara',
    regionNameKn: 'ಹೊಸನಗರ'
  },
  {
    id: 'hn-kodachadri-rd',
    name: 'Kodachadri Road',
    name_kn: 'ಕೊಡಚಾದ್ರಿ ರಸ್ತೆ',
    landmark: 'Near Sharavathi Backwater View Point',
    lat: 13.9250,
    lng: 75.0590,
    pincode: '577418',
    region: 'hosanagara',
    regionName: 'Hosanagara',
    regionNameKn: 'ಹೊಸನಗರ'
  },
  {
    id: 'hn-nagar-fort',
    name: 'Nagar Heritage Road',
    name_kn: 'ನಗರ ಕೋಟೆ ರಸ್ತೆ',
    landmark: 'Near Historic Keladi Shivappa Nayaka Fort (Bidanur)',
    lat: 13.8230,
    lng: 75.0280,
    pincode: '577452',
    region: 'hosanagara',
    regionName: 'Hosanagara',
    regionNameKn: 'ಹೊಸನಗರ'
  },
  {
    id: 'hn-sharavathi-nagar',
    name: 'Sharavathi Nagar',
    name_kn: 'ಶರಾವತಿ ನಗರ',
    landmark: 'Near APMC Yard Hosanagara',
    lat: 13.9170,
    lng: 75.0740,
    pincode: '577418',
    region: 'hosanagara',
    regionName: 'Hosanagara',
    regionNameKn: 'ಹೊಸನಗರ'
  }
];

export const HONNALI_LOCALITIES: SagaraLocality[] = [
  {
    id: 'hl-bus-stand',
    name: 'Honnali Main Bus Stand Circle',
    name_kn: 'ಹೊನ್ನಾಳಿ ಮುಖ್ಯ ಬಸ್ ನಿಲ್ದಾಣ ವೃತ್ತ',
    landmark: 'Near KSRTC Depo & Old TB Circle',
    lat: 14.2443,
    lng: 75.6425,
    pincode: '577217',
    region: 'honnali',
    regionName: 'Honnali',
    regionNameKn: 'ಹೊನ್ನಾಳಿ'
  },
  {
    id: 'hl-river-bridge',
    name: 'Tungabhadra River Bridge Road',
    name_kn: 'ತುಂಗಭದ್ರಾ ನದಿ ಸೇತುವೆ ರಸ್ತೆ',
    landmark: 'Near Tungabhadra River Ghat',
    lat: 14.2480,
    lng: 75.6450,
    pincode: '577217',
    region: 'honnali',
    regionName: 'Honnali',
    regionNameKn: 'ಹೊನ್ನಾಳಿ'
  },
  {
    id: 'hl-tb-circle',
    name: 'TB Circle / Mini Vidhana Soudha',
    name_kn: 'ಟಿ.ಬಿ. ಸರ್ಕಲ್ / ಮಿನಿ ವಿಧಾನ ಸೌಧ',
    landmark: 'Near Taluk Administrative Complex Honnali',
    lat: 14.2410,
    lng: 75.6390,
    pincode: '577217',
    region: 'honnali',
    regionName: 'Honnali',
    regionNameKn: 'ಹೊನ್ನಾಳಿ'
  },
  {
    id: 'hl-durgigudi',
    name: 'Durgigudi Honnali',
    name_kn: 'ದುರ್ಗಿಗುಡಿ ಹೊನ್ನಾಳಿ',
    landmark: 'Near Sri Raghavendra Swamy Mutt',
    lat: 14.2460,
    lng: 75.6410,
    pincode: '577217',
    region: 'honnali',
    regionName: 'Honnali',
    regionNameKn: 'ಹೊನ್ನಾಳಿ'
  },
  {
    id: 'hl-shikaripura-rd',
    name: 'Shikaripura Road',
    name_kn: 'ಶಿಕಾರಿಪುರ ರಸ್ತೆ',
    landmark: 'Near APMC Market Yard Honnali',
    lat: 14.2510,
    lng: 75.6350,
    pincode: '577217',
    region: 'honnali',
    regionName: 'Honnali',
    regionNameKn: 'ಹೊನ್ನಾಳಿ'
  },
  {
    id: 'hl-channagiri-rd',
    name: 'Channagiri Road',
    name_kn: 'ಚನ್ನಗಿರಿ ರಸ್ತೆ',
    landmark: 'Near Govt Pre-University College Honnali',
    lat: 14.2380,
    lng: 75.6460,
    pincode: '577217',
    region: 'honnali',
    regionName: 'Honnali',
    regionNameKn: 'ಹೊನ್ನಾಳಿ'
  }
];

export const BENGALURU_LOCALITIES: SagaraLocality[] = [
  {
    id: 'blr-indiranagar',
    name: 'Indiranagar (100ft Rd / 12th Main)',
    name_kn: 'ಇಂದಿರಾನಗರ',
    landmark: 'Near 100 Feet Road / CMH Road Metro',
    lat: 12.9784,
    lng: 77.6408,
    pincode: '560038',
    region: 'bengaluru',
    regionName: 'Bengaluru',
    regionNameKn: 'ಬೆಂಗಳೂರು'
  },
  {
    id: 'blr-koramangala',
    name: 'Koramangala (Sony World / 80ft Rd)',
    name_kn: 'ಕೋರಮಂಗಲ',
    landmark: 'Near Sony World Signal & Forum Mall',
    lat: 12.9352,
    lng: 77.6245,
    pincode: '560034',
    region: 'bengaluru',
    regionName: 'Bengaluru',
    regionNameKn: 'ಬೆಂಗಳೂರು'
  },
  {
    id: 'blr-hsr',
    name: 'HSR Layout (Sectors 1-7)',
    name_kn: 'ಎಚ್.ಎಸ್.ಆರ್. ಬಡಾವಣೆ',
    landmark: 'Near HSR BDA Complex & 27th Main',
    lat: 12.9121,
    lng: 77.6446,
    pincode: '560102',
    region: 'bengaluru',
    regionName: 'Bengaluru',
    regionNameKn: 'ಬೆಂಗಳೂರು'
  },
  {
    id: 'blr-whitefield',
    name: 'Whitefield / ITPL Main Road',
    name_kn: 'ವೈಟ್‌ಫೀಲ್ಡ್',
    landmark: 'Near ITPL Gate & Hope Farm Circle',
    lat: 12.9698,
    lng: 77.7500,
    pincode: '560066',
    region: 'bengaluru',
    regionName: 'Bengaluru',
    regionNameKn: 'ಬೆಂಗಳೂರು'
  },
  {
    id: 'blr-jayanagar',
    name: 'Jayanagar (3rd & 4th Blocks)',
    name_kn: 'ಜಯನಗರ',
    landmark: 'Near Jayanagar 4th Block Shopping Complex',
    lat: 12.9308,
    lng: 77.5838,
    pincode: '560011',
    region: 'bengaluru',
    regionName: 'Bengaluru',
    regionNameKn: 'ಬೆಂಗಳೂರು'
  },
  {
    id: 'blr-mg-road',
    name: 'MG Road / Brigade Road / CBD',
    name_kn: 'ಎಂ.ಜಿ. ರಸ್ತೆ / ಬ್ರಿಗೇಡ್ ರಸ್ತೆ',
    landmark: 'Near MG Road Metro & Church Street',
    lat: 12.9756,
    lng: 77.6066,
    pincode: '560001',
    region: 'bengaluru',
    regionName: 'Bengaluru',
    regionNameKn: 'ಬೆಂಗಳೂರು'
  },
  {
    id: 'blr-electronic-city',
    name: 'Electronic City (Phase 1 & Phase 2)',
    name_kn: 'ಎಲೆಕ್ಟ್ರಾನಿಕ್ ಸಿಟಿ',
    landmark: 'Near Infosys Gate 1 & Toll Plaza',
    lat: 12.8452,
    lng: 77.6602,
    pincode: '560100',
    region: 'bengaluru',
    regionName: 'Bengaluru',
    regionNameKn: 'ಬೆಂಗಳೂರು'
  },
  {
    id: 'blr-marathahalli',
    name: 'Marathahalli / Outer Ring Road',
    name_kn: 'ಮಾರತಹಳ್ಳಿ',
    landmark: 'Near Marathahalli Bridge & Multiplex',
    lat: 12.9591,
    lng: 77.6974,
    pincode: '560037',
    region: 'bengaluru',
    regionName: 'Bengaluru',
    regionNameKn: 'ಬೆಂಗಳೂರು'
  },
  {
    id: 'blr-malleshwaram',
    name: 'Malleshwaram (Sampige & Margosa Rd)',
    name_kn: 'ಮಲ್ಲೇಶ್ವರಂ',
    landmark: 'Near 8th Cross / Kadu Malleshwara Temple',
    lat: 13.0031,
    lng: 77.5643,
    pincode: '560003',
    region: 'bengaluru',
    regionName: 'Bengaluru',
    regionNameKn: 'ಬೆಂಗಳೂರು'
  },
  {
    id: 'blr-bellandur',
    name: 'Bellandur / EcoSpace IT Park',
    name_kn: 'ಬೆಳ್ಳಂದೂರು',
    landmark: 'Near EcoSpace / Central Mall',
    lat: 12.9260,
    lng: 77.6762,
    pincode: '560103',
    region: 'bengaluru',
    regionName: 'Bengaluru',
    regionNameKn: 'ಬೆಂಗಳೂರು'
  },
  {
    id: 'blr-sanjayanagara-marathahalli',
    name: 'Sanjayanagara (Marathahalli)',
    name_kn: 'ಸಂಜಯನಗರ (ಮಾರತಹಳ್ಳಿ)',
    landmark: '1st Cross Road, Marathahalli, Near Outer Ring Road',
    lat: 12.9562,
    lng: 77.7015,
    pincode: '560037',
    region: 'bengaluru',
    regionName: 'Bengaluru',
    regionNameKn: 'ಬೆಂಗಳೂರು'
  },
  {
    id: 'blr-sanjayanagar',
    name: 'Sanjayanagar (New BEL Road / RMV)',
    name_kn: 'ಸಂಜಯನಗರ (ನ್ಯೂ ಬಿಇಎಲ್ ರಸ್ತೆ)',
    landmark: 'Near Radhakrishna Temple & New BEL Road',
    lat: 13.0382,
    lng: 77.5760,
    pincode: '560094',
    region: 'bengaluru',
    regionName: 'Bengaluru',
    regionNameKn: 'ಬೆಂಗಳೂರು'
  }
];

// Unified list across all active service regions (Bengaluru, Sagara, Hosanagara, Honnali)
export const SAGARA_LOCALITIES: SagaraLocality[] = [
  ...BENGALURU_LOCALITIES,
  ...SAGARA_ONLY_LOCALITIES,
  ...HOSANAGARA_LOCALITIES,
  ...HONNALI_LOCALITIES
];

// Haversine distance in kilometers
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export function findLocalityByCoords(lat: number, lng: number): SagaraLocality {
  const distToShivamogga = calculateDistanceKm(lat, lng, 13.9299, 75.5681);
  if (distToShivamogga <= 25) {
    return {
      id: 'out-shivamogga',
      name: 'Shivamogga City',
      name_kn: 'ಶಿವಮೊಗ್ಗ',
      landmark: 'Shivamogga District Center',
      lat,
      lng,
      pincode: '577201',
      region: 'sagara',
      regionName: 'Shivamogga (Coming Soon)',
      regionNameKn: 'ಶಿವಮೊಗ್ಗ'
    };
  }

  let closest = SAGARA_LOCALITIES[0];
  let minDistance = Infinity;

  for (const loc of SAGARA_LOCALITIES) {
    const dist = calculateDistanceKm(lat, lng, loc.lat, loc.lng);
    if (dist < minDistance) {
      minDistance = dist;
      closest = loc;
    }
  }

  // If even the closest locality is > 45km away from any active hub, mark as Out of Service Area
  if (minDistance > 45) {
    return {
      id: 'out-of-area',
      name: `External Region (~${Math.round(minDistance)}km away)`,
      name_kn: 'ಹೊರ ಪ್ರದೇಶ',
      landmark: 'Location outside active service hubs',
      lat,
      lng,
      pincode: '000000',
      region: 'sagara',
      regionName: 'Out of Area',
      regionNameKn: 'ಹೊರ ಪ್ರದೇಶ'
    };
  }

  return closest;
}

export function detectRegionFromLocality(localityStr: string): 'sagara' | 'hosanagara' | 'honnali' | 'bengaluru' {
  const lower = (localityStr || '').toLowerCase();
  if (lower.includes('bengaluru') || lower.includes('bangalore') || lower.includes('blr') || lower.includes('560')) return 'bengaluru';
  if (lower.includes('hosanagara') || lower.includes('hosanagar') || lower.includes('577418')) return 'hosanagara';
  if (lower.includes('honnali') || lower.includes('honnalli') || lower.includes('577217')) return 'honnali';
  return 'sagara';
}

export function getLocalitiesForRegion(regionOrCity: string): SagaraLocality[] {
  const reg = detectRegionFromLocality(regionOrCity);
  switch (reg) {
    case 'bengaluru':
      return BENGALURU_LOCALITIES;
    case 'hosanagara':
      return HOSANAGARA_LOCALITIES;
    case 'honnali':
      return HONNALI_LOCALITIES;
    case 'sagara':
    default:
      return SAGARA_ONLY_LOCALITIES;
  }
}

