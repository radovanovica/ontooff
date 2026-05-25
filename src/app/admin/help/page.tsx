import {
  Box,
  Typography,
  Paper,
  Chip,
  Divider,
} from '@mui/material';
import {
  DashboardOutlined,
  PlaceOutlined,
  TuneOutlined,
  LocalOfferOutlined,
  AttachMoneyOutlined,
  MapOutlined,
  EventSeatOutlined,
  CalendarMonthOutlined,
  BookOnlineOutlined,
  StarOutlined,
  CodeOutlined,
  LightbulbOutlined,
  WarningAmberOutlined,
  CheckCircleOutlined,
  NavigateNext,
} from '@mui/icons-material';

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface Step {
  title: string;
  detail: string;
}

interface SubSection {
  title: string;
  icon?: React.ReactNode;
  steps: Step[];
}

interface HelpSection {
  id: string;
  color: string;
  icon: React.ReactNode;
  title: string;
  path: string;
  tagline: string;
  intro: string;
  features?: string[];
  steps?: Step[];
  subSections?: SubSection[];
  tips?: string[];
  warnings?: string[];
}

  tips?: string[];
  warnings?: string[];
}

// â”€â”€â”€ Content â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const SECTIONS: HelpSection[] = [
  // â”€â”€ 1. DASHBOARD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    id: 'dashboard',
    color: '#2d5a27',
    icon: <DashboardOutlined />,
    title: 'Dashboard',
    path: '/owner',
    tagline: 'Your starting point â€” see everything at a glance',
    intro:
      'The owner dashboard gives you a live snapshot of your entire operation: how many places and activity spaces you have, how many bookings are pending your action, and your total revenue from confirmed paid visits.',
    features: ['Total Places', 'Total Locations', 'Pending Bookings', 'Total Revenue', 'Organization Status'],
    steps: [
      {
        title: 'Check the stat cards',
        detail:
          'At the top you will see four cards: Total Places, Total Locations, Pending Bookings, and Total Revenue. Revenue counts only PAID confirmed bookings.',
      },
      {
        title: 'Read your organization status banner',
        detail:
          'If your organization has not yet been approved by the platform admin, a yellow/orange banner will tell you it is still PENDING. You cannot receive bookings until the organization is approved. Once approved, a green success banner appears.',
      },
      {
        title: 'Navigate to your most urgent task',
        detail:
          'Click "My Places" to jump straight to your places list, or use the left-side navigation to go anywhere in the owner panel.',
      },
    ],
    tips: [
      'Pending Bookings number is your most important daily metric. Check it every morning.',
      'Revenue shown is cumulative and grows as you mark bookings as PAID.',
    ],
    warnings: [
      'If your organization is PENDING or SUSPENDED, guests will not be able to complete bookings for your places.',
    ],
  },

  // â”€â”€ 2. MY PLACES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    id: 'places',
    color: '#1565c0',
    icon: <PlaceOutlined />,
    title: 'My Places',
    path: '/owner/places',
    tagline: 'The top level of your content â€” a campsite, resort, or activity venue',
    intro:
      'A Place is your property or venue â€” for example "Green Valley Camping" or "Adriatic Adventure Park". One account can manage multiple places. Everything else (activity types, locations, spots, pricing, bookings, events) lives inside a place.',
    features: ['Create a place', 'View all your places', 'Open place detail', 'Navigate to the 7 management tabs'],
    subSections: [
      {
        title: 'Creating a new place',
        icon: <PlaceOutlined />,
        steps: [
          {
            title: 'Click "Add New Place"',
            detail: 'The multi-step form wizard opens. You will go through the steps one by one â€” you can always go back to a previous step.',
          },
          {
            title: 'Step 1 â€” Basic Information',
            detail:
              'Enter the place name, a URL slug (e.g. "green-valley"), a short description, city, country, and address. The slug becomes the public URL: ontooff.app/locations/[slug]. Use only lowercase letters, numbers, and hyphens.',
          },
          {
            title: 'Step 2 â€” Contact Details',
            detail: 'Add a phone number, email address, website URL, and social media links (Facebook, Instagram, TikTok, YouTube, LinkedIn). These appear on the public listing page.',
          },
          {
            title: 'Step 3 â€” Photos',
            detail:
              'Upload a Profile Photo (shown as the logo/avatar), a Cover Photo (the banner background), and optionally a Floor Plan / Map Image (used inside the location map editor). Accepted formats: JPG, PNG, WebP.',
          },
          {
            title: 'Step 4 â€” Review & Submit',
            detail: 'Check all the details and click Submit. The place is created and you land on the place detail page.',
          },
        ],
      },
    ],
    tips: [
      'High-quality photos dramatically increase bookings. Use a wide landscape photo for the cover and a square logo for the profile.',
      'The slug cannot be changed without affecting existing bookings, so choose it carefully.',
    ],
  },

  // â”€â”€ 3. PLACE SETTINGS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    id: 'place-settings',
    color: '#0277bd',
    icon: <TuneOutlined />,
    title: 'Place Settings',
    path: '/owner/places/[id] â†’ Settings tab',
    tagline: 'Edit all details, images, map and social links for a place',
    intro:
      'Open any place from the list and you land on the Settings tab (Tab 1). Here you can update everything you entered when creating the place, plus upload or replace the floor-plan map image.',
    subSections: [
      {
        title: 'Basic Information',
        steps: [
          { title: 'Name & Slug', detail: 'The name is shown publicly. The slug is the URL identifier â€” change only if necessary, and be careful as it changes the public link.' },
          { title: 'Description', detail: 'Write a detailed, welcoming description. This text appears on the public listing and affects search results. Aim for at least 100â€“200 words.' },
          { title: 'Address, City & Country', detail: 'Used for display and map search. Enter accurately so guests can find you.' },
          { title: 'Timezone', detail: 'Set your local timezone (default: Europe/Belgrade). This ensures booking times are shown correctly to your guests.' },
        ],
      },
      {
        title: 'Images & Media',
        steps: [
          { title: 'Profile Photo', detail: 'Your logo or venue icon. Shown as a circular avatar on the listing. Use a square image for best results (min 400Ã—400 px).' },
          { title: 'Cover Photo', detail: 'Wide banner photo shown at the top of your public page. Use a landscape image (min 1200Ã—400 px).' },
          { title: 'Floor Plan / Map Image', detail: 'Upload a plan of your grounds (PNG or JPG). This image is used in the map editor when you create Locations and place them visually on the map. Typical size: 900Ã—600 or larger.' },
        ],
      },
      {
        title: 'Contact & Social Media',
        steps: [
          { title: 'Phone, Email, Website', detail: 'Contact details visible on the public listing page. Guests may contact you before booking.' },
          { title: 'Social Links', detail: 'Paste full URLs for Facebook, Instagram, TikTok, YouTube, and LinkedIn. Icons are shown on your listing.' },
        ],
      },
    ],
    tips: [
      'Always save your changes by clicking the Save button at the bottom of the form.',
      'Upload the floor plan image before creating locations â€” you will use it to pin each location on the map.',
    ],
  },

  // â”€â”€ 4. ACTIVITY TYPES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    id: 'activity-types',
    color: '#e65100',
    icon: <LocalOfferOutlined />,
    title: 'Activity Types',
    path: '/owner/places/[id] â†’ Activity Types tab',
    tagline: 'Define what kind of activities your place offers',
    intro:
      'An Activity Type is a category of service â€” for example "Tent Camping", "Glamping Cabin", "Kayaking", or "Archery". You define them here first, and then assign one or more activity types to each Location. Activity Types also carry the Pricing Rules.',
    features: ['Create activity types', 'Assign icon & color', 'Add descriptive tags', 'Attach pricing rules', 'Reorder by sort order'],
    subSections: [
      {
        title: 'Creating an Activity Type',
        steps: [
          { title: 'Click "Add Activity Type"', detail: 'A dialog opens with the creation form.' },
          { title: 'Enter a Name', detail: 'Use a clear, guest-facing name like "Standard Pitch", "Forest Cabin", or "Stand-Up Paddleboard".' },
          { title: 'Add a Description', detail: 'Optional but recommended. Describes what guests get with this activity (e.g. "Pitch for one tent with electricity hookup").' },
          { title: 'Pick an Icon', detail: 'Enter an emoji (e.g. â›º ðŸ›¶ ðŸ¹) as the icon. It appears on the listing cards and booking forms.' },
          { title: 'Choose a Color', detail: 'Use the color picker to assign a brand color. The activity type card will use this as its left border accent so you can quickly distinguish them.' },
          { title: 'Set Sort Order', detail: 'Lower numbers appear first. Use this to control the order activities appear to guests.' },
          { title: 'Select Tags', detail: 'Tags are searchable labels (e.g. "Pet Friendly", "Family", "Electric Hookup"). Select all that apply. Tags help guests filter activities when searching.' },
          { title: 'Save', detail: 'Click Save. The new activity type appears on the tab. You can now attach pricing rules to it.' },
        ],
      },
    ],
    tips: [
      'Create one activity type per distinct offering. If you have Tent Camping and RV Pitches, those should be separate activity types with separate pricing.',
      'Tags are set up by the platform administrator. If a tag you need is missing, contact support.',
      'The sort order controls how activities appear in the guest-facing booking form.',
    ],
    warnings: [
      'You cannot delete an activity type that is still assigned to a location. Remove it from all locations first.',
    ],
  },

  // â”€â”€ 5. PRICING RULES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    id: 'pricing',
    color: '#6a1b9a',
    icon: <AttachMoneyOutlined />,
    title: 'Pricing Rules',
    path: '/owner/places/[id] â†’ Activity Types tab â†’ price tag icon',
    tagline: 'Set how much guests pay â€” per person, per day, or a flat daily fee',
    intro:
      'Each Activity Type can have one or more Pricing Rules. A Pricing Rule defines the pricing model (per person per day, flat daily fee, etc.), the currency, which price tiers apply (adult, child, custom), and whether online payment is required.',
    features: [
      'Multiple pricing rules per activity',
      'Per-person or flat daily fee',
      'Age-group tiers (Adult, Child, Infant, Custom)',
      'Online, on-site, or both payment methods',
      'Currency preview across supported currencies',
    ],
    subSections: [
      {
        title: 'Creating a Pricing Rule',
        steps: [
          {
            title: 'Click the price tag icon next to an Activity Type',
            detail: 'The "Add Pricing Rule" button is visible under each activity type card. Click it to open the pricing dialog.',
          },
          {
            title: 'Give the rule a name',
            detail: 'For example: "Peak Season Rates" or "Standard Adult/Child". This name is for your reference and may appear on invoices.',
          },
          {
            title: 'Choose Pricing Type',
            detail:
              'PER_PERSON_PER_DAY â€” total is calculated as (price Ã— people Ã— days). Use this for campsite pitches or any activity billed per guest per night.\n\nDAILY_FEE â€” a flat amount charged per day regardless of group size. Use this for facility rentals (e.g. a kayak, a meeting room).',
          },
          {
            title: 'Add Pricing Tiers',
            detail:
              'Each tier represents one type of guest. Start with ADULT. Add more tiers as needed:\n\nâ€¢ ADULT â€” standard adult price\nâ€¢ CHILD â€” discounted price for children (you set the label, e.g. "Child (3â€“12 yrs)")\nâ€¢ INFANT â€” typically free or very low price\nâ€¢ CUSTOM â€” use for any other category (e.g. "Student", "Senior", "Pet")\n\nFor each tier, enter the price in EUR.',
          },
          {
            title: 'Set the Tier Label',
            detail: 'The label is shown to guests in the booking form. Be descriptive: "Adult (13+)", "Child (3â€“12)", "Infant (under 3 â€” free)".',
          },
          {
            title: 'Select Payment Method',
            detail:
              'BOTH â€” guest can pay online or on arrival (recommended).\nONLINE â€” guest must pay online before the booking is confirmed.\nON_SITE â€” guest pays on arrival only.',
          },
          {
            title: 'Requires Payment toggle',
            detail:
              'ON â€” the booking system collects or registers a payment.\nOFF â€” the activity is free or handled entirely outside the system.',
          },
          {
            title: 'Enable Currency Preview',
            detail: 'Toggle "Show Currency Preview" to see the same prices converted into other currencies. Useful for venues that receive international guests.',
          },
          { title: 'Save the rule', detail: 'Click Save. The pricing rule now appears in the card for that activity type.' },
        ],
      },
      {
        title: 'How pricing is calculated at booking',
        steps: [
          {
            title: 'PER_PERSON_PER_DAY example',
            detail: 'Rule: Adult â‚¬15, Child â‚¬8. Guest books for 3 nights with 2 adults and 1 child.\nTotal = (2 Ã— â‚¬15 Ã— 3) + (1 Ã— â‚¬8 Ã— 3) = â‚¬90 + â‚¬24 = â‚¬114.',
          },
          {
            title: 'DAILY_FEE example',
            detail: 'Rule: â‚¬45/day. Guest rents a kayak for 2 days.\nTotal = â‚¬45 Ã— 2 = â‚¬90. Group size does not affect the price.',
          },
          {
            title: 'Multiple pricing rules',
            detail: 'If you have multiple rules for one activity type (e.g. Peak Season and Off-Season), the guest selects which rate applies during booking.',
          },
        ],
      },
    ],
    tips: [
      'Keep tier labels clear and specific so guests know exactly what they are selecting.',
      'Add multiple rules to one activity type for seasonal pricing (e.g. "Summer Peak" vs "Winter Off-Season").',
    ],
    warnings: [
      'Deleting a pricing rule removes it from all future bookings. Existing confirmed bookings retain their stored price.',
      'Setting a price of 0 makes that tier free â€” use with care.',
    ],
  },

  // â”€â”€ 6. LOCATIONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    id: 'locations',
    color: '#00695c',
    icon: <MapOutlined />,
    title: 'Locations (Activity Spaces)',
    path: '/owner/places/[id] â†’ Locations tab',
    tagline: 'Named activity areas within your place â€” a zone, field, or facility',
    intro:
      'A Location is a physical zone or named area within your place where a specific activity takes place. For example a campsite might have "Pine Forest Zone A", "Lake Shore Zone B", and "RV Area". A water sports park might have "Kayak Dock" and "Paddle Pool". Each location is linked to one or more Activity Types and may contain individual Spots.',
    features: [
      'Unlimited locations per place',
      'Assign activity types',
      'Upload gallery photos',
      'Pin on floor plan map',
      'Set GPS coordinates',
      'Define capacity & instructions',
      'Create embed tokens',
    ],
    subSections: [
      {
        title: 'Creating a Location',
        steps: [
          { title: 'Click "Add Location"', detail: 'You are taken to the New Location form page.' },
          {
            title: 'Name & Description',
            detail: 'Give the location a clear name guests will see (e.g. "Zone A â€” Tent Pitches", "Main Kayak Dock"). The description appears on the public listing.',
          },
          {
            title: 'Instructions (How to find it)',
            detail: 'Optional. Provide arrival instructions for guests, e.g. "Follow the red markers past the reception, turn left at the lake". These appear in the booking confirmation email.',
          },
          {
            title: 'Maximum Capacity',
            detail: 'The maximum number of people this location can accommodate at any one time. The system will not allow more guests to book if this number is reached.',
          },
          {
            title: 'Assign Activity Types',
            detail: 'Select which Activity Types are available at this location. Each activity type has a "Requires Spot" toggle:\n\nâ€¢ ON â€” guests must choose an individual spot (pitch number, cabin, etc.) when booking.\nâ€¢ OFF â€” the booking is for the location as a whole without assigning a specific spot.',
          },
          {
            title: 'Pin on Floor Plan Map',
            detail: 'If your place has a floor plan image uploaded, an interactive SVG map is shown. Click "Pick on map" then click the exact position of this location on the plan. A circle pin is placed â€” this helps guests understand where the location is.',
          },
          { title: 'Sort Order', detail: 'Controls the display order among all locations. Lower number = appears first.' },
          { title: 'Save', detail: 'Click Save. The location is created and you land on the location detail page where you can add photos, spots, and further settings.' },
        ],
      },
      {
        title: 'Location Detail â€” Gallery & GPS',
        steps: [
          {
            title: 'Gallery tab',
            detail: 'Upload multiple photos for this location. Drag to reorder them. Click the star icon to set a photo as the cover image shown on the public listing.',
          },
          {
            title: 'GPS Coordinates',
            detail: 'Enter the latitude and longitude for outdoor locations. Use the map picker to drop a pin on an interactive OpenStreetMap â€” the coordinates fill automatically. A "Get Directions" link appears for guests.',
          },
          {
            title: 'Update map zone position',
            detail: 'On the Settings tab, the floor plan editor lets you re-pin this location\'s zone on the map at any time.',
          },
        ],
      },
    ],
    tips: [
      'Create one location per physically separate area. A campsite with 3 distinct zones = 3 locations.',
      'Upload at least 3â€“5 good photos per location. Listings with photos convert significantly better.',
      'The floor plan map pin helps guests understand your layout before arriving.',
    ],
    warnings: [
      'Disabling a location (Active toggle OFF) immediately hides it from new bookings. Existing confirmed bookings are not affected.',
    ],
  },

  // â”€â”€ 7. SPOTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    id: 'spots',
    color: '#4e342e',
    icon: <EventSeatOutlined />,
    title: 'Spots',
    path: '/owner/places/[id]/locations/[id] â†’ Spots tab',
    tagline: 'Individual numbered units within a location â€” a pitch, a cabin, a seat',
    intro:
      'A Spot is the smallest bookable unit inside a location. When "Requires Spot" is ON for an activity type, guests must choose one specific spot when booking. Spots have their own capacity, minimum/maximum stay, status, and amenities. Examples: Pitch #1â€“#30, Cabin A through F, Kayak K01â€“K10.',
    features: [
      'Named & numbered spots',
      'Max people per spot',
      'Min/max booking duration (days)',
      'Status management',
      'Amenities list',
      'Visual map shape',
      'Timeslots per spot',
    ],
    subSections: [
      {
        title: 'Creating a Spot',
        steps: [
          { title: 'Go to location detail â†’ Spots tab', detail: 'Open a location from the Locations tab on your place page, then click the Spots tab.' },
          { title: 'Click "Add Spot"', detail: 'A creation dialog opens.' },
          { title: 'Name', detail: 'The spot\'s display name, e.g. "Pitch 01", "Cabin A", "Kayak K-01". Keep it short and consistent.' },
          { title: 'Code', detail: 'Optional short identifier or internal code, e.g. "P01", "KY01". Useful for internal management.' },
          { title: 'Description', detail: 'Optional details about this specific spot: "Corner pitch near shower block", "Cabin with lake view".' },
          {
            title: 'Max People',
            detail: 'The maximum number of guests that can stay in this spot. The booking system will not allow more than this number of people to be assigned to the spot.',
          },
          {
            title: 'Min Days / Max Days',
            detail: 'Minimum and maximum booking duration in days. Leave blank for no restriction. Example: Min Days = 2 for a minimum 2-night stay, Max Days = 14 to prevent month-long bookings.',
          },
          {
            title: 'Status',
            detail:
              'AVAILABLE â€” open for bookings (default).\nOCCUPIED â€” currently in use, blocked from new bookings.\nMAINTENANCE â€” spot is being serviced, blocked from bookings.\nDISABLED â€” permanently hidden from guests.',
          },
          {
            title: 'Amenities',
            detail: 'Select all amenities available at this spot (e.g. Electricity, Water Hookup, Shade, BBQ, WiFi). These appear as feature chips on the booking details.',
          },
          { title: 'Activity Type', detail: 'If the location has multiple activity types, choose which one this specific spot belongs to.' },
          { title: 'Save', detail: 'Click Save. The spot is created and appears in the Spots list.' },
        ],
      },
      {
        title: 'Timeslots',
        steps: [
          {
            title: 'What is a Timeslot?',
            detail: 'A Timeslot defines when a spot is available during the day. For time-based activities (kayaking at 09:00, 12:00, 15:00) add timeslots to each spot.',
          },
          { title: 'Click "Add Timeslot" inside a Spot', detail: 'Enter a name (e.g. "Morning Session"), start time, and end time.' },
          { title: 'Whole-day toggle', detail: 'If the activity runs all day (like a campsite pitch), enable "Whole Day" and skip entering times.' },
          { title: 'Sort Order & Active', detail: 'Control the display order and whether guests can book this timeslot.' },
        ],
      },
      {
        title: 'Spot map shape (visual floor plan)',
        steps: [
          {
            title: 'Open a spot and click "Draw on map"',
            detail: 'An SVG overlay of the location\'s map image appears. Draw a rectangle or circle to mark the physical position of this spot. This creates an interactive visual map guests can use to pick their preferred spot.',
          },
        ],
      },
    ],
    tips: [
      'Number spots consistently: Pitch 01, Pitch 02, â€¦ so managing them is easy.',
      'Use MAINTENANCE status to temporarily block a spot during repairs without deleting it.',
      'Set Min Days = 2 or 3 on peak-season spots to avoid costly single-night gaps in your calendar.',
    ],
    warnings: [
      'Setting a spot to DISABLED prevents it from appearing in booking forms â€” use MAINTENANCE for temporary blocks instead.',
      'Deleting a spot is permanent. All booking history linked to that spot will still be accessible but the spot itself is gone.',
    ],
  },

  // â”€â”€ 8. EVENTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    id: 'events',
    color: '#c62828',
    icon: <CalendarMonthOutlined />,
    title: 'Events',
    path: '/owner/places/[id] â†’ Events tab',
    tagline: 'Special one-off or recurring events at your place',
    intro:
      'Events are date-specific activities or gatherings you want to promote and sell tickets for. Unlike regular spot bookings, events have a specific date, time, and ticket capacity. Guests register for an event in a single step without choosing a specific spot.',
    features: ['Create dated events', 'Set ticket capacity', 'Choose activity type', 'Open/close registration', 'Track registrations'],
    steps: [
      { title: 'Click "Add Event"', detail: 'The event creation form opens.' },
      { title: 'Name & Description', detail: 'Give the event a name (e.g. "Yoga Sunrise Retreat â€” July 12") and a detailed description of what guests will experience.' },
      { title: 'Select Activity Type', detail: 'Link the event to one of your pre-created activity types. This connects it to the correct pricing rules.' },
      { title: 'Date & Time', detail: 'Set the event date, start time, and end time.' },
      { title: 'Capacity', detail: 'Maximum number of registrations allowed. Once the limit is reached, the event is shown as fully booked.' },
      { title: 'Registration Open / Closed', detail: 'Toggle to control whether guests can currently register. Open early and close once full or the cut-off date passes.' },
      { title: 'Save & Publish', detail: 'Click Save. The event is immediately visible on the public listing if active.' },
    ],
    tips: [
      'Use events for workshops, guided tours, yoga sessions, or any time-limited experience.',
      'Close registration 24 hours before the event start so you have time to prepare the attendee list.',
    ],
  },

  // â”€â”€ 9. BOOKINGS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    id: 'bookings',
    color: '#f57c00',
    icon: <BookOnlineOutlined />,
    title: 'Bookings',
    path: '/owner/bookings  or  /owner/places/[id] â†’ Bookings tab',
    tagline: 'View, approve, and manage all registrations',
    intro:
      'Bookings (Registrations) are created when guests submit a reservation for a spot, location, or event. View all bookings from the Bookings menu, or filter to a specific place from the Bookings tab inside a place.',
    features: ['View all bookings', 'Filter by status & date', 'Approve / Reject', 'View payment breakdown', 'Update payment status'],
    steps: [
      {
        title: 'Open the Bookings page',
        detail: 'Navigate to Bookings in the left menu for a full list across all your places, or go to Place â†’ Bookings tab for a place-specific view.',
      },
      {
        title: 'Search & filter',
        detail: 'Use the search bar to find bookings by guest name, email, or booking number. Use the Status filter (PENDING, CONFIRMED, CANCELLED, COMPLETED, NO_SHOW) and date pickers to narrow results.',
      },
      {
        title: 'Read the booking list',
        detail: 'Each row shows: guest name, location, check-in date, check-out date, number of guests, total amount, payment status, and booking status.',
      },
      {
        title: 'Click a booking to open details',
        detail: 'The detail page shows full guest information, the exact spot/location reserved, number of guests per age group, and the full payment breakdown.',
      },
      {
        title: 'Approve a booking',
        detail: 'Click "Approve". The booking status changes to CONFIRMED and the guest receives a confirmation email with all details and arrival instructions.',
      },
      {
        title: 'Reject a booking',
        detail: 'Click "Reject". You can add an optional reason. The guest receives a rejection email and the spot is freed for other guests.',
      },
      {
        title: 'Update payment status',
        detail: 'When a guest pays on arrival, mark the payment status as PAID. This updates the revenue figure on your dashboard.',
      },
      {
        title: 'Mark as Completed or No-Show',
        detail: 'After check-out, change the status to COMPLETED. If the guest never arrived, use NO_SHOW to keep your records accurate.',
      },
    ],
    tips: [
      'Try to respond to PENDING bookings within 24 hours â€” guests appreciate fast confirmation.',
      'The payment breakdown shows the exact calculation: price per tier Ã— quantity Ã— days so you can verify totals easily.',
      'The "Source" field tells you whether the booking came from your listing (WEB) or an embedded widget on your own website (EMBED).',
    ],
    warnings: [
      'Rejecting a CONFIRMED booking sends a cancellation email to the guest. Payment refunds must be handled manually outside the system.',
    ],
  },

  // â”€â”€ 10. REVIEWS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    id: 'reviews',
    color: '#ad1457',
    icon: <StarOutlined />,
    title: 'Reviews',
    path: '/owner/places/[id] â†’ Reviews tab',
    tagline: 'See what your guests think',
    intro:
      'After a completed stay, guests can leave a star rating and a written review. Reviews appear publicly on your listing and heavily influence new guests\' booking decisions. The Reviews tab shows all reviews for a place.',
    steps: [
      { title: 'Open the Reviews tab', detail: 'Go to your place detail page and click the Reviews tab (last tab on the right).' },
      { title: 'Read guest feedback', detail: 'Each review shows the guest name, star rating (1â€“5), date, and written comment.' },
      { title: 'Monitor your average rating', detail: 'The overall star average is shown at the top. Aim for 4.5+ stars.' },
    ],
    tips: [
      'Reading reviews helps you spot recurring issues (e.g. "parking is difficult") that you can address to improve your score.',
      'A high star rating is the single most effective way to increase new bookings.',
    ],
  },

  // â”€â”€ 11. EMBED WIDGET â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    id: 'embed',
    color: '#004d40',
    icon: <CodeOutlined />,
    title: 'Embed Widget',
    path: '/owner/places/[id] â†’ Locations tab â†’ </> icon  or  Embed Tokens tab',
    tagline: 'Put the booking form directly on your own website',
    intro:
      'The Embed Widget lets you embed a fully functional booking form for a specific location into any website â€” your own website, a travel blog, or a partner page. Guests can book without ever visiting ontooff.app.',
    features: ['Unique token per location', 'Direct URL or iframe snippet', 'Expiry date', 'Usage tracking', 'Revokable at any time'],
    steps: [
      {
        title: 'Open the Locations tab on a place',
        detail: 'Find the location you want to embed. Click the "</>" (Code) icon on the location card to open the Embed dialog for that location.',
      },
      {
        title: 'Create an embed token',
        detail: 'Enter a Label (e.g. "Website embed", "Facebook ad landing page") so you remember where this token is used. Optionally set an Expiry Date after which the token stops working.',
      },
      {
        title: 'Copy the embed URL',
        detail: 'A direct URL is generated: https://www.ontooff.app/embed/[token]. Share this link directly or use it as the src in an iframe.',
      },
      {
        title: 'Copy the iframe snippet',
        detail: 'Click the iframe copy button to get a ready-to-paste HTML snippet:\n<iframe src="https://www.ontooff.app/embed/[token]" width="100%" height="700" frameborder="0" allow="payment"></iframe>\nPaste this into your website\'s HTML.',
      },
      {
        title: 'Monitor usage',
        detail: 'Each token shows a Use Count (how many times the booking form was loaded) and a Last Used date.',
      },
      {
        title: 'Revoke a token',
        detail: 'Click the delete icon to immediately deactivate the token. Any embed using that token will stop working. Create a new token to replace it.',
      },
    ],
    tips: [
      'Create a separate token for each website or marketing campaign so you can track which one generates more bookings.',
      'Set an expiry date for tokens created for seasonal campaigns so they expire automatically.',
    ],
    warnings: [
      'Anyone with the embed URL can view and submit the booking form. Do not share embed URLs publicly if you want to control access.',
    ],
  },
];

