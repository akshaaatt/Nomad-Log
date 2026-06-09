import React, { useState, useEffect } from 'react';
import { RouteSegment, TravelRoute, TravelLocation } from '../types';
import { 
  X, Plus, ListPlus, Trash2, ArrowUp, ArrowDown, Link, Calendar, 
  DollarSign, MapPin, Search, Video, ExternalLink, Globe, FileText
} from 'lucide-react';

interface RouteFormProps {
  initialRoute: Partial<TravelRoute> | null;
  savedLocations: TravelLocation[];
  onSubmit: (route: TravelRoute) => void;
  onCancel: () => void;
  currency?: string;
}

export default function RouteForm({ 
  initialRoute, 
  savedLocations, 
  onSubmit, 
  onCancel,
  currency = '$'
}: RouteFormProps) {
  const [title, setTitle] = useState('');
  const [costAmount, setCostAmount] = useState<number | undefined>(undefined);
  const [visitDate, setVisitDate] = useState('');
  const [notes, setNotes] = useState('');
  const [mediaLinks, setMediaLinks] = useState<string[]>([]);
  const [newMediaUrl, setNewMediaUrl] = useState('');
  const [stops, setStops] = useState<RouteSegment[]>([]);

  // Search cities coordinates
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [errorMSG, setErrorMSG] = useState('');

  useEffect(() => {
    if (initialRoute) {
      setTitle(initialRoute.title || '');
      setCostAmount(initialRoute.costAmount);
      setVisitDate(initialRoute.visitDate || new Date().toISOString().split('T')[0]);
      setNotes(initialRoute.notes || '');
      setMediaLinks(initialRoute.mediaLinks || []);
      setStops(initialRoute.stops || []);
    } else {
      setVisitDate(new Date().toISOString().split('T')[0]);
    }
  }, [initialRoute]);

  // Lookup nominatim suggestions
  useEffect(() => {
    if (searchQuery.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&addressdetails=1`
        );
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data);
        }
      } catch (e) {
        console.error('Suggestions fetch failed', e);
      } finally {
        setIsSearching(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const addMediaUrl = () => {
    if (!newMediaUrl.trim()) return;
    if (!newMediaUrl.startsWith('http://') && !newMediaUrl.startsWith('https://')) {
      setErrorMSG('Media URL must start with http:// or https://');
      return;
    }
    setErrorMSG('');
    setMediaLinks([...mediaLinks, newMediaUrl.trim()]);
    setNewMediaUrl('');
  };

  const removeMediaUrl = (idx: number) => {
    setMediaLinks(mediaLinks.filter((_, i) => i !== idx));
  };

  const addNewStop = (cityName: string, countryName: string, lat: number, lng: number) => {
    const newStop: RouteSegment = {
      id: `stop-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      cityName,
      countryName,
      lat,
      lng,
      stopOrder: stops.length
    };
    setStops([...stops, newStop]);
    setSearchQuery('');
    setSuggestions([]);
  };

  const addStopFromPins = (loc: TravelLocation) => {
    const isAlreadyAdded = stops.some(s => s.lat === loc.lat && s.lng === loc.lng);
    if (isAlreadyAdded) {
      setErrorMSG(`${loc.cityName} is already in the route.`);
      return;
    }
    setErrorMSG('');
    addNewStop(loc.cityName, loc.countryName, loc.lat, loc.lng);
  };

  const moveStop = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= stops.length) return;

    const copy = [...stops];
    const temp = copy[index];
    copy[index] = copy[targetIdx];
    copy[targetIdx] = temp;

    // Recalculate stop order
    const ordered = copy.map((st, i) => ({ ...st, stopOrder: i }));
    setStops(ordered);
  };

  const removeStop = (id: string) => {
    const filtered = stops.filter(s => s.id !== id);
    const ordered = filtered.map((st, i) => ({ ...st, stopOrder: i }));
    setStops(ordered);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMSG('');

    if (!title.trim()) {
      setErrorMSG('Route title is required.');
      return;
    }
    if (stops.length < 2) {
      setErrorMSG('Route map must contain at least 2 stops to connect travel points (e.g., Rome to Milan).');
      return;
    }

    const compileRoute: TravelRoute = {
      id: initialRoute?.id || `route-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      userId: initialRoute?.userId || '',
      title: title.trim(),
      stops,
      costAmount: costAmount !== undefined ? costAmount : 0,
      mediaLinks,
      visitDate,
      notes: notes.trim()
    };

    onSubmit(compileRoute);
  };

  return (
    <div className="bg-[#F9F8F6] rounded-none border border-[#1A1A1A]/20 overflow-hidden shadow-xl">
      <div className="p-5 border-b border-[#1A1A1A]/10 flex justify-between items-center bg-[#F1EFEC]">
        <div className="flex items-center space-x-2">
          <Globe className="w-4 h-4 text-[#1A1A1A]" />
          <h2 className="font-serif italic text-base font-semibold text-[#1A1A1A]">
            {initialRoute?.id ? 'Edit Journey Route' : 'Design Journey Route'}
          </h2>
        </div>
        <button
          onClick={onCancel}
          className="text-[#1A1A1A]/55 hover:text-[#1A1A1A] hover:bg-[#1A1A1A]/5 p-1.5 rounded-none transition-colors duration-150 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={handleFormSubmit} className="p-5 space-y-5 max-h-[82vh] overflow-y-auto">
        {errorMSG && (
          <div className="bg-red-50 text-red-950 p-3 rounded-none text-xs flex items-start space-x-2 border border-red-200 font-sans">
            <span className="font-bold">Caution:</span>
            <span>{errorMSG}</span>
          </div>
        )}

        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-[9px] font-bold text-[#1A1A1A]/60 uppercase tracking-[0.2em] mb-1.5">
              Route/Journey Name *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Italian Espresso Trail"
              className="w-full px-3 py-2 bg-white border border-[#1A1A1A]/15 rounded-none text-xs focus:outline-none focus:border-[#1A1A1A] font-sans placeholder:text-[#1A1A1A]/30"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Total Cost */}
            <div>
              <label className="block text-[9px] font-bold text-[#1A1A1A]/60 uppercase tracking-[0.2em] mb-1.5">
                Total Route Cost ({currency})
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pr-3 pointer-events-none text-[#1A1A1A]/40 text-[11px] font-bold font-mono">
                  {currency}
                </span>
                <input
                  type="number"
                  value={costAmount !== undefined ? costAmount : ''}
                  onChange={(e) => setCostAmount(e.target.value !== '' ? parseFloat(e.target.value) : undefined)}
                  placeholder="e.g. 1500"
                  className="w-full pl-8 pr-3 py-2 bg-white border border-[#1A1A1A]/15 rounded-none text-xs focus:outline-none focus:border-[#1A1A1A] font-sans"
                />
              </div>
            </div>

            {/* Travel Date */}
            <div>
              <label className="block text-[9px] font-bold text-[#1A1A1A]/60 uppercase tracking-[0.2em] mb-1.5">
                Execution/Start Date
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#1A1A1A]/40">
                  <Calendar className="w-3.5 h-3.5" />
                </span>
                <input
                  type="date"
                  required
                  value={visitDate}
                  onChange={(e) => setVisitDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-[#1A1A1A]/15 rounded-none text-xs focus:outline-none focus:border-[#1A1A1A]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Waypoint Creator list */}
        <div className="border-t border-[#1A1A1A]/10 pt-4 space-y-4">
          <div>
            <h3 className="text-[10px] uppercase tracking-[0.15em] font-bold text-[#1A1A1A] mb-1 leading-none">
              Waypoints Sequence ({stops.length} Stops)
            </h3>
            <p className="text-[9px] text-[#1A1A1A]/55 leading-tight mb-3">
              Organize chronological cities. The map will link these in an elegant connected flow route.
            </p>
          </div>

          {/* Connected Steps Listing */}
          {stops.length > 0 ? (
            <div className="space-y-2 relative pl-4 border-l-2 border-[#1A1A1A]/15">
              {stops.map((st, index) => (
                <div 
                  key={st.id} 
                  className="flex items-center justify-between p-2.5 bg-white border border-[#1A1A1A]/10 relative shadow-sm"
                >
                  <div className="absolute -left-[23px] w-[14px] h-[14px] rounded-full bg-[#1A1A1A] text-white text-[8px] font-bold flex items-center justify-center">
                    {index + 1}
                  </div>
                  <div className="space-y-0.5">
                    <p className="font-bold text-[10.5px] text-[#1A1A1A]">{st.cityName}</p>
                    <p className="text-[9px] text-[#1A1A1A]/50 uppercase font-semibold">{st.countryName}</p>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={() => moveStop(index, 'up')}
                      disabled={index === 0}
                      className="p-1 text-[#1A1A1A]/50 hover:text-[#1A1A1A] disabled:opacity-20 hover:bg-[#1A1A1A]/5 transition-colors cursor-pointer"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveStop(index, 'down')}
                      disabled={index === stops.length - 1}
                      className="p-1 text-[#1A1A1A]/50 hover:text-[#1A1A1A] disabled:opacity-20 hover:bg-[#1A1A1A]/5 transition-colors cursor-pointer"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeStop(st.id)}
                      className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 transition-colors cursor-pointer ml-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 border border-dashed border-[#1A1A1A]/15 text-center text-[10px] text-[#1A1A1A]/45">
              No waypoints assigned yet. Create Rome to Milan to Florence!
            </div>
          )}

          {/* Add stops section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#F1EFEC]/60 p-3 border border-[#1A1A1A]/10">
            {/* Search and lookup stops */}
            <div className="space-y-2">
              <label className="block text-[8.5px] font-extrabold text-[#1A1A1A]/70 uppercase tracking-wider">
                Find stop city in the world
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pr-3 pointer-events-none text-[#1A1A1A]/40">
                  <Search className="w-3.5 h-3.5" />
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Type city e.g. Rome, Milan..."
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-[#1A1A1A]/15 rounded-none text-xs focus:outline-none focus:border-[#1A1A1A]"
                />
              </div>

              {/* Suggestions dropdown */}
              {isSearching && (
                <p className="text-[9px] text-[#1A1A1A]/60 italic animate-pulse">Scanning cities map...</p>
              )}
              {suggestions.length > 0 && (
                <div className="bg-white border border-[#1A1A1A]/20 shadow-md divide-y divide-[#1A1A1A]/5 absolute z-[110] max-h-40 overflow-y-auto w-[240px] text-xs">
                  {suggestions.map((sug) => {
                    const city = sug.address?.city || sug.address?.town || sug.address?.village || sug.address?.county || sug.display_name.split(',')[0];
                    const country = sug.address?.country || '';
                    return (
                      <button
                        key={sug.place_id + Math.random()}
                        type="button"
                        onClick={() => addNewStop(city, country, parseFloat(sug.lat), parseFloat(sug.lon))}
                        className="w-full text-left px-2.5 py-1.5 hover:bg-[#1A1A1A]/5 text-[10.5px] leading-tight block truncate font-sans"
                      >
                        <span className="font-bold">{city}</span>
                        {country && <span className="text-[#1A1A1A]/50">, {country}</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick adds from logged places */}
            <div className="space-y-1.5 max-h-[120px] overflow-y-auto">
              <label className="block text-[8.5px] font-extrabold text-[#1A1A1A]/70 uppercase tracking-wider leading-none mb-1">
                Pin links from your Logbook
              </label>
              {savedLocations.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {savedLocations.map((loc) => (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => addStopFromPins(loc)}
                      className="text-[9px] bg-white border border-[#1A1A1A]/10 hover:border-[#1A1A1A] px-2 py-1 flex items-center space-x-1 uppercase font-bold tracking-wider cursor-pointer"
                    >
                      <MapPin className="w-2.5 h-2.5 text-[#1A1A1A]/50" />
                      <span>{loc.cityName}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-[9px] text-[#1A1A1A]/40 italic">No pins logged yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* Social media links logger */}
        <div className="border-t border-[#1A1A1A]/10 pt-4 space-y-3">
          <div>
            <h3 className="text-[10px] uppercase tracking-[0.15em] font-bold text-[#1A1A1A] mb-1 leading-none">
              Linked Videos / Reels / Blog Posts List
            </h3>
            <p className="text-[9px] text-[#1A1A1A]/55 leading-tight">
              Link YouTube vlogs, Instagram reels, TikTok loops, or Substack/travel blogs.
            </p>
          </div>

          {mediaLinks.length > 0 && (
            <div className="space-y-1 bg-white border border-[#1A1A1A]/10 p-2.5 max-h-[140px] overflow-y-auto">
              {mediaLinks.map((url, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-[#1A1A1A]/5 last:border-b-0">
                  <div className="flex items-center space-x-1.5 text-blue-800 hover:underline truncate max-w-[85%]">
                    <Video className="w-3.5 h-3.5 text-[#1A1A1A]/70 flex-shrink-0" />
                    <a href={url} target="_blank" rel="noreferrer" className="text-[10.5px] font-mono leading-none truncate">
                      {url}
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeMediaUrl(i)}
                    className="p-1 text-red-650 hover:bg-red-50 cursor-pointer text-[10px] uppercase tracking-wider font-bold"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex space-x-2">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pr-3 pointer-events-none text-[#1A1A1A]/40">
                <Link className="w-3.5 h-3.5" />
              </span>
              <input
                type="text"
                value={newMediaUrl}
                onChange={(e) => setNewMediaUrl(e.target.value)}
                placeholder="Paste Instagram Reel / Blog URL..."
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-[#1A1A1A]/15 rounded-none text-xs focus:outline-none focus:border-[#1A1A1A]"
              />
            </div>
            <button
              type="button"
              onClick={addMediaUrl}
              className="px-3.5 py-1.5 bg-[#1A1A1A] text-white hover:bg-black font-semibold text-[10.5px] uppercase tracking-wider cursor-pointer flex items-center space-x-1"
            >
              <Plus className="w-3 h-3" />
              <span>Attach</span>
            </button>
          </div>
        </div>

        {/* Note / Memories box */}
        <div className="border-t border-[#1A1A1A]/10 pt-4">
          <label className="block text-[9px] font-bold text-[#1A1A1A]/60 uppercase tracking-[0.2em] mb-1.5">
            Journey Journal Details & Thoughts
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Describe the transport, road experiences, beautiful vistas, and scenic train transitions..."
            rows={3}
            className="w-full px-3 py-2.5 bg-white border border-[#1A1A1A]/15 rounded-none text-xs focus:outline-none focus:border-[#1A1A1A] font-sans placeholder:text-[#1A1A1A]/30 leading-relaxed"
          />
        </div>

        {/* Action Footer */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-[#1A1A1A]/10 font-sans">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-[#1A1A1A]/20 text-[#1A1A1A] hover:bg-[#1A1A1A]/5 rounded-none text-[10px] uppercase tracking-[0.2em] font-bold cursor-pointer transition-colors"
          >
            Discard
          </button>
          <button
            type="submit"
            className="px-5 py-2.5 bg-[#1A1A1A] hover:bg-black text-[#F9F8F6] rounded-none text-[10px] uppercase tracking-[0.2em] font-bold cursor-pointer shadow-lg transition-colors"
          >
            {initialRoute?.id ? 'Update Route' : 'Commit Route'}
          </button>
        </div>
      </form>
    </div>
  );
}
