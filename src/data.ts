import { TravelLocation } from './types';

export const INITIAL_TRAVEL_LOCATIONS: TravelLocation[] = [
  {
    id: 'seed-1',
    placeName: 'Kyoto, Japan',
    cityName: 'Kyoto',
    countryName: 'Japan',
    lat: 35.0116,
    lng: 135.7681,
    category: 'visited',
    visitDate: '2025-04-12',
    rating: 5,
    review: 'Kyoto was absolutely magical. The contrast between ancient temples like Kinkaku-ji and modern streets was breathtaking. Cherry blossoms were in full bloom. Highly recommend Renting a Kimono and walking through Gion at night!',
    companions: 'Partner',
    tags: ['Culture', 'Temples', 'Nature', 'Foodie']
  },
  {
    id: 'seed-2',
    placeName: 'Paris, France',
    cityName: 'Paris',
    countryName: 'France',
    lat: 48.8566,
    lng: 2.3522,
    category: 'visited',
    visitDate: '2024-09-18',
    rating: 4,
    review: 'A classic that lived up to the hype! Visiting the Louvre at night and eating freshly baked croissants from local boulangeries made it unforgettable. Beware of pickpockets around Sacré-Cœur, but otherwise spectacular visual layouts.',
    companions: 'Solo',
    tags: ['Museums', 'Romantic', 'Architecture', 'Foodie']
  },
  {
    id: 'seed-3',
    placeName: 'Reykjavik, Iceland',
    cityName: 'Reykjavik',
    countryName: 'Iceland',
    lat: 64.1466,
    lng: -21.9426,
    category: 'wishlist',
    visitDate: '2027-02-15',
    rating: 0,
    review: 'Dreaming of seeing the Northern Lights and soaking in the Blue Lagoon. Planning a full road trip around the Ring Road to witness the black sand beaches, colossal waterfalls, and majestic glaciers.',
    companions: 'Friends',
    estimatedBudget: 3500,
    priority: 'High',
    tags: ['Nature', 'Northern Lights', 'Adventure', 'Roadtrip']
  },
  {
    id: 'seed-4',
    placeName: 'Sanzhi UFO Houses, Taiwan',
    cityName: 'New Taipei City',
    countryName: 'Taiwan',
    lat: 25.2608,
    lng: 121.5002,
    category: 'avoid',
    visitDate: '2023-11-05',
    rating: 1,
    review: 'Extremely dangerous and creepy. I thought it would be an interesting urban exploration spot, but the site is completely demolished, highly unstable, fenced off, and guarded by stray dogs. Do not waste travel time going out here!',
    companions: 'Solo',
    flaggedReason: 'Dangerous abandoned site, stray wild dogs, completely demolished structure.',
    tags: ['Abandoned', 'Unstable', 'Hazardous']
  },
  {
    id: 'seed-5',
    placeName: 'Amalfi Coast, Italy',
    cityName: 'Positano',
    countryName: 'Italy',
    lat: 40.6281,
    lng: 14.4850,
    category: 'wishlist',
    visitDate: '2026-07-22',
    rating: 0,
    review: 'Want to rent a vintage Vespa, cruise along the narrow cliffside roads override Positano, and swim in the Mediterranean Sea while sipping Italian Limoncello.',
    companions: 'Partner',
    estimatedBudget: 2800,
    priority: 'Medium',
    tags: ['Beach', 'Scenic', 'Foodie', 'Relaxing']
  }
];

export const PRESET_TAGS = [
  'Beach',
  'Nature',
  'Culture',
  'Temples',
  'Foodie',
  'Nightlife',
  'Adventure',
  'Museums',
  'Hiking',
  'Romantic',
  'Shopping',
  'History',
  'Wildlife',
  'Budget Friendly',
  'Luxury'
];

export const COMPANIONS_OPTIONS = [
  'Solo',
  'Partner',
  'Friends',
  'Family',
  'Co-workers'
];
