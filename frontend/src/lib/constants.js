// Clothing categories from the Excel template
export const CATEGORIES = [
  { id: 'kleider', name: 'Kleider', icon: 'Shirt' },
  { id: 'strickmode', name: 'Strickmode/Cardigans', icon: 'Layers' },
  { id: 'sweatshirt', name: 'Sweatshirt', icon: 'Shirt' },
  { id: 'hoodie', name: 'Hoodie', icon: 'Shirt' },
  { id: 'hosen', name: 'Hosen', icon: 'Ruler' },
  { id: 'jeans', name: 'Jeans', icon: 'Ruler' },
  { id: 'jacken', name: 'Jacken', icon: 'Shirt' },
  { id: 'blazer', name: 'Blazer', icon: 'Briefcase' },
  { id: 'maentel', name: 'Mäntel', icon: 'Shirt' },
  { id: 'shirts', name: 'Shirts', icon: 'Shirt' },
  { id: 'top', name: 'Top', icon: 'Shirt' },
  { id: 'hemd', name: 'Hemd', icon: 'Shirt' },
  { id: 'bluse', name: 'Bluse', icon: 'Shirt' },
  { id: 'roecke', name: 'Röcke/Jupe', icon: 'Scissors' },
  { id: 'sport', name: 'Sportbekleidung', icon: 'Dumbbell' },
  { id: 'bademode', name: 'Bademode', icon: 'Waves' },
  { id: 'shorts', name: 'Shorts', icon: 'Ruler' },
];

// Price levels (Marken-Kategorien)
export const PRICE_LEVELS = [
  { id: 'luxus', name: 'Luxus', color: 'bg-amber-100 text-amber-800 border-amber-300', description: 'Designer & Premium' },
  { id: 'teuer', name: 'Teuer', color: 'bg-blue-100 text-blue-800 border-blue-300', description: 'Hochwertige Marken' },
  { id: 'mittel', name: 'Mittel', color: 'bg-green-100 text-green-800 border-green-300', description: 'Standard Marken' },
  { id: 'guenstig', name: 'Günstig', color: 'bg-slate-100 text-slate-800 border-slate-300', description: 'Basis Qualität' },
];

// Condition levels
export const CONDITIONS = [
  { id: 'neu', name: 'Neu', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { id: 'kaum_benutzt', name: 'Kaum benutzt', color: 'bg-sky-100 text-sky-800 border-sky-300' },
  { id: 'gebraucht', name: 'Gebraucht/Gut', color: 'bg-orange-100 text-orange-800 border-orange-300' },
  { id: 'abgenutzt', name: 'Abgenutzt', color: 'bg-red-100 text-red-800 border-red-300' },
];

// Store info for receipts
export const STORE_INFO = {
  name: 'Smillå-Store GmbH',
  address: 'Musterstrasse 123',
  city: '8000 Zürich',
  phone: '+41 44 123 45 67',
};
