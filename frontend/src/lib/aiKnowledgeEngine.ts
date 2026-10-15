// SOLVO — Unified AI Knowledge Base & RAG On-the-Job Learning Engine
// Designed for Customer Concierge, Technician Field Copilot, and Admin Operations

import { db, isFirebaseLive } from './firebase';
import {
  collection,
  doc,
  setDoc,
  getDocs,
  serverTimestamp,
  updateDoc,
  increment
} from 'firebase/firestore';

export type UserPersona = 'customer' | 'technician' | 'admin';

export interface UserContextPayload {
  userId?: string | null;
  userName?: string | null;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  tradeCategory?: string | null;
  location?: string | null;
  city?: string | null;
  locality?: string | null;
}

export interface IoTTelemetryPayload {
  deviceId?: string;
  deviceType?: string;
  errorCode?: string;
  status?: string;
  voltage?: number;
  temperature?: number;
  signalStrength?: number;
}

export interface KnowledgeArticle {
  id: string;
  category: 'electrical' | 'plumbing' | 'ac_appliance' | 'cleaning' | 'carpentry' | 'painting' | 'platform';
  persona: 'customer' | 'technician' | 'admin' | 'all';
  title: string;
  keywords: string[];
  summary: string;
  detailedSteps?: string[];
  estimatedCost?: string;
  suggestedServiceId?: string;
  suggestedServiceName?: string;
  safetyWarning?: string;
  sparePartsGuidance?: string;
}

export interface LearnedResolution {
  id: string;
  category: string;
  query: string;
  symptom: string;
  resolution: string;
  partsUsed?: string;
  technicianName: string;
  locality: string;
  timestamp: string;
  helpfulCount: number;
  verifiedByAdmin: boolean;
}

export interface AiQueryResult {
  answer: string;
  persona: UserPersona;
  confidence: number;
  matchedSources: string[];
  learnedCaseStudies: LearnedResolution[];
  suggestedAction?: {
    label: string;
    actionType: 'BOOK_SERVICE' | 'SAFETY_ALERT' | 'CONTACT_SUPPORT' | 'VIEW_MANUAL';
    payload?: any;
  };
  safetyWarning?: string;
}

// ─── Location-Aware Pricing & Regional Service Hub Models ───────────────────
export interface LocationContext {
  city: string;
  locality: string;
  isMetro: boolean;
}

export const METRO_PRICING_MAP: Record<string, string> = {
  elec_fan_humming: '₹299 - ₹499 (Standard labor + capacitor)',
  elec_mcb_tripping: '₹399 - ₹699',
  elec_switch_spark: '₹199 - ₹399',
  plumb_low_pressure: '₹249 - ₹449',
  plumb_pipe_burst: '₹399 - ₹799',
  ac_not_cooling: '₹599 - ₹1,499 (Standard Service to Gas Refill)',
  appliance_ro_water: '₹399 - ₹799',
  appliance_washing_machine: '₹449 - ₹899',
  cleaning_deep_clean: '₹699 - ₹2,499 (Bathroom vs Full Home)',
};

export function resolveLocationContext(userContext?: UserContextPayload): LocationContext {
  const rawCity = (userContext?.city || '').toLowerCase();
  const rawLoc = (userContext?.location || userContext?.locality || '').toLowerCase();

  const isBlr =
    rawCity.includes('bengaluru') ||
    rawCity.includes('bangalore') ||
    rawCity.includes('blr') ||
    rawLoc.includes('bengaluru') ||
    rawLoc.includes('bangalore') ||
    rawLoc.includes('marappa') ||
    rawLoc.includes('indiranagar') ||
    rawLoc.includes('koramangala') ||
    rawLoc.includes('whitefield') ||
    rawLoc.includes('jayanagar') ||
    rawLoc.includes('hsr') ||
    rawLoc.includes('mg road') ||
    rawLoc.includes('brigade') ||
    rawLoc.includes('bellandur') ||
    rawLoc.includes('hebbal') ||
    rawLoc.includes('rajajinagar') ||
    rawLoc.includes('malleshwaram') ||
    /\b560\d{3}\b/.test(rawLoc);

  if (isBlr) {
    const primaryLoc = userContext?.locality || userContext?.location || 'Marappa Garden, Bengaluru';
    return {
      city: 'Bengaluru',
      locality: primaryLoc.includes('Bengaluru') || primaryLoc.includes('Bangalore') ? primaryLoc : `${primaryLoc}, Bengaluru`,
      isMetro: true
    };
  }

  if (rawCity.includes('hosanagara') || rawCity.includes('hosanagar') || rawLoc.includes('hosanagara') || rawLoc.includes('hosanagar') || /\b577418\b/.test(rawLoc)) {
    return {
      city: 'Hosanagara',
      locality: userContext?.locality || userContext?.location || 'Main Market, Hosanagara',
      isMetro: false
    };
  }

  if (rawCity.includes('honnali') || rawCity.includes('honnalli') || rawLoc.includes('honnali') || rawLoc.includes('honnalli') || /\b577217\b/.test(rawLoc)) {
    return {
      city: 'Honnali',
      locality: userContext?.locality || userContext?.location || 'Main Bus Stand Circle, Honnali',
      isMetro: false
    };
  }

  if (rawCity.includes('sagara') || rawCity.includes('sagar') || rawLoc.includes('sagara') || rawLoc.includes('sagar') || /\b577401\b/.test(rawLoc)) {
    return {
      city: 'Sagara',
      locality: userContext?.locality || userContext?.location || 'Gandhi Nagar, Sagara',
      isMetro: false
    };
  }

  if (userContext?.city && userContext.city.trim().length > 0) {
    const c = userContext.city.trim();
    return {
      city: c,
      locality: userContext?.locality || userContext?.location || c,
      isMetro: false
    };
  }

  return {
    city: 'Bengaluru',
    locality: userContext?.locality || userContext?.location || 'Bengaluru',
    isMetro: true
  };
}

