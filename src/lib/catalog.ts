// കൂട്ടായി service catalogue + Kerala Govt wage pricing engine.
//
// Wage figures are a HISTORICAL REFERENCE from:
//   Kerala Govt. Minimum Wage Notification — Domestic Labour Sector,
//   G.O. (P) No. 202/2016/LBR (S.R.O. No. 86/2017), published 17 Feb 2017.
// Verify the latest notification + dearness allowance before treating them as current.

export type ClusterType = "household" | "trade";

export type SubCategory = {
  id: string;
  name: string;
  ml: string;
  initial: number; // ₹ for the first hour (govt "Initial hour")
  subsequent: number; // ₹ for each subsequent hour
  govtRef: string; // schedule item reference
  estimated?: boolean; // true = prototype estimate, not in the notification
  keywords: string[]; // English + Manglish + Malayalam ("=word" = exact match only)
};

export type Category = {
  id: string;
  name: string;
  ml: string;
  icon: string;
  cluster: ClusterType;
  license?: "kseb" | "plumbing";
  color: string;
  subs: SubCategory[];
};

// ---- Pricing rules ----
export const PLATFORM_FEE_PCT = 15; // കൂട്ടായി service fee on discounted base
export const BUNDLE_DISCOUNT_PCT = 8; // AI bundle discount for 2+ tasks in one visit
export const BUNDLE_MIN_TASKS = 2;
export const BUNDLE_MAX_TASKS = 3; // operational cap: max 3 subtasks per visit
export const BUNDLE_MAX_HOURS = 3; // operational cap: max ~3 hours per visit
export const DEFAULT_RADIUS_KM = 5;
export const EXPANSION_OPTIONS = [{ radiusKm: 10, fee: 40 }]; // +₹40 travel fee
export const TRAVEL_FEE_10KM = 40;

export const PRICE_NOTE =
  `⚠️ "Note on Variable Costs: Baseline rates are calculated using official Kerala Government hourly labor standards. If your task requires additional physical labor, extended time beyond the initial booking, or extra materials/spare parts, the final rate may vary. Any extra costs must be mutually agreed upon with the customer. Only after customer approval can the worker proceed or purchase more."`;

export const WAGE_SOURCE_NOTE =
  "Historical reference: Kerala Govt. Minimum Wage Notification — Domestic Labour Sector, G.O. (P) No. 202/2016/LBR, 17 Feb 2017. Check the latest notification & DA before treating figures as current.";

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** ₹ formatting that trims trailing zeros (₹320, not ₹320.00). */
export function fmt(n: number) {
  const r = round2(n);
  return `₹${Number.isInteger(r) ? r : r.toFixed(2)}`;
}

/** Govt formula: first hour at initial rate + each extra hour at subsequent rate. */
export function taskBase(sub: { initial: number; subsequent: number }, hours: number) {
  const h = Math.max(1, Math.min(12, Math.round(hours || 1)));
  return round2(sub.initial + sub.subsequent * (h - 1));
}

