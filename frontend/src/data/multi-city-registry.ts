export interface CityConfig {
  id: string;
  name: string;
  name_kn: string;
  state: string;
  pincode: string;
  center: { lat: number; lng: number };
  defaultZoom: number;
  isServiceable?: boolean;
  localities: Array<{
    id: string;
    name: string;
    name_kn: string;
    landmark: string;
    lat: number;
    lng: number;
    pincode: string;
  }>;
}

export const SUPPORTED_CITIES: CityConfig[] = [
  {
    id: 'sagara',
    name: 'Sagara (Shivamogga District)',
    name_kn: 'ಸಾಗರ (ಶಿವಮೊಗ್ಗ)',
    state: 'Karnataka',
    pincode: '577401',
    center: { lat: 14.1670, lng: 75.0298 },
    defaultZoom: 14,
    isServiceable: true,
    localities: [
      { id: 'gandhi-nagar', name: 'Gandhi Nagar', name_kn: 'ಗಾಂಧಿ ನಗರ', landmark: 'Rotary Circle', lat: 14.1670, lng: 75.0298, pincode: '577401' },
      { id: 'keladi-road', name: 'Keladi Road', name_kn: 'ಕೆಳದಿ ರಸ್ತೆ', landmark: 'Keladi Heritage Gate', lat: 14.1750, lng: 75.0340, pincode: '577401' },
      { id: 'vinobha-nagar', name: 'Vinobha Nagar', name_kn: 'ವಿನೋಬಾ ನಗರ', landmark: 'Opp. Junior College', lat: 14.1590, lng: 75.0360, pincode: '577401' },
      { id: 'subhash-nagar', name: 'Subhash Nagar', name_kn: 'ಸುಭಾಷ್ ನಗರ', landmark: 'Behind CMC Sagara', lat: 14.1620, lng: 75.0250, pincode: '577401' },
      { id: 'bh-road', name: 'B.H. Road / Main Market', name_kn: 'ಬಿ.ಹೆಚ್. ರಸ್ತೆ', landmark: 'Near KSRTC Bus Stand', lat: 14.1685, lng: 75.0280, pincode: '577401' },
      { id: 'jog-road', name: 'Jog Falls Road', name_kn: 'ಜೋಗ್ ರಸ್ತೆ', landmark: 'Marikamba Temple Arch', lat: 14.1800, lng: 75.0180, pincode: '577401' }
    ]
  },
  {
    id: 'hosanagara',
    name: 'Hosanagara (Shivamogga District)',
    name_kn: 'ಹೊಸನಗರ (ಶಿವಮೊಗ್ಗ)',
    state: 'Karnataka',
    pincode: '577418',
    center: { lat: 13.9190, lng: 75.0670 },
    defaultZoom: 14,
    isServiceable: true,
    localities: [
      { id: 'hn-market', name: 'Main Market / Bus Stand', name_kn: 'ಮುಖ್ಯ ಮಾರುಕಟ್ಟೆ / ಬಸ್ ನಿಲ್ದಾಣ', landmark: 'Near KSRTC Bus Stand', lat: 13.9190, lng: 75.0670, pincode: '577418' },
      { id: 'hn-riponpet', name: 'Riponpet Road', name_kn: 'ರಿಪನ್‌ಪೇಟೆ ರಸ್ತೆ', landmark: 'Near Mini Vidhana Soudha', lat: 13.9210, lng: 75.0710, pincode: '577418' },
      { id: 'hn-kerehalli', name: 'Kerehalli Road', name_kn: 'ಕೆರೆಹಳ್ಳಿ ರಸ್ತೆ', landmark: 'Near Govt College', lat: 13.9140, lng: 75.0620, pincode: '577418' },
      { id: 'hn-kodachadri', name: 'Kodachadri Road', name_kn: 'ಕೊಡಚಾದ್ರಿ ರಸ್ತೆ', landmark: 'Near Sharavathi Backwater', lat: 13.9250, lng: 75.0590, pincode: '577418' },
      { id: 'hn-nagar', name: 'Nagar Heritage Road', name_kn: 'ನಗರ ಕೋಟೆ ರಸ್ತೆ', landmark: 'Near Keladi Nayaka Fort', lat: 13.8230, lng: 75.0280, pincode: '577452' }
    ]
  },
  {
    id: 'honnali',
    name: 'Honnali (Davanagere / Shivamogga Border)',
    name_kn: 'ಹೊನ್ನಾಳಿ',
    state: 'Karnataka',
    pincode: '577217',
    center: { lat: 14.2443, lng: 75.6425 },
    defaultZoom: 14,
    isServiceable: true,
    localities: [
      { id: 'hl-bus-stand', name: 'Honnali Main Bus Stand Circle', name_kn: 'ಹೊನ್ನಾಳಿ ಬಸ್ ನಿಲ್ದಾಣ ವೃತ್ತ', landmark: 'Near KSRTC Depo & TB Circle', lat: 14.2443, lng: 75.6425, pincode: '577217' },
      { id: 'hl-bridge', name: 'Tungabhadra River Bridge Road', name_kn: 'ತುಂಗಭದ್ರಾ ನದಿ ಸೇತುವೆ ರಸ್ತೆ', landmark: 'Near Tungabhadra River Ghat', lat: 14.2480, lng: 75.6450, pincode: '577217' },
      { id: 'hl-tb-circle', name: 'TB Circle / Administrative Complex', name_kn: 'ಟಿ.ಬಿ. ಸರ್ಕಲ್ / ಮಿನಿ ವಿಧಾನ ಸೌಧ', landmark: 'Near Taluk Office', lat: 14.2410, lng: 75.6390, pincode: '577217' },
      { id: 'hl-durgigudi', name: 'Durgigudi Honnali', name_kn: 'ದುರ್ಗಿಗುಡಿ ಹೊನ್ನಾಳಿ', landmark: 'Near Raghavendra Swamy Mutt', lat: 14.2460, lng: 75.6410, pincode: '577217' },
      { id: 'hl-shikaripura', name: 'Shikaripura Road', name_kn: 'ಶಿಕಾರಿಪುರ ರಸ್ತೆ', landmark: 'Near APMC Yard', lat: 14.2510, lng: 75.6350, pincode: '577217' }
    ]
  },
  {
    id: 'shivamogga',
    name: 'Shivamogga (Shimoga)',
    name_kn: 'ಶಿವಮೊಗ್ಗ',
    state: 'Karnataka',
    pincode: '577201',
    center: { lat: 13.9299, lng: 75.5681 },
    defaultZoom: 13,
    isServiceable: false,
    localities: [
      { id: 'gopi-circle', name: 'Gopi Circle', name_kn: 'ಗೋಪಿ ಸರ್ಕಲ್', landmark: 'City Center', lat: 13.9312, lng: 75.5665, pincode: '577201' },
      { id: 'durgigudi', name: 'Durgigudi', name_kn: 'ದುರ್ಗಿಗುಡಿ', landmark: 'Main Commercial Hub', lat: 13.9340, lng: 75.5620, pincode: '577201' },
      { id: 'vinoba-smg', name: 'Vinoba Nagara', name_kn: 'ವಿನೋಬಾ ನಗರ (ಶಿವಮೊಗ್ಗ)', landmark: 'Near 100ft Road', lat: 13.9420, lng: 75.5800, pincode: '577204' }
    ]
  },
  {
    id: 'bengaluru',
    name: 'Bengaluru (Bangalore)',
    name_kn: 'ಬೆಂಗಳೂರು',
    state: 'Karnataka',
    pincode: '560001',
    center: { lat: 12.9716, lng: 77.5946 },
    defaultZoom: 12,
    isServiceable: false,
    localities: [
      { id: 'indiranagar', name: 'Indiranagar 100ft Rd', name_kn: 'ಇಂದಿರಾನಗರ', landmark: '12th Main', lat: 12.9784, lng: 77.6408, pincode: '560038' },
      { id: 'koramangala', name: 'Koramangala 4th Block', name_kn: 'ಕೋರಮಂಗಲ', landmark: 'Near Sony World Signal', lat: 12.9352, lng: 77.6245, pincode: '560034' },
      { id: 'hsr-layout', name: 'HSR Layout Sector 1', name_kn: 'ಎಚ್‌ಎಸ್‌ಆರ್ ಲೇಔಟ್', landmark: 'BDA Complex', lat: 12.9121, lng: 77.6446, pincode: '560102' }
    ]
  },
  {
    id: 'hubballi',
    name: 'Hubballi - Dharwad',
    name_kn: 'ಹುಬ್ಬಳ್ಳಿ - ಧಾರವಾಡ',
    state: 'Karnataka',
    pincode: '580020',
    center: { lat: 15.3647, lng: 75.1240 },
    defaultZoom: 13,
    isServiceable: false,
    localities: [
      { id: 'vidyanagar-hub', name: 'Vidyanagar', name_kn: 'ವಿದ್ಯಾನಗರ', landmark: 'KLE Tech University', lat: 15.3720, lng: 75.1210, pincode: '580031' },
      { id: 'cbt-hub', name: 'CBT Hubballi', name_kn: 'ಸಿಬಿಟಿ ಹುಬ್ಬಳ್ಳಿ', landmark: 'Old Bus Stand', lat: 15.3530, lng: 75.1380, pincode: '580020' }
    ]
  },
  {
    id: 'mangalore',
    name: 'Mangaluru (Mangalore)',
    name_kn: 'ಮಂಗಳೂರು',
    state: 'Karnataka',
    pincode: '575001',
    center: { lat: 12.9141, lng: 74.8560 },
    defaultZoom: 13,
    isServiceable: false,
    localities: [
      { id: 'hampankatta', name: 'Hampankatta', name_kn: 'ಹಂಪನಕಟ್ಟೆ', landmark: 'City Center Mall', lat: 12.8698, lng: 74.8430, pincode: '575001' },
      { id: 'kadri', name: 'Kadri Hills', name_kn: 'ಕದ್ರಿ', landmark: 'Kadri Manjunatha Temple', lat: 12.8845, lng: 74.8620, pincode: '575002' }
    ]
  }
];