export function getLocalizedCost(article: KnowledgeArticle, loc: LocationContext): string {
  if (loc.isMetro && METRO_PRICING_MAP[article.id]) {
    return METRO_PRICING_MAP[article.id];
  }
  return article.estimatedCost || '₹199 - ₹499';
}

// ─── 1. Static Domain Knowledge Base (Home Services & Technical SOPs) ────────
export const STATIC_KNOWLEDGE_BASE: KnowledgeArticle[] = [
  // ── ELECTRICAL ──
  {
    id: 'elec_fan_humming',
    category: 'electrical',
    persona: 'all',
    title: 'Ceiling Fan Humming Sound / Low Speed',
    keywords: ['fan', 'humming', 'slow', 'capacitor', 'bearing', 'speed', 'fan not spinning'],
    summary: 'A humming sound with slow rotation in ceiling fans is almost always caused by a degraded start/run capacitor (loss of microfarad capacitance from 2.5 µF to below 1.2 µF) or dry ball bearings.',
    detailedSteps: [
      '1. Turn OFF the regulator and switch; isolate power before touching the fan.',
      '2. Inspect the capacitor located inside the top canopy (standard rating: 2.25 µF to 2.5 µF, 440V AC).',
      '3. Discharge the capacitor with an insulated screwdriver.',
      '4. Test capacitance with a multimeter or replace with a new 2.5 µF capacitor (approx ₹50-₹120).',
      '5. If the shaft feels stiff when turned by hand, lubricate or replace the 6201/6202 ball bearings.'
    ],
    estimatedCost: '₹150 - ₹350 (Service charge + capacitor)',
    suggestedServiceId: 'srv_electrician_general',
    suggestedServiceName: 'Electrician — General Repair & Fan Servicing',
    safetyWarning: 'Always isolate the 6A MCB/switchboard before climbing and testing capacitors.',
    sparePartsGuidance: 'Havells/Tibcon 2.5 µF 440V AC capacitor (₹60), 6202 ball bearings (₹120/pair)'
  },
  {
    id: 'elec_mcb_tripping',
    category: 'electrical',
    persona: 'all',
    title: 'MCB / ELCB Tripping Continuously',
    keywords: ['mcb', 'tripping', 'elcb', 'rccb', 'short circuit', 'spark', 'power trip', 'overload'],
    summary: 'Frequent MCB tripping indicates either a heavy electrical overload, a live-to-neutral short circuit, or a damaged appliance heating element (Geyser / Induction / Microwave).',
    detailedSteps: [
      '1. Unplug all high-power appliances (Geyser, AC, Iron, Microwave, Refrigerator) on that specific circuit.',
      '2. Reset the MCB switch UP. If it stays UP, plug appliances back in one-by-one to pinpoint the faulty unit.',
      '3. If the MCB trips immediately with no loads connected, there is a direct wire insulation short or a burnt socket.',
      '4. Measure line insulation resistance with an insulation tester / multimeter.',
      '5. Check wire gauge: 16A power points require minimum 2.5 sq mm or 4.0 sq mm copper wire.'
    ],
    estimatedCost: '₹250 - ₹500',
    suggestedServiceId: 'srv_electrician_general',
    suggestedServiceName: 'Electrician — Short Circuit & MCB Troubleshooting',
    safetyWarning: 'DANGER: Never force an MCB to stay in the ON position using tape. It prevents thermal trip and causes fire.',
    sparePartsGuidance: 'Schneider/Legrand C-Curve 16A/25A Single Pole MCB (₹180 - ₹240)'
  },
  {
    id: 'elec_switch_spark',
    category: 'electrical',
    persona: 'customer',
    title: 'Switch Board Sparking or Burning Smell',
    keywords: ['spark', 'smoke', 'burning smell', 'switch loose', 'plug burning'],
    summary: 'Loose terminal screws or high contact resistance cause arcing and severe heat buildup, melting the PVC switch body.',
    detailedSteps: [
      '1. Immediately turn off the main DP switch on the main distribution board.',
      '2. Do not insert any 2-pin or 3-pin plugs into the sparking socket.',
      '3. Book a verified electrician to replace the modular switch and clean carbonized copper wires.'
    ],
    estimatedCost: '₹150 - ₹300',
    suggestedServiceId: 'srv_electrician_general',
    suggestedServiceName: 'Electrician — Switch & Socket Replacement',
    safetyWarning: 'Do not touch charred switches with wet hands. Keep water far away.'
  },

  // ── PLUMBING ──
  {
    id: 'plumb_low_pressure',
    category: 'plumbing',
    persona: 'all',
    title: 'Low Water Pressure / Tap Dripping / Airlock in Pipeline',
    keywords: ['water pressure', 'low water', 'tap drip', 'airlock', 'overhead tank', 'shower pressure'],
    summary: 'Low water pressure in taps is typically caused by air trapped in the gravity feed pipe (airlock) after overhead tank cleaning, or scale deposit inside the faucet aerator.',
    detailedSteps: [
      '1. Unscrew the tap aerator/strainer nozzle using a cloth wrench and clear calcium/sand debris.',
      '2. Check if all taps on the same floor have low pressure; if yes, it is an airlock from the overhead tank.',
      '3. To clear an airlock: Connect a garden hose from a working high-pressure municipal/motor tap to the affected tap, open both taps for 15 seconds to back-flush air up into the tank.',
      '4. Verify the overhead tank vent pipe (breather pipe) is taller than the tank rim and unblocked.'
    ],
    estimatedCost: '₹150 - ₹350',
    suggestedServiceId: 'srv_plumber_general',
    suggestedServiceName: 'Plumber — Tap Repair & Pressure Clearing',
    sparePartsGuidance: 'Jaquar/Parryware half-turn ceramic spindle (₹140 - ₹180), Teflon PTFE tape (₹20)'
  },
  {
    id: 'plumb_pipe_burst',
    category: 'plumbing',
    persona: 'all',
    title: 'Pipe Leakage / CPVC Joint Burst / Concealed Leak',
    keywords: ['pipe leak', 'water leak', 'burst', 'joint leak', 'damp wall', 'cpvc', 'pvc'],
    summary: 'Pipe joint failures usually result from vibration or improper primer/solvent bonding. Concealed leaks produce dampness or peeling paint on walls.',
    detailedSteps: [
      '1. Close the main isolation ball valve near the overhead tank immediately to prevent water damage.',
      '2. Drain residual water by turning on the lowest tap in the household.',
      '3. For exposed CPVC pipes: Cut 2 inches across the cracked section and join with CPVC coupler using heavy-duty CPVC solvent cement.',
      '4. Allow minimum 15 minutes set time before re-pressurizing the pipeline.'
    ],
    estimatedCost: '₹250 - ₹600',
    suggestedServiceId: 'srv_plumber_general',
    suggestedServiceName: 'Plumber — Pipe Leak & Joint Repair',
    safetyWarning: 'Turn off the water pump switch before working near pump discharge lines.'
  },

  // ── AC & APPLIANCE ──
  {
    id: 'ac_not_cooling',
    category: 'ac_appliance',
    persona: 'all',
    title: 'Air Conditioner (AC) Blowing Warm Air / Not Cooling',
    keywords: ['ac', 'cooling', 'warm air', 'refrigerant', 'gas leak', 'air conditioner', 'compressor'],
    summary: 'Warm air from an AC indoor unit usually stems from a dirty indoor filter choking airflow, a faulty dual-run capacitor preventing outdoor compressor start, or refrigerant gas loss (R32 / R410A).',
    detailedSteps: [
      '1. Wash the indoor plastic air filters under running water and dry them completely.',
      '2. Check if the outdoor unit fan and compressor turn ON after 3 minutes of setting remote to 18°C Cool Mode.',
      '3. If outdoor fan runs but compressor only hums and clicks OFF, replace the 35µF/45µF dual capacitor.',
      '4. If both run normally but the copper suction line has white ice buildup, there is a refrigerant leak.',
      '5. Use soap foam to test flare joints; braze leaks and vacuum lines to 500 microns before recharging gas.'
    ],
    estimatedCost: '₹499 - ₹1,499 (Standard Service to Gas Refill)',
    suggestedServiceId: 'srv_ac_repair',
    suggestedServiceName: 'AC Servicing, Deep Cleaning & Repair',
    sparePartsGuidance: 'Epcos 35+5 µF or 45+5 µF 440V dual run capacitor (₹220 - ₹350), R32 gas (₹600/kg)'
  },
  {
    id: 'appliance_ro_water',
    category: 'ac_appliance',
    persona: 'all',
    title: 'Water Purifier (RO) Slow Water / Beeping / Bad Taste',
    keywords: ['ro', 'water purifier', 'kent', 'aquaguard', 'filter', 'slow water', 'beeping'],
    summary: 'RO beeping or slow water indicates choked sediment/carbon pre-filters or a clogged RO membrane from mineral-rich borewell hard water (TDS > 500 ppm).',
    detailedSteps: [
      '1. Inspect the transparent sediment filter housing; if brown/dark, replace the 5-micron spun candle.',
      '2. Measure booster pump outlet pressure using a 150 PSI gauge (must exceed 70 PSI for RO membrane to produce pure water).',
      '3. Test TDS of incoming tap water vs output pure water (rejection rate must be > 90%).',
      '4. If pump runs continuously but waste water flows non-stop, inspect the Auto-Shut-Off (ASV) valve.'
    ],
    estimatedCost: '₹299 - ₹699',
    suggestedServiceId: 'srv_appliance_repair',
    suggestedServiceName: 'RO Water Purifier Service & Filter Change',
    sparePartsGuidance: 'Pre-filter Spun Candle (₹80), Activated Carbon Block (₹220), 75 GPD Vontron Membrane (₹750)'
  },
  {
    id: 'appliance_washing_machine',
    category: 'ac_appliance',
    persona: 'all',
    title: 'Washing Machine Not Spinning / Water Not Draining',
    keywords: ['washing machine', 'spin', 'drain', 'error e2', 'error 4e', 'drum not spinning'],
    summary: 'Drain pump blockage from coins/lint or broken drive belts are the primary cause for washing machine spin failures.',
    detailedSteps: [
      '1. Open the lower front lint filter cap (place a shallow tray underneath) and clear out coins, pins, or lint.',
      '2. Inspect the drain pump impeller inside with a torch to confirm it spins freely.',
      '3. On top-load machines: Check the lid safety switch; if the lid sensor is open or broken, the machine refuses to enter spin mode for user safety.',
      '4. Check motor drive belt tension underneath the drum.'
    ],
    estimatedCost: '₹350 - ₹750',
    suggestedServiceId: 'srv_appliance_repair',
    suggestedServiceName: 'Washing Machine Repair & Diagnostics'
  },

  // ── CLEANING & HOME MAINTENANCE ──
  {
    id: 'cleaning_deep_clean',
    category: 'cleaning',
    persona: 'customer',
    title: 'Home Deep Cleaning & Bathroom Descaling',
    keywords: ['cleaning', 'bathroom', 'kitchen', 'deep clean', 'tiles', 'hard water stains'],
    summary: 'Deep scrubbing of bathrooms, kitchen grease removal, and hard water scale elimination on floor/wall tiles using eco-safe descalers.',
    detailedSteps: [
      '1. Professional machines (single-disc scrubber, wet-dry vacuum) remove heavy calcium deposits.',
      '2. Includes sanitization of toilet bowls, tap descaling, and high-pressure steam cleaning.'
    ],
    estimatedCost: '₹499 - ₹1,899 (Bathroom vs Full Home)',
    suggestedServiceId: 'srv_cleaning_deep',
    suggestedServiceName: 'Home Deep Cleaning & Bathroom Descaling'
  },

  // ── PLATFORM & POLICIES ──
  {
    id: 'platform_doorstep_otp',
    category: 'platform',
    persona: 'all',
    title: 'Doorstep 4-Digit OTP Verification Security',
    keywords: ['otp', 'security', 'doorstep', 'verification', 'start job', 'code'],
    summary: 'For safety, every booking generates a unique 4-digit security OTP visible in the customer portal. The technician must enter this code upon arrival to start the job.',
    detailedSteps: [
      'Customer shows the 4-digit code on their phone screen.',
      'Technician inputs the code into the Pro Workbench to unlock "IN_PROGRESS" mode.',
      'Ensures only the authorized verified technician commences work.'
    ]
  },
  {
    id: 'platform_cod_policy',
    category: 'platform',
    persona: 'all',
    title: 'Cash on Delivery (COD) & Settlement Policy',
    keywords: ['cod', 'payment', 'cash', 'how to pay', 'advance'],
    summary: 'SOLVO requires zero advance payment for COD bookings. Customers pay only after service completion via cash or instant UPI to the technician.',
    detailedSteps: [
      'Zero advance required at booking.',
      'Technician completes the repair and enters any authorized extra materials cost.',
      'Customer inspects work and pays cash or UPI.',
      'Technician taps "Payment Received & Close Job" to issue digital invoice.'
    ]
  }
];

