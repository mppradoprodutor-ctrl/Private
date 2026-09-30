
import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Search, MapPin, Navigation, Info, AlertCircle, Package, Loader2, X } from 'lucide-react';
import { Shipment, Freight } from '../types';
import { 
  geocode, 
  calculateDistance, 
  geocodeCache, 
  routeCache, 
  saveRouteCache,
  parseCityState,
  getRoute
} from '../services/geocodingService';

// Fix for Leaflet default icon issue in React
L.Icon.Default.prototype.options.imagePath = 'https://unpkg.com/leaflet@1.9.4/dist/images/';

const MAP_LAYERS = {
  google: {
    name: 'Google Ruas',
    url: 'https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    attribution: '&copy; Google Maps'
  },
  positron: {
    name: 'Discreto',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    subdomains: ['a', 'b', 'c', 'd'],
    attribution: '&copy; CARTO &copy; OpenStreetMap'
  },
  osm: {
    name: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    subdomains: ['a', 'b', 'c'],
    attribution: '&copy; OpenStreetMap contributors'
  }
};

const MapUpdater: React.FC<{ bounds: L.LatLngBoundsExpression | null; isVisible: boolean }> = ({ bounds, isVisible }) => {
  const map = useMap();
  
  // Track last bounds string to avoid redundant fitBounds
  const boundsStr = bounds ? JSON.stringify(bounds) : '';

  useEffect(() => {
    const handleResize = () => {
      map.invalidateSize();
    };

    window.addEventListener('resize', handleResize);
    
    if (isVisible) {
      // Small delay to ensure the container is fully visible before invalidating size
      const timer = setTimeout(() => {
        map.invalidateSize();
        if (bounds) {
          map.fitBounds(bounds, { padding: [35, 35], maxZoom: 12, animate: true });
        }
      }, 100);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', handleResize);
      };
    }
    
    return () => window.removeEventListener('resize', handleResize);
  }, [isVisible, map, boundsStr]);

  return null;
};

// Simple cache for geocoding results to avoid redundant API calls
interface MapViewProps {
  isVisible?: boolean;
  shipments?: Shipment[];
  freights?: Freight[];
}

interface ShipmentDetail {
  product: string;
  destination: string;
  type: 'shipment' | 'freight';
  driverTariff?: string | number;
}

interface ShipmentOrigin {
  name: string;
  coords: [number, number];
  count: number;
  details: ShipmentDetail[];
}

