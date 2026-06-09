import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { TravelLocation, TravelRoute } from '../types';

interface TravelMapProps {
  locations: TravelLocation[];
  selectedLocation: TravelLocation | null;
  tempMarker: { lat: number; lng: number; placeName: string } | null;
  mapType: 'standard' | 'dark' | 'light';
  showCountryView: boolean;
  routes?: TravelRoute[];
  selectedRouteId?: string | null;
  onLocationClick: (loc: TravelLocation) => void;
  onMapClick: (lat: number, lng: number) => void;
  currency?: string;
}

// Global cached promise for fetching countries GeoJSON boundaries
let geoJsonPromise: Promise<any> | null = null;

function fetchGeoJson(): Promise<any> {
  if (!geoJsonPromise) {
    const urls = [
      'https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json',
      'https://cdn.jsdelivr.net/gh/johan/world.geo.json@master/countries.geo.json'
    ];
    
    geoJsonPromise = (async () => {
      for (const url of urls) {
        try {
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            if (data && data.features) return data;
          }
        } catch (e) {
          console.warn(`Failed to fetch country geojson from ${url}, checking fallback...`, e);
        }
      }
      throw new Error('All primary GeoJSON servers are unresponsive.');
    })();
  }
  return geoJsonPromise;
}

// Utility to match country strings robustly
function matchCountry(locationCountry: string | undefined, geoJsonName: string | undefined, geoJsonId: string | undefined): boolean {
  if (!locationCountry || (!geoJsonName && !geoJsonId)) return false;
  
  const loc = locationCountry.toLowerCase().trim();
  const geo = (geoJsonName || '').toLowerCase().trim();
  const gid = (geoJsonId || '').toLowerCase().trim();

  if (loc === geo || loc === gid) return true;

  // Synonyms/aliases dictionary for perfect matching on global cartography
  const synonyms: Record<string, string[]> = {
    'united states': ['united states of america', 'usa', 'us', 'usa', 'united states america'],
    'united states of america': ['united states', 'usa', 'us', 'united states america'],
    'usa': ['united states', 'united states of america', 'us', 'united states america'],
    'united kingdom': ['uk', 'great britain', 'england', 'britain'],
    'uk': ['united kingdom', 'great britain', 'england', 'scotland'],
    'vietnam': ['viet nam'],
    'viet nam': ['vietnam'],
    'south korea': ['korea, republic of', 'korea', 'republic of korea', 'south korea'],
    'korea': ['south korea', 'north korea'],
    'russia': ['russian federation'],
    'russian federation': ['russia'],
  };

  if (synonyms[loc] && synonyms[loc].some(syn => syn === geo)) return true;
  if (synonyms[geo] && synonyms[geo].some(syn => syn === loc)) return true;

  // Substring matching: e.g. "Japan" in "Japan (Mainland)" or "Iran" in "Iran, Islamic Republic of"
  if (geo.includes(loc) || loc.includes(geo)) return true;

  return false;
}