// ─── 2. In-Memory / Local Storage Learned Solutions Cache ───────────────────
const LOCAL_LEARNED_STORAGE_KEY = 'mud_ai_learned_solutions';

export function getCachedLearnedSolutions(): LearnedResolution[] {
  try {
    const raw = localStorage.getItem(LOCAL_LEARNED_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}

  // Built-in starter on-the-job resolutions from field technicians across active service hubs
  const defaults: LearnedResolution[] = [
    {
      id: 'res_blr_001',
      category: 'electrical',
      query: 'Crompton ceiling fan making rattling noise in Marappa Garden / Indiranagar',
      symptom: 'Fan runs with harsh metallic grinding vibration at speed 4 and 5',
      resolution: 'Inspected upper 6201 ball bearing and capacitor microfarad rating; replaced capacitor and aligned blade angle with spirit level. Rattling completely resolved.',
      partsUsed: 'SKF 6201-2Z bearing (₹85)',
      technicianName: 'Suresh M. (Electrician)',
      locality: 'Marappa Garden, Bengaluru',
      timestamp: '2026-09-18T10:15:00Z',
      helpfulCount: 22,
      verifiedByAdmin: true
    },
    {
      id: 'res_blr_002',
      category: 'plumbing',
      query: 'Water leaking continuously behind Western commode flush tank in Koramangala',
      symptom: 'Continuous hissing sound in toilet, flush tank overflowing into bowl',
      resolution: 'Replaced silicon inlet siphon diaphragm washer and cleared mineral scaling from water cutoff assembly.',
      partsUsed: 'Parryware inlet siphon diaphragm washer (₹55)',
      technicianName: 'Kiran N. (Plumber)',
      locality: 'Koramangala, Bengaluru',
      timestamp: '2026-09-19T13:30:00Z',
      helpfulCount: 28,
      verifiedByAdmin: true
    },
    {
      id: 'res_blr_003',
      category: 'ac_appliance',
      query: 'Voltas split AC indoor unit leaking water onto bedroom wall in Whitefield',
      symptom: 'Water dripping from right corner of indoor cooling blower casing',
      resolution: 'Flushed blocked condensate drain pipe with compressed nitrogen and corrected slope to 10-degree gradient.',
      partsUsed: 'None (Chemical drain unclog flush)',
      technicianName: 'Naveen R. (HVAC Tech)',
      locality: 'Whitefield, Bengaluru',
      timestamp: '2026-09-20T16:00:00Z',
      helpfulCount: 35,
      verifiedByAdmin: true
    },
    {
      id: 'res_001',
      category: 'electrical',
      query: 'Crompton ceiling fan making rattling noise in Gandhi Nagar',
      symptom: 'Fan runs with harsh metallic grinding vibration at speed 4 and 5',
      resolution: 'Inspected upper 6201 ball bearing; found dry grease and slight play. Replaced bearing and aligned blade angle with spirit level. Rattling completely resolved.',
      partsUsed: 'SKF 6201-2Z bearing (₹65)',
      technicianName: 'Manjunath K. (Electrician)',
      locality: 'Gandhi Nagar, Sagara',
      timestamp: '2026-09-15T11:20:00Z',
      helpfulCount: 18,
      verifiedByAdmin: true
    },
    {
      id: 'res_002',
      category: 'plumbing',
      query: 'Water leaking continuously behind Western commode flush tank',
      symptom: 'Continuous hissing sound in toilet, flush tank overflowing into bowl',
      resolution: 'Float ball valve washer had hardened from mineral deposits. Replaced silicon inlet siphon diaphragm washer and adjusted float arm water cutoff height.',
      partsUsed: 'Parryware inlet siphon diaphragm washer (₹45)',
      technicianName: 'Raghu S. (Plumber)',
      locality: 'Subhash Nagar, Sagara',
      timestamp: '2026-09-16T14:45:00Z',
      helpfulCount: 24,
      verifiedByAdmin: true
    },
    {
      id: 'res_003',
      category: 'ac_appliance',
      query: 'Voltas split AC indoor unit leaking water onto bedroom wall',
      symptom: 'Water dripping from right corner of indoor cooling blower casing',
      resolution: 'The 16mm flexible condensate drain pipe was kinked behind the wall sleeve and choked with black algae slime. Blew compressed nitrogen to flush sludge and sloped drain pipe with 10 degree fall.',
      partsUsed: 'None (Chemical drain unclog flush)',
      technicianName: 'Prashanth H. (HVAC Tech)',
      locality: 'Sagar Main Road',
      timestamp: '2026-09-17T09:10:00Z',
      helpfulCount: 31,
      verifiedByAdmin: true
    }
  ];

  try {
    localStorage.setItem(LOCAL_LEARNED_STORAGE_KEY, JSON.stringify(defaults));
  } catch {}
  return defaults;
}

// ─── 3. Sync Learned Memory with Cloud Firestore ───────────────────────────
export async function syncLearnedSolutionsFromFirestore(): Promise<LearnedResolution[]> {
  const localList = getCachedLearnedSolutions();
  if (!isFirebaseLive()) return localList;

  try {
    const colRef = collection(db, 'ai_learned_solutions');
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      const remoteList: LearnedResolution[] = [];
      snap.forEach((d) => {
        remoteList.push({ id: d.id, ...d.data() } as LearnedResolution);
      });
      // Merge unique by id
      const map = new Map<string, LearnedResolution>();
      localList.forEach((item) => map.set(item.id, item));
      remoteList.forEach((item) => map.set(item.id, item));
      const merged = Array.from(map.values());
      localStorage.setItem(LOCAL_LEARNED_STORAGE_KEY, JSON.stringify(merged));
      return merged;
    }
  } catch (err) {
    console.warn('[AI RAG Engine] Firestore sync warning, using local cache:', err);
  }
  return localList;
}