// â”€â”€â”€ UI Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function Callout({ type, children }: { type: 'tip' | 'warning'; children: React.ReactNode }) {
  const map = {
    tip:     { bg: '#e8f5e9', border: '#2e7d32', icon: <LightbulbOutlined sx={{ fontSize: 16, color: '#2e7d32', flexShrink: 0 }} /> },
    warning: { bg: '#fff3e0', border: '#e65100', icon: <WarningAmberOutlined sx={{ fontSize: 16, color: '#e65100', flexShrink: 0 }} /> },
  };
  const c = map[type];
  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1,
        alignItems: 'flex-start',
        bgcolor: c.bg,
        borderLeft: `3px solid ${c.border}`,
        borderRadius: '0 6px 6px 0',
        px: 1.5,
        py: 1,
        mb: 0.75,
      }}
    >
      <Box sx={{ pt: 0.1 }}>{c.icon}</Box>
      <Typography variant="body2" sx={{ lineHeight: 1.6 }}>{children}</Typography>
    </Box>
  );
}

function StepCard({ n, title, detail, color }: { n: number; title: string; detail: string; color: string }) {
  return (
    <Box
      sx={{
        display: 'flex',
        gap: 2,
        alignItems: 'flex-start',
        py: 1.5,
        borderBottom: '1px solid',
        borderColor: 'divider',
        '&:last-child': { borderBottom: 'none' },
      }}
    >
      <Box
        sx={{
          width: 26,
          height: 26,
          borderRadius: '50%',
          bgcolor: color,
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: '0.72rem',
          flexShrink: 0,
          mt: 0.1,
          boxShadow: `0 2px 6px ${color}55`,
        }}
      >
        {n}
      </Box>
      <Box>
        <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.4 }}>{title}</Typography>
        {detail.split('\n').map((line, i) => (
          <Typography key={i} variant="body2" color="text.secondary" sx={{ lineHeight: 1.6, mt: 0.25 }}>{line}</Typography>
        ))}
      </Box>
    </Box>
  );
}

