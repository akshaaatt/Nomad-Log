import React from 'react';
import { TravelLocation } from '../types';
import { Award, Compass, Heart, AlertTriangle, Coins, Sparkles, Map, Landmark } from 'lucide-react';

interface TravelStatisticsProps {
  locations: TravelLocation[];
  currency?: string;
}

export default function TravelStatistics({ locations, currency = '$' }: TravelStatisticsProps) {
  // Compute tallies
  const visited = locations.filter(l => l.category === 'visited');
  const wishlist = locations.filter(l => l.category === 'wishlist');
  const avoid = locations.filter(l => l.category === 'avoid');

  // Count unique countries
  const uniqueCountriesVisited = new Set(visited.map(l => l.countryName.toLowerCase().trim())).size;
  const uniqueCountriesWishlist = new Set(wishlist.map(l => l.countryName.toLowerCase().trim())).size;

  // Total Wishlist Budget
  const totalBudget = wishlist.reduce((acc, curr) => acc + (curr.estimatedBudget || 0), 0);

  // Highest rated places
  const highestRated = [...visited]
    .filter(l => l.rating && l.rating > 0)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 3);

  // Tag usage distribution
  const tagCounts: Record<string, number> = {};
  locations.forEach(loc => {
    loc.tags?.forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });

  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Visual Footprint Counters */}
      <h3 className="text-[9px] font-bold uppercase text-[#1A1A1A]/50 tracking-[0.2em] pl-1">
        Logbook Analytics
      </h3>
      
      <div className="grid grid-cols-2 gap-3.5">
        <div className="bg-white rounded-none p-3 border border-[#1A1A1A]/15 flex items-center space-x-3 shadow-xs">
          <div className="w-1.5 h-6 bg-[#1A1A1A]" />
          <div>
            <div className="text-xl font-bold text-[#1A1A1A] font-mono leading-none">
              {visited.length}
            </div>
            <div className="text-[9px] uppercase font-bold text-[#1A1A1A]/60 tracking-wider">
              CITIES VISITED
            </div>
          </div>
        </div>

        <div className="bg-white rounded-none p-3 border border-[#1A1A1A]/15 flex items-center space-x-3 shadow-xs">
          <div className="w-1.5 h-6 bg-[#1A1A1A]/60" />
          <div>
            <div className="text-xl font-bold text-[#1A1A1A]/90 font-mono leading-none">
              {uniqueCountriesVisited}
            </div>
            <div className="text-[9px] uppercase font-bold text-[#1A1A1A]/60 tracking-wider">
              NATIONS LOGGED
            </div>
          </div>
        </div>

        <div className="bg-white rounded-none p-3 border border-[#1A1A1A]/15 flex items-center space-x-3 shadow-xs">
          <div className="w-1.5 h-6 bg-[#B45309]" />
          <div>
            <div className="text-xl font-bold text-[#B45309] font-mono leading-none">
              {wishlist.length}
            </div>
            <div className="text-[9px] uppercase font-bold text-[#B45309]/80 tracking-wider">
              WISHLIST TARGETS
            </div>
          </div>
        </div>

        <div className="bg-white rounded-none p-3 border border-[#1A1A1A]/15 flex items-center space-x-3 shadow-xs">
          <div className="w-1.5 h-6 bg-[#DC2626]" />
          <div>
            <div className="text-xl font-bold text-[#DC2626] font-mono leading-none">
              {avoid.length}
            </div>
            <div className="text-[9px] uppercase font-bold text-[#DC2626]/85 tracking-wider">
              PLACES AVOIDED
            </div>
          </div>
        </div>
      </div>

      {/* Financial Tallies */}
      {wishlist.length > 0 && (
        <div className="bg-[#F1EFEC] border border-[#1A1A1A]/15 rounded-none p-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-[#B45309]/10 text-[#B45309]">
              <Coins className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[9px] font-bold text-[#1A1A1A]/70 uppercase tracking-widest leading-tight">WISHLIST FUND ALLOCATION</p>
              <p className="text-[10px] text-[#1A1A1A]/50 italic">Aggregated travel expectation</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-base font-bold text-[#1A1A1A] font-mono">
              {currency}{totalBudget.toLocaleString()}
            </p>
            <p className="text-[8px] uppercase tracking-wider text-[#1A1A1A]/40 font-mono">EST</p>
          </div>
        </div>
      )}

      {/* Top Travel Vibes */}
      {topTags.length > 0 && (
        <div className="space-y-2">
          <p className="text-[9px] font-bold text-[#1A1A1A]/60 uppercase tracking-[0.2em] flex items-center">
            <Sparkles className="w-3 h-3 text-[#B45309] mr-1.5" />
            Curated Vibe Taxonomy
          </p>
          <div className="flex flex-wrap gap-1.5">
            {topTags.map(([tag, count]) => (
              <div 
                key={tag}
                className="bg-white border border-[#1A1A1A]/10 px-2.5 py-1.5 rounded-none flex items-center justify-between text-[11px] font-semibold text-[#1A1A1A]/80 w-[calc(50%-4px)] shadow-xs uppercase tracking-wider"
              >
                <span className="truncate">{tag}</span>
                <span className="font-mono bg-[#F1EFEC] text-[#1A1A1A] px-1.5 py-0.5 text-[9px]">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top rated items */}
      {highestRated.length > 0 && (
        <div className="space-y-2">
          <p className="text-[9px] font-bold text-[#1A1A1A]/60 uppercase tracking-[0.2em] flex items-center">
            <Heart className="w-3 h-3 text-[#DC2626] mr-1.5" />
            Distinguished Landmarks
          </p>
          <div className="space-y-2 bg-white rounded-none border border-[#1A1A1A]/15 p-3 shadow-xs">
            {highestRated.map((place) => (
              <div key={place.id} className="flex justify-between items-center text-xs pb-2 border-b border-[#1A1A1A]/5 last:border-none last:pb-0">
                <div className="truncate pr-2">
                  <p className="font-serif italic font-semibold text-[#1A1A1A] leading-tight truncate">{place.cityName}</p>
                  <p className="text-[9px] uppercase tracking-wider text-[#1A1A1A]/55 truncate mt-0.5">{place.countryName}</p>
                </div>
                <div className="flex items-center space-x-1 shrink-0 bg-[#F1EFEC] px-2 py-0.5 border border-[#1A1A1A]/10">
                  <Award className="w-3 h-3 text-[#1A1A1A]/70" />
                  <span className="font-bold text-[#1A1A1A] text-[9px] font-mono">{place.rating}.0</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
