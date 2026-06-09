import { TravelLocation, TravelRoute } from '../types';

const getSessionToken = () => localStorage.getItem('travel_session_token');
const setSessionToken = (token: string) => localStorage.setItem('travel_session_token', token);
const clearSessionToken = () => localStorage.removeItem('travel_session_token');

export interface User {
  id: string;
  username: string;
}

export const api = {
  // Check if current session token is valid and retrieve user information
  async me(): Promise<User | null> {
    const token = getSessionToken();
    if (!token) return null;

    try {
      const res = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Session-Token': token
        }
      });
      if (!res.ok) {
        clearSessionToken();
        return null;
      }
      const data = await res.json();
      return data.user;
    } catch (e) {
      console.error('Failed to authenticate token', e);
      return null;
    }
  },

  // Log in
  async login(username: string, password: string): Promise<{ user: User; token: string }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to authenticate user.');
    }

    const data = await res.json();
    setSessionToken(data.token);
    return data;
  },

  // Sign up
  async signup(username: string, password: string): Promise<{ user: User; token: string }> {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to register account.');
    }

    const data = await res.json();
    setSessionToken(data.token);
    return data;
  },

  // Log out
  async logout(): Promise<void> {
    const token = getSessionToken();
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Session-Token': token
          }
        });
      } catch (e) {
        console.error('Logout request failed', e);
      }
    }
    clearSessionToken();
  },

  // Get all user locations
  async getLocations(): Promise<TravelLocation[]> {
    const token = getSessionToken();
    if (!token) throw new Error('Unauthenticated request.');

    const res = await fetch('/api/locations', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Session-Token': token
      }
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to fetch places.');
    }

    return res.json();
  },

  // Add a location
  async addLocation(loc: Omit<TravelLocation, 'userId'>): Promise<TravelLocation> {
    const token = getSessionToken();
    if (!token) throw new Error('Unauthenticated request.');

    const res = await fetch('/api/locations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Session-Token': token
      },
      body: JSON.stringify(loc)
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to register place coordinates.');
    }

    return res.json();
  },

  // Update a location
  async updateLocation(id: string, loc: Partial<TravelLocation>): Promise<TravelLocation> {
    const token = getSessionToken();
    if (!token) throw new Error('Unauthenticated request.');

    const res = await fetch(`/api/locations/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Session-Token': token
      },
      body: JSON.stringify(loc)
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to update place record.');
    }

    return res.json();
  },

  // Delete a location
  async deleteLocation(id: string): Promise<void> {
    const token = getSessionToken();
    if (!token) throw new Error('Unauthenticated request.');

    const res = await fetch(`/api/locations/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Session-Token': token
      }
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to delete place record.');
    }
  },

  // Get all user travel routes
  async getRoutes(): Promise<TravelRoute[]> {
    const token = getSessionToken();
    if (!token) throw new Error('Unauthenticated request.');

    const res = await fetch('/api/routes', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Session-Token': token
      }
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to fetch travel routes.');
    }

    return res.json();
  },

  // Add a brand new travel route
  async addRoute(route: Omit<TravelRoute, 'userId'>): Promise<TravelRoute> {
    const token = getSessionToken();
    if (!token) throw new Error('Unauthenticated request.');

    const res = await fetch('/api/routes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Session-Token': token
      },
      body: JSON.stringify(route)
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to register travel route.');
    }

    return res.json();
  },

  // Update a travel route
  async updateRoute(id: string, route: Partial<TravelRoute>): Promise<TravelRoute> {
    const token = getSessionToken();
    if (!token) throw new Error('Unauthenticated request.');

    const res = await fetch(`/api/routes/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Session-Token': token
      },
      body: JSON.stringify(route)
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to update travel route.');
    }

    return res.json();
  },

  // Delete a travel route
  async deleteRoute(id: string): Promise<void> {
    const token = getSessionToken();
    if (!token) throw new Error('Unauthenticated request.');

    const res = await fetch(`/api/routes/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Session-Token': token
      }
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to delete travel route.');
    }
  }
};