export default function TravelMap({
  locations,
  selectedLocation,
  tempMarker,
  mapType,
  showCountryView,
  routes = [],
  selectedRouteId,
  onLocationClick,
  onMapClick,
  currency = '$'
}: TravelMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const tempMarkerInstanceRef = useRef<L.Marker | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);
  const routeLayersRef = useRef<L.Layer[]>([]);

  // GeoJSON features state
  const [geoJsonData, setGeoJsonData] = useState<any | null>(null);
  const [isLoadingGeoJson, setIsLoadingGeoJson] = useState(false);
  const [geoJsonLoadError, setGeoJsonLoadError] = useState<string | null>(null);

  // Tile Provider URLs
  const tileProviders = {
    standard: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  };

  const attributions = {
    standard: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    light: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    dark: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
  };

  // Create custom CSS DivIcon based on location category
  const createCustomIcon = (category: 'visited' | 'wishlist' | 'avoid', isSelected: boolean = false) => {
    let color = '#1A1A1A'; // Nomad Log Charcoal Black
    let pingColor = 'bg-[#1A1A1A]';

    if (category === 'wishlist') {
      color = '#B45309'; // Warm ochre earth tone
      pingColor = 'bg-amber-600';
    } else if (category === 'avoid') {
      color = '#DC2626'; // Editorial Crimson red
      pingColor = 'bg-red-600';
    }

    const ringClass = isSelected 
      ? 'border-[#1A1A1A] scale-125 ring-2 ring-[#1A1A1A]/30 shadow-xl z-[999]' 
      : 'border-[#F9F8F6] hover:scale-115 shadow-sm';

    return L.divIcon({
      className: 'custom-div-icon',
      html: `
        <div class="relative flex items-center justify-center w-5 h-5">
          <span class="absolute inline-flex h-full w-full rounded-full animate-ping ${pingColor} opacity-20"></span>
          <div class="relative flex items-center justify-center w-4 h-4 rounded-none border ${ringClass} transition-all duration-300 pointer-events-none" style="background-color: ${color}">
            <div class="w-1 h-1 bg-[#F9F8F6]"></div>
          </div>
        </div>
      `,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });
  };

  // Helper for temp marker (search results or click results)
  const createTempIcon = () => {
    return L.divIcon({
      className: 'temp-div-icon',
      html: `
        <div class="relative flex items-center justify-center w-6 h-6">
          <span class="absolute inline-flex h-full w-full rounded-full animate-ping bg-[#1A1A1A] opacity-30"></span>
          <div class="relative flex items-center justify-center w-4.5 h-4.5 border border-[#1A1A1A] bg-[#F9F8F6] text-[#1A1A1A] shadow-md z-[1000] rotate-45">
            <div class="w-1 h-1 bg-[#1A1A1A] -rotate-45"></div>
          </div>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
  };

  // Fetch GeoJSON boundary geometries when country highlight view is enabled
  useEffect(() => {
    if (showCountryView && !geoJsonData && !isLoadingGeoJson) {
      setIsLoadingGeoJson(true);
      setGeoJsonLoadError(null);
      fetchGeoJson()
        .then(data => {
          setGeoJsonData(data);
        })
        .catch(err => {
          console.error(err);
          setGeoJsonLoadError('Failed to download global country boundaries.');
        })
        .finally(() => {
          setIsLoadingGeoJson(false);
        });
    }
  }, [showCountryView, geoJsonData, isLoadingGeoJson]);

  // First-time init
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Default center on some beautiful overview coordinate (cozy zoom 2 for full world view)
    const map = L.map(mapContainerRef.current, {
      center: [25, 10],
      zoom: 2.5,
      minZoom: 1.5,
      maxZoom: 18,
      worldCopyJump: true,
      zoomControl: false, // will reposition zoom control
    });

    // Add zoom control at bottom right to keep top corners clean
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Bind map level clicks
    map.on('click', (e: L.LeafletMouseEvent) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    });

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Tile Layer when mapType Changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const tileUrl = tileProviders[mapType];
    const attributionTxt = attributions[mapType];

    tileLayerRef.current = L.tileLayer(tileUrl, {
      attribution: attributionTxt,
      maxZoom: 18,
    }).addTo(map);
  }, [mapType]);

  // Update Country Highlighting Overlay
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clean preceding country shapes
    if (geoJsonLayerRef.current) {
      map.removeLayer(geoJsonLayerRef.current);
      geoJsonLayerRef.current = null;
    }

    if (!showCountryView || !geoJsonData) return;

    // Color code country polygon features depending on what cities the user registered
    const geoJsonLayer = L.geoJSON(geoJsonData, {
      style: (feature: any) => {
        const countryName = feature.properties?.name || '';
        const countryId = feature.id || '';

        // Match logged places
        const matched = locations.filter(loc => matchCountry(loc.countryName, countryName, countryId));

        if (matched.length === 0) {
          return {
            fillColor: 'transparent',
            fillOpacity: 0,
            color: 'transparent',
            weight: 0
          };
        }

        // Category precedence: Visited > Wishlist > Avoid
        const hasVisited = matched.some(l => l.category === 'visited');
        const hasWishlist = matched.some(l => l.category === 'wishlist');
        const hasAvoid = matched.some(l => l.category === 'avoid');

        if (hasVisited) {
          return {
            fillColor: '#1A1A1A', // charcoal
            fillOpacity: 0.25,
            color: '#1A1A1A',
            weight: 1.2,
            opacity: 0.5
          };
        } else if (hasWishlist) {
          return {
            fillColor: '#B45309', // warm ochre
            fillOpacity: 0.22,
            color: '#B45309',
            weight: 1.2,
            opacity: 0.5
          };
        } else if (hasAvoid) {
          return {
            fillColor: '#DC2626', // editorial crimson
            fillOpacity: 0.22,
            color: '#DC2626',
            weight: 1.2,
            opacity: 0.5
          };
        }

        return {
          fillColor: 'transparent',
          fillOpacity: 0,
          color: 'transparent',
          weight: 0
        };
      },
      onEachFeature: (feature: any, layer: any) => {
        const countryName = feature.properties?.name || '';
        const countryId = feature.id || '';

        const matched = locations.filter(loc => matchCountry(loc.countryName, countryName, countryId));
        if (matched.length === 0) return;

        const visitedCount = matched.filter(l => l.category === 'visited').length;
        const wishlistCount = matched.filter(l => l.category === 'wishlist').length;
        const avoidCount = matched.filter(l => l.category === 'avoid').length;

        // Formulate standard aesthetic tooltip text
        const itemsList: string[] = [];
        if (visitedCount > 0) itemsList.push(`${visitedCount} visited`);
        if (wishlistCount > 0) itemsList.push(`${wishlistCount} wishlist`);
        if (avoidCount > 0) itemsList.push(`${avoidCount} avoid`);

        layer.bindTooltip(
          `<div class="p-1 text-xs font-sans text-stone-900 leading-normal">
            <span class="font-bold underline">${countryName}</span>
            <p class="text-[10px] text-stone-500 font-semibold mt-0.5 capitalize">${itemsList.join(', ')}</p>
           </div>`,
          { sticky: true, opacity: 0.95 }
        );

        // Highlight interaction
        layer.on({
          mouseover: (e: L.LeafletMouseEvent) => {
            const pathLayer = e.target;
            pathLayer.setStyle({
              fillOpacity: 0.42,
              weight: 1.8
            });
          },
          mouseout: (e: L.LeafletMouseEvent) => {
            const pathLayer = e.target;
            geoJsonLayer.resetStyle(pathLayer);
          }
        });
      }
    }).addTo(map);

    geoJsonLayerRef.current = geoJsonLayer;
  }, [showCountryView, geoJsonData, locations]);

  // Update Markers when locations change or selectedLocation changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear old markers
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    // Add new markers
    locations.forEach(loc => {
      const isSelected = selectedLocation?.id === loc.id;
      const markerJson = L.marker([loc.lat, loc.lng], {
        icon: createCustomIcon(loc.category, isSelected),
        title: loc.placeName,
      });

      markerJson.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        onLocationClick(loc);
      });

      markerJson.addTo(map);
      markersRef.current.push(markerJson);
    });
  }, [locations, selectedLocation]);

  // Handle Temp Marker updates (for search and manual coordinates clicking)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tempMarkerInstanceRef.current) {
      map.removeLayer(tempMarkerInstanceRef.current);
      tempMarkerInstanceRef.current = null;
    }

    if (tempMarker) {
      const marker = L.marker([tempMarker.lat, tempMarker.lng], {
        icon: createTempIcon(),
        title: tempMarker.placeName,
      }).addTo(map);

      marker.bindPopup(`
        <div class="text-xs font-sans">
          <p class="font-bold text-gray-900">${tempMarker.placeName}</p>
          <p class="text-gray-500 mt-1">Found coordinate! Setup travel detail by clicking 'Add Destination'.</p>
        </div>
      `).openPopup();

      tempMarkerInstanceRef.current = marker;

      map.setView([tempMarker.lat, tempMarker.lng], Math.max(map.getZoom(), 7), {
        animate: true,
        duration: 0.8
      });
    }
  }, [tempMarker]);

  // Center on Selected Location animatedly
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedLocation) return;

    map.setView([selectedLocation.lat, selectedLocation.lng], Math.max(map.getZoom(), 8), {
      animate: true,
      duration: 1.0,
    });
  }, [selectedLocation]);

  // Update Routes Polyline Overlay
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clean preceding routes
    routeLayersRef.current.forEach(layer => map.removeLayer(layer));
    routeLayersRef.current = [];

    if (!routes || routes.length === 0) return;

    routes.forEach(route => {
      if (!route.stops || route.stops.length < 2) return;

      const isSelected = selectedRouteId === route.id;
      const latlngs = route.stops.map(s => [s.lat, s.lng] as L.LatLngTuple);

      // Create a nice styled polyline representation
      const polyline = L.polyline(latlngs, {
        color: isSelected ? '#1A1A1A' : '#78716C',
        weight: isSelected ? 4 : 2,
        dashArray: isSelected ? '6, 6' : '3, 6',
        opacity: isSelected ? 0.95 : 0.5,
        interactive: true
      });

      // Bind dynamic descriptive content popup to the polyline representing travel
      const itemsList = route.stops.map(s => s.cityName).join(' ➜ ');
      const linksHtml = route.mediaLinks && route.mediaLinks.length > 0
        ? `<div class="mt-1.5 flex flex-wrap gap-1 border-t border-[#1A1A1A]/10 pt-1">
            ${route.mediaLinks.map((url, i) => `
              <a href="${url}" target="_blank" rel="noreferrer" class="inline-flex items-center space-x-1 text-[8.5px] bg-[#1A1A1A]/5 text-[#1A1A1A] px-1 py-0.5 font-bold uppercase tracking-wide no-underline hover:bg-[#1A1A1A] hover:text-white leading-none">
                📹 Link ${i+1}
              </a>
            `).join('')}
           </div>`
        : '';

      polyline.bindPopup(`
        <div class="p-1 font-sans text-stone-900 leading-normal" style="min-width: 180px;">
          <p class="font-bold text-xs uppercase tracking-tight text-[#1A1A1A] mb-0.5">${route.title}</p>
          <p class="text-[9.5px] text-stone-500 font-semibold mb-1">
            Cost: ${route.costAmount ? `${currency}${route.costAmount.toLocaleString()}` : `${currency}0`} | ${route.stops.length} stops
          </p>
          <div class="text-[10px] text-[#1A1A1A]/85 p-1 bg-stone-100 rounded-none border border-stone-200 mt-1 font-mono">
            ${itemsList}
          </div>
          ${route.notes ? `<p class="text-[9px] text-[#1A1A1A]/70 mt-1.5 leading-relaxed">${route.notes}</p>` : ''}
          ${linksHtml}
        </div>
      `, { maxWidth: 220 });

      polyline.addTo(map);
      routeLayersRef.current.push(polyline);

      // Add stop order numbered markers ONLY for the selected/active route to avoid map noise clutter!
      if (isSelected) {
        route.stops.forEach((stop, index) => {
          const stopIcon = L.divIcon({
            className: 'custom-route-stop-icon',
            html: `
              <div class="w-5 h-5 rounded-full bg-[#1A1A1A] border-2 border-[#F9F8F6] shadow-md flex items-center justify-center font-bold text-white font-sans text-[9px] select-none">
                ${index + 1}
              </div>
            `,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          });

          const marker = L.marker([stop.lat, stop.lng], {
            icon: stopIcon,
            title: `Stop ${index + 1}: ${stop.cityName}`,
            zIndexOffset: 1000
          });

          marker.bindTooltip(`
            <div class="p-1 font-sans text-stone-950 font-bold text-[9.5px]">
              Stop ${index + 1}: ${stop.cityName}
            </div>
          `, { sticky: true });

          marker.addTo(map);
          routeLayersRef.current.push(marker);
        });

        // Zoom map viewport to display the entire parsed path nicely!
        try {
          const bounds = L.latLngBounds(latlngs);
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: 8, animate: true, duration: 0.8 });
        } catch (e) {
          console.warn('Could not fit bounds', e);
        }
      }
    });

  }, [routes, selectedRouteId]);

  return (
    <div className="w-full h-full relative" style={{ minHeight: '400px' }}>
      <div 
        ref={mapContainerRef} 
        id="map-canvas"
        className="w-full h-full bg-[#EAE8E4] focus:outline-none"
      />

      {/* Floating indicators for loading GeoJSON */}
      {isLoadingGeoJson && (
        <div className="absolute top-4 right-4 bg-white/95 border border-[#1A1A1A]/10 px-3 py-1.5 shadow-md flex items-center space-x-2 z-[1000] rounded-none animate-pulse">
          <span className="w-2 h-2 rounded-full bg-[#1A1A1A] animate-ping" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#1A1A1A]/70">
            Mapping Boundaries...
          </span>
        </div>
      )}

      {geoJsonLoadError && (
        <div className="absolute top-4 right-4 bg-red-50 border border-red-500/20 px-3 py-1.5 shadow-md flex items-center space-x-1.5 z-[1000] rounded-none">
          <span className="text-[9.5px] font-semibold text-red-700 leading-tight">
            {geoJsonLoadError}
          </span>
        </div>
      )}
    </div>
  );
}