const ZoomControls: React.FC<{ 
  onRecenter: () => void;
  mapLayer: 'google' | 'positron' | 'osm';
  onSelectLayer: (layer: 'google' | 'positron' | 'osm') => void;
}> = ({ onRecenter, mapLayer, onSelectLayer }) => {
  const map = useMap();
  return (
    <div className="absolute top-3 right-3 z-[1000] flex items-center gap-1.5 pointer-events-auto">
      {/* Discreet Layer Switcher */}
      <div className="bg-white/95 backdrop-blur-xs p-0.5 rounded-md border border-slate-200/90 shadow-2xs flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => onSelectLayer('google')}
          className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase transition-all cursor-pointer ${
            mapLayer === 'google' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
          }`}
          title="Google Ruas e Cidades"
        >
          Google Ruas
        </button>
        <button
          type="button"
          onClick={() => onSelectLayer('positron')}
          className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase transition-all cursor-pointer ${
            mapLayer === 'positron' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
          }`}
          title="Mapa Claro Neutro"
        >
          Discreto
        </button>
        <button
          type="button"
          onClick={() => onSelectLayer('osm')}
          className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase transition-all cursor-pointer ${
            mapLayer === 'osm' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
          }`}
          title="OpenStreetMap"
        >
          OSM
        </button>
      </div>

      {/* Discreet Zoom Controls */}
      <div className="flex items-center gap-1">
        <button 
          onClick={(e) => { e.stopPropagation(); map.zoomIn(); }}
          className="bg-white/95 backdrop-blur-xs w-6 h-6 rounded-md shadow-2xs border border-slate-200/90 flex items-center justify-center text-slate-800 font-black text-xs hover:bg-slate-50 transition-all active:scale-90 cursor-pointer"
          title="Aproximar Zoom"
        >
          +
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); map.zoomOut(); }}
          className="bg-white/95 backdrop-blur-xs w-6 h-6 rounded-md shadow-2xs border border-slate-200/90 flex items-center justify-center text-slate-800 font-black text-xs hover:bg-slate-50 transition-all active:scale-90 cursor-pointer"
          title="Diminuir Zoom"
        >
          -
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); onRecenter(); }}
          className="bg-white/95 backdrop-blur-xs w-6 h-6 rounded-md shadow-2xs border border-slate-200/90 flex items-center justify-center text-slate-800 hover:bg-slate-50 transition-all active:scale-90 cursor-pointer"
          title="Centralizar Mapa"
        >
          <Navigation size={10} className="text-slate-600" />
        </button>
      </div>
    </div>
  );
};

const MapView: React.FC<MapViewProps> = ({ isVisible = true, shipments = [], freights = [] }) => {
  const [mapLayer, setMapLayer] = useState<'google' | 'positron' | 'osm'>('google');
  const [origins, setOrigins] = useState<string[]>(['']);
  const [debouncedOrigin, setDebouncedOrigin] = useState('');
  const [destinations, setDestinations] = useState<string[]>(['']);
  const [originCoordsList, setOriginCoordsList] = useState<[number, number][]>([]);
  const [destCoordsList, setDestCoordsList] = useState<[number, number][]>([]);
  const [routePolyline, setRoutePolyline] = useState<[number, number][]>([]);
  const [distance, setDistance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bounds, setBounds] = useState<L.LatLngBoundsExpression | null>(null);
  const [shipmentOrigins, setShipmentOrigins] = useState<ShipmentOrigin[]>([]);
  const [nearbyOrigins, setNearbyOrigins] = useState<(ShipmentOrigin & { distanceToRoute: number })[]>([]);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  // Helper functions for dynamic origins
  const handleAddOrigin = () => {
    setOrigins(prev => [...prev, '']);
  };

  const handleRemoveOrigin = (index: number) => {
    setOrigins(prev => {
      const next = prev.filter((_, i) => i !== index);
      return next.length > 0 ? next : [''];
    });
  };

  const handleOriginChange = (index: number, value: string) => {
    setOrigins(prev => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  // Helper functions for dynamic destinations
  const handleAddDestination = () => {
    setDestinations(prev => [...prev, '']);
  };

  const handleRemoveDestination = (index: number) => {
    setDestinations(prev => {
      const next = prev.filter((_, i) => i !== index);
      return next.length > 0 ? next : [''];
    });
  };

  const handleDestinationChange = (index: number, value: string) => {
    setDestinations(prev => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortController) abortController.abort();
    };
  }, [abortController]);

  // Helper to extract city and state from strings like "City, UF" or "City UF"
  // Removed local parseCityState as it is now imported from geocodingService

  // Geocode all origins (shipments + freights)
  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    const geocodeShipmentOrigins = async () => {
      const allOrigins = [
        ...shipments.map(s => parseCityState(s.origin)),
        ...freights.map(f => ({ 
          name: f.origin.trim(), 
          state: f.state.trim() 
        }))
      ].map(o => ({
        name: 'name' in o ? o.name : o.city,
        state: o.state
      })).filter(o => o.name);

      // Group by name and state to get unique combinations
      const uniqueOriginsMap = new Map<string, { name: string, state: string }>();
      allOrigins.forEach(o => {
        const key = `${o.name.toLowerCase()}|${o.state.toLowerCase()}`;
        if (!uniqueOriginsMap.has(key)) {
          uniqueOriginsMap.set(key, o);
        }
      });
      const uniqueOrigins = Array.from(uniqueOriginsMap.values());
      
      const results: ShipmentOrigin[] = [];
      const nonCachedOrigins: { name: string, state: string }[] = [];

      // Process cached origins instantly
      for (const originObj of uniqueOrigins) {
        if (signal.aborted) return;
        const normalized = originObj.name.toLowerCase().trim();
        const cacheKey = originObj.state ? `${normalized}, ${originObj.state.toLowerCase().trim()}` : normalized;
        
        if (geocodeCache[cacheKey] || geocodeCache[normalized]) {
          const coords = geocodeCache[cacheKey] || geocodeCache[normalized];
          const cityShipments = shipments.filter(s => s.origin.toLowerCase().includes(normalized));
          const cityFreights = freights.filter(f => f.origin.toLowerCase().trim() === normalized);
          
          results.push({
            name: originObj.state ? `${originObj.name}, ${originObj.state}` : originObj.name,
            coords,
            count: cityShipments.length + cityFreights.length,
            details: [
              ...cityShipments.map(s => ({
                product: s.product,
                destination: s.destination,
                type: 'shipment' as const,
                driverTariff: s.pptm
              })),
              ...cityFreights.map(f => ({
                product: f.product,
                destination: f.destination,
                type: 'freight' as const,
                driverTariff: f.driverTariff
              }))
            ]
          });
        } else {
          nonCachedOrigins.push(originObj);
        }
      }

      // Update UI with cached results immediately
      if (results.length > 0 && !signal.aborted) {
        setShipmentOrigins([...results]);
      }

  // Process non-cached sequentially with a slightly longer delay for background tasks
      for (const originObj of nonCachedOrigins) {
        if (signal.aborted) return;
        try {
          // Add a jittered delay to be polite to Nominatim
          await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));
          if (signal.aborted) return;
          
          const coords = await geocode(originObj.name, true, signal, originObj.state, false);
          if (coords && !signal.aborted) {
            const normalized = originObj.name.toLowerCase().trim();
            const cityShipments = shipments.filter(s => s.origin.toLowerCase().includes(normalized));
            const cityFreights = freights.filter(f => f.origin.toLowerCase().trim() === normalized);
            
            const details: ShipmentDetail[] = [
              ...cityShipments.map(s => ({
                product: s.product,
                destination: s.destination,
                type: 'shipment' as const,
                driverTariff: s.pptm
              })),
              ...cityFreights.map(f => ({
                product: f.product,
                destination: f.destination,
                type: 'freight' as const,
                driverTariff: f.driverTariff
              }))
            ];

            const newOrigin = { 
              name: originObj.state ? `${originObj.name}, ${originObj.state}` : originObj.name, 
              coords, 
              count: cityShipments.length + cityFreights.length, 
              details
            };
            
            results.push(newOrigin);
            setShipmentOrigins([...results]);
          }
        } catch (err: any) {
          if (err.name !== 'AbortError') {
            console.error(`Failed to geocode city: ${originObj.name}`, err);
          }
        }
      }

      // Fit bounds if no route is searched
      if (results.length > 0 && originCoordsList.length === 0 && destCoordsList.length === 0 && !signal.aborted) {
        const coords = results.map(so => so.coords);
        const newBounds = L.latLngBounds(coords);
        setBounds(newBounds as any);
      }
    };

    if (shipments.length > 0 || freights.length > 0) {
      geocodeShipmentOrigins();
    }

    return () => controller.abort();
  }, [shipments, freights, isVisible]);

  // Debounce origin input for geocoding
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedOrigin(origins[0] || ''), 800);
    return () => clearTimeout(timer);
  }, [origins]);

  // Geocode origin as user types
  useEffect(() => {
    if (debouncedOrigin && debouncedOrigin.length > 3) {
      const controller = new AbortController();
      const geocodeOrigin = async () => {
        try {
          const data = parseCityState(debouncedOrigin);
          const coords = await geocode(data.city, true, controller.signal, data.state, false);
          if (coords && !controller.signal.aborted) {
            setOriginCoordsList(prev => {
              const next = [...prev];
              next[0] = coords;
              return next;
            });
            // If no bounds are set or we only have origin, center on it
            if (destCoordsList.length === 0) {
              setBounds(L.latLngBounds([coords]) as any);
            }
          }
        } catch (err) {
          // Ignore errors during typing
        }
      };
      geocodeOrigin();
      return () => controller.abort();
    }
  }, [debouncedOrigin, destCoordsList]);

  // Find nearby origins when origin or route changes
  useEffect(() => {
    if (shipmentOrigins.length > 0 && (originCoordsList.length > 0 || routePolyline.length > 0)) {
      const nearby = shipmentOrigins.map(so => {
        let minDistance = Infinity;
        
        if (routePolyline.length > 0) {
          // Calculate minimum distance from origin to any point in the polyline
          const sampleRate = Math.max(1, Math.floor(routePolyline.length / 40));
          for (let i = 0; i < routePolyline.length; i += sampleRate) {
            const point = routePolyline[i];
            const d = calculateDistance(so.coords[0], so.coords[1], point[0], point[1]);
            if (d < minDistance) minDistance = d;
          }
          const lastPoint = routePolyline[routePolyline.length - 1];
          const dLast = calculateDistance(so.coords[0], so.coords[1], lastPoint[0], lastPoint[1]);
          if (dLast < minDistance) minDistance = dLast;
        } else if (originCoordsList.length > 0) {
          // Just distance to the first origin
          minDistance = calculateDistance(so.coords[0], so.coords[1], originCoordsList[0][0], originCoordsList[0][1]);
        }

        return { ...so, distanceToRoute: minDistance };
      })
      .filter(so => so.distanceToRoute < 250) // Within 250km
      .sort((a, b) => a.distanceToRoute - b.distanceToRoute)
      .slice(0, 10); // Top 10 closest

      setNearbyOrigins(nearby);
    } else {
      setNearbyOrigins([]);
    }
  }, [routePolyline, shipmentOrigins, originCoordsList]);

  const mapStyle = React.useMemo(() => ({ height: '100%', width: '100%' }), []);

  const handleRecenter = () => {
    if (routePolyline.length > 0) {
      const newBounds = L.latLngBounds(routePolyline);
      setBounds(newBounds as any);
    } else if (shipmentOrigins.length > 0) {
      const coords = shipmentOrigins.map(so => so.coords);
      const newBounds = L.latLngBounds(coords);
      setBounds(newBounds as any);
    } else {
      // Default to Maringá if nothing else
      setBounds(L.latLngBounds([[-23.4209, -51.9331]]));
    }
  };

  const handleCancelRoute = useCallback(() => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
    setOrigins(['']);
    setDestinations(['']);
    setOriginCoordsList([]);
    setDestCoordsList([]);
    setRoutePolyline([]);
    setDistance(null);
    setBounds(L.latLngBounds([[-23.4209, -51.9331]]) as any);
    setError(null);
    setLoading(false);
  }, [abortController]);

  const performSearch = async (originCities: string[], destCities: string[]) => {
    const validOrigins = originCities.filter(o => o.trim() !== '');
    const validDests = destCities.filter(d => d.trim() !== '');
    if (validOrigins.length === 0 || validDests.length === 0) return;

    setLoading(true);
    setError(null);
    setOriginCoordsList([]);
    setDestCoordsList([]);
    setRoutePolyline([]);
    setDistance(null);

    // Cancel any previous search immediately
    if (abortController) {
      abortController.abort();
    }

    const newController = new AbortController();
    setAbortController(newController);
    const signal = newController.signal;

    try {
      // Check if cities are already in our local shipmentOrigins list to avoid API calls
      const findLocalCoords = (cityName: string) => {
        const normalized = cityName.toLowerCase().trim();
        return shipmentOrigins.find(so => so.name.toLowerCase().trim() === normalized || so.name.toLowerCase().trim().includes(normalized))?.coords;
      };

      // Geocode all origins
      const oCoordsList: ([number, number] | null)[] = await Promise.all(
        validOrigins.map(async (origCity) => {
          const localCoords = findLocalCoords(origCity);
          if (localCoords) return localCoords;
          const origData = parseCityState(origCity);
          try {
            return await geocode(origData.city, true, signal, origData.state, true);
          } catch (e) {
            return null;
          }
        })
      );

      if (signal.aborted) return;

      const successfulOrigins: { name: string; coords: [number, number] }[] = [];
      validOrigins.forEach((name, index) => {
        const coords = oCoordsList[index];
        if (coords) {
          successfulOrigins.push({ name, coords });
        }
      });

      if (successfulOrigins.length === 0) {
        setError("Não foi possível encontrar nenhuma das cidades de origem. Verifique a ortografia.");
        setLoading(false);
        setAbortController(null);
        return;
      }

      const justOriginCoords = successfulOrigins.map(o => o.coords);
      setOriginCoordsList(justOriginCoords);

      // Geocode all destinations
      const dCoordsList: ([number, number] | null)[] = await Promise.all(
        validDests.map(async (destCity) => {
          const localCoords = findLocalCoords(destCity);
          if (localCoords) return localCoords;
          const destData = parseCityState(destCity);
          try {
            return await geocode(destData.city, true, signal, destData.state, true);
          } catch (e) {
            return null;
          }
        })
      );

      if (signal.aborted) return;

      // Filter out any destinations that could not be geocoded
      const successfulDests: { name: string; coords: [number, number] }[] = [];
      validDests.forEach((name, index) => {
        const coords = dCoordsList[index];
        if (coords) {
          successfulDests.push({ name, coords });
        }
      });

      if (successfulDests.length === 0) {
        setError("Não foi possível encontrar nenhuma das cidades de destino. Verifique a ortografia.");
        setLoading(false);
        setAbortController(null);
        return;
      }

      // Update state
      const justDestCoords = successfulDests.map(d => d.coords);
      setDestCoordsList(justDestCoords);

      const allCoords = [...justOriginCoords, ...justDestCoords];

      // Route Cache key - combination of all coordinates
      const routeKey = allCoords.map(c => c.join(',')).join('_');
      if (routeCache[routeKey]) {
        const cached = routeCache[routeKey];
        setRoutePolyline(cached.polyline);
        setDistance(cached.distance);
        setBounds(L.latLngBounds(cached.polyline) as any);
        setLoading(false);
        setAbortController(null);
        return;
      }

      // Optimistic fallback: show straight line connecting sequentially
      const directDist = allCoords.reduce((acc, current, index) => {
        if (index === 0) return 0;
        const prev = allCoords[index - 1];
        return acc + calculateDistance(prev[0], prev[1], current[0], current[1]);
      }, 0);

      setRoutePolyline(allCoords);
      setDistance(directDist);
      setBounds(L.latLngBounds(allCoords) as any);

      // Try to get real road route from OSRM for all sequential coordinates
      try {
        const coordsString = allCoords.map(c => `${c[1]},${c[0]}`).join(';');
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coordsString}?overview=full&geometries=geojson`;

        const timeoutId = setTimeout(() => {
          console.warn("OSRM timeout - sticking with straight line");
        }, 3500);

        const response = await fetch(osrmUrl, { signal });
        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          if (data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            const coordinates = route.geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]] as [number, number]);
            const roadDist = route.distance / 1000;

            setRoutePolyline(coordinates);
            setDistance(roadDist);

            const newBounds = L.latLngBounds(coordinates);
            setBounds(newBounds as any);

            // Save to cache
            routeCache[routeKey] = { polyline: coordinates, distance: roadDist };
            saveRouteCache();
          }
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.warn("OSRM routing failed or timed out, keeping straight line:", err);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setError("Erro ao processar a rota. Tente novamente.");
    } finally {
      setLoading(false);
      setAbortController(null);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(origins, destinations);
  };

  const handleRouteToShipment = (shipmentOrigin: string) => {
    setError(null);
    const activeOrigin = origins[0] || 'Maringá, PR';
    let updatedOrigins = [...origins];
    if (updatedOrigins.filter(o => o.trim() !== '').length === 0) {
      updatedOrigins = [activeOrigin];
      setOrigins(updatedOrigins);
    }

    const nonEntries = destinations.filter(d => d.trim() !== '');
    if (nonEntries.length === 0) {
      setDestinations([shipmentOrigin]);
      performSearch(updatedOrigins, [shipmentOrigin]);
    } else {
      const updated = [...nonEntries, shipmentOrigin];
      setDestinations(updated);
      performSearch(updatedOrigins, updated);
    }
  };

  const handleManualCancel = () => {
    handleCancelRoute();
  };

  return (
    <div className="animate-in fade-in duration-500 h-[650px] lg:h-[720px] flex flex-col lg:flex-row gap-4 max-w-7xl mx-auto">
      {/* Search Panel */}
      <div className="w-full lg:w-1/3 bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col overflow-y-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Navigation className="text-red-600" size={28} />
            Calculador de Rotas
          </h2>
          <p className="text-slate-500 text-xs mt-1 font-medium">Trace rotas e calcule distâncias.</p>
        </div>

        <form onSubmit={handleSearch} className="space-y-4">
          <div className="space-y-3">
            {origins.map((orig, index) => (
              <div key={index} className="relative group">
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 flex justify-between items-center">
                  <span>Cidade de Origem {origins.length > 1 ? `#${index + 1}` : ''}</span>
                  {origins.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOrigin(index)}
                      className="text-[8px] font-bold text-red-500 hover:text-red-700 uppercase"
                    >
                      Remover
                    </button>
                  )}
                </label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-red-600 transition-colors" size={16} />
                  <input 
                    type="text" 
                    value={orig}
                    onChange={(e) => handleOriginChange(index, e.target.value)}
                    placeholder={index === 0 ? "Ex: Maringá, PR" : "Ex: Londrina, PR"}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-12 pr-4 py-3 text-xs font-black outline-none focus:ring-4 focus:ring-red-100 transition-all"
                    required
                  />
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={handleAddOrigin}
              className="w-full py-2 border border-dashed border-slate-200 hover:border-red-400 rounded-xl text-slate-500 hover:text-red-600 text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
            >
              + Adicionar Próxima Origem
            </button>

            {destinations.map((dest, index) => (
              <div key={index} className="relative group">
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 flex justify-between items-center">
                  <span>Cidade de Destino {destinations.length > 1 ? `#${index + 1}` : ''}</span>
                  {destinations.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveDestination(index)}
                      className="text-[8px] font-bold text-red-500 hover:text-red-700 uppercase"
                    >
                      Remover
                    </button>
                  )}
                </label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-red-600 transition-colors" size={16} />
                  <input 
                    type="text" 
                    value={dest}
                    onChange={(e) => handleDestinationChange(index, e.target.value)}
                    placeholder={index === 0 ? "Ex: Curitiba, PR" : "Ex: São Paulo, SP"}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-12 pr-4 py-3 text-xs font-black outline-none focus:ring-4 focus:ring-red-100 transition-all"
                    required
                  />
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={handleAddDestination}
              className="w-full py-2 border border-dashed border-slate-200 hover:border-red-400 rounded-xl text-slate-500 hover:text-red-600 text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
            >
              + Adicionar Próximo Destino
            </button>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest py-4 rounded-xl shadow-xl hover:bg-red-600 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Search size={16} /> Calcular Rota
              </>
            )}
          </button>

          {(originCoordsList.length > 0 || destCoordsList.length > 0 || origins.some(o => o !== '') || destinations.some(d => d !== '') || error) && (
            <button 
              type="button"
              onClick={handleManualCancel}
              className="w-full text-slate-400 font-black text-[9px] uppercase tracking-widest py-2 hover:text-red-600 transition-colors flex items-center justify-center gap-2 animate-in fade-in slide-in-from-top-1"
            >
              <X size={14} /> Cancelar Roteirização
            </button>
          )}
        </form>

        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-700 animate-in slide-in-from-top-2">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <p className="text-xs font-bold leading-relaxed">{error}</p>
          </div>
        )}

        {distance !== null && (
          <div className="mt-6 pt-6 border-t border-slate-100 animate-in slide-in-from-bottom-4 space-y-4">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Distância Estimada</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-3xl font-black text-slate-900 tracking-tighter">{Math.round(distance)}</h3>
                <span className="text-sm font-black text-slate-400 uppercase">KM</span>
              </div>
            </div>
          </div>
        )}

        {nearbyOrigins.length > 0 && (
          <div className="mt-6 pt-6 border-t border-slate-100 animate-in slide-in-from-bottom-4 space-y-3">
            <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <Package size={14} className="text-blue-600" />
              Origens de Embarque Próximas
            </h4>
            <div className="space-y-2">
              {nearbyOrigins.map(nearby => (
                <div key={nearby.name} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex justify-between items-center group hover:border-blue-200 transition-all">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-900 uppercase">{nearby.name}</span>
                    <span className="text-[8px] font-bold text-slate-400 uppercase">Para: {nearby.details[0]?.destination || 'N/A'}{nearby.details.length > 1 ? ` (+${nearby.details.length - 1})` : ''}</span>
                    <button 
                      onClick={() => handleRouteToShipment(nearby.name)}
                      className="mt-1 text-[8px] font-black text-blue-600 uppercase tracking-widest hover:underline text-left"
                    >
                      Roteirizar como novo destino
                    </button>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-black text-blue-600">{Math.round(nearby.distanceToRoute)} KM</span>
                    <p className="text-[8px] font-bold text-slate-300 uppercase">da origem</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Map Panel */}
      <div className="flex-1 bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden relative">
        <MapContainer 
          center={[-23.4209, -51.9331]} // Default to Maringá
          zoom={12} 
          style={mapStyle}
          zoomControl={false}
          preferCanvas={true}
          minZoom={4}
          maxBounds={[[-35, -75], [6, -33]]}
          maxBoundsViscosity={1.0}
        >
          <TileLayer
            key={mapLayer}
            attribution={MAP_LAYERS[mapLayer].attribution}
            url={MAP_LAYERS[mapLayer].url}
            subdomains={MAP_LAYERS[mapLayer].subdomains}
          />
          
          {shipmentOrigins.map(so => (
            <Marker 
              key={so.name} 
              position={so.coords} 
              icon={L.divIcon({
                className: 'discreet-city-flag',
                html: `
                  <div style="display:inline-flex; align-items:center; gap:2.5px; transform:translate(-50%, -50%); background:rgba(255,255,255,0.92); border:1px solid #cbd5e1; border-radius:3px; padding:1px 4px; cursor:pointer; pointer-events:auto; box-shadow:0 1px 2px rgba(0,0,0,0.08); white-space:nowrap; backdrop-filter:blur(2px);">
                    <span style="color:#2563eb; font-size:8px; line-height:1;" title="Origem Registrada">⚑</span>
                    <span style="font-size:8px; font-weight:700; color:#334155; text-transform:uppercase; letter-spacing:-0.01em;">${so.name}</span>
                    <span style="font-size:7px; font-weight:800; color:#2563eb;">(${so.count})</span>
                  </div>
                `,
                iconSize: [0, 0],
                iconAnchor: [0, 0],
                popupAnchor: [0, -10]
              })}
            >
              <Popup>
                <div className="p-1 min-w-[150px]">
                  <div className="font-black text-[10px] text-blue-600 uppercase mb-1">Origem Registrada</div>
                  <div className="font-black text-xs text-slate-900 uppercase">{so.name}</div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase mt-1 mb-2">{so.count} registros ativos</div>
                  
                  {/* Discreet Details - Show only 1 item */}
                  <div className="space-y-1 mb-3 border-t border-slate-100 pt-2">
                    {so.details.slice(0, 1).map((d, i) => (
                      <div key={i} className="flex flex-col border-b border-slate-50 pb-1 last:border-0">
                        <div className="flex items-center gap-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${d.type === 'shipment' ? 'bg-blue-500' : 'bg-amber-500'}`}></span>
                          <span className="text-[8px] font-black text-slate-600 uppercase leading-tight truncate">{d.product}</span>
                        </div>
                        <span className="text-[7px] font-bold text-slate-400 uppercase leading-tight truncate ml-2.5">Para: {d.destination}</span>
                        {d.driverTariff && (
                          <span className="text-[7px] font-black text-red-600 uppercase leading-tight truncate ml-2.5 mt-0.5">
                            Frete Motorista: {typeof d.driverTariff === 'number' ? `R$ ${d.driverTariff.toFixed(2)}` : d.driverTariff}
                          </span>
                        )}
                      </div>
                    ))}
                    {so.details.length > 1 && (
                      <div className="text-[7px] font-bold text-slate-300 italic uppercase">...e mais {so.details.length - 1} registros</div>
                    )}
                  </div>

                  <button 
                    onClick={() => handleRouteToShipment(so.name)}
                    className="w-full bg-blue-600 text-white text-[9px] font-black uppercase py-2 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
                  >
                    Roteirizar como Destino
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
          
          {originCoordsList.map((coords, index) => {
            const cityName = origins[index] || `Origem ${index + 1}`;
            return (
              <Marker 
                key={`orig-${index}`} 
                position={coords} 
                icon={L.divIcon({
                  className: 'discreet-route-flag',
                  html: `
                    <div style="display:inline-flex; align-items:center; gap:2.5px; transform:translate(-50%, -50%); background:rgba(255,255,255,0.95); border:1px solid #10b981; border-radius:3px; padding:1px 5px; cursor:pointer; pointer-events:auto; box-shadow:0 1px 3px rgba(0,0,0,0.12); white-space:nowrap;">
                      <span style="background:#10b981; color:white; font-size:7px; font-weight:900; border-radius:2px; padding:0 2.5px; line-height:1.2;">A${originCoordsList.length > 1 ? index + 1 : ''}</span>
                      <span style="font-size:8px; font-weight:700; color:#0f172a; text-transform:uppercase;">${cityName}</span>
                    </div>
                  `,
                  iconSize: [0, 0],
                  iconAnchor: [0, 0],
                  popupAnchor: [0, -10]
                })}
              >
                <Popup>
                  <div className="font-black text-xs uppercase tracking-tight p-1">
                    Origem {originCoordsList.length > 1 ? `#${index + 1}` : ''}: {cityName}
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {destCoordsList.map((coords, index) => {
            const cityName = destinations[index] || `Destino ${index + 1}`;
            return (
              <Marker 
                key={`dest-${index}`} 
                position={coords} 
                icon={L.divIcon({
                  className: 'discreet-route-flag',
                  html: `
                    <div style="display:inline-flex; align-items:center; gap:2.5px; transform:translate(-50%, -50%); background:rgba(255,255,255,0.95); border:1px solid #ef4444; border-radius:3px; padding:1px 5px; cursor:pointer; pointer-events:auto; box-shadow:0 1px 3px rgba(0,0,0,0.12); white-space:nowrap;">
                      <span style="background:#ef4444; color:white; font-size:7px; font-weight:900; border-radius:2px; padding:0 2.5px; line-height:1.2;">B${destCoordsList.length > 1 ? index + 1 : ''}</span>
                      <span style="font-size:8px; font-weight:700; color:#0f172a; text-transform:uppercase;">${cityName}</span>
                    </div>
                  `,
                  iconSize: [0, 0],
                  iconAnchor: [0, 0],
                  popupAnchor: [0, -10]
                })}
              >
                <Popup>
                  <div className="font-black text-xs uppercase tracking-tight p-1">
                    Destino {destCoordsList.length > 1 ? `#${index + 1}` : ''}: {cityName}
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {originCoordsList.length > 0 && destCoordsList.length > 0 && routePolyline.length > 0 && (
            <>
              {/* Soft outline casing for route line */}
              <Polyline 
                positions={routePolyline} 
                color="#1d4ed8" 
                weight={6}
                opacity={0.35}
                lineCap="round"
                lineJoin="round"
              />
              {/* Main Google Maps navigation blue line */}
              <Polyline 
                positions={routePolyline} 
                color="#3b82f6" 
                weight={4}
                opacity={0.9}
                lineCap="round"
                lineJoin="round"
              />
            </>
          )}

          <MapUpdater bounds={bounds} isVisible={isVisible} />
          <ZoomControls onRecenter={handleRecenter} mapLayer={mapLayer} onSelectLayer={setMapLayer} />
        </MapContainer>
      </div>
    </div>
  );
};

export default MapView;
