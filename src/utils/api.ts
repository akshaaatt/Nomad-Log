import { TravelLocation, TravelRoute } from '../types';
import { supabase } from './supabaseClient';

export interface User {
  id: string;
  username: string;
}

// Default travel landmarks to seed a new account (Kyoto, Paris, Reykjavik)
const SEED_LOCATIONS_TEMPLATE = [
  {
    placeName: 'Kyoto, Japan',
    cityName: 'Kyoto',
    countryName: 'Japan',
    lat: 35.0116,
    lng: 135.7681,
    category: 'visited' as const,
    visitDate: '2025-04-12',
    rating: 5,
    review: 'Kyoto was absolutely magical. The contrast between ancient temples like Kinkaku-ji and modern streets was breathtaking. Cherry blossoms were in full bloom. Highly recommend Renting a Kimono and walking through Gion at night!',
    companions: 'Partner',
    tags: ['Culture', 'Temples', 'Nature', 'Foodie']
  },
  {
    placeName: 'Paris, France',
    cityName: 'Paris',
    countryName: 'France',
    lat: 48.8566,
    lng: 2.3522,
    category: 'visited' as const,
    visitDate: '2024-09-18',
    rating: 4,
    review: 'A classic that lived up to the hype! Visiting the Louvre at night and eating freshly baked croissants from local boulangeries made it unforgettable. Beware of pickpockets around Sacré-Cœur, but otherwise spectacular visual layouts.',
    companions: 'Solo',
    tags: ['Museums', 'Romantic', 'Architecture', 'Foodie']
  },
  {
    placeName: 'Reykjavik, Iceland',
    cityName: 'Reykjavik',
    countryName: 'Iceland',
    lat: 64.1466,
    lng: -21.9426,
    category: 'wishlist' as const,
    visitDate: '2027-02-15',
    rating: 0,
    review: 'Dreaming of seeing the Northern Lights and soaking in the Blue Lagoon. Planning a full road trip around the Ring Road to witness the black sand beaches, colossal waterfalls, and majestic glaciers.',
    companions: 'Friends',
    estimatedBudget: 3500,
    priority: 'High' as const,
    tags: ['Nature', 'Northern Lights', 'Adventure', 'Roadtrip']
  }
];