function PathBreadcrumb({ path }: { path: string }) {
  const parts = path.split(' â†’ ');
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.25, mb: 1.5 }}>
      {parts.map((part, i) => (
        <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
          <Chip label={part} size="small" variant="outlined" sx={{ fontFamily: 'monospace', fontSize: '0.7rem', height: 20, borderRadius: 1 }} />
          {i < parts.length - 1 && <NavigateNext sx={{ fontSize: 14, color: 'text.disabled' }} />}
        </Box>
      ))}
    </Box>
  );
}

// â”€â”€â”€ Table of Contents items â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const TOC_ITEMS = SECTIONS.map((s) => ({ id: s.id, label: s.title, color: s.color, icon: s.icon }));

// â”€â”€â”€ Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const metadata = { title: 'Place Owner Help Guide â€” ontooff' };

export default function AdminHelpPage() {
  return (
    <Box sx={{ bgcolor: 'grey.50', minHeight: '100vh' }}>
      {/* Top hero strip */}
      <Box sx={{ bgcolor: '#1b4332', color: '#fff', px: { xs: 3, md: 6 }, py: { xs: 4, md: 5 } }}>
        <Typography variant="h3" sx={{ fontWeight: 800, mb: 0.75, letterSpacing: -0.5 }}>
          Place Owner Guide
        </Typography>
        <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.8)', maxWidth: 560 }}>
          Everything you need to know to set up, manage and grow your venue on ontooff â€” from creating your first place to pricing, spots, and bookings.
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2.5 }}>
          {TOC_ITEMS.map((item) => (
            <Chip
              key={item.id}
              label={item.label}
              component="a"
              href={`#${item.id}`}
              clickable
              size="small"
              sx={{
                bgcolor: 'rgba(255,255,255,0.12)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.25)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.22)' },
                fontWeight: 500,
              }}
            />
          ))}
        </Box>
      </Box>

      {/* Body: sidebar + content */}
      <Box
        sx={{
          display: 'flex',
          maxWidth: 1100,
          mx: 'auto',
          px: { xs: 2, md: 4 },
          py: 5,
          gap: { xs: 0, md: 4 },
          alignItems: 'flex-start',
        }}
      >
        {/* Sticky sidebar â€” desktop only */}
        <Box
          component="nav"
          sx={{ display: { xs: 'none', md: 'block' }, width: 200, flexShrink: 0, position: 'sticky', top: 24 }}
        >
          <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ px: 2, py: 1.25, bgcolor: 'grey.100', borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary' }}>
                Sections
              </Typography>
            </Box>
            {TOC_ITEMS.map((item, i) => (
              <Box
                key={item.id}
                component="a"
                href={`#${item.id}`}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 2,
                  py: 0.9,
                  textDecoration: 'none',
                  color: 'text.primary',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  borderBottom: i < TOC_ITEMS.length - 1 ? '1px solid' : 'none',
                  borderColor: 'divider',
                  borderLeft: '3px solid transparent',
                  transition: 'all 0.15s',
                  '&:hover': { bgcolor: 'grey.50', borderLeftColor: item.color, color: item.color },
                }}
              >
                <Box sx={{ color: item.color, display: 'flex', fontSize: 16 }}>
                  {item.icon as React.ReactElement}
                </Box>
                {item.label}
              </Box>
            ))}
          </Paper>
        </Box>

        {/* Main content */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {SECTIONS.map((section) => (
            <Box key={section.id} id={section.id} sx={{ mb: 5 }}>
              <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}>

                {/* Section header */}
                <Box
                  sx={{
                    px: { xs: 2.5, md: 3.5 },
                    py: 2.5,
                    borderLeft: `5px solid ${section.color}`,
                    bgcolor: '#fff',
                    borderBottom: '1px solid',
                    borderBottomColor: 'divider',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.75 }}>
                    <Box
                      sx={{
                        width: 38,
                        height: 38,
                        borderRadius: 2,
                        bgcolor: `${section.color}18`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: section.color,
                        flexShrink: 0,
                      }}
                    >
                      {section.icon as React.ReactElement}
                    </Box>
                    <Box>
                      <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.2 }}>{section.title}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.2 }}>{section.tagline}</Typography>
                    </Box>
                  </Box>
                  <PathBreadcrumb path={section.path} />
                  <Typography variant="body2" sx={{ lineHeight: 1.7, color: 'text.secondary', maxWidth: 680 }}>
                    {section.intro}
                  </Typography>
                  {section.features && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1.5 }}>
                      {section.features.map((f) => (
                        <Chip
                          key={f}
                          label={f}
                          size="small"
                          sx={{
                            bgcolor: `${section.color}0f`,
                            color: section.color,
                            fontWeight: 500,
                            fontSize: '0.72rem',
                            height: 22,
                            border: `1px solid ${section.color}33`,
                          }}
                        />
                      ))}
                    </Box>
                  )}
                </Box>

                {/* Top-level steps */}
                {section.steps && section.steps.length > 0 && (
                  <Box sx={{ px: { xs: 2.5, md: 3.5 }, py: 2, bgcolor: '#fff' }}>
                    <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 0.5, mb: 1, display: 'block' }}>
                      Step by Step
                    </Typography>
                    {section.steps.map((step, i) => (
                      <StepCard key={i} n={i + 1} title={step.title} detail={step.detail} color={section.color} />
                    ))}
                  </Box>
                )}

                {/* Sub-sections */}
                {section.subSections?.map((sub, si) => (
                  <Box key={si}>
                    <Box
                      sx={{
                        px: { xs: 2.5, md: 3.5 },
                        py: 1.25,
                        bgcolor: `${section.color}08`,
                        borderTop: '1px solid',
                        borderColor: 'divider',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                      }}
                    >
                      {sub.icon && <Box sx={{ color: section.color, display: 'flex', fontSize: 18 }}>{sub.icon as React.ReactElement}</Box>}
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: section.color }}>{sub.title}</Typography>
                    </Box>
                    <Box sx={{ px: { xs: 2.5, md: 3.5 }, py: 1.5, bgcolor: '#fff' }}>
                      {sub.steps.map((step, i) => (
                        <StepCard key={i} n={i + 1} title={step.title} detail={step.detail} color={section.color} />
                      ))}
                    </Box>
                  </Box>
                ))}

                {/* Tips & Warnings */}
                {((section.tips?.length ?? 0) > 0 || (section.warnings?.length ?? 0) > 0) && (
                  <Box
                    sx={{
                      px: { xs: 2.5, md: 3.5 },
                      py: 2,
                      bgcolor: 'grey.50',
                      borderTop: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    {section.tips?.map((tip, i) => <Callout key={`t${i}`} type="tip">{tip}</Callout>)}
                    {section.warnings?.map((w, i) => <Callout key={`w${i}`} type="warning">{w}</Callout>)}
                  </Box>
                )}
              </Paper>
            </Box>
          ))}

          <Divider sx={{ mb: 2 }} />
          <Typography variant="caption" color="text.disabled" sx={{ display: 'block', textAlign: 'center', pb: 4 }}>
            ontooff Place Owner Guide â€” For internal use only
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