// ─── 4. On-the-Job Learning: Record Real-World Field Resolution ──────────────
export async function submitFieldResolution(params: {
  category: string;
  query: string;
  symptom: string;
  resolution: string;
  partsUsed?: string;
  technicianName: string;
  locality?: string;
}): Promise<LearnedResolution> {
  const id = `res_${Date.now()}`;
  const record: LearnedResolution = {
    id,
    category: params.category,
    query: params.query.trim(),
    symptom: params.symptom.trim(),
    resolution: params.resolution.trim(),
    partsUsed: params.partsUsed?.trim() || 'None',
    technicianName: params.technicianName || 'Verified Technician',
    locality: params.locality || 'Sagara',
    timestamp: new Date().toISOString(),
    helpfulCount: 1,
    verifiedByAdmin: false
  };

  // 1. Update local storage
  const list = getCachedLearnedSolutions();
  list.unshift(record);
  localStorage.setItem(LOCAL_LEARNED_STORAGE_KEY, JSON.stringify(list));

  // 2. Persist to Cloud Firestore
  if (isFirebaseLive()) {
    try {
      await setDoc(doc(db, 'ai_learned_solutions', id), {
        ...record,
        firestore_created_at: serverTimestamp()
      });
    } catch (e) {
      console.warn('[AI RAG Engine] Firestore cloud write warning:', e);
    }
  }

  // 3. Broadcast sync event to all open tabs/portals
  try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const bus = new BroadcastChannel('urbandaily_sync_bus');
      bus.postMessage({ type: 'NEW_AI_LEARNED_RESOLUTION', payload: record });
    }
    window.dispatchEvent(new CustomEvent('mud_ai_learning_updated', { detail: record }));
  } catch {}

  return record;
}

