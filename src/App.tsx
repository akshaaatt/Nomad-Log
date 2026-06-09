import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MapPin, 
  Search, 
  Settings, 
  Plus, 
  Download, 
  Upload, 
  Trash2, 
  Edit, 
  X, 
  Award, 
  Compass, 
  AlertTriangle, 
  Calendar, 
  Users, 
  DollarSign, 
  Bookmark, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp, 
  Info,
  Map as MapIcon,
  CheckCircle,
  Eye,
  Heart,
  Lock,
  User as UserIcon,
  Video,
  ExternalLink,
  BookOpen
} from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import TravelMap from './components/TravelMap';
import TravelForm from './components/TravelForm';
import RouteForm from './components/RouteForm';
import TravelStatistics from './components/TravelStatistics';
import { TravelLocation, TravelCategory, MapSettings, TravelRoute } from './types';
import { INITIAL_TRAVEL_LOCATIONS } from './data';
import { api, User } from './utils/api';
import { translations, AppLanguage } from './utils/translations';

export default function App() {
  // User auth state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [authTab, setAuthTab] = useState<'login' | 'signup'>('login');
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);

  // Locations state synced with full-stack endpoints
  const [locations, setLocations] = useState<TravelLocation[]>([]);
  const [routes, setRoutes] = useState<TravelRoute[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null);
  const [isAddingRoute, setIsAddingRoute] = useState(false);
  const [activeSegmentTab, setActiveSegmentTab] = useState<'pins' | 'routes'>('pins');

  // Initialize auth session check on mount
  useEffect(() => {
    async function loadSession() {
      try {
        const user = await api.me();
        if (user) {
          setCurrentUser(user);
          const [locs, rts] = await Promise.all([
            api.getLocations(),
            api.getRoutes()
          ]);
          setLocations(locs);
          setRoutes(rts);
        }
      } catch (err) {
        console.error('Failed checking active travel session', err);
      } finally {
        setIsLoadingUser(false);
      }
    }
    loadSession();
  }, []);

  // Sync selectedLocation on locations load or changes
  const [selectedLocation, setSelectedLocation] = useState<TravelLocation | null>(null);
  useEffect(() => {
    if (locations.length > 0 && !selectedLocation) {
      setSelectedLocation(locations[0]);
    } else if (locations.length === 0) {
      setSelectedLocation(null);
    }
  }, [locations]);

  // Core visual state
  const [activeTab, setActiveTab] = useState<TravelCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Forms & Temp Markers
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingLocId, setEditingLocId] = useState<string | null>(null);
  const [newLocationTemplate, setNewLocationTemplate] = useState<Partial<TravelLocation> | null>(null);
  const [tempMarker, setTempMarker] = useState<{ lat: number; lng: number; placeName: string } | null>(null);

  // Map Tile Style State
  const [mapType, setMapType] = useState<'standard' | 'light' | 'dark'>('light');
  const [showCountryView, setShowCountryView] = useState(false);

  // Nominatim search suggestions states
  const [searchQueryInput, setSearchQueryInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([]);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);

  // Widget Toggles
  const [showStats, setShowStats] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [apiError, setApiError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Mobile responsive views switcher
  const [mobileView, setMobileView] = useState<'map' | 'list'>('map');

  // Localized preferences
  const [appLanguage, setAppLanguage] = useState<AppLanguage>(() => {
    return (localStorage.getItem('travel_app_lang') as AppLanguage) || 'en';
  });
  const [currency, setCurrency] = useState<string>(() => {
    return localStorage.getItem('travel_app_currency') || '$';
  });
  const [timeFormat, setTimeFormat] = useState<'12' | '24'>(() => {
    return (localStorage.getItem('travel_app_time_format') as '12' | '24') || '24';
  });
  const [dateFormat, setDateFormat] = useState<string>(() => {
    return localStorage.getItem('travel_app_date_format') || 'YYYY-MM-DD';
  });
  const [timezone, setTimezone] = useState<string>(() => {
    return localStorage.getItem('travel_app_timezone') || 'UTC';
  });

  // Watch and sync local preferences changes
  useEffect(() => {
    localStorage.setItem('travel_app_lang', appLanguage);
  }, [appLanguage]);

  useEffect(() => {
    localStorage.setItem('travel_app_currency', currency);
  }, [currency]);

  useEffect(() => {
    localStorage.setItem('travel_app_time_format', timeFormat);
  }, [timeFormat]);

  useEffect(() => {
    localStorage.setItem('travel_app_date_format', dateFormat);
  }, [dateFormat]);

  useEffect(() => {
    localStorage.setItem('travel_app_timezone', timezone);
  }, [timezone]);

  const t = translations[appLanguage] || translations.en;

  // Localized price formatter
  const formatPrice = (val: number | undefined | null) => {
    if (val === undefined || val === null) return 'N/A';
    return `${currency}${val.toLocaleString()}`;
  };

  // Localized date formatter
  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return '';
    const parts = dateString.split('-');
    if (parts.length !== 3) return dateString;
    const [yr, mo, dy] = parts;
    if (dateFormat === 'DD/MM/YYYY') {
      return `${dy}/${mo}/${yr}`;
    }
    if (dateFormat === 'MM/DD/YYYY') {
      return `${mo}/${dy}/${yr}`;
    }
    return dateString; // YYYY-MM-DD
   };

  // Live timezone clock ticking state
  const [clockTime, setClockTime] = useState('');
  useEffect(() => {
    const updateClock = () => {
      try {
        const now = new Date();
        const options: Intl.DateTimeFormatOptions = {
          timeZone: timezone === 'UTC' ? 'UTC' : timezone,
          hour: 'numeric',
          minute: '2-digit',
          second: '2-digit',
          hour12: timeFormat === '12'
        };
        setClockTime(new Intl.DateTimeFormat('en-US', options).format(now));
      } catch (err) {
        setClockTime(new Date().toLocaleTimeString());
      }
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, [timezone, timeFormat]);

  // Handle Notifications
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  // OSM Nominatim Geocoding API Search Call
  const handleGeoSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQueryInput.trim()) return;

    setIsSearching(true);
    setApiError('');
    setSearchSuggestions([]);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQueryInput)}&limit=5`,
        {
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('OSM Server error');
      }

      const data = await response.json();
      if (data && data.length > 0) {
        const parsed = data.map((item: any) => {
          const parts = item.display_name.split(', ');
          const cityName = parts[0] || '';
          
          // Try to intelligent capture city/country
          let countryName = parts[parts.length - 1] || '';
          if (!isNaN(Number(countryName)) && parts.length > 1) {
            countryName = parts[parts.length - 2] || '';
          }

          return {
            placeName: item.display_name,
            cityName: cityName,
            countryName: countryName,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
          };
        });
        setSearchSuggestions(parsed);
      } else {
        setApiError('No coordinates found for that location. Try clicking directly on the map!');
      }
    } catch (err) {
      console.error(err);
      setApiError('Search network error. Feel free to click directly on the map to place notes.');
    } finally {
      setIsSearching(false);
    }
  };

  // Setup dynamic temporary marker and open form on selection
  const handleSelectSuggestion = (sug: any) => {
    setMobileView('list');
    setTempMarker({
      lat: sug.lat,
      lng: sug.lng,
      placeName: `${sug.cityName}, ${sug.countryName}`,
    });

    setNewLocationTemplate({
      cityName: sug.cityName,
      countryName: sug.countryName,
      placeName: sug.placeName,
      lat: sug.lat,
      lng: sug.lng,
      category: 'visited',
    });

    setSearchSuggestions([]);
    setSearchQueryInput('');
    setIsAddingNew(true);
    setEditingLocId(null);
  };

  // Reverse Geocoding upon Map Clicks
  const handleMapClick = async (lat: number, lng: number) => {
    setMobileView('list');
    // Put temp marker instantly to show responsiveness
    setTempMarker({
      lat,
      lng,
      placeName: 'Selected Coordinates',
    });

    setIsReverseGeocoding(true);
    setApiError('');

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
        {
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const address = data.address || {};
        
        const city = address.city || address.town || address.village || address.suburb || address.quarter || address.county || '';
        const country = address.country || '';
        
        setNewLocationTemplate({
          lat,
          lng,
          cityName: city,
          countryName: country,
          placeName: data.display_name || '',
          category: 'visited',
        });
      } else {
        throw new Error('Reverse geocoding failed');
      }
    } catch (err) {
      console.error('Reverse Geocode Error details', err);
      // Fallback with empty city names but loading precise lat/lng coordinates
      setNewLocationTemplate({
        lat,
        lng,
        cityName: '',
        countryName: '',
        placeName: `Point (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
        category: 'visited',
      });
    } finally {
      setIsReverseGeocoding(false);
      setIsAddingNew(true);
      setEditingLocId(null);
    }
  };

  // Submit new location or edit entry
  const handleFormSubmit = async (submittedLoc: TravelLocation) => {
    setApiError('');
    try {
      if (editingLocId) {
        const updated = await api.updateLocation(editingLocId, submittedLoc);
        setLocations(locations.map(l => (l.id === editingLocId ? updated : l)));
        setSelectedLocation(updated);
        setSuccessMsg('Successfully updated your travel record!');
      } else {
        const cleanLoc = { ...submittedLoc };
        delete (cleanLoc as any).id;
        const added = await api.addLocation(cleanLoc);
        setLocations([added, ...locations]);
        setSelectedLocation(added);
        setSuccessMsg('Successfully added a new pins to your logbook!');
      }
      setIsAddingNew(false);
      setEditingLocId(null);
      setNewLocationTemplate(null);
      setTempMarker(null);
    } catch (err: any) {
      setApiError(err.message || 'Failed to save coordinate log.');
    }
  };

  const handleDeleteLocation = async (id: string) => {
    if (confirm('Are you sure you want to remove this place from your log?')) {
      setApiError('');
      try {
        await api.deleteLocation(id);
        const updated = locations.filter(l => l.id !== id);
        setLocations(updated);
        setSelectedLocation(updated[0] || null);
        setSuccessMsg('Removed destination from your logs.');
      } catch (err: any) {
        setApiError(err.message || 'Failed to delete record.');
      }
    }
  };

  // Submit new route or edit entry
  const handleRouteFormSubmit = async (submittedRoute: TravelRoute) => {
    setApiError('');
    try {
      if (editingRouteId) {
        const updated = await api.updateRoute(editingRouteId, submittedRoute);
        setRoutes(routes.map(r => (r.id === editingRouteId ? updated : r)));
        setSelectedRouteId(updated.id);
        setSuccessMsg('Successfully updated your travel route sequence!');
      } else {
        const cleanRoute = { ...submittedRoute };
        delete (cleanRoute as any).id;
        const added = await api.addRoute(cleanRoute);
        setRoutes([added, ...routes]);
        setSelectedRouteId(added.id);
        setSuccessMsg('Successfully logged a new travel route track!');
      }
      setIsAddingRoute(false);
      setEditingRouteId(null);
    } catch (err: any) {
      setApiError(err.message || 'Failed to save travel route log.');
    }
  };

  const handleDeleteRoute = async (id: string) => {
    if (confirm('Are you sure you want to remove this travel route connection?')) {
      setApiError('');
      try {
        await api.deleteRoute(id);
        const updated = routes.filter(r => r.id !== id);
        setRoutes(updated);
        setSelectedRouteId(updated[0]?.id || null);
        setSuccessMsg('Removed travel route connected log.');
      } catch (err: any) {
        setApiError(err.message || 'Failed to delete route.');
      }
    }
  };

  const handleEditClick = (loc: TravelLocation) => {
    setMobileView('list');
    setEditingLocId(loc.id);
    setNewLocationTemplate(loc);
    setIsAddingNew(true);
  };

  // Log out of active session
  const handleLogout = async () => {
    try {
      await api.logout();
      setCurrentUser(null);
      setLocations([]);
      setRoutes([]);
      setSelectedLocation(null);
      setSelectedRouteId(null);
      setSuccessMsg('Exit successful. See you on the road!');
    } catch (err) {
      console.error(err);
    }
  };

  // Auth Submit handler (Login / Signup)
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUsername.trim() || !authPassword) {
      setAuthError('Please provide both username and password.');
      return;
    }
    setAuthError('');
    setIsAuthSubmitting(true);
    try {
      let result;
      if (authTab === 'login') {
        result = await api.login(authUsername, authPassword);
      } else {
        result = await api.signup(authUsername, authPassword);
      }
      setCurrentUser(result.user);
      const [userLocs, userRoutes] = await Promise.all([
        api.getLocations(),
        api.getRoutes()
      ]);
      setLocations(userLocs);
      setRoutes(userRoutes);
      if (userLocs.length > 0) {
        setSelectedLocation(userLocs[0]);
      }
      setSuccessMsg(authTab === 'login' ? `Welcome back, ${result.user.username}!` : `Welcome to the Nomad Log, ${result.user.username}!`);
      setAuthUsername('');
      setAuthPassword('');
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  // Google Sign-In redirect handler
  const handleGoogleSignIn = async () => {
    setIsAuthSubmitting(true);
    setAuthError('');
    try {
      await api.loginWithGoogle();
    } catch (err: any) {
      console.error(err);
      setAuthError(err.message || 'Failed to initiate Google authentication.');
      setIsAuthSubmitting(false);
    }
  };

  // JSON Save/Restore Utility
  const handleExportBackup = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(locations, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `Travel_Map_Backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setSuccessMsg('Travel backup file downloaded successfully!');
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const files = e.target.files;
    if (files && files.length > 0) {
      fileReader.readAsText(files[0], "UTF-8");
      fileReader.onload = async (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (Array.isArray(parsed)) {
            setSuccessMsg('Uploading and cloud-syncing travel deck...');
            const restoredList: TravelLocation[] = [];
            for (const loc of parsed) {
              const cleanLoc = { ...loc };
              delete (cleanLoc as any).userId;
              delete (cleanLoc as any).id;
              try {
                const added = await api.addLocation(cleanLoc);
                restoredList.push(added);
              } catch (err) {
                console.error("Backup restore failed on entry", loc, err);
              }
            }
            if (restoredList.length > 0) {
              const merged = [...restoredList, ...locations];
              setLocations(merged);
              setSelectedLocation(restoredList[0]);
              setSuccessMsg(`Successfully restored and cloud-synced ${restoredList.length} destinations!`);
            } else {
              setApiError('Backup restoration failed. Check if items are valid.');
            }
          } else {
            alert('Invalid backup format. Must be a travel JSON array.');
          }
        } catch (err) {
          alert('Failed to parse file. Ensure it is valid JSON.');
        }
      };
    }
  };

  // Filtering criteria
  const filteredLocations = locations.filter((loc) => {
    const matchesTab = activeTab === 'all' || loc.category === activeTab;
    const matchesSearch = 
      loc.cityName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loc.countryName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (loc.review && loc.review.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesTab && matchesSearch;
  });

  if (isLoadingUser) {
    return (
      <div className="h-screen w-screen bg-[#F9F8F6] flex flex-col items-center justify-center font-sans text-[#1A1A1A]">
        <RefreshCw className="w-8 h-8 animate-spin text-[#1A1A1A]/70 mb-4" />
        <p className="font-serif italic text-sm font-semibold tracking-wide">Syncing Personal Cartography Logs...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="h-screen w-screen bg-[#F9F8F6] flex items-center justify-center px-4 font-sans text-[#1A1A1A]">
        <div className="w-full max-w-sm border border-[#1A1A1A]/15 bg-white p-7 shadow-2xl space-y-6">
          <div className="text-center space-y-1.5">
            <div className="mx-auto p-2.5 bg-[#1A1A1A] text-white w-fit">
              <Compass className="w-5 h-5" />
            </div>
            <h1 className="font-serif font-bold text-xl tracking-tight text-[#1A1A1A]">
              The Nomad Log
            </h1>
            <p className="text-[9px] uppercase tracking-[0.22em] text-[#1A1A1A]/50 font-bold leading-none">
              PERSONAL CARTOGRAPHY SERVICE
            </p>
          </div>

          <div className="flex border-b border-[#1A1A1A]/10 p-0.5 bg-[#F1EFEC]">
            <button
              onClick={() => {
                setAuthTab('login');
                setAuthError('');
              }}
              className={`flex-1 text-center py-2 text-[10px] font-bold uppercase tracking-widest cursor-pointer transition-all ${
                authTab === 'login'
                  ? 'bg-[#1A1A1A] text-white font-bold'
                  : 'text-[#1A1A1A]/50 hover:text-[#1A1A1A]'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setAuthTab('signup');
                setAuthError('');
              }}
              className={`flex-1 text-center py-2 text-[10px] font-bold uppercase tracking-widest cursor-pointer transition-all ${
                authTab === 'signup'
                  ? 'bg-[#1A1A1A] text-white font-bold'
                  : 'text-[#1A1A1A]/50 hover:text-[#1A1A1A]'
              }`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {authError && (
              <div className="bg-red-50 text-red-950 p-2.5 border border-red-200 text-xs flex items-start space-x-1.5 font-sans">
                <AlertTriangle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
                <span className="leading-tight">{authError}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-[8.5px] font-bold text-[#1A1A1A]/60 uppercase tracking-[0.18em]">
                Traveller Name / Username
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-[#1A1A1A]/40">
                  <UserIcon className="w-3.5 h-3.5 mr-1" />
                </span>
                <input
                  type="text"
                  required
                  value={authUsername}
                  onChange={(e) => setAuthUsername(e.target.value)}
                  placeholder="e.g. MarcoPolo"
                  className="w-full pl-8 pr-3 py-2 bg-white border border-[#1A1A1A]/15 text-xs focus:outline-none focus:border-[#1A1A1A] placeholder:text-[#1A1A1A]/30 font-sans"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[8.5px] font-bold text-[#1A1A1A]/60 uppercase tracking-[0.18em]">
                Security Key / Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-[#1A1A1A]/40">
                  <Lock className="w-3.5 h-3.5 mr-1" />
                </span>
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-8 pr-3 py-2 bg-white border border-[#1A1A1A]/15 text-xs focus:outline-none focus:border-[#1A1A1A] placeholder:text-[#1A1A1A]/30 font-sans"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isAuthSubmitting}
              className="w-full bg-[#1A1A1A] hover:bg-black text-[#F9F8F6] py-2.5 text-[10px] uppercase tracking-[0.18em] font-bold transition-all disabled:opacity-50 cursor-pointer shadow-md"
            >
              {isAuthSubmitting
                ? 'Authenticating...'
                : authTab === 'login'
                ? 'Unveil Logbook'
                : 'Embark (Register)'}
            </button>
          </form>

          <div className="relative my-4 flex items-center justify-center">
            <div className="absolute inset-x-0 h-px bg-[#1A1A1A]/10"></div>
            <span className="relative bg-white px-3 text-[9px] uppercase tracking-wider font-extrabold text-[#1A1A1A]/40">
              Or explore via
            </span>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isAuthSubmitting}
            className="w-full border border-[#1A1A1A]/15 bg-white hover:bg-[#F9F8F6] text-[#1A1A1A] py-2.5 px-4 text-[10px] uppercase tracking-[0.18em] font-bold transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center space-x-2.5"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            <span>Sign In with Google</span>
          </button>

          <p className="text-[10.5px] text-center text-[#1A1A1A]/45 leading-relaxed font-sans pt-1">
            "An interactive dashboard tracking global coordinates, travel memoirs, and future wishlists safely secured under custom profile keys."
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-screen w-screen bg-[#F9F8F6] overflow-hidden font-sans text-[#1A1A1A]">
      
      {/* SIDEBAR DASHBOARD CONTROL PANEL */}
      <aside className={`${mobileView === 'list' ? 'flex' : 'hidden'} md:flex w-full md:w-[420px] lg:w-[450px] border-r border-[#1A1A1A]/15 bg-[#F9F8F6] flex-col shrink-0 z-20 overflow-hidden`}>
        
        {/* HEADER BRANDING */}
        <div className="p-4 border-b border-[#1A1A1A]/15 bg-[#F1EFEC] text-[#1A1A1A] flex flex-col space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-[#1A1A1A] text-[#F9F8F6] rounded-none shadow-xs">
                <MapIcon className="w-4 h-4" />
              </div>
              <div>
                <h1 className="font-serif font-bold text-base tracking-tight leading-none text-[#1A1A1A]">
                  The Nomad Log
                </h1>
                <p className="text-[9px] uppercase tracking-[0.18em] text-[#1A1A1A]/50 font-bold mt-1 leading-none">PERSONAL CARTOGRAPHY</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-1 shrink-0">
              <button
                onClick={() => setShowSettings(!showSettings)}
                title="Map & Backup Settings"
                className={`p-1.5 rounded-none border transition-all cursor-pointer ${
                  showSettings 
                    ? 'border-[#1A1A1A] bg-[#1A1A1A] text-white' 
                    : 'border-[#1A1A1A]/20 text-[#1A1A1A]/60 hover:bg-[#1A1A1A]/5 bg-white'
                }`}
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setMobileView('list');
                  setNewLocationTemplate({
                    lat: 35.0116,
                    lng: 135.7681,
                    cityName: '',
                    countryName: '',
                    category: 'visited'
                  });
                  setIsAddingNew(true);
                  setEditingLocId(null);
                  setIsAddingRoute(false);
                  setEditingRouteId(null);
                }}
                className="flex items-center space-x-1 px-2.5 py-1.5 bg-[#1A1A1A] hover:bg-black text-[#F9F8F6] rounded-none text-[9.5px] uppercase tracking-[0.16em] font-bold transition-all shadow-xs cursor-pointer"
                title="Log new place entry"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ PIN</span>
              </button>
              <button
                onClick={() => {
                  setMobileView('list');
                  setIsAddingRoute(true);
                  setEditingRouteId(null);
                  setIsAddingNew(false);
                  setNewLocationTemplate(null);
                  setTempMarker(null);
                }}
                className="flex items-center space-x-1 px-2.5 py-1.5 bg-[#B45309] hover:bg-[#92400E] text-[#F9F8F6] rounded-none text-[9.5px] uppercase tracking-[0.16em] font-bold transition-all shadow-xs cursor-pointer"
                title="Log new route mapping"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ ROUTE</span>
              </button>
            </div>
          </div>

          {/* TRAVELLER SESSION STATUS */}
          <div className="flex items-center justify-between pt-2 border-t border-[#1A1A1A]/10 text-[10.5px]">
            <span className="font-bold uppercase tracking-wider text-[#1A1A1A]/55 flex items-center">
              <UserIcon className="w-3.5 h-3.5 mr-1 text-[#1A1A1A]/70" />
              Logged: <span className="font-serif italic font-bold text-[#1A1A1A] ml-1">{currentUser.username}</span>
            </span>
            <button
              onClick={handleLogout}
              className="px-2 py-0.5 border border-red-500/20 text-red-700 hover:bg-red-50 text-[9px] uppercase tracking-wider font-bold rounded-none cursor-pointer"
            >
              Log Out
            </button>
          </div>
        </div>

        {/* NOTIFICATIONS PANEL */}
        <AnimatePresence>
          {successMsg && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-emerald-50 text-emerald-950 px-4 py-2 border-b border-emerald-100 text-[11px] font-sans flex items-center justify-between"
            >
              <span className="flex items-center">
                <CheckCircle className="w-3.5 h-3.5 mr-2 text-emerald-700" />
                {successMsg}
              </span>
              <button onClick={() => setSuccessMsg('')} className="text-emerald-700 hover:text-emerald-950 cursor-pointer">
                <X className="w-3" />
              </button>
            </motion.div>
          )}

          {isReverseGeocoding && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-[#F1EFEC] text-[#1A1A1A] px-4 py-2.5 border-b border-[#1A1A1A]/10 text-[11px] flex items-center justify-between"
            >
              <span className="flex items-center font-bold uppercase tracking-wider animate-pulse">
                <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin text-[#1A1A1A]/60" />
                Interpreting targeted place coordinates...
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* SETTINGS AND BACKUPS ACCORDION */}
        {showSettings && (
          <div className="bg-[#F1EFEC]/80 p-4 border-b border-[#1A1A1A]/10 text-[11px] space-y-4 font-sans max-h-[380px] overflow-y-auto">
            
            {/* LATEST LOCAL CLOCK ACCENT */}
            <div className="bg-white/50 border border-[#1A1A1A]/10 p-2 flex items-center justify-between">
              <span className="text-[9px] uppercase tracking-wider font-extrabold text-[#1A1A1A]/50">
                {t.timezoneLabel} ({timezone})
              </span>
              <span className="font-mono text-xs font-black text-[#1A1A1A] animate-pulse">
                {clockTime || 'Ticking...'}
              </span>
            </div>

            {/* PREFERENCES SECTION */}
            <div className="space-y-3 pt-1">
              <p className="font-bold text-[#1A1A1A]/60 uppercase tracking-[0.15em] text-[8.5px] leading-none mb-2">
                {t.localeSettings}
              </p>

              {/* Language selection dropdown */}
              <div className="space-y-1">
                <label className="block text-[8px] uppercase tracking-wider font-bold text-[#1A1A1A]/60">
                  {t.languageLabel}
                </label>
                <select
                  value={appLanguage}
                  onChange={(e) => setAppLanguage(e.target.value as AppLanguage)}
                  className="w-full bg-white border border-[#1A1A1A]/15 text-[10.5px] px-2 py-1 rounded-none font-sans focus:outline-none focus:border-[#1A1A1A]"
                >
                  <option value="en">English (US)</option>
                  <option value="es">Español (ES)</option>
                  <option value="fr">Français (FR)</option>
                  <option value="de">Deutsch (DE)</option>
                  <option value="ja">日本語 (JA)</option>
                  <option value="hi">हिन्दी (HI)</option>
                </select>
              </div>

              {/* Currency Selector */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="block text-[8px] uppercase tracking-wider font-bold text-[#1A1A1A]/60">
                    {t.currencyLabel}
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full bg-white border border-[#1A1A1A]/15 text-[10.5px] px-2 py-1 rounded-none font-sans focus:outline-none focus:border-[#1A1A1A]"
                  >
                    <option value="$">USD ($)</option>
                    <option value="€">EUR (€)</option>
                    <option value="¥">JPY (¥)</option>
                    <option value="₹">INR (₹)</option>
                    <option value="£">GBP (£)</option>
                    <option value="C$">CAD (C$)</option>
                    <option value="A$">AUD (A$)</option>
                  </select>
                </div>

                {/* Time format */}
                <div className="space-y-1">
                  <label className="block text-[8px] uppercase tracking-wider font-bold text-[#1A1A1A]/60">
                    {t.dateTimeLabel}
                  </label>
                  <select
                    value={timeFormat}
                    onChange={(e) => setTimeFormat(e.target.value as '12' | '24')}
                    className="w-full bg-white border border-[#1A1A1A]/15 text-[10.5px] px-2 py-1 rounded-none font-sans focus:outline-none focus:border-[#1A1A1A]"
                  >
                    <option value="24">{t.timeFormat24}</option>
                    <option value="12">{t.timeFormat12}</option>
                  </select>
                </div>
              </div>

              {/* Date Format and Timezone */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="block text-[8px] uppercase tracking-wider font-bold text-[#1A1A1A]/60">
                    {t.dateFormatLabel}
                  </label>
                  <select
                    value={dateFormat}
                    onChange={(e) => setDateFormat(e.target.value)}
                    className="w-full bg-white border border-[#1A1A1A]/15 text-[10.5px] px-2 py-1 rounded-none font-sans focus:outline-none focus:border-[#1A1A1A]"
                  >
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[8px] uppercase tracking-wider font-bold text-[#1A1A1A]/60">
                    {t.timezoneLabel}
                  </label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full bg-white border border-[#1A1A1A]/15 text-[10.5px] px-2 py-1 rounded-none font-sans focus:outline-none focus:border-[#1A1A1A]"
                  >
                    <option value="UTC">UTC (GMT)</option>
                    <option value="America/New_York">New York (EST/EDT)</option>
                    <option value="Europe/London">London (GMT/BST)</option>
                    <option value="Europe/Paris">Paris (CET/CEST)</option>
                    <option value="Asia/Kolkata">Kolkata (IST)</option>
                    <option value="Asia/Tokyo">Tokyo (JST)</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <p className="font-bold text-[#1A1A1A]/60 uppercase tracking-[0.15em] text-[8.5px] mb-2 leading-none">
                {t.mapLayout}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {(['standard', 'light', 'dark'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setMapType(t)}
                    className={`py-1 rounded-none border text-center font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer ${
                      mapType === t
                        ? 'border-[#1A1A1A] bg-[#1A1A1A] text-white'
                        : 'border-[#1A1A1A]/15 text-[#1A1A1A]/60 bg-white hover:bg-[#1A1A1A]/5'
                    }`}
                  >
                    {t === 'standard' && 'Standard'}
                    {t === 'light' && 'Light Grid'}
                    {t === 'dark' && 'Ink Dark'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="font-bold text-[#1A1A1A]/60 uppercase tracking-[0.15em] text-[8.5px] mb-2 leading-none">
                {t.boundariesOverlay}
              </p>
              <div className="flex items-center justify-between bg-white border border-[#1A1A1A]/15 p-2.5">
                <div className="space-y-0.5">
                  <p className="font-bold text-[10px] uppercase text-[#1A1A1A]">{t.countryHighlight}</p>
                  <p className="text-[9px] text-[#1A1A1A]/55 leading-none">{t.boundariesDesc}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCountryView(!showCountryView)}
                  className={`w-10 h-5 flex items-center p-0.5 rounded-full transition-all cursor-pointer select-none ${
                    showCountryView ? 'bg-[#1A1A1A]' : 'bg-[#1A1A1A]/20'
                  }`}
                  aria-label="Toggle country view boundary highlight"
                >
                  <div
                    className={`w-4 h-4 bg-white shadow-md transform transition-all duration-200 ${
                      showCountryView ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div>
              <p className="font-bold text-[#1A1A1A]/60 uppercase tracking-[0.15em] text-[8.5px] mb-2 leading-none">
                {t.backupDeck}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleExportBackup}
                  className="flex items-center justify-center space-x-1.5 px-3 py-1.5 border border-[#1A1A1A]/25 rounded-none hover:bg-[#1A1A1A]/5 bg-white transition-all text-[10px] uppercase tracking-wider font-bold text-[#1A1A1A] cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-[#1A1A1A]" />
                  <span>{t.exportDeck}</span>
                </button>
 
                <label className="flex items-center justify-center space-x-1.5 px-3 py-1.5 border border-[#1A1A1A]/25 rounded-none hover:bg-[#1A1A1A]/5 bg-white transition-all text-[10px] uppercase tracking-wider font-bold text-[#1A1A1A] cursor-pointer">
                  <Upload className="w-3.5 h-3.5 text-[#1A1A1A]" />
                  <span>{t.restoreDeck}</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportBackup}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* MAIN BODY AREA & LOGS */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          
          {/* GEOPLACE Nominatim SEARCH */}
          <div className="space-y-2">
            <h3 className="text-[9.5px] font-bold uppercase text-[#1A1A1A]/50 tracking-[0.2em] pl-0.5 leading-none">
              Explore & Plot New Targets
            </h3>
            
            <form onSubmit={handleGeoSearch} className="flex space-x-2">
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#1A1A1A]/40">
                  <Search className="w-3.5 h-3.5" />
                </span>
                <input
                  type="text"
                  value={searchQueryInput}
                  onChange={(e) => setSearchQueryInput(e.target.value)}
                  placeholder="Query global city (e.g. Kyoto, Milan)..."
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#1A1A1A]/15 rounded-none text-xs font-sans focus:outline-none focus:border-[#1A1A1A]"
                />
              </div>
              <button
                type="submit"
                disabled={isSearching}
                className="px-4 py-1.5 bg-[#1A1A1A] text-white rounded-none text-[10px] font-bold uppercase tracking-wider hover:bg-black transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
              >
                {isSearching ? '...' : 'QUERY'}
              </button>
            </form>

            {/* Suggestions layout */}
            {searchSuggestions.length > 0 && (
              <div className="bg-white border border-[#1A1A1A]/20 rounded-none shadow-lg mt-1 overflow-hidden divide-y divide-[#1A1A1A]/10 max-h-[180px] overflow-y-auto z-30">
                {searchSuggestions.map((sug, index) => (
                  <button
                    key={index}
                    onClick={() => handleSelectSuggestion(sug)}
                    className="w-full text-left px-3 py-2.5 hover:bg-[#F1EFEC] text-[11px] leading-tight flex items-start space-x-2 transition-colors cursor-pointer"
                  >
                    <MapPin className="w-3.5 h-3.5 text-[#1A1A1A]/70 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-bold text-[#1A1A1A]">
                        {sug.cityName}, {sug.countryName}
                      </p>
                      <p className="text-[10px] text-[#1A1A1A]/50 font-normal truncate max-w-[320px] mt-0.5">
                        {sug.placeName}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            
            {apiError && (
              <p className="text-[10px] text-red-950 flex items-center pl-1 bg-red-50 p-2.5 rounded-none border border-red-200 leading-tight font-sans">
                <AlertTriangle className="w-3.5 h-3.5 text-red-700 mr-2 shrink-0" />
                {apiError}
              </p>
            )}
          </div>
          {/* ADD / EDIT FORM OVERLAY */}
          {isAddingNew && (
            <div className="pt-1">
              <TravelForm
                initialLocation={newLocationTemplate}
                onSubmit={handleFormSubmit}
                onCancel={() => {
                  setIsAddingNew(false);
                  setNewLocationTemplate(null);
                  setTempMarker(null);
                }}
                currency={currency}
              />
            </div>
          )}

          {/* ADD / EDIT ROUTE FORM OVERLAY */}
          {isAddingRoute && (
            <div className="pt-1">
              <RouteForm
                initialRoute={editingRouteId ? routes.find(r => r.id === editingRouteId) || null : null}
                savedLocations={locations}
                onSubmit={handleRouteFormSubmit}
                onCancel={() => {
                  setIsAddingRoute(false);
                  setEditingRouteId(null);
                }}
                currency={currency}
              />
            </div>
          )}

          {/* CORE LIST AND FILTERING SCHEME */}
          {!isAddingNew && !isAddingRoute && (
            <div className="space-y-4">
              
              {/* Segmented control for Pins of Interest vs Journey Routes */}
              <div className="flex border-b border-[#1A1A1A]/10 pb-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setActiveSegmentTab('pins')}
                  className={`pb-2 px-3 text-[10px] font-sans uppercase tracking-[0.15em] font-extrabold border-b-2 transition-all cursor-pointer ${
                    activeSegmentTab === 'pins'
                      ? 'border-[#1A1A1A] text-[#1A1A1A]'
                      : 'border-transparent text-[#1A1A1A]/40 hover:text-[#1A1A1A]/75'
                  }`}
                >
                  📍 PIN LOGBOOK ({locations.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSegmentTab('routes')}
                  className={`pb-2 px-3 text-[10px] font-sans uppercase tracking-[0.15em] font-extrabold border-b-2 transition-all cursor-pointer ${
                    activeSegmentTab === 'routes'
                      ? 'border-[#1A1A1A] text-[#1A1A1A]'
                      : 'border-transparent text-[#1A1A1A]/40 hover:text-[#1A1A1A]/75'
                  }`}
                >
                  🗺️ JOURNEY ROUTES ({routes.length})
                </button>
              </div>

              {activeSegmentTab === 'pins' ? (
                <div className="space-y-4">
                  {/* Category Filter Tabs */}
                  <div className="flex bg-[#F1EFEC] p-0.5 rounded-none border border-[#1A1A1A]/10">
                    <button
                      onClick={() => setActiveTab('all')}
                      className={`flex-1 text-center py-1.5 rounded-none text-[9.5px] font-bold uppercase tracking-widest transition-all cursor-pointer ${
                        activeTab === 'all' 
                          ? 'bg-[#1A1A1A] text-white shadow-xs' 
                          : 'text-[#1A1A1A]/60 hover:text-[#1A1A1A]'
                      }`}
                    >
                      All ({locations.length})
                    </button>
                    <button
                      onClick={() => setActiveTab('visited')}
                      className={`flex-1 text-center py-1.5 rounded-none text-[9.5px] font-bold uppercase tracking-widest transition-all cursor-pointer ${
                        activeTab === 'visited' 
                          ? 'bg-[#1A1A1A] text-white shadow-xs' 
                          : 'text-[#1A1A1A]/60 hover:text-[#1A1A1A]'
                      }`}
                    >
                      Visited ({locations.filter(l => l.category === 'visited').length})
                    </button>
                    <button
                      onClick={() => setActiveTab('wishlist')}
                      className={`flex-1 text-center py-1.5 rounded-none text-[9.5px] font-bold uppercase tracking-widest transition-all cursor-pointer ${
                        activeTab === 'wishlist' 
                          ? 'bg-[#B45309] text-white shadow-xs' 
                          : 'text-[#B45309]/70 hover:text-[#B45309]'
                      }`}
                    >
                      Wishlist ({locations.filter(l => l.category === 'wishlist').length})
                    </button>
                    <button
                      onClick={() => setActiveTab('avoid')}
                      className={`flex-1 text-center py-1.5 rounded-none text-[9.5px] font-bold uppercase tracking-widest transition-all cursor-pointer ${
                        activeTab === 'avoid' 
                          ? 'bg-[#DC2626] text-white shadow-xs' 
                          : 'text-[#DC2626]/70 hover:text-[#DC2626]'
                      }`}
                    >
                      Avoid ({locations.filter(l => l.category === 'avoid').length})
                    </button>
                  </div>

                  {/* SEARCH ALREADY LOGGED LOCATIONS */}
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#1A1A1A]/40">
                      <Search className="w-3.5 h-3.5" />
                    </span>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Filter saved entries..."
                      className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#1A1A1A]/15 rounded-none text-xs font-sans focus:outline-none focus:border-[#1A1A1A]"
                    />
                  </div>

                  {/* DETAILED EXPANDED PLACE PREVIEW */}
                  {selectedLocation && (
                    <div className="bg-[#F9F8F6] rounded-none border border-[#1A1A1A]/20 overflow-hidden shadow-lg">
                      {/* Banner header based on status */}
                      <div className={`p-4 text-white flex justify-between items-start ${
                        selectedLocation.category === 'visited' ? 'bg-[#1A1A1A]' :
                        selectedLocation.category === 'wishlist' ? 'bg-[#B45309]' : 'bg-[#DC2626]'
                      }`}>
                        <div>
                          <span className="text-[8px] uppercase tracking-[0.2em] font-bold bg-white/20 px-2 py-0.5 rounded-none">
                            {selectedLocation.category === 'visited' && 'Visited Place'}
                            {selectedLocation.category === 'wishlist' && 'Wishlist Destination'}
                            {selectedLocation.category === 'avoid' && 'Fenced Location (Avoid)'}
                          </span>
                          <h4 className="font-serif italic font-bold text-lg mt-1 tracking-tight leading-none text-[#F9F8F6]">
                            {selectedLocation.cityName}
                          </h4>
                          <p className="text-[10px] uppercase tracking-wider text-white/70 leading-none mt-1">
                            {selectedLocation.countryName}
                          </p>
                        </div>

                        <div className="flex items-center space-x-1 shrink-0">
                          <button
                            onClick={() => handleEditClick(selectedLocation)}
                            className="p-1.5 bg-white/10 hover:bg-white/20 rounded-none transition-colors cursor-pointer"
                            title="Edit entry"
                          >
                            <Edit className="w-3.5 h-3.5 text-white" />
                          </button>
                          <button
                            onClick={() => handleDeleteLocation(selectedLocation.id)}
                            className="p-1.5 bg-white/10 hover:bg-white/20 rounded-none transition-colors cursor-pointer"
                            title="Delete entry"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-white" />
                          </button>
                        </div>
                      </div>

                      {/* Attributes Details Card */}
                      <div className="p-4 space-y-4.5 text-xs text-[#1A1A1A]">
                        <div className="grid grid-cols-2 gap-3 text-[10.5px] border-b border-[#1A1A1A]/10 pb-3">
                          <div className="flex items-center text-[#1A1A1A]/60 space-x-1.5">
                            <Calendar className="w-3.5 h-3.5 shrink-0 text-[#1A1A1A]/70" />
                            <div>
                              <p className="text-[8.5px] font-bold text-[#1A1A1A]/40 uppercase tracking-widest leading-none">LOG DATE</p>
                              <span className="font-mono text-[#1A1A1A] font-medium leading-none">{formatDate(selectedLocation.visitDate)}</span>
                            </div>
                          </div>

                          <div className="flex items-center text-[#1A1A1A]/60 space-x-1.5">
                            <Users className="w-3.5 h-3.5 shrink-0 text-[#1A1A1A]/70" />
                            <div>
                              <p className="text-[8.5px] font-bold text-[#1A1A1A]/40 uppercase tracking-widest leading-none">COMPANION</p>
                              <span className="text-[#1A1A1A] font-medium leading-none">{selectedLocation.companions}</span>
                            </div>
                          </div>

                          {selectedLocation.category === 'wishlist' && (
                            <>
                              <div className="flex items-center text-[#1A1A1A]/60 space-x-1.5">
                                <DollarSign className="w-3.5 h-3.5 shrink-0 text-[#B45309]" />
                                <div>
                                  <p className="text-[8.5px] font-bold text-[#B45309]/50 uppercase tracking-widest leading-none">BUDGET</p>
                                  <span className="font-mono text-[#B45309] font-bold">
                                    {formatPrice(selectedLocation.estimatedBudget)}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center text-[#1A1A1A]/60 space-x-1.5">
                                <Bookmark className="w-3.5 h-3.5 shrink-0 text-[#B45309]" />
                                <div>
                                  <p className="text-[8.5px] font-bold text-[#B45309]/50 uppercase tracking-widest leading-none">PRIORITY</p>
                                  <span className="font-bold text-[#B45309] uppercase tracking-wider text-[9px]">
                                    {selectedLocation.priority || 'Medium'}
                                  </span>
                                </div>
                              </div>
                            </>
                          )}

                          {selectedLocation.category === 'visited' && (
                            <>
                              <div className="flex items-center space-x-1.5 text-[#1A1A1A]/60 pt-1">
                                <Award className="w-3.5 h-3.5 text-[#1A1A1A]" />
                                <div>
                                  <p className="text-[8.5px] font-bold text-[#1A1A1A]/40 uppercase tracking-widest leading-none">RATING</p>
                                  <span className="text-[#1A1A1A] font-bold font-mono text-[11px] leading-tight flex items-center mt-0.5">
                                    {'★'.repeat(selectedLocation.rating)}
                                    {'☆'.repeat(5 - selectedLocation.rating)}
                                  </span>
                                </div>
                              </div>
                              {selectedLocation.costAmount !== undefined && (
                                <div className="flex items-center space-x-1.5 text-[#1A1A1A]/60 pt-1">
                                  <DollarSign className="w-3.5 h-3.5 text-[#1A1A1A]" />
                                  <div>
                                    <p className="text-[8.5px] font-bold text-[#1A1A1A]/40 uppercase tracking-widest leading-none">ACTUAL COST</p>
                                    <span className="text-[#1A1A1A] font-bold font-mono text-[11px] leading-none block">
                                      {formatPrice(selectedLocation.costAmount)}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </>
                          )}

                          {selectedLocation.category === 'avoid' && (
                            <div className="col-span-2 bg-[#DC2626]/5 p-2 border border-[#DC2626]/20">
                              <p className="text-[8.5px] font-bold text-[#DC2626] uppercase tracking-widest leading-none mb-1">WARNING SPECIFICATION</p>
                              <span className="font-semibold text-[#DC2626] text-[10px]">
                                {selectedLocation.rating === 3 ? '🚨 HIGH ALERT (STAY CLEAR)' : selectedLocation.rating === 2 ? '⚠️ NOT RECOMMENDED (TOURIST TRAP)' : '⚠️ MINOR CONCERNS'}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Display exact custom reference */}
                        {selectedLocation.placeName && selectedLocation.placeName !== `${selectedLocation.cityName}, ${selectedLocation.countryName}` && (
                          <div className="text-[10px] leading-relaxed italic bg-[#F1EFEC] py-1.5 px-2.5 border-l-2 border-[#1A1A1A]">
                            <span className="font-serif font-bold not-italic">Label reference: </span> {selectedLocation.placeName}
                          </div>
                        )}

                        {/* Review text block */}
                        {selectedLocation.review && (
                          <div className="space-y-1.5 bg-[#F1EFEC]/40 p-3 border border-[#1A1A1A]/10 font-sans">
                            <p className="font-bold text-[#1A1A1A]/50 uppercase text-[8.5px] tracking-[0.15em] leading-none mb-1">
                              {selectedLocation.category === 'avoid' ? 'CRITIQUE & FENCING LOG' : 'TRAVELLER MEMOIRS'}
                            </p>
                            <p className="text-[#1a1a1a]/85 leading-relaxed font-serif italic text-xs">
                              "{selectedLocation.review}"
                            </p>
                          </div>
                        )}

                        {/* Tag list */}
                        {selectedLocation.tags && selectedLocation.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1 font-sans">
                            {selectedLocation.tags.map(tag => (
                              <span 
                                key={tag}
                                className="bg-[#F1EFEC] border border-[#1A1A1A]/10 text-[#1a1a1a]/80 text-[9px] px-2 py-0.5 font-bold uppercase tracking-wider"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Display exact Lat Lng reference */}
                        <div className="text-[9.5px] font-mono text-[#1A1A1A]/40 text-right pt-0.5">
                          Geographic Index: {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* LISTED LOCATIONS CONTAINER */}
                  <div className="space-y-2">
                    <h3 className="text-[10px] font-bold uppercase text-[#1A1A1A]/50 tracking-[0.2em] pl-0.5 leading-none flex items-center justify-between">
                      <span>LOG ENTRIES ({filteredLocations.length})</span>
                      <span className="text-[8.5px] uppercase font-bold tracking-wider text-[#1A1A1A]/30 italic pointer-events-none">Click to pan map</span>
                    </h3>

                    {filteredLocations.length === 0 ? (
                      <div className="text-center py-10 bg-white border border-[#1A1A1A]/15 p-6 rounded-none">
                        <Compass className="w-6 h-6 text-[#1A1A1A]/30 mx-auto mb-2" />
                        <p className="text-xs text-[#1A1A1A]/70 font-medium">No results match selected taxonomy.</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                        {filteredLocations.map((loc) => {
                          const isSelected = selectedLocation?.id === loc.id;
                          return (
                            <button
                              key={loc.id}
                              onClick={() => {
                                setSelectedLocation(loc);
                                setTempMarker(null);
                                setMobileView('map');
                              }}
                              className={`w-full text-left p-3 rounded-none border flex items-start justify-between transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-[#F1EFEC] border-[#1A1A1A] ring-1 ring-[#1A1A1A]/10'
                                  : 'bg-white border-[#1A1A1A]/15 hover:bg-[#F1EFEC]/30'
                              }`}
                            >
                              <div className="truncate pr-3">
                                <p className="font-serif italic font-bold text-xs text-[#1A1A1A] leading-tight truncate">
                                  {loc.cityName}
                                </p>
                                <p className="text-[9px] uppercase tracking-wider text-[#1A1A1A]/50 truncate mt-1 leading-none">
                                  {loc.countryName}
                                </p>
                                <div className="flex items-center space-x-1.5 mt-2">
                                  <span className={`w-1.5 h-1.5 rounded-none ${
                                    loc.category === 'visited' ? 'bg-[#1A1A1A]' :
                                    loc.category === 'wishlist' ? 'bg-[#B45309]' : 'bg-[#DC2626]'
                                  }`} />
                                  <span className="text-[8.5px] uppercase font-bold tracking-widest text-[#1a1a1a]/40 leading-none">
                                    {loc.category}
                                  </span>
                                  {loc.visitDate && (
                                    <span className="text-[8.5px] text-[#1A1A1A]/40 font-mono leading-none">
                                      • {formatDate(loc.visitDate)}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <span className="shrink-0 text-xs font-mono font-bold">
                                {loc.category === 'visited' && (
                                  <span className="text-[#1A1A1A]">{'★'.repeat(loc.rating)}</span>
                                )}
                                {loc.category === 'wishlist' && loc.estimatedBudget && (
                                  <span className="text-[#B45309] font-semibold">{formatPrice(loc.estimatedBudget)}</span>
                                )}
                                {loc.category === 'avoid' && (
                                  <span className="text-[#DC2626] font-semibold text-[8px] uppercase tracking-wider bg-[#DC2626]/5 px-2 py-0.5 border border-[#DC2626]/10">
                                    avoid
                                  </span>
                                )}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* ROUTES / JOURNEYS VIEW BLOCK */
                <div className="space-y-4">
                  {/* SELECTED ROUTE DETAILS CARD */}
                  {selectedRouteId && routes.some(r => r.id === selectedRouteId) && (() => {
                    const selectedRoute = routes.find(r => r.id === selectedRouteId)!;
                    return (
                      <div className="bg-[#F9F8F6] rounded-none border border-[#1A1A1A]/20 overflow-hidden shadow-lg space-y-0">
                        <div className="p-4 bg-[#1A1A1A] text-[#F9F8F6] flex justify-between items-start">
                          <div>
                            <span className="text-[8px] uppercase tracking-[0.2em] font-bold bg-white/20 px-2 py-0.5 rounded-none">
                              Journey Route Track
                            </span>
                            <h4 className="font-serif italic font-bold text-base mt-1 tracking-tight leading-none text-white">
                              {selectedRoute.title}
                            </h4>
                            <p className="text-[9px] uppercase tracking-wider text-white/60 leading-none mt-1">
                              {selectedRoute.visitDate} • {selectedRoute.stops.length} STOPS
                            </p>
                          </div>

                          <div className="flex items-center space-x-1 shrink-0">
                            <button
                              onClick={() => {
                                setMobileView('list');
                                setEditingRouteId(selectedRoute.id);
                                setIsAddingRoute(true);
                                setIsAddingNew(false);
                              }}
                              className="p-1.5 bg-white/10 hover:bg-white/20 rounded-none transition-colors cursor-pointer"
                              title="Edit Route"
                            >
                              <Edit className="w-3.5 h-3.5 text-white" />
                            </button>
                            <button
                              onClick={() => handleDeleteRoute(selectedRoute.id)}
                              className="p-1.5 bg-white/10 hover:bg-white/20 rounded-none transition-colors cursor-pointer"
                              title="Delete Route"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-white" />
                            </button>
                          </div>
                        </div>

                        <div className="p-4 space-y-4 text-xs text-[#1A1A1A]">
                          {/* Cost and dates details */}
                          <div className="grid grid-cols-2 gap-3 text-[10.5px] border-b border-[#1A1A1A]/10 pb-3">
                            <div className="flex items-center text-[#1A1A1A]/60 space-x-1.5">
                              <DollarSign className="w-3.5 h-3.5 shrink-0 text-stone-950" />
                              <div>
                                <p className="text-[8px] font-bold text-[#1A1A1A]/40 uppercase tracking-widest leading-none">TOTAL COST</p>
                                <span className="font-mono text-stone-900 font-bold text-[11px]">{formatPrice(selectedRoute.costAmount || 0)}</span>
                              </div>
                            </div>

                            <div className="flex items-center text-[#1A1A1A]/60 space-x-1.5">
                              <Calendar className="w-3.5 h-3.5 shrink-0 text-stone-600" />
                              <div>
                                <p className="text-[8px] font-bold text-[#1A1A1A]/40 uppercase tracking-widest leading-none">TRAVEL DATE</p>
                                <span className="font-mono text-stone-900 leading-none">{formatDate(selectedRoute.visitDate)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Waypoint lists */}
                          <div className="space-y-2 border-b border-[#1A1A1A]/10 pb-3">
                            <p className="font-bold text-[#1A1A1A]/50 uppercase text-[8px] tracking-[0.15em] leading-none mb-1">
                              WAYPOINT PATTERN
                            </p>
                            <div className="space-y-1 relative pl-3 border-l-2 border-[#1A1A1A]/10">
                              {selectedRoute.stops.map((st, i) => (
                                <div key={st.id} className="relative py-0.5 text-[11px]">
                                  <span className="absolute -left-[18px] top-1.5 w-[8px] h-[8px] rounded-full bg-[#1A1A1A]" />
                                  <span className="font-serif italic font-bold text-[#1A1A1A]">{st.cityName}</span>
                                  <span className="text-[#1A1A1A]/50 uppercase tracking-wider text-[8px] ml-1.5">({st.countryName})</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Travel notes */}
                          {selectedRoute.notes && (
                            <div className="space-y-1 bg-[#F1EFEC]/40 p-3 border border-[#1A1A1A]/10 font-sans">
                              <p className="font-bold text-[#1A1A1A]/50 uppercase text-[8px] tracking-[0.15em] leading-none mb-1">
                                TRAVEL DISPATCH JOURNAL
                              </p>
                              <p className="text-[#1a1a1a]/85 leading-relaxed font-serif italic text-xs">
                                "{selectedRoute.notes}"
                              </p>
                            </div>
                          )}

                          {/* Attached media links */}
                          {selectedRoute.mediaLinks && selectedRoute.mediaLinks.length > 0 && (
                            <div className="space-y-2 pt-1 font-sans">
                              <p className="font-bold text-[#1A1A1A]/50 uppercase text-[8px] tracking-[0.15em] leading-none">
                                CONNECTED SOCIAL VIDEOS & BLOG POSTS
                              </p>
                              <div className="space-y-1">
                                {selectedRoute.mediaLinks.map((url, i) => (
                                  <a
                                    key={i}
                                    href={url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center space-x-1.5 text-blue-805 hover:underline p-1.5 bg-blue-50/50 border border-[#1a1a1a]/10 leading-none"
                                  >
                                    <Video className="w-3.5 h-3.5 text-stone-800 shrink-0" />
                                    <span className="text-[9.5px] truncate font-mono">{url}</span>
                                    <ExternalLink className="w-2.5 h-2.5 shrink-0 ml-auto text-[#1a1a1a]/50" />
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* JOURNEY ROUTES LOGS CHECKS */}
                  <div className="space-y-2">
                    <h3 className="text-[10px] font-bold uppercase text-[#1A1A1A]/50 tracking-[0.2em] pl-0.5 leading-none flex items-center justify-between">
                      <span>LOGGED JOURNEYS ({routes.length})</span>
                      <span className="text-[8.5px] uppercase font-bold tracking-wider text-[#1A1A1A]/30 italic pointer-events-none">Click to highlight path</span>
                    </h3>

                    {routes.length === 0 ? (
                      <div className="text-center py-10 bg-white border border-[#1A1A1A]/15 p-6 rounded-none">
                        <MapIcon className="w-6 h-6 text-[#1A1A1A]/30 mx-auto mb-2" />
                        <p className="text-xs text-[#1A1A1A]/70 font-medium">No journey routes logged yet.</p>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingRoute(true);
                            setIsAddingNew(false);
                          }}
                          className="mt-3 text-[9px] border border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white px-3 py-1 font-bold uppercase tracking-wider"
                        >
                          Design First Route
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                        {routes.map((rt) => {
                          const isSelected = selectedRouteId === rt.id;
                          const stopStr = rt.stops.map(s => s.cityName).join(' ➜ ');
                          return (
                            <button
                              key={rt.id}
                              onClick={() => {
                                setSelectedRouteId(rt.id);
                                setMobileView('map');
                              }}
                              className={`w-full text-left p-3.5 rounded-none border flex flex-col transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-[#F1EFEC] border-[#1A1A1A] ring-1 ring-[#1A1A1A]/10'
                                  : 'bg-white border-[#1A1A1A]/15 hover:bg-[#F1EFEC]/30'
                              }`}
                            >
                              <div className="flex justify-between items-start w-full">
                                <p className="font-serif font-bold text-xs text-[#1A1A1A] truncate pr-2 leading-none">
                                  {rt.title}
                                </p>
                                <span className="text-[10px] font-mono font-bold text-stone-750 flex-shrink-0 leading-none">
                                  {formatPrice(rt.costAmount || 0)}
                                </span>
                              </div>
                              
                              <div className="text-[10px] text-stone-600 bg-stone-100 px-2 py-1 mt-2.5 w-full font-mono font-medium border border-stone-200/50 leading-tight">
                                {stopStr}
                              </div>

                              <div className="flex items-center space-x-3 mt-3.5 text-[8.5px] font-semibold text-[#1a1a1a]/45 uppercase tracking-widest leading-none">
                                <span className="flex items-center">
                                  <Calendar className="w-2.5 h-2.5 mr-1" />
                                  {formatDate(rt.visitDate)}
                                </span>
                                <span>• {rt.stops.length} Stops</span>
                                {rt.mediaLinks && rt.mediaLinks.length > 0 && (
                                  <span className="flex items-center text-blue-800">
                                    <Video className="w-2.5 h-2.5 mr-1 text-[#1a1a1a]/40" />
                                    {rt.mediaLinks.length} Links
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* COLLAPSIBLE TRAVEL COUNTS STATS PANEL */}
              <div className="border-t border-[#1A1A1A]/10 pt-4">
                <button
                  type="button"
                  onClick={() => setShowStats(!showStats)}
                  className="w-full flex items-center justify-between text-[9.5px] font-bold text-[#1A1A1A]/60 uppercase tracking-[0.2em] hover:text-[#1A1A1A] transition-colors cursor-pointer"
                >
                  <span>Metrics & Analysis Deck</span>
                  {showStats ? <ChevronUp className="w-3.5 h-3.5 text-[#1A1A1A]/50" /> : <ChevronDown className="w-3.5 h-3.5 text-[#1A1A1A]/50" />}
                </button>
                
                {showStats && (
                  <div className="mt-3">
                    <TravelStatistics locations={locations} currency={currency} />
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </aside>

      {/* FULL SCREEN INTERACTIVE MAP BOX AREA */}
      <main className={`${mobileView === 'map' ? 'flex' : 'hidden'} md:flex flex-1 h-full relative flex-col justify-end`}>
        {/* Helper Top floating Banner */}
        <div className="absolute top-4 left-4 right-4 z-[1000] pointer-events-none hidden sm:flex justify-center">
          <div className="bg-[#1A1A1A]/95 text-[#F9F8F6] text-[10.5px] font-semibold px-4 py-2.5 rounded-none shadow-2xl border border-white/10 pointer-events-auto flex items-center space-x-2">
            <Info className="w-4 h-4 text-[#B45309] shrink-0" />
            <span className="tracking-wide">
              💡 <strong>Cartography Tip:</strong> Left-click any geographic point directly on the grid to geocode, flag, or register coordinates.
            </span>
          </div>
        </div>

        {/* Dynamic Canvas wrapper */}
        <div className="w-full h-full relative">
          <TravelMap
            locations={locations}
            selectedLocation={selectedLocation}
            tempMarker={tempMarker}
            mapType={mapType}
            showCountryView={showCountryView}
            routes={routes}
            selectedRouteId={selectedRouteId}
            onLocationClick={(loc) => {
              setSelectedLocation(loc);
              setTempMarker(null);
              setIsAddingNew(false);
            }}
            onMapClick={handleMapClick}
            currency={currency}
          />
        </div>
      </main>

      {/* FIXED MOBILE NAVIGATION SELECTOR PILL */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[1001] md:hidden bg-[#1A1A1A]/95 text-[#F9F8F6] p-1 shadow-2xl flex items-center border border-white/10 rounded-full">
        <button
          onClick={() => setMobileView('map')}
          className={`px-4 py-2 text-[10px] uppercase tracking-widest transition-all rounded-full ${
            mobileView === 'map'
              ? 'bg-[#F9F8F6] text-[#1A1A1A] font-extrabold shadow-sm'
              : 'text-[#F9F8F6]/65 hover:text-white font-bold'
          } flex items-center space-x-1.5`}
        >
          <MapIcon className="w-3.5 h-3.5" />
          <span>MAP</span>
        </button>
        <button
          onClick={() => setMobileView('list')}
          className={`px-4 py-2 text-[10px] uppercase tracking-widest transition-all rounded-full ${
            mobileView === 'list'
              ? 'bg-[#F9F8F6] text-[#1A1A1A] font-extrabold shadow-sm'
              : 'text-[#F9F8F6]/65 hover:text-white font-bold'
          } flex items-center space-x-1.5`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>LOGBOOK</span>
        </button>
      </div>

      <Analytics />
      <SpeedInsights />
    </div>
  );
}