export const CATEGORIES: Category[] = [
  {
    id: "kitchen",
    name: "Kitchen & Cooking",
    ml: "അടുക്കള",
    icon: "🍳",
    cluster: "household",
    color: "from-orange-400 to-amber-500",
    subs: [
      { id: "cooking", name: "Cooking food", ml: "പാചകം", initial: 39.75, subsequent: 24.75, govtRef: "Item 10", keywords: ["cook", "cooking", "food", "meal", "lunch", "dinner", "breakfast", "curry", "=chor", "=choru", "=chorum", "bhakshanam", "bakshanam", "pachakam", "vekkan", "vaykkan", "undakkan", "undaakkan", "sadya", "പാചകം", "ഭക്ഷണം", "ചോറ്"] },
      { id: "helping_cooking", name: "Helping with cooking", ml: "പാചക സഹായം", initial: 37.5, subsequent: 22.5, govtRef: "Item 5", keywords: ["help cook", "helping", "cooking help", "kitchen help", "cutting", "chop", "pachakkari", "ariyan", "thenga", "chirakkan", "pachakathinu sahay", "പച്ചക്കറി"] },
      { id: "grocery", name: "Buying groceries / vegetables", ml: "സാധനം വാങ്ങൽ", initial: 37.5, subsequent: 22.5, govtRef: "Item 4", keywords: ["grocery", "groceries", "vegetable shopping", "buy vegetable", "market", "store run", "samanam", "sadhanam vang", "kada", "പച്ചക്കറി വാങ്ങ"] },
    ],
  },
  {
    id: "cleaning",
    name: "Cleaning & Washing",
    ml: "വൃത്തിയാക്കൽ",
    icon: "🧹",
    cluster: "household",
    color: "from-sky-400 to-cyan-500",
    subs: [
      { id: "washing_clothes", name: "Washing clothes", ml: "തുണി അലക്കൽ", initial: 37.5, subsequent: 22.5, govtRef: "Item 1", keywords: ["wash clothes", "washing clothes", "laundry", "clothes", "cloth", "thuni", "thuny", "dress", "alakkan", "alakkal", "alakk", "iron", "ironing", "isthiri", "isthri", "fold", "folding", "അലക്ക്", "തുണി", "ഇസ്തിരി"] },
      { id: "utensils", name: "Washing vessels / utensils", ml: "പാത്രം കഴുകൽ", initial: 37.5, subsequent: 22.5, govtRef: "Item 2", keywords: ["utensil", "utensils", "dishes", "dish", "vessel", "vessels", "plates", "pathram", "paathram", "patram", "pathrangal", "kazhukal", "പാത്രം"] },
      { id: "sweeping", name: "Sweeping / wiping floors", ml: "തറ തുടയ്ക്കൽ", initial: 37.5, subsequent: 22.5, govtRef: "Item 3", keywords: ["sweep", "sweeping", "mop", "mopping", "floor", "wipe", "dust", "dusting", "podi", "pody", "thudakkan", "thudaykkan", "thara", "adichu vari", "adichuvaari", "thoothu", "cobweb", "maaraala", "തറ", "പൊടി", "അടിച്ചുവാരൽ"] },
      { id: "washroom", name: "Washroom cleaning", ml: "ബാത്ത്റൂം വൃത്തിയാക്കൽ", initial: 37.5, subsequent: 22.5, govtRef: "Item 3", keywords: ["washroom", "bathroom", "toilet", "restroom", "kakkoos", "kakoos", "kulimuri", "ബാത്ത്റൂം", "കക്കൂസ്", "കുളിമുറി"] },
      { id: "other_household", name: "Other household work", ml: "മറ്റ് വീട്ടുജോലി", initial: 37.5, subsequent: 22.5, govtRef: "Item 11", keywords: ["household work", "house work", "deep clean", "full house", "whole house", "house clean", "veedu clean", "veedu pani", "veetile pani", "വീട്"] },
    ],
  },
  {
    id: "care",
    name: "Child & Elderly Care",
    ml: "പരിചരണം",
    icon: "🧒",
    cluster: "household",
    color: "from-pink-400 to-rose-500",
    subs: [
      { id: "childcare", name: "Child care", ml: "കുട്ടികളുടെ പരിചരണം", initial: 38.25, subsequent: 23.25, govtRef: "Item 7", keywords: ["child", "children", "baby", "babysit", "kids", "school drop", "kutti", "kuttikal", "kolunth", "കുട്ടി"] },
      { id: "elderly", name: "Care of elderly / sick", ml: "പ്രായമായവരുടെ പരിചരണം", initial: 38.25, subsequent: 23.25, govtRef: "Item 8", keywords: ["elderly", "senior", "sick", "patient care", "caretaker", "bypar", "ammamma", "achan care", "rogi", "പരിചരണം"] },
      { id: "home_nurse", name: "Home nurse", ml: "ഹോം നഴ്സ്", initial: 40.5, subsequent: 25.5, govtRef: "Item 15a", keywords: ["nurse", "nursing", "home nurse", "injection", "bp check", "നഴ്സ്"] },
    ],
  },
  {
    id: "outdoor",
    name: "Outdoor & Maintenance",
    ml: "പുറംജോലി",
    icon: "🌳",
    cluster: "household",
    color: "from-emerald-400 to-teal-500",
    subs: [
      { id: "driver", name: "Vehicle driver", ml: "ഡ്രൈവർ", initial: 40.5, subsequent: 25.5, govtRef: "Item 13", keywords: ["driver", "drive", "trip", "driving", "chauffeur", "vandi odikkan", "ഡ്രൈവർ"] },
      { id: "gardener", name: "Gardener", ml: "തോട്ടക്കാരൻ", initial: 40.5, subsequent: 25.5, govtRef: "Item 14", keywords: ["garden", "gardening", "plants", "lawn", "thottam", "chethy", "തോട്ടം"] },
      { id: "vehicle_clean", name: "Car / bike washing", ml: "വാഹനം കഴുകൽ", initial: 40.5, subsequent: 25.5, govtRef: "Prototype estimate", estimated: true, keywords: ["car", "car wash", "car clean", "car dusting", "bike", "scooter", "two wheeler", "activa", "scooty", "vandi", "vandy", "kaar", "കാർ", "വണ്ടി", "ബൈക്ക്"] },
      { id: "security", name: "Security / watchman", ml: "കാവൽ", initial: 40.5, subsequent: 25.5, govtRef: "Prototype estimate (hourly — in notification)", estimated: true, keywords: ["security", "watchman", "guard", "kaval", "കാവൽ"] },
    ],
  },
  {
    id: "electrical",
    name: "Electrical",
    ml: "ഇലക്ട്രിക്കൽ",
    icon: "⚡",
    cluster: "trade",
    license: "kseb",
    color: "from-yellow-400 to-orange-500",
    subs: [
      { id: "fan_light", name: "Fan / light repair", ml: "ഫാൻ / ലൈറ്റ്", initial: 200, subsequent: 150, govtRef: "Prototype market rate (trade)", estimated: true, keywords: ["fan", "light", "bulb", "tube light", "tubelight", "led", "karangunnilla", "karangunilla", "kathunnilla", "kathunilla", "ഫാൻ", "ലൈറ്റ്"] },
      { id: "switch_socket", name: "Switch & socket", ml: "സ്വിച്ച് / പ്ലഗ്", initial: 200, subsequent: 150, govtRef: "Prototype market rate (trade)", estimated: true, keywords: ["switch", "socket", "plug", "point", "board", "sparking", "spark", "സ്വിച്ച്"] },
      { id: "wiring", name: "Wiring", ml: "വയറിങ്", initial: 250, subsequent: 180, govtRef: "Prototype market rate (trade)", estimated: true, keywords: ["wiring", "wire", "cable", "rewiring", "vayar", "വയറിങ്"] },
      { id: "mcb_fuse", name: "MCB / fuse / power issue", ml: "ഫ്യൂസ് / കറന്റ്", initial: 220, subsequent: 160, govtRef: "Prototype market rate (trade)", estimated: true, keywords: ["mcb", "fuse", "trip", "short circuit", "current illa", "current poyi", "current", "power cut", "no power", "electricity", "shock", "കറന്റ്", "ഫ്യൂസ്"] },
      { id: "appliance_install", name: "Inverter / appliance install", ml: "ഇൻവെർട്ടർ / ഉപകരണം", initial: 250, subsequent: 180, govtRef: "Prototype market rate (trade)", estimated: true, keywords: ["inverter", "ups", "geyser", "heater", "ac install", "washing machine install", "mixie", "appliance", "electrician", "electric", "ഇൻവെർട്ടർ"] },
    ],
  },
  {
    id: "plumbing",
    name: "Plumbing",
    ml: "പ്ലംബിങ്",
    icon: "🔧",
    cluster: "trade",
    license: "plumbing",
    color: "from-blue-500 to-indigo-500",
    subs: [
      { id: "tap_leak", name: "Tap / leak repair", ml: "ടാപ്പ് / ലീക്ക്", initial: 200, subsequent: 150, govtRef: "Prototype market rate (trade)", estimated: true, keywords: ["tap", "leak", "leaking", "drip", "chorunnu", "chorunu", "chorichil", "chorcha", "ടാപ്പ്", "ചോരുന്നു", "ചോർച്ച"] },
      { id: "pipe_fit", name: "Pipe fitting / block", ml: "പൈപ്പ്", initial: 220, subsequent: 160, govtRef: "Prototype market rate (trade)", estimated: true, keywords: ["pipe", "pipe burst", "pottippoyi", "potti", "block", "blocked", "clog", "drain", "adanju", "adanjupoyi", "പൈപ്പ്", "ബ്ലോക്ക്"] },
      { id: "bath_fittings", name: "Bathroom fittings", ml: "ബാത്ത്റൂം ഫിറ്റിങ്", initial: 220, subsequent: 160, govtRef: "Prototype market rate (trade)", estimated: true, keywords: ["shower", "flush", "commode", "closet", "wash basin", "basin", "sink", "fitting", "fittings", "ഫ്ലഷ്"] },
      { id: "tank_clean", name: "Water tank cleaning", ml: "ടാങ്ക് വൃത്തിയാക്കൽ", initial: 180, subsequent: 130, govtRef: "Prototype market rate (trade)", estimated: true, keywords: ["tank", "water tank", "sump", "overhead tank", "tank clean", "ടാങ്ക്"] },
      { id: "motor_pump", name: "Motor / pump repair", ml: "മോട്ടോർ", initial: 230, subsequent: 170, govtRef: "Prototype market rate (trade)", estimated: true, keywords: ["motor", "pump", "vellam varunnilla", "vellam illa", "no water", "water not coming", "plumber", "plumbing", "മോട്ടോർ", "വെള്ളം"] },
    ],
  },
];

export const ALL_SUBS = CATEGORIES.flatMap((c) =>
  c.subs.map((s) => ({ ...s, categoryId: c.id, category: c })),
);

export function getSub(subId: string) {
  return ALL_SUBS.find((s) => s.id === subId);
}

export function getCategory(id: string) {
  return CATEGORIES.find((c) => c.id === id);
}

// Default location (Kochi) when GPS is unavailable.
export const DEFAULT_LOCATION = { lat: 9.9816, lng: 76.2999, address: "Kochi, Kerala" };