// ─── 5. Upvote / Feedback Loop on Learned Knowledge ─────────────────────────
export async function voteLearnedSolution(id: string, isHelpful: boolean): Promise<void> {
  const list = getCachedLearnedSolutions();
  const target = list.find((item) => item.id === id);
  if (target) {
    if (isHelpful) target.helpfulCount += 1;
    localStorage.setItem(LOCAL_LEARNED_STORAGE_KEY, JSON.stringify(list));
  }

  if (isFirebaseLive()) {
    try {
      await updateDoc(doc(db, 'ai_learned_solutions', id), {
        helpfulCount: increment(isHelpful ? 1 : 0)
      });
    } catch {}
  }
}

// ─── 6. Semantic Token Matching (RAG Core) ──────────────────────────────────
function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );
}

function computeSimilarity(queryTokens: Set<string>, targetTokens: Set<string>): number {
  if (queryTokens.size === 0 || targetTokens.size === 0) return 0;
  let matches = 0;
  queryTokens.forEach((q) => {
    if (targetTokens.has(q)) matches += 1;
  });
  return matches / Math.sqrt(queryTokens.size * targetTokens.size);
}

// ─── 7. Primary RAG Query Engine ────────────────────────────────────────────
export function queryAiKnowledge(
  userQuery: string,
  persona: UserPersona = 'customer',
  userContext?: UserContextPayload,
  _iotTelemetry?: IoTTelemetryPayload
): AiQueryResult {
  const cleanQuery = userQuery.trim();
  const rawName = userContext?.userName?.trim();
  const displayName = rawName ? rawName.split(' ')[0].replace(/[@_0-9]/g, '') : '';
  const greetingName = displayName ? ` **${displayName}**` : '';
  const loc = resolveLocationContext(userContext);

  // Check for Greeting Intent (e.g., "Hi", "Hello", "Hey", "Good morning", "Namaskara")
  const isGreeting = /^(hi|hello|hey|hiya|namaskara|namaste|good\s+(morning|afternoon|evening))/i.test(cleanQuery);
  if (isGreeting || !cleanQuery) {
    if (persona === 'technician') {
      const trade = userContext?.tradeCategory ? ` for ${userContext.tradeCategory}` : '';
      return {
        answer: `Hello${greetingName}! 🛠️ Great to have you on duty today.\n\nI am your **UrbanAI Field Copilot**${trade}. Ask me about any equipment fault, IoT error codes (E1-E9, F1-F5), or repair steps to help you on site.`,
        persona: 'technician',
        confidence: 0.98,
        matchedSources: ['UrbanAI Field Copilot'],
        learnedCaseStudies: []
      };
    }
    return {
      answer: `Hello${greetingName}! 👋 Welcome back to **SOLVO**.\n\nI am your dedicated **UrbanAI Concierge**. I can help you diagnose home repairs, check transparent pricing in **${loc.city}**, troubleshoot smart home / IoT devices, or book a verified technician. What seems to be the problem?`,
      persona: 'customer',
      confidence: 0.98,
      matchedSources: ['UrbanAI Concierge'],
      learnedCaseStudies: []
    };
  }

  const queryTokens = tokenize(cleanQuery);
  const learnedList = getCachedLearnedSolutions();

  // Step 1: Score Static Knowledge Base
  const staticScores: { article: KnowledgeArticle; score: number }[] = [];
  STATIC_KNOWLEDGE_BASE.forEach((art) => {
    // Check persona applicability
    if (art.persona !== 'all' && art.persona !== persona && persona !== 'admin') return;

    let score = 0;
    const kwTokens = tokenize(art.keywords.join(' ') + ' ' + art.title + ' ' + art.summary);
    score += computeSimilarity(queryTokens, kwTokens) * 3;

    // Boost on direct keyword hits
    art.keywords.forEach((kw) => {
      if (cleanQuery.toLowerCase().includes(kw.toLowerCase())) score += 2;
    });

    if (score > 0.15) {
      staticScores.push({ article: art, score });
    }
  });

  staticScores.sort((a, b) => b.score - a.score);

  // Step 2: Score Dynamic Learned Solutions (On-the-Job Knowledge) with Regional Prioritization
  const learnedScores: { learned: LearnedResolution; score: number }[] = [];
  learnedList.forEach((sol) => {
    const solTokens = tokenize(sol.query + ' ' + sol.symptom + ' ' + sol.resolution + ' ' + sol.category);
    let score = computeSimilarity(queryTokens, solTokens) * 3;
    if (sol.verifiedByAdmin) score += 0.5;
    score += Math.min(sol.helpfulCount * 0.05, 1.0); // Boost popular helpful solutions

    // Boost field cases matching the user's active city (e.g. Bengaluru tech cases for Bengaluru customers)
    if (sol.locality.toLowerCase().includes(loc.city.toLowerCase())) {
      score += 2.0;
    }

    if (score > 0.15) {
      learnedScores.push({ learned: sol, score });
    }
  });

  learnedScores.sort((a, b) => b.score - a.score);

  // Step 3: Synthesize Answer according to Persona & Regional Location
  const topStatic = staticScores[0]?.article;
  const topLearned = learnedScores.slice(0, 2).map((s) => s.learned);

  // Persona 1: Customer Concierge
  if (persona === 'customer') {
    if (topStatic) {
      const localizedCost = getLocalizedCost(topStatic, loc);
      let ans = `**Diagnosis: ${topStatic.title}**\n\n${topStatic.summary}\n\n`;
      if (localizedCost) {
        ans += `💰 **Estimated Cost in ${loc.city}**: ${localizedCost}\n`;
      }
      if (topStatic.safetyWarning) {
        ans += `⚠️ **Safety Note**: ${topStatic.safetyWarning}\n`;
      }
      if (topLearned.length > 0) {
        const topSol = topLearned[0];
        ans += `\n💡 **On-Job Field Learning (${loc.city} Techs)**:\n`;
        ans += `Technician ${topSol.technicianName} recently solved this in ${topSol.locality}: *"I resolved this by ${topSol.resolution.slice(0, 140)}..."* (${topSol.helpfulCount} people found this helpful)`;
      }

      return {
        answer: ans,
        persona: 'customer',
        confidence: Math.min(0.98, staticScores[0].score * 0.4 + 0.5),
        matchedSources: [topStatic.title],
        learnedCaseStudies: topLearned,
        safetyWarning: topStatic.safetyWarning,
        suggestedAction: topStatic.suggestedServiceId
          ? {
              label: topStatic.suggestedServiceName || 'Service',
              actionType: 'BOOK_SERVICE',
              payload: {
                serviceId: topStatic.suggestedServiceId,
                name: topStatic.suggestedServiceName,
                estimatedPrice: localizedCost
              }
            }
          : undefined
      };
    }
  }

  // Persona 2: Technician Field Copilot
  if (persona === 'technician') {
    if (topStatic || topLearned.length > 0) {
      let ans = `🔧 **Field SOP & Diagnostic Protocol**\n\n`;
      if (topStatic?.detailedSteps) {
        ans += `**Standard Operating Procedures**:\n`;
        topStatic.detailedSteps.forEach((step) => {
          ans += `${step}\n`;
        });
      }
      if (topStatic?.sparePartsGuidance) {
        ans += `\n📦 **Spare Parts & Standard Pricing**: ${topStatic.sparePartsGuidance}\n`;
      }
      if (topStatic?.safetyWarning) {
        ans += `\n⚡ **Safety Precaution**: ${topStatic.safetyWarning}\n`;
      }

      if (topLearned.length > 0) {
        ans += `\n⭐ **Real-World Case Study from Field (${loc.city})**:\n`;
        topLearned.forEach((cs) => {
          ans += `• **${cs.locality}** (${cs.technicianName}): "${cs.resolution}" | Parts: ${cs.partsUsed || 'None'}\n`;
        });
      }

      return {
        answer: ans,
        persona: 'technician',
        confidence: 0.95,
        matchedSources: topStatic ? [topStatic.title] : ['Field Resolutions'],
        learnedCaseStudies: topLearned,
        safetyWarning: topStatic?.safetyWarning
      };
    }
  }

  // Persona 3: Admin Operations Intel
  if (persona === 'admin') {
    return {
      answer: `📊 **Platform Operations & Intelligence Query**\n\nQuery Analyzed: "${cleanQuery}"\n\n• **Matched Knowledge Articles**: ${staticScores.map((s) => s.article.title).slice(0, 3).join(', ') || 'General Operational Policy'}\n• **Related Field Resolutions**: ${learnedScores.length} real-world case studies in ${loc.city}.\n• **SLA Standard**: Verified technicians must arrive within 45 mins with 4-digit doorstep OTP.\n• **COD Reconciled Status**: Cash settlements are logged live upon technician closure.`,
      persona: 'admin',
      confidence: 0.9,
      matchedSources: staticScores.map((s) => s.article.title),
      learnedCaseStudies: topLearned
    };
  }

  // Fallback for general queries
  return {
    answer: `I understood your query about "${cleanQuery}". In ${loc.city}, our verified technicians cover Electrical, Plumbing, AC & Appliance Servicing, and Deep Cleaning with zero advance required (COD). Please describe the symptoms in more detail, or select a service to book directly.`,
    persona,
    confidence: 0.7,
    matchedSources: [`${loc.city} Service Directory`],
    learnedCaseStudies: topLearned
  };
}

