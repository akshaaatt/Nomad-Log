export type TravelCategory = 'visited' | 'wishlist' | 'avoid';

export interface TravelLocation {
  id: string;
  placeName: string;
  cityName: string;
  countryName: string;
  lat: number;
  lng: number;
  category: TravelCategory;
  visitDate: string; // YYYY-MM-DD format
  rating: number; // 1 to 5 stars
  review: string;
  companions: string; // 'Solo', 'Family', 'Friends', 'Partner', etc.
  flaggedReason?: string; // specific reason to avoid
  estimatedBudget?: number; // for wishlist
  costAmount?: number; // actual spent cost
  priority?: 'High' | 'Medium' | 'Low'; // for wishlist
  tags?: string[]; // e.g. "Beach", "Foodie", "Culture", "Adventure"
}

export interface RouteSegment {
  id: string;
  cityName: string;
  countryName: string;
  lat: number;
  lng: number;
  stopOrder: number; // ordered route stop index: 0, 1, 2, ...
}

export interface TravelRoute {
  id: string;
  userId: string;
  title: string; // e.g. "Grand Tour of Italy"
  stops: RouteSegment[]; // sequence of waypoints
  costAmount?: number; // total trip cost amount
  mediaLinks?: string[]; // social reels, videos, vlogs, blog posts
  visitDate?: string; // date of route execution
  notes?: string; // travel memory journal notes
}

export interface MapSettings {
  showVisited: boolean;
  showWishlist: boolean;
  showAvoid: boolean;
  mapType: 'standard' | 'dark' | 'satellite';
}

export interface GeocodeResult {
  placeName: string;
  cityName: string;
  countryName: string;
  lat: number;
  lng: number;
}
