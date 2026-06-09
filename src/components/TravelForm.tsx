import React, { useState, useEffect } from 'react';
import { TravelLocation, TravelCategory } from '../types';
import { PRESET_TAGS, COMPANIONS_OPTIONS } from '../data';
import { X, Star, Calendar, Users, DollarSign, AlertCircle, Bookmark, Compass, Plane } from 'lucide-react';

interface TravelFormProps {
  initialLocation: Partial<TravelLocation> | null;
  onSubmit: (location: TravelLocation) => void;
  onCancel: () => void;
  currency?: string;
}

export default function TravelForm({ initialLocation, onSubmit, onCancel, currency = '$' }: TravelFormProps) {
  const [category, setCategory] = useState<TravelCategory>('visited');
  const [placeName, setPlaceName] = useState('');
  const [cityName, setCityName] = useState('');
  const [countryName, setCountryName] = useState('');
  const [lat, setLat] = useState(0);
  const [lng, setLng] = useState(0);
  const [visitDate, setVisitDate] = useState('');
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');
  const [companions, setCompanions] = useState('Solo');
  const [flaggedReason, setFlaggedReason] = useState('');
  const [estimatedBudget, setEstimatedBudget] = useState<number | undefined>(undefined);
  const [costAmount, setCostAmount] = useState<number | undefined>(undefined);
  const [priority, setPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [error, setError] = useState('');

  // Repopulate form is template is provided (like after geocoding or clicking map)
  useEffect(() => {
    if (initialLocation) {
      setCategory(initialLocation.category || 'visited');
      setPlaceName(initialLocation.placeName || '');
      setCityName(initialLocation.cityName || '');
      setCountryName(initialLocation.countryName || '');
      setLat(initialLocation.lat !== undefined ? initialLocation.lat : 0);
      setLng(initialLocation.lng !== undefined ? initialLocation.lng : 0);
      setVisitDate(initialLocation.visitDate || new Date().toISOString().split('T')[0]);
      setRating(initialLocation.rating || 5);
      setReview(initialLocation.review || '');
      setCompanions(initialLocation.companions || 'Solo');
      setFlaggedReason(initialLocation.flaggedReason || '');
      setEstimatedBudget(initialLocation.estimatedBudget);
      setCostAmount(initialLocation.costAmount);
      setPriority(initialLocation.priority || 'Medium');
      setSelectedTags(initialLocation.tags || []);
    }
  }, [initialLocation]);

  const handleTagToggle = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!cityName.trim()) {
      setError('City name is required.');
      return;
    }
    if (!countryName.trim()) {
      setError('Country name is required.');
      return;
    }
    if (lat === 0 && lng === 0) {
      setError('Please provide valid latitude/longitude coordinates.');
      return;
    }

    const compiledPlaceName = placeName.trim() || `${cityName.trim()}, ${countryName.trim()}`;

    const submission: TravelLocation = {
      id: initialLocation?.id || `loc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      placeName: compiledPlaceName,
      cityName: cityName.trim(),
      countryName: countryName.trim(),
      lat,
      lng,
      category,
      visitDate: visitDate || new Date().toISOString().split('T')[0],
      rating: category !== 'wishlist' ? rating : 0,
      review: review.trim(),
      companions,
      tags: selectedTags,
      costAmount: costAmount !== undefined ? costAmount : undefined,
      ...(category === 'avoid' ? { flaggedReason: flaggedReason.trim() || review.trim() } : {}),
      ...(category === 'wishlist' ? { estimatedBudget: estimatedBudget || 0, priority } : {}),
    };

    onSubmit(submission);
  };

  return (
    <div className="bg-[#F9F8F6] rounded-none border border-[#1A1A1A]/20 overflow-hidden shadow-xl">
      <div className="p-5 border-b border-[#1A1A1A]/10 flex justify-between items-center bg-[#F1EFEC]">
        <div className="flex items-center space-x-2">
          {initialLocation?.id ? (
            <Plane className="w-4 h-4 text-[#1A1A1A]/70" />
          ) : (
            <Compass className="w-4 h-4 text-[#1A1A1A]/70" />
          )}
          <h2 className="font-serif italic text-base font-semibold text-[#1A1A1A]">
            {initialLocation?.id ? 'Edit Travel Record' : 'Record Destination'}
          </h2>
        </div>
        <button
          onClick={onCancel}
          className="text-[#1A1A1A]/55 hover:text-[#1A1A1A] hover:bg-[#1A1A1A]/5 p-1.5 rounded-none transition-colors duration-150 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={handleFormSubmit} className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
        {error && (
          <div className="bg-red-50 text-red-950 p-3 rounded-none text-xs flex items-start space-x-2 border border-red-200 font-sans">
            <span className="font-bold">Error:</span>
            <span>{error}</span>
          </div>
        )}

        {/* Category Toggles */}
        <div>
          <label className="block text-[9px] font-bold text-[#1A1A1A]/60 uppercase tracking-[0.2em] mb-2.5">
            LOGBOOK CATEGORY
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setCategory('visited')}
              className={`flex flex-col items-center justify-center p-3 rounded-none border text-center transition-all cursor-pointer ${
                category === 'visited'
                  ? 'border-[#1A1A1A] bg-[#1A1A1A] text-white font-medium'
                  : 'border-[#1A1A1A]/10 text-[#1A1A1A]/60 hover:bg-[#1A1A1A]/5 bg-white'
              }`}
            >
              <div className={`w-2 h-2 rounded-none mb-1.5 ${category === 'visited' ? 'bg-[#F9F8F6]' : 'bg-[#1A1A1A]'}`} />
              <span className="text-[10px] uppercase tracking-wider font-sans font-semibold">Visited</span>
            </button>

            <button
              type="button"
              onClick={() => setCategory('wishlist')}
              className={`flex flex-col items-center justify-center p-3 rounded-none border text-center transition-all cursor-pointer ${
                category === 'wishlist'
                  ? 'border-[#B45309] bg-[#B45309]/10 text-[#B45309] font-medium'
                  : 'border-[#1A1A1A]/10 text-[#1A1A1A]/60 hover:bg-[#1A1A1A]/5 bg-white'
              }`}
            >
              <div className={`w-2 h-2 rounded-none mb-1.5 ${category === 'wishlist' ? 'bg-[#B45309]' : 'bg-[#B45309]/50'}`} />
              <span className="text-[10px] uppercase tracking-wider font-sans font-semibold">Wishlist</span>
            </button>

            <button
              type="button"
              onClick={() => setCategory('avoid')}
              className={`flex flex-col items-center justify-center p-3 rounded-none border text-center transition-all cursor-pointer ${
                category === 'avoid'
                  ? 'border-[#DC2626] bg-[#DC2626]/10 text-[#DC2626] font-medium'
                  : 'border-[#1A1A1A]/10 text-[#1A1A1A]/60 hover:bg-[#1A1A1A]/5 bg-white'
              }`}
            >
              <div className={`w-2 h-2 rounded-none mb-1.5 ${category === 'avoid' ? 'bg-[#DC2626]' : 'bg-[#DC2626]/50'}`} />
              <span className="text-[10px] uppercase tracking-wider font-sans font-semibold">Flag Avoid</span>
            </button>
          </div>
        </div>

        {/* Location Coordinates & Place Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[9px] font-bold text-[#1A1A1A]/60 uppercase tracking-[0.2em] mb-1.5">
              City Name *
            </label>
            <input
              type="text"
              required
              value={cityName}
              onChange={(e) => setCityName(e.target.value)}
              placeholder="e.g. Kyoto"
              className="w-full px-3 py-2 bg-white border border-[#1A1A1A]/15 rounded-none text-xs focus:outline-none focus:border-[#1A1A1A] font-sans placeholder:text-[#1A1A1A]/30"
            />
          </div>
          <div>
            <label className="block text-[9px] font-bold text-[#1A1A1A]/60 uppercase tracking-[0.2em] mb-1.5">
              Country / Nation *
            </label>
            <input
              type="text"
              required
              value={countryName}
              onChange={(e) => setCountryName(e.target.value)}
              placeholder="e.g. Japan"
              className="w-full px-3 py-2 bg-white border border-[#1A1A1A]/15 rounded-none text-xs focus:outline-none focus:border-[#1A1A1A] font-sans placeholder:text-[#1A1A1A]/30"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[9px] font-bold text-[#1A1A1A]/40 uppercase tracking-[0.2em] mb-1">
              Latitude (Coord)
            </label>
            <input
              type="number"
              step="any"
              value={lat ? Number(lat.toFixed(6)) : ''}
              onChange={(e) => setLat(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-1.5 border border-[#1A1A1A]/10 rounded-none bg-[#F1EFEC] text-[11px] font-mono text-[#1A1A1A] focus:outline-none"
              placeholder="e.g. 35.0116"
            />
          </div>
          <div>
            <label className="block text-[9px] font-bold text-[#1A1A1A]/40 uppercase tracking-[0.2em] mb-1">
              Longitude (Coord)
            </label>
            <input
              type="number"
              step="any"
              value={lng ? Number(lng.toFixed(6)) : ''}
              onChange={(e) => setLng(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-1.5 border border-[#1A1A1A]/10 rounded-none bg-[#F1EFEC] text-[11px] font-mono text-[#1A1A1A] focus:outline-none"
              placeholder="e.g. 135.7681"
            />
          </div>
        </div>

        <div>
          <label className="block text-[9px] font-bold text-[#1A1A1A]/60 uppercase tracking-[0.2em] mb-1.5">
            Display Address Label / Temple Name (Optional)
          </label>
          <input
            type="text"
            value={placeName}
            onChange={(e) => setPlaceName(e.target.value)}
            placeholder="e.g. Kinkaku-ji Golden Pavilion, Kyoto"
            className="w-full px-3 py-2 bg-white border border-[#1A1A1A]/15 rounded-none text-xs focus:outline-none focus:border-[#1A1A1A] font-sans placeholder:text-[#1A1A1A]/30"
          />
        </div>

        {/* Category-Specific Form Modules */}
        {category === 'visited' && (
          <div className="space-y-4 pt-3 border-t border-[#1A1A1A]/10">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[9px] font-bold text-[#1A1A1A]/60 uppercase tracking-[0.2em] mb-1.5">
                  Visit Date
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pr-3 pointer-events-none text-[#1A1A1A]/40">
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

              <div>
                <label className="block text-[9px] font-bold text-[#1A1A1A]/60 uppercase tracking-[0.2em] mb-1.5">
                  Travel Companion
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pr-3 pointer-events-none text-[#1A1A1A]/40">
                    <Users className="w-3.5 h-3.5" />
                  </span>
                  <select
                    value={companions}
                    onChange={(e) => setCompanions(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-[#1A1A1A]/15 rounded-none text-xs focus:outline-none focus:border-[#1A1A1A] font-sans"
                  >
                    {COMPANIONS_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[9px] font-bold text-[#1A1A1A]/60 uppercase tracking-[0.2em] mb-1.5">
                  Trip Cost Incurred ({currency})
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pr-3 pointer-events-none text-[#1A1A1A]/40 text-[11px] font-bold font-mono">
                    {currency}
                  </span>
                  <input
                    type="number"
                    value={costAmount !== undefined ? costAmount : ''}
                    onChange={(e) => setCostAmount(e.target.value !== '' ? parseFloat(e.target.value) : undefined)}
                    placeholder="e.g. 1200"
                    className="w-full pl-8 pr-3 py-2 bg-white border border-[#1A1A1A]/15 rounded-none text-xs focus:outline-none focus:border-[#1A1A1A] font-sans"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-[#1A1A1A]/60 uppercase tracking-[0.2em] mb-1.5">
                  Destination Rating
                </label>
                <div className="flex items-center space-x-1.5 h-9">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setRating(s)}
                      className="focus:outline-none p-1 border border-[#1A1A1A]/10 hover:border-[#1A1A1A] hover:bg-[#1A1A1A]/5 rounded-none transition-colors"
                    >
                      <Star
                        className={`w-4 h-4 transition-all ${
                          s <= rating
                            ? 'text-[#1A1A1A] fill-[#1A1A1A]'
                            : 'text-slate-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Review Input */}
            <div>
              <label className="block text-[9px] font-bold text-[#1A1A1A]/60 uppercase tracking-[0.2em] mb-1.5">
                Travel Memories & Journal Dispatch
              </label>
              <textarea
                value={review}
                onChange={(e) => setReview(e.target.value)}
                placeholder="The food was beautiful, old alleyways lit by oil lamps at sunrise..."
                rows={3}
                className="w-full px-3 py-2.5 bg-white border border-[#1A1A1A]/15 rounded-none text-xs focus:outline-none focus:border-[#1A1A1A] font-sans placeholder:text-[#1A1A1A]/30 leading-relaxed"
              />
            </div>
          </div>
        )}

        {category === 'wishlist' && (
          <div className="space-y-4 pt-3 border-t border-[#1A1A1A]/10">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[9px] font-bold text-[#1A1A1A]/60 uppercase tracking-[0.2em] mb-1.5">
                  Target Travel Season
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#1A1A1A]/40">
                    <Calendar className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="date"
                    value={visitDate}
                    onChange={(e) => setVisitDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-[#1A1A1A]/15 rounded-none text-xs focus:outline-none focus:border-[#1A1A1A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-[#1A1A1A]/60 uppercase tracking-[0.2em] mb-1.5">
                  Dream Companion
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#1A1A1A]/40">
                    <Users className="w-3.5 h-3.5" />
                  </span>
                  <select
                    value={companions}
                    onChange={(e) => setCompanions(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-[#1A1A1A]/15 rounded-none text-xs focus:outline-none focus:border-[#1A1A1A] font-sans"
                  >
                    {COMPANIONS_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[9px] font-bold text-[#1A1A1A]/60 uppercase tracking-[0.2em] mb-1.5">
                  Estimated Fund Allocation ({currency})
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#1A1A1A]/40 font-mono text-[11.5px] font-bold select-none">
                    {currency}
                  </span>
                  <input
                    type="number"
                    value={estimatedBudget || ''}
                    onChange={(e) => setEstimatedBudget(parseFloat(e.target.value) || undefined)}
                    placeholder="e.g. 3500"
                    className="w-full pl-8 pr-3 py-2 bg-white border border-[#1A1A1A]/15 rounded-none text-xs focus:outline-none focus:border-[#1A1A1A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-[#1A1A1A]/60 uppercase tracking-[0.2em] mb-1.5">
                  Dream Priority
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#1A1A1A]/40">
                    <Bookmark className="w-3.5 h-3.5 text-[#B45309]" />
                  </span>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-[#1A1A1A]/15 rounded-none text-xs focus:outline-none focus:border-[#1A1A1A] font-sans"
                  >
                    <option value="High">🔥 Urgent Horizon</option>
                    <option value="Medium">⚡ Secondary Target</option>
                    <option value="Low">💤 Faraway Dream</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-bold text-[#1A1A1A]/60 uppercase tracking-[0.2em] mb-1.5">
                Dream Itinerary Highlights
              </label>
              <textarea
                value={review}
                onChange={(e) => setReview(e.target.value)}
                placeholder="Planning to rent a small campervan, traverse glacier tracks, and lodge nearby..."
                rows={3}
                className="w-full px-3 py-2.5 bg-white border border-[#1A1A1A]/15 rounded-none text-xs focus:outline-none focus:border-[#1A1A1A] font-sans placeholder:text-[#1A1A1A]/30 leading-relaxed"
              />
            </div>
          </div>
        )}

        {category === 'avoid' && (
          <div className="space-y-4 pt-3 border-t border-[#1A1A1A]/10">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[9px] font-bold text-[#1A1A1A]/60 uppercase tracking-[0.2em] mb-1.5">
                  Flagged Date
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#1A1A1A]/40">
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

              <div>
                <label className="block text-[9px] font-bold text-[#1A1A1A]/60 uppercase tracking-[0.2em] mb-1.5">
                  Cautionary Scale
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#1A1A1A]/40">
                    <AlertCircle className="w-3.5 h-3.5 text-[#DC2626]" />
                  </span>
                  <select
                    value={rating.toString()}
                    onChange={(e) => setRating(parseInt(e.target.value))}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-[#1A1A1A]/15 rounded-none text-xs focus:outline-none focus:border-[#1A1A1A] font-sans font-medium text-[#DC2626]"
                  >
                    <option value="1">⚠️ Low Level (Waste of Time)</option>
                    <option value="2">☢️ Medium Level (Tourist Trap or Scam)</option>
                    <option value="3">🚨 Critical Alert (Unsafe or Dangerous)</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-bold text-[#1A1A1A]/60 uppercase tracking-[0.2em] mb-1.5">
                Detailed Log of Blacklist Reasons *
              </label>
              <textarea
                required
                value={flaggedReason}
                onChange={(e) => {
                  setFlaggedReason(e.target.value);
                  setReview(e.target.value);
                }}
                placeholder="State exactly why this point is fenced, high local risk, highly unstable terrain, or heavily overcharged..."
                rows={3}
                className="w-full px-3 py-2.5 bg-white border border-red-250 rounded-none text-xs focus:outline-none focus:border-[#DC2626] font-sans placeholder:text-[#1A1A1A]/30 leading-relaxed"
              />
            </div>
          </div>
        )}

        {/* Travel Tags selection */}
        <div className="pt-3 border-t border-[#1A1A1A]/10">
          <label className="block text-[9px] font-bold text-[#1A1A1A]/60 uppercase tracking-[0.2em] mb-2 leading-none">
            CLASSIFICATION TAGS
          </label>
          <div className="flex flex-wrap gap-1 max-h-[140px] overflow-y-auto p-1.5 border border-[#1A1A1A]/10 rounded-none bg-[#F1EFEC]/50 font-sans">
            {PRESET_TAGS.map((tag) => {
              const isSelected = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleTagToggle(tag)}
                  className={`text-[9.5px] px-2.5 py-1 rounded-none border transition-all duration-150 cursor-pointer uppercase tracking-wider font-semibold ${
                    isSelected
                      ? 'bg-[#1A1A1A] border-[#1A1A1A] text-white'
                      : 'bg-white border-[#1A1A1A]/15 text-[#1A1A1A]/70 hover:bg-[#1A1A1A]/5'
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        {/* Form footer actions */}
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
            {initialLocation?.id ? 'Uphold Entry' : 'Log Entry'}
          </button>
        </div>
      </form>
    </div>
  );
}