// ─── 8. UrbanAI Customer Relationship Manager (CRM) & RAG Client Bridge ─────
export async function queryRagMicroservice(
  query: string,
  userContext?: UserContextPayload,
  persona: UserPersona = 'customer',
  iotTelemetry?: IoTTelemetryPayload
): Promise<AiQueryResult> {
  const loc = resolveLocationContext(userContext);
  const primaryUrl = (import.meta as any).env?.VITE_AI_RAG_URL || 'http://127.0.0.1:8001';
  const urlsToTry = [
    '/api/v1/crm/customer-concierge',
    '/api/crm/customer-concierge',
    '/api/rag/chat',
    `${primaryUrl}/api/rag/chat`
  ];

  for (const url of urlsToTry) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2800);

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query,
          message: query,
          user_context: userContext ? {
            user_id: userContext.userId,
            user_name: userContext.userName,
            email: userContext.email,
            phone: userContext.phone,
            role: userContext.role || (persona === 'technician' ? 'technician' : 'customer'),
            trade_category: userContext.tradeCategory,
            location: userContext.location || loc.locality,
            city: loc.city,
            locality: userContext.locality || loc.locality
          } : {
            role: persona,
            location: loc.locality,
            city: loc.city,
            locality: loc.locality
          },
          location: {
            city: loc.city,
            locality: loc.locality
          },
          customer: userContext ? {
            id: userContext.userId || undefined,
            name: userContext.userName || undefined,
            email: userContext.email || undefined,
            phone: userContext.phone || undefined
          } : undefined,
          iot_telemetry: iotTelemetry ? {
            device_id: iotTelemetry.deviceId,
            device_type: iotTelemetry.deviceType,
            error_code: iotTelemetry.errorCode,
            status: iotTelemetry.status,
            voltage: iotTelemetry.voltage,
            temperature: iotTelemetry.temperature,
            signal_strength: iotTelemetry.signalStrength
          } : undefined
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        let suggestedAction: AiQueryResult['suggestedAction'] = undefined;
        if (data.suggested_action || data.suggestedAction) {
          const act = data.suggested_action || data.suggestedAction;
          suggestedAction = {
            label: act.label,
            actionType: act.action_type || act.actionType || 'BOOK_SERVICE',
            payload: act.payload
          };
        } else if (data.suggested_actions && data.suggested_actions.length > 0) {
          const firstAct = data.suggested_actions[0];
          suggestedAction = {
            label: firstAct.label,
            actionType: firstAct.type === 'book_service' ? 'BOOK_SERVICE' : 'VIEW_MANUAL',
            payload: firstAct.payload
          };
        }

        return {
          answer: data.answer || data.response || data.reply || 'Diagnosis complete.',
          persona,
          confidence: data.confidence || 0.96,
          matchedSources: data.matched_sources || data.sources || [`${loc.city} Service Directory`],
          learnedCaseStudies: data.learned_cases || data.learnedCaseStudies || [],
          suggestedAction,
          safetyWarning: data.safety_warning || data.iot_diagnostics?.safetyWarning
        };
      }
    } catch {
      // Continue to next endpoint or fallback
    }
  }

  // Seamless fallback to client knowledge engine with full regional localization
  return queryAiKnowledge(query, persona, userContext, iotTelemetry);
}

