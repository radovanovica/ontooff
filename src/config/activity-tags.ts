/**
 * Canonical list of activity tags.
 *
 * This is the single source of truth used by:
 *  - prisma/seed.ts          → initial DB population
 *  - GET /api/tags            → auto-upserts on first call if DB is empty
 *  - ActivityTypesTab         → tag multi-select when creating/editing an activity
 *  - Landing page hero search → tag filter chips
 *  - /search results page     → tag filter chips
 */

export interface ActivityTagConfig {
  name: string;
  slug: string;
  icon: string;
  color: string;
  sortOrder: number;
}

export const ACTIVITY_TAGS: ActivityTagConfig[] = [
  { name: 'Camping',        slug: 'camping',        icon: '⛺', color: '#2d5a27', sortOrder: 1  },
  { name: 'Fishing',        slug: 'fishing',        icon: '🎣', color: '#1565c0', sortOrder: 2  },
  { name: 'Kayaking',       slug: 'kayaking',       icon: '🛶', color: '#0277bd', sortOrder: 3  },
  { name: 'Hiking',         slug: 'hiking',         icon: '🥾', color: '#5d4037', sortOrder: 4  },
  { name: 'Cycling',        slug: 'cycling',        icon: '🚴', color: '#f57f17', sortOrder: 5  },
  { name: 'Swimming',       slug: 'swimming',       icon: '🏊', color: '#0097a7', sortOrder: 6  },
  { name: 'Glamping',       slug: 'glamping',       icon: '🏕️', color: '#6a1b9a', sortOrder: 7  },
  { name: 'Rock Climbing',  slug: 'rock-climbing',  icon: '🧗', color: '#78909c', sortOrder: 8  },
  { name: 'Horse Riding',   slug: 'horse-riding',   icon: '🐴', color: '#8d6e63', sortOrder: 9  },
  { name: 'Mountain Biking',slug: 'mountain-biking',icon: '🚵', color: '#546e7a', sortOrder: 10 },
  { name: 'Zip Line',       slug: 'zip-line',       icon: '🪂', color: '#7b1fa2', sortOrder: 11 },
  { name: 'Rafting',        slug: 'rafting',        icon: '🌊', color: '#01579b', sortOrder: 12 },
  { name: 'Birdwatching',   slug: 'birdwatching',   icon: '🐦', color: '#388e3c', sortOrder: 13 },
  { name: 'Photography',    slug: 'photography',    icon: '📷', color: '#37474f', sortOrder: 14 },
  { name: 'Yoga',           slug: 'yoga',           icon: '🧘', color: '#9c27b0', sortOrder: 15 },
  { name: 'ATV & Offroad',  slug: 'atv-offroad',    icon: '🏍', color: '#bf360c', sortOrder: 16 },
  { name: 'Archery',        slug: 'archery',        icon: '🎯', color: '#006064', sortOrder: 17 },
];