export const api = {
  // Check if current session is valid and retrieve user information
  async me(): Promise<User | null> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) return null;

      return {
        id: user.id,
        username: user.user_metadata?.username || user.email?.split('@')[0] || 'Traveller'
      };
    } catch (e) {
      console.error('Failed to authenticate token with Supabase', e);
      return null;
    }
  },

  // Log in
  async login(username: string, password: string): Promise<{ user: User; token: string }> {
    const email = `${username.trim().toLowerCase()}@nomad-log.local`;
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      throw new Error(error.message || 'Failed to authenticate user.');
    }

    if (!data.user || !data.session) {
      throw new Error('Failed to retrieve user session.');
    }

    const token = data.session.access_token;
    localStorage.setItem('travel_session_token', token);

    return {
      user: {
        id: data.user.id,
        username: data.user.user_metadata?.username || username
      },
      token
    };
  },

  // Sign up
  async signup(username: string, password: string): Promise<{ user: User; token: string }> {
    const trimmedUsername = username.trim();
    const email = `${trimmedUsername.toLowerCase()}@nomad-log.local`;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: trimmedUsername
        }
      }
    });

    if (error) {
      throw new Error(error.message || 'Failed to register account.');
    }

    if (!data.user || !data.session) {
      throw new Error('Registration succeeded but session could not be established.');
    }

    const token = data.session.access_token;
    localStorage.setItem('travel_session_token', token);

    const user = {
      id: data.user.id,
      username: trimmedUsername
    };

    // Auto seed travel examples for a beautiful initial experience
    try {
      const seedData = SEED_LOCATIONS_TEMPLATE.map((tpl, i) => ({
        id: `seed-${data.user!.id}-${i}-${Date.now()}`,
        user_id: data.user!.id,
        place_name: tpl.placeName,
        city_name: tpl.cityName,
        country_name: tpl.countryName,
        lat: tpl.lat,
        lng: tpl.lng,
        category: tpl.category,
        visit_date: tpl.visitDate,
        rating: tpl.rating,
        review: tpl.review,
        companions: tpl.companions,
        tags: tpl.tags,
        estimated_budget: (tpl as any).estimatedBudget || null,
        priority: (tpl as any).priority || null
      }));

      await supabase.from('locations').insert(seedData);
    } catch (e) {
      console.error('Failed to seed user locations:', e);
    }

    return { user, token };
  },

  // Log out
  async logout(): Promise<void> {
    await supabase.auth.signOut();
    localStorage.removeItem('travel_session_token');
  },

  // Trigger Google Sign-In redirect flow
  async loginWithGoogle(): Promise<void> {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) {
      throw new Error(error.message || 'Failed to initiate Google authentication.');
    }
  },

  // Get all user locations
  async getLocations(): Promise<TravelLocation[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthenticated request.');

    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message || 'Failed to fetch places.');
    }

    return (data || []).map(row => ({
      id: row.id,
      placeName: row.place_name,
      cityName: row.city_name,
      countryName: row.country_name,
      lat: row.lat,
      lng: row.lng,
      category: row.category,
      visitDate: row.visit_date,
      rating: row.rating,
      review: row.review,
      companions: row.companions,
      flaggedReason: row.flagged_reason,
      estimatedBudget: row.estimated_budget,
      costAmount: row.cost_amount,
      priority: row.priority,
      tags: row.tags || []
    }));
  },

  // Add a location
  async addLocation(loc: Omit<TravelLocation, 'userId'>): Promise<TravelLocation> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthenticated request.');

    const id = `loc-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

    const dbRow = {
      id,
      user_id: user.id,
      place_name: loc.placeName,
      city_name: loc.cityName,
      country_name: loc.countryName,
      lat: loc.lat,
      lng: loc.lng,
      category: loc.category,
      visit_date: loc.visitDate,
      rating: loc.rating,
      review: loc.review,
      companions: loc.companions,
      flagged_reason: loc.flaggedReason,
      estimated_budget: loc.estimatedBudget,
      cost_amount: loc.costAmount,
      priority: loc.priority,
      tags: loc.tags
    };

    const { data, error } = await supabase
      .from('locations')
      .insert(dbRow)
      .select()
      .single();

    if (error) {
      throw new Error(error.message || 'Failed to register place coordinates.');
    }

    return {
      id: data.id,
      placeName: data.place_name,
      cityName: data.city_name,
      countryName: data.country_name,
      lat: data.lat,
      lng: data.lng,
      category: data.category,
      visitDate: data.visit_date,
      rating: data.rating,
      review: data.review,
      companions: data.companions,
      flaggedReason: data.flagged_reason,
      estimatedBudget: data.estimated_budget,
      costAmount: data.cost_amount,
      priority: data.priority,
      tags: data.tags || []
    };
  },

  // Update a location
  async updateLocation(id: string, loc: Partial<TravelLocation>): Promise<TravelLocation> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthenticated request.');

    const dbRow: any = {};
    if (loc.placeName !== undefined) dbRow.place_name = loc.placeName;
    if (loc.cityName !== undefined) dbRow.city_name = loc.cityName;
    if (loc.countryName !== undefined) dbRow.country_name = loc.countryName;
    if (loc.lat !== undefined) dbRow.lat = loc.lat;
    if (loc.lng !== undefined) dbRow.lng = loc.lng;
    if (loc.category !== undefined) dbRow.category = loc.category;
    if (loc.visitDate !== undefined) dbRow.visit_date = loc.visitDate;
    if (loc.rating !== undefined) dbRow.rating = loc.rating;
    if (loc.review !== undefined) dbRow.review = loc.review;
    if (loc.companions !== undefined) dbRow.companions = loc.companions;
    if (loc.flaggedReason !== undefined) dbRow.flagged_reason = loc.flaggedReason;
    if (loc.estimatedBudget !== undefined) dbRow.estimated_budget = loc.estimatedBudget;
    if (loc.costAmount !== undefined) dbRow.cost_amount = loc.costAmount;
    if (loc.priority !== undefined) dbRow.priority = loc.priority;
    if (loc.tags !== undefined) dbRow.tags = loc.tags;

    const { data, error } = await supabase
      .from('locations')
      .update(dbRow)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message || 'Failed to update place record.');
    }

    return {
      id: data.id,
      placeName: data.place_name,
      cityName: data.city_name,
      countryName: data.country_name,
      lat: data.lat,
      lng: data.lng,
      category: data.category,
      visitDate: data.visit_date,
      rating: data.rating,
      review: data.review,
      companions: data.companions,
      flaggedReason: data.flagged_reason,
      estimatedBudget: data.estimated_budget,
      costAmount: data.cost_amount,
      priority: data.priority,
      tags: data.tags || []
    };
  },

  // Delete a location
  async deleteLocation(id: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthenticated request.');

    const { error } = await supabase
      .from('locations')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(error.message || 'Failed to delete place record.');
    }
  },

  // Get all user travel routes
  async getRoutes(): Promise<TravelRoute[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthenticated request.');

    const { data, error } = await supabase
      .from('routes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message || 'Failed to fetch travel routes.');
    }

    return (data || []).map(row => ({
      id: row.id,
      userId: row.user_id,
      title: row.title,
      stops: row.stops,
      costAmount: row.cost_amount,
      mediaLinks: row.media_links || [],
      visitDate: row.visit_date,
      notes: row.notes
    }));
  },

  // Add a brand new travel route
  async addRoute(route: Omit<TravelRoute, 'userId'>): Promise<TravelRoute> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthenticated request.');

    const id = `route-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

    const dbRow = {
      id,
      user_id: user.id,
      title: route.title,
      stops: route.stops,
      cost_amount: route.costAmount || 0,
      media_links: route.mediaLinks || [],
      visit_date: route.visitDate,
      notes: route.notes
    };

    const { data, error } = await supabase
      .from('routes')
      .insert(dbRow)
      .select()
      .single();

    if (error) {
      throw new Error(error.message || 'Failed to register travel route.');
    }

    return {
      id: data.id,
      userId: data.user_id,
      title: data.title,
      stops: data.stops,
      costAmount: data.cost_amount,
      mediaLinks: data.media_links || [],
      visitDate: data.visit_date,
      notes: data.notes
    };
  },

  // Update a travel route
  async updateRoute(id: string, route: Partial<TravelRoute>): Promise<TravelRoute> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthenticated request.');

    const dbRow: any = {};
    if (route.title !== undefined) dbRow.title = route.title;
    if (route.stops !== undefined) dbRow.stops = route.stops;
    if (route.costAmount !== undefined) dbRow.cost_amount = route.costAmount;
    if (route.mediaLinks !== undefined) dbRow.media_links = route.mediaLinks;
    if (route.visitDate !== undefined) dbRow.visit_date = route.visitDate;
    if (route.notes !== undefined) dbRow.notes = route.notes;

    const { data, error } = await supabase
      .from('routes')
      .update(dbRow)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message || 'Failed to update travel route.');
    }

    return {
      id: data.id,
      userId: data.user_id,
      title: data.title,
      stops: data.stops,
      costAmount: data.cost_amount,
      mediaLinks: data.media_links || [],
      visitDate: data.visit_date,
      notes: data.notes
    };
  },

  // Delete a travel route
  async deleteRoute(id: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthenticated request.');

    const { error } = await supabase
      .from('routes')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(error.message || 'Failed to delete travel route.');
    }
  }
};
