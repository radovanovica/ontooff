/**
 * Canonical list of activity tags.
 *
 * This is the single source of truth used by:
 *  - prisma/seed.ts          → initial DB population
 *  - GET /api/tags            → auto-upserts on first call if DB is empty
 *  - ActivityTypesTab         → tag multi-select when creating/editing an activity
 *  - Landing page hero search → tag filter chips
 *  - /search results page     → tag filter chips
 *  - Admin outreach page      → activities multi-select & filter
 */

export interface ActivityTagConfig {
  name: string;
  slug: string;
  icon: string;
  color: string;
  sortOrder: number;
}

export const ACTIVITY_TAGS: ActivityTagConfig[] = [
  { name: 'Camping',                slug: 'camping',               icon: '⛺', color: '#2d5a27', sortOrder: 1  },
  { name: 'Fishing',                slug: 'fishing',               icon: '🎣', color: '#1565c0', sortOrder: 2  },
  { name: 'Kayaking',               slug: 'kayaking',              icon: '🛶', color: '#0277bd', sortOrder: 3  },
  { name: 'Hiking',                 slug: 'hiking',                icon: '🥾', color: '#5d4037', sortOrder: 4  },
  { name: 'Cycling',                slug: 'cycling',               icon: '🚴', color: '#f57f17', sortOrder: 5  },
  { name: 'Swimming',               slug: 'swimming',              icon: '🏊', color: '#0097a7', sortOrder: 6  },
  { name: 'Glamping',               slug: 'glamping',              icon: '🏕️', color: '#6a1b9a', sortOrder: 7  },
  { name: 'Rock Climbing',          slug: 'rock-climbing',         icon: '🧗', color: '#78909c', sortOrder: 8  },
  { name: 'Horse Riding',           slug: 'horse-riding',          icon: '🐴', color: '#8d6e63', sortOrder: 9  },
  { name: 'Mountain Biking',        slug: 'mountain-biking',       icon: '🚵', color: '#546e7a', sortOrder: 10 },
  { name: 'Zip Line',               slug: 'zip-line',              icon: '🪂', color: '#7b1fa2', sortOrder: 11 },
  { name: 'Rafting',                slug: 'rafting',               icon: '🌊', color: '#01579b', sortOrder: 12 },
  { name: 'Birdwatching',           slug: 'birdwatching',          icon: '🐦', color: '#388e3c', sortOrder: 13 },
  { name: 'Photography',            slug: 'photography',           icon: '📷', color: '#37474f', sortOrder: 14 },
  { name: 'Yoga & Wellness',        slug: 'yoga-wellness',         icon: '🧘', color: '#9c27b0', sortOrder: 15 },
  { name: 'ATV & Offroad',          slug: 'atv-offroad',           icon: '🏍', color: '#bf360c', sortOrder: 16 },
  { name: 'Archery',                slug: 'archery',               icon: '🎯', color: '#006064', sortOrder: 17 },
  { name: 'Canoeing',               slug: 'canoeing',              icon: '🚣', color: '#0288d1', sortOrder: 18 },
  { name: 'SUP / Paddleboarding',   slug: 'sup-paddleboarding',    icon: '🏄', color: '#00838f', sortOrder: 19 },
  { name: 'Paragliding',            slug: 'paragliding',           icon: '🦅', color: '#1a237e', sortOrder: 20 },
  { name: 'Diving & Snorkeling',    slug: 'diving-snorkeling',     icon: '🤿', color: '#006064', sortOrder: 21 },
  { name: 'Paintball',              slug: 'paintball',             icon: '💥', color: '#424242', sortOrder: 23 },
  { name: 'Adventure Park',         slug: 'adventure-park',        icon: '🎢', color: '#e65100', sortOrder: 24 },
  { name: 'Via Ferrata',            slug: 'via-ferrata',           icon: '⛰️', color: '#78909c', sortOrder: 25 },
  { name: 'Canyoning',              slug: 'canyoning',             icon: '🏞️', color: '#00695c', sortOrder: 26 },
  { name: 'Wakeboarding',           slug: 'wakeboarding',          icon: '🤙', color: '#0277bd', sortOrder: 27 },
  { name: 'Windsurfing',            slug: 'windsurfing',           icon: '🌬️', color: '#0288d1', sortOrder: 28 },
  { name: 'Foraging & Bushcraft',   slug: 'foraging-bushcraft',    icon: '🍄', color: '#558b2f', sortOrder: 29 },
  { name: 'Stargazing',             slug: 'stargazing',            icon: '🔭', color: '#1a237e', sortOrder: 30 },
  { name: 'Orienteering',           slug: 'orienteering',          icon: '🗺️', color: '#4e342e', sortOrder: 31 },
  { name: 'Snowshoeing',            slug: 'snowshoeing',           icon: '❄️', color: '#0288d1', sortOrder: 32 },
  { name: 'Survival Skills',        slug: 'survival-skills',       icon: '🔥', color: '#bf360c', sortOrder: 33 },
  { name: 'Team Building',          slug: 'team-building',         icon: '🤝', color: '#455a64', sortOrder: 34 },
];

/**
 * Simple sorted list of activity names — use this anywhere a string[] is needed
 * (e.g. outreach multi-select, filter dropdowns).
 */
export const ACTIVITY_NAMES: string[] = ACTIVITY_TAGS.map((t) => t.name);
