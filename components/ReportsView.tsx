import React, { useMemo, useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { 
  Calendar, Search, Filter, Download, User, Truck, Building2, 
  MapPin, ClipboardList, TrendingUp, Award, LayoutGrid, FileText,
  Hash, Users, Activity, Target, Weight, Globe, Loader2, Navigation, FilterX,
  Plus, Check, X, DollarSign, Scale, Percent, CheckSquare, Square, Layers, Route, ArrowRight
} from 'lucide-react';
import { MapContainer, TileLayer, Circle, useMap, Tooltip as LeafletTooltip, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Driver, Trip } from '../types';
import { geocodeCache, geocode, parseCityState } from '../services/geocodingService';

L.Icon.Default.prototype.options.imagePath = 'https://unpkg.com/leaflet@1.9.4/dist/images/';

export interface ReportsNavigateFilters {
  origin?: string;
  destination?: string;
  antt?: string;
  plate?: string;
  selectedPlates?: string[];
  driverName?: string;
  startDate?: string;
  endDate?: string;
}

interface ReportsViewProps {
  trips: Trip[];
  drivers: Driver[];
  onNavigateToTrips?: (filters: ReportsNavigateFilters) => void;
}

const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#ec4899', '#6b7280'];

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

const MAP_LAYERS = {
  google: {
    name: 'Google Ruas',
    icon: '🛣️',
    url: 'https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    attribution: '&copy; Google Maps'
  },
  positron: {
    name: 'Discreto',
    icon: '🗺️',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    subdomains: ['a', 'b', 'c', 'd'],
    attribution: '&copy; CARTO &copy; OpenStreetMap'
  },
  osm: {
    name: 'OpenStreetMap',
    icon: '🌍',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    subdomains: ['a', 'b', 'c'],
    attribution: '&copy; OpenStreetMap contributors'
  }
};

// Helper to auto-fit map to points or center on Brazil
const MapUpdater: React.FC<{ center: [number, number]; points: any[] }> = ({ center, points }) => {
  const map = useMap();
  
  useEffect(() => {
    if (points.length > 1) {
      const bounds = L.latLngBounds(points.map(p => p.pos));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 10 });
    } else if (points.length === 1) {
      map.setView(points[0].pos, 8);
    } else if (center && center[0] !== 0) {
      map.setView(center, 4);
    }
  }, [center, points, map]);

  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);
    return () => clearTimeout(timer);
  }, [map]);

  return null;
};

const ZoomControls: React.FC<{ 
  points: any[]; 
  center: [number, number];
  mapLayer: 'google' | 'positron' | 'osm';
  onSelectLayer: (l: 'google' | 'positron' | 'osm') => void;
}> = ({ points, center, mapLayer, onSelectLayer }) => {
  const map = useMap();
  
  const handleRecenter = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (points.length > 1) {
      const bounds = L.latLngBounds(points.map(p => p.pos));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 10 });
    } else if (points.length === 1) {
      map.setView(points[0].pos, 8);
    } else {
      map.setView(center[0] !== 0 ? center : [-15.7801, -47.9292], 4);
    }
  };

  return (
    <div className="absolute top-2.5 right-2.5 z-[1000] flex items-center gap-1.5 pointer-events-auto">
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
          title="Mapa Discreto / Neutro"
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
          className="bg-white/90 backdrop-blur-xs w-6 h-6 rounded-md shadow-2xs border border-slate-200/80 flex items-center justify-center text-slate-800 font-black text-xs hover:bg-slate-50 transition-all active:scale-90 cursor-pointer"
          title="Aproximar Zoom"
        >
          +
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); map.zoomOut(); }}
          className="bg-white/90 backdrop-blur-xs w-6 h-6 rounded-md shadow-2xs border border-slate-200/80 flex items-center justify-center text-slate-800 font-black text-xs hover:bg-slate-50 transition-all active:scale-90 cursor-pointer"
          title="Afastar Zoom"
        >
          -
        </button>
        <button 
          onClick={handleRecenter}
          className="bg-white/90 backdrop-blur-xs w-6 h-6 rounded-md shadow-2xs border border-slate-200/80 flex items-center justify-center text-slate-800 hover:bg-slate-50 transition-all active:scale-90 cursor-pointer"
          title="Recentralizar Cidades"
        >
          <Navigation size={10} className="text-slate-600" />
        </button>
      </div>
    </div>
  );
};

const ReportsView: React.FC<ReportsViewProps> = ({ trips, drivers, onNavigateToTrips }) => {
  const [mapLayer, setMapLayer] = useState<'google' | 'positron' | 'osm'>('google');
  const [mapFilter, setMapFilter] = useState<'all' | 'origins' | 'destinations'>('all');
  const [showRoutes, setShowRoutes] = useState<boolean>(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [anttFilter, setAnttFilter] = useState('');
  const [plateFilter, setPlateFilter] = useState('');
  const [nameFilter, setNameFilter] = useState('');
  
  // Multiple Plates Selection Modal State (strictly for plates in the filter list)
  const [selectedPlates, setSelectedPlates] = useState<string[]>([]);
  const [isPlateModalOpen, setIsPlateModalOpen] = useState(false);
  const [plateSearchText, setPlateSearchText] = useState('');

  // Helper para aceitar texto e remover qualquer caractere que não seja letra ou número
  const cleanTruckPlate = (raw: string): string => {
    if (!raw) return '';
    // Identifica placa padrão ou Mercosul caso o texto colado contenha pontuação, espaço ou prefixo (ex: "ABC-1234", "Placa: ABC 1D23")
    const plateMatch = raw.match(/([a-zA-Z]{3})\s*[-_./\s]?\s*([0-9][a-zA-Z0-9][0-9]{2})/);
    if (plateMatch) {
      return `${plateMatch[1]}${plateMatch[2]}`.toUpperCase();
    }
    // Remove qualquer caractere que não seja uma letra ou um número
    return raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 7);
  };

  const handlePlateFilterChange = (raw: string) => {
    const clean = cleanTruckPlate(raw);
    setPlateFilter(clean);
    if (selectedPlates.length > 0) {
      setSelectedPlates([]);
    }
  };

  // Filter options for select dropdowns: Extract ONLY items with trips actually performed
  const filterOptions = useMemo(() => {
    const antts = new Set<string>();
    const plates = new Set<string>();
    const names = new Set<string>();

    trips.forEach(t => {
      if (t.truckPlate && t.truckPlate.trim()) {
        plates.add(t.truckPlate.trim().toUpperCase());
      }
      if (t.driverName && t.driverName.trim()) {
        names.add(t.driverName.trim());
      }
      
      const d = drivers.find(drv => drv.truckPlate && drv.truckPlate.trim().toUpperCase() === (t.truckPlate ? t.truckPlate.trim().toUpperCase() : ''));
      if (d?.antt && d.antt.trim()) antts.add(d.antt.trim());
      if (d?.name && d.name.trim()) names.add(d.name.trim());
    });

    return {
      antts: Array.from(antts).sort(),
      plates: Array.from(plates).sort(),
      names: Array.from(names).sort()
    };
  }, [trips, drivers]);

  // List of plates strictly with trips performed, including trip count and driver details
  const availableFilterPlates = useMemo(() => {
    return filterOptions.plates.map(plate => {
      const plateTrips = trips.filter(t => t.truckPlate && t.truckPlate.trim().toUpperCase() === plate);
      const tripCount = plateTrips.length;
      const driver = drivers.find(d => d.truckPlate && d.truckPlate.trim().toUpperCase() === plate);
      const latestTrip = plateTrips[plateTrips.length - 1];
      const driverName = driver?.name || latestTrip?.driverName || '';
      return {
        plate,
        driverName,
        tripCount,
        model: driver?.trailerModel || driver?.trailerType || ''
      };
    }).sort((a, b) => b.tripCount - a.tripCount || a.plate.localeCompare(b.plate));
  }, [filterOptions.plates, drivers, trips]);

  // Filtered trips dataset
  const filteredTrips = useMemo(() => {
    return trips.filter(trip => {
      const tripDate = new Date(trip.date);
      const isWithinPeriod = (!startDate || tripDate >= new Date(startDate)) && 
                             (!endDate || tripDate <= new Date(endDate));
      
      const tripDriver = drivers.find(d => d.truckPlate === trip.truckPlate);
      
      const matchesAntt = !anttFilter || (tripDriver && tripDriver.antt === anttFilter);
      
      // If multi-plate filter is active, match any selected plate; otherwise single plateFilter
      let matchesPlate = true;
      const tPlate = trip.truckPlate ? trip.truckPlate.trim().toUpperCase() : '';
      const cleanTPlate = tPlate.replace(/[^a-zA-Z0-9]/g, '');

      if (selectedPlates.length > 0) {
        matchesPlate = !!tPlate && (
          selectedPlates.includes(tPlate) ||
          selectedPlates.some(sp => sp.replace(/[^a-zA-Z0-9]/g, '') === cleanTPlate)
        );
      } else if (plateFilter) {
        const cleanFilter = plateFilter.trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        matchesPlate = cleanTPlate.includes(cleanFilter) || tPlate.includes(plateFilter.trim().toUpperCase());
      }

      const matchesName = !nameFilter || 
        (trip.driverName && trip.driverName.toUpperCase().includes(nameFilter.toUpperCase())) || 
        (tripDriver && tripDriver.name.toUpperCase().includes(nameFilter.toUpperCase()));

      return isWithinPeriod && matchesAntt && matchesPlate && matchesName;
    });
  }, [trips, drivers, startDate, endDate, anttFilter, plateFilter, selectedPlates, nameFilter]);

  // FINANCIAL & WEIGHT TOTALS
  const financialTotals = useMemo(() => {
    let totalKg = 0;
    let totalCompanyFreight = 0;
    let totalDriverFreight = 0;
    let totalIcms = 0;

    filteredTrips.forEach(t => {
      const weight = typeof t.weight === 'number' ? t.weight : parseFloat(String(t.weight || 0).replace(',', '.'));
      const companyTariff = typeof t.companyTariff === 'number' ? t.companyTariff : parseFloat(String(t.companyTariff || 0).replace(',', '.'));
      const driverTariff = typeof t.driverTariff === 'number' ? t.driverTariff : parseFloat(String(t.driverTariff || 0).replace(',', '.'));
      const icmsRate = typeof t.icmsRate === 'number' ? t.icmsRate : parseFloat(String(t.icmsRate || 0).replace(',', '.'));

      const weightFactor = (weight || 0) / 1000;
      const gross = (companyTariff || 0) * weightFactor;
      const icms = t.deductIcms ? (gross * ((icmsRate || 0) / 100)) : 0;
      const driverCost = (driverTariff || 0) * weightFactor;

      totalKg += (weight || 0);
      totalCompanyFreight += gross;
      totalDriverFreight += driverCost;
      totalIcms += icms;
    });

    const totalWeightTn = totalKg / 1000;
    const netRevenue = totalCompanyFreight - totalIcms - totalDriverFreight;
    const marginPercentage = totalCompanyFreight > 0 ? (netRevenue / totalCompanyFreight) * 100 : 0;
    const avgTonPrice = totalWeightTn > 0 ? totalCompanyFreight / totalWeightTn : 0;

    return {
      totalWeightTn,
      totalCompanyFreight,
      totalDriverFreight,
      netRevenue,
      marginPercentage,
      avgTonPrice
    };
  }, [filteredTrips]);

  // State to store coordinates for geocoded locations (origins & destinations)
  const [geocodedLocations, setGeocodedLocations] = useState<Record<string, [number, number]>>({});
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Trigger geocoding for all filtered origins and destinations
  useEffect(() => {
    const locMap = new Map<string, { city: string, state?: string }>();

    filteredTrips.forEach(t => {
      // Origin
      let origCity = (t.origin || "").trim();
      if (origCity) {
        const upperOrig = origCity.toUpperCase();
        if (!['ORIGEM', 'DESTINO', 'CIDADE', 'COLETA', 'CARGA', 'DESCARGA'].includes(upperOrig)) {
          if (upperOrig.includes('PALMENRIAS')) origCity = origCity.replace(/Palmenrias/i, 'Palmeiras');
          let origState = (t.originState || "").trim().toUpperCase();
          const parsed = parseCityState(origCity);
          if (parsed.state && (!origState || parsed.state === origState)) {
            origCity = parsed.city;
            origState = origState || parsed.state;
          }
          const key = origState ? `${origCity.toLowerCase()}, ${origState.toLowerCase()}` : origCity.toLowerCase();
          if (!locMap.has(key)) locMap.set(key, { city: origCity, state: origState });
        }
      }

      // Destination
      let destCity = (t.destination || "").trim();
      if (destCity) {
        const upperDest = destCity.toUpperCase();
        if (!['ORIGEM', 'DESTINO', 'CIDADE', 'COLETA', 'CARGA', 'DESCARGA'].includes(upperDest)) {
          let destState = (t.destinationState || "").trim().toUpperCase();
          const parsed = parseCityState(destCity);
          if (parsed.state && (!destState || parsed.state === destState)) {
            destCity = parsed.city;
            destState = destState || parsed.state;
          }
          const key = destState ? `${destCity.toLowerCase()}, ${destState.toLowerCase()}` : destCity.toLowerCase();
          if (!locMap.has(key)) locMap.set(key, { city: destCity, state: destState });
        }
      }
    });

    if (locMap.size > 0) {
      setIsGeocoding(true);
      const resolveCoords = async () => {
        const newCoords: Record<string, [number, number]> = {};
        let changed = false;

        try {
          for (const [key, details] of locMap.entries()) {
            const normalized = key;
            const result = await geocode(details.city, true, undefined, details.state);
            
            if (result) {
              if (!geocodedLocations[normalized] || 
                  geocodedLocations[normalized][0] !== result[0] || 
                  geocodedLocations[normalized][1] !== result[1]) {
                newCoords[normalized] = result;
                changed = true;
              }
            }
          }

          if (changed) {
            setGeocodedLocations(prev => ({ ...prev, ...newCoords }));
          }
        } finally {
          setIsGeocoding(false);
        }
      };

      resolveCoords();
    }
  }, [filteredTrips]);

  // Comprehensive Mapping and Active Route Network Calculation
  const mapData = useMemo(() => {
    const cityStats: Record<string, {
      cityName: string;
      state: string;
      fullName: string;
      originTrips: number;
      destTrips: number;
      originTons: number;
      destTons: number;
      routesOut: Record<string, number>;
      routesIn: Record<string, number>;
    }> = {};

    const routePairs: Record<string, {
      fromKey: string;
      toKey: string;
      fromName: string;
      toName: string;
      count: number;
      totalTons: number;
    }> = {};

    filteredTrips.forEach(t => {
      const weight = typeof t.weight === 'number' ? t.weight : parseFloat(String(t.weight || 0).replace(',', '.'));
      const tons = (weight || 0) / 1000;

      let origCity = (t.origin || '').trim();
      let origState = (t.originState || '').trim().toUpperCase();
      let origKey = '';

      if (origCity && !['ORIGEM', 'DESTINO', 'CIDADE', 'COLETA', 'CARGA', 'DESCARGA'].includes(origCity.toUpperCase())) {
        if (origCity.toUpperCase().includes('PALMENRIAS')) origCity = origCity.replace(/Palmenrias/i, 'Palmeiras');
        const parsed = parseCityState(origCity);
        if (parsed.state && (!origState || parsed.state === origState)) {
          origCity = parsed.city;
          origState = origState || parsed.state;
        }
        origKey = origState ? `${origCity.toLowerCase()}, ${origState.toLowerCase()}` : origCity.toLowerCase();
        
        if (!cityStats[origKey]) {
          cityStats[origKey] = {
            cityName: origCity.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' '),
            state: origState,
            fullName: `${origCity.toUpperCase()}${origState ? ` - ${origState}` : ''}`,
            originTrips: 0,
            destTrips: 0,
            originTons: 0,
            destTons: 0,
            routesOut: {},
            routesIn: {}
          };
        }
        cityStats[origKey].originTrips += 1;
        cityStats[origKey].originTons += tons;
      }

      let destCity = (t.destination || '').trim();
      let destState = (t.destinationState || '').trim().toUpperCase();
      let destKey = '';

      if (destCity && !['ORIGEM', 'DESTINO', 'CIDADE', 'COLETA', 'CARGA', 'DESCARGA'].includes(destCity.toUpperCase())) {
        const parsed = parseCityState(destCity);
        if (parsed.state && (!destState || parsed.state === destState)) {
          destCity = parsed.city;
          destState = destState || parsed.state;
        }
        destKey = destState ? `${destCity.toLowerCase()}, ${destState.toLowerCase()}` : destCity.toLowerCase();

        if (!cityStats[destKey]) {
          cityStats[destKey] = {
            cityName: destCity.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' '),
            state: destState,
            fullName: `${destCity.toUpperCase()}${destState ? ` - ${destState}` : ''}`,
            originTrips: 0,
            destTrips: 0,
            originTons: 0,
            destTons: 0,
            routesOut: {},
            routesIn: {}
          };
        }
        cityStats[destKey].destTrips += 1;
        cityStats[destKey].destTons += tons;
      }

      if (origKey && destKey && origKey !== destKey) {
        cityStats[origKey].routesOut[destCity.toUpperCase()] = (cityStats[origKey].routesOut[destCity.toUpperCase()] || 0) + 1;
        cityStats[destKey].routesIn[origCity.toUpperCase()] = (cityStats[destKey].routesIn[origCity.toUpperCase()] || 0) + 1;

        const pairKey = `${origKey}-->${destKey}`;
        if (!routePairs[pairKey]) {
          routePairs[pairKey] = {
            fromKey: origKey,
            toKey: destKey,
            fromName: origCity.toUpperCase(),
            toName: destCity.toUpperCase(),
            count: 0,
            totalTons: 0
          };
        }
        routePairs[pairKey].count += 1;
        routePairs[pairKey].totalTons += tons;
      }
    });

    const points: {
      key: string;
      pos: [number, number];
      cityName: string;
      state: string;
      fullName: string;
      type: 'origin' | 'destination' | 'both';
      originTrips: number;
      destTrips: number;
      totalTrips: number;
      originTons: number;
      destTons: number;
      totalTons: number;
      routesOut: [string, number][];
      routesIn: [string, number][];
    }[] = [];

    Object.entries(cityStats).forEach(([key, stat]) => {
      const pos = geocodedLocations[key];
      if (pos) {
        const type: 'origin' | 'destination' | 'both' = 
          stat.originTrips > 0 && stat.destTrips > 0 ? 'both' :
          stat.originTrips > 0 ? 'origin' : 'destination';

        const routesOut = Object.entries(stat.routesOut).sort((a, b) => b[1] - a[1]);
        const routesIn = Object.entries(stat.routesIn).sort((a, b) => b[1] - a[1]);

        points.push({
          key,
          pos,
          cityName: stat.cityName,
          state: stat.state,
          fullName: stat.fullName,
          type,
          originTrips: stat.originTrips,
          destTrips: stat.destTrips,
          totalTrips: stat.originTrips + stat.destTrips,
          originTons: stat.originTons,
          destTons: stat.destTons,
          totalTons: stat.originTons + stat.destTons,
          routesOut,
          routesIn
        });
      }
    });

    // Active routes connecting points
    const routes: {
      fromPos: [number, number];
      toPos: [number, number];
      fromName: string;
      toName: string;
      count: number;
      totalTons: number;
    }[] = [];

    Object.values(routePairs).forEach(pair => {
      const fromPos = geocodedLocations[pair.fromKey];
      const toPos = geocodedLocations[pair.toKey];
      if (fromPos && toPos) {
        routes.push({
          fromPos,
          toPos,
          fromName: pair.fromName,
          toName: pair.toName,
          count: pair.count,
          totalTons: pair.totalTons
        });
      }
    });

    const defaultCenter: [number, number] = [-15.7801, -47.9292]; // Brasilia
    let center = defaultCenter;

    if (points.length > 0) {
      const avgLat = points.reduce((acc, p) => acc + p.pos[0], 0) / points.length;
      const avgLng = points.reduce((acc, p) => acc + p.pos[1], 0) / points.length;
      center = [avgLat, avgLng];
    }

    return {
      points,
      routes,
      center,
      totalCities: points.length,
      originCitiesCount: points.filter(p => p.type === 'origin' || p.type === 'both').length,
      destCitiesCount: points.filter(p => p.type === 'destination' || p.type === 'both').length
    };
  }, [filteredTrips, geocodedLocations]);

  const displayedPoints = useMemo(() => {
    if (mapFilter === 'origins') {
      return mapData.points.filter(p => p.type === 'origin' || p.type === 'both');
    }
    if (mapFilter === 'destinations') {
      return mapData.points.filter(p => p.type === 'destination' || p.type === 'both');
    }
    return mapData.points;
  }, [mapData.points, mapFilter]);

  // DRIVER RANKING WITH FINANCIALS (Valor da Tonelada, Frete Empresa, Frete Motorista & Rotas Origem/Destino)
  const driverRanking = useMemo(() => {
    const stats: Record<string, { 
      count: number; 
      plate: string; 
      totalKg: number; 
      totalCompanyFreight: number; 
      totalDriverFreight: number;
      routes: { origin: string; destination: string; count: number }[];
    }> = {};

    filteredTrips.forEach(t => {
      const name = t.driverName || 'Desconhecido';
      if (!stats[name]) {
        stats[name] = { 
          count: 0, 
          plate: t.truckPlate || '', 
          totalKg: 0, 
          totalCompanyFreight: 0, 
          totalDriverFreight: 0,
          routes: []
        };
      }

      const weight = typeof t.weight === 'number' ? t.weight : parseFloat(String(t.weight || 0).replace(',', '.'));
      const companyTariff = typeof t.companyTariff === 'number' ? t.companyTariff : parseFloat(String(t.companyTariff || 0).replace(',', '.'));
      const driverTariff = typeof t.driverTariff === 'number' ? t.driverTariff : parseFloat(String(t.driverTariff || 0).replace(',', '.'));

      const weightFactor = (weight || 0) / 1000;
      const gross = (companyTariff || 0) * weightFactor;
      const driverCost = (driverTariff || 0) * weightFactor;

      stats[name].count += 1;
      stats[name].totalKg += (weight || 0);
      stats[name].totalCompanyFreight += gross;
      stats[name].totalDriverFreight += driverCost;
      if (t.truckPlate) stats[name].plate = t.truckPlate;

      // Track routes (Origin ➔ Destination)
      const orig = (t.origin || '').trim().toUpperCase();
      const dest = (t.destination || '').trim().toUpperCase();
      if (orig || dest) {
        const existingRoute = stats[name].routes.find(r => r.origin === orig && r.destination === dest);
        if (existingRoute) {
          existingRoute.count += 1;
        } else {
          stats[name].routes.push({ origin: orig || 'N/I', destination: dest || 'N/I', count: 1 });
        }
      }
    });

    return Object.entries(stats)
      .map(([name, data]) => {
        const totalTons = data.totalKg / 1000;
        const avgTonPrice = totalTons > 0 ? (data.totalCompanyFreight / totalTons) : 0;
        const avgDriverTonPrice = totalTons > 0 ? (data.totalDriverFreight / totalTons) : 0;
        
        // Sort routes by trip count
        const sortedRoutes = [...data.routes].sort((a, b) => b.count - a.count);
        const topRoute = sortedRoutes[0];
        const routeDisplay = topRoute ? `${topRoute.origin} ➔ ${topRoute.destination}` : '';
        const extraRoutesCount = sortedRoutes.length > 1 ? sortedRoutes.length - 1 : 0;
        const allRoutesTooltip = sortedRoutes.map(r => `${r.origin} ➔ ${r.destination} (${r.count}x)`).join(' | ');

        return {
          name,
          count: data.count,
          plate: data.plate,
          totalTons,
          avgTonPrice,
          avgDriverTonPrice,
          totalCompanyFreight: data.totalCompanyFreight,
          totalDriverFreight: data.totalDriverFreight,
          routeDisplay,
          topRoute,
          extraRoutesCount,
          allRoutesTooltip
        };
      })
      .sort((a, b) => b.count - a.count || b.totalTons - a.totalTons)
      .slice(0, 10);
  }, [filteredTrips]);

  // Volume Trend for sparklines and recent flow chart
  const volumeTrend = useMemo(() => {
    const daily: Record<string, number> = {};
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });

    last7Days.forEach(day => daily[day] = 0);
    
    filteredTrips.forEach(t => {
      const day = t.date;
      if (daily[day] !== undefined) daily[day]++;
    });

    return Object.entries(daily).map(([day, val]) => ({ day, val }));
  }, [filteredTrips]);

  const originStats = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredTrips.forEach(t => {
      if (t.origin) counts[t.origin] = (counts[t.origin] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredTrips]);

  const destinationStats = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredTrips.forEach(t => {
      if (t.destination) counts[t.destination] = (counts[t.destination] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredTrips]);

  // Multi-Plate Selection Handlers (operating strictly on availableFilterPlates)
  const handleTogglePlate = (plate: string) => {
    const upper = plate.trim().toUpperCase();
    setSelectedPlates(prev => 
      prev.includes(upper) ? prev.filter(p => p !== upper) : [...prev, upper]
    );
  };

  const handleSelectAllPlates = () => {
    setSelectedPlates(filterOptions.plates);
  };

  const handleClearSelectedPlates = () => {
    setSelectedPlates([]);
  };

  return (
    <div className="h-[calc(100vh-4.2rem)] flex flex-col overflow-hidden bg-slate-100 text-slate-800 p-2 sm:p-2.5 space-y-2 rounded-2xl border border-slate-200 shadow-md relative">
      
      {/* 1. TOP CONTROL & FILTER BAR */}
      <div className="shrink-0 bg-white border border-slate-200/90 rounded-xl px-2 py-1.5 flex flex-nowrap items-center justify-between gap-1.5 shadow-xs overflow-x-auto custom-scrollbar">
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="bg-gradient-to-br from-red-600 to-red-700 p-1 rounded-md text-white shadow-xs">
            <Filter size={12} />
          </div>
          <div>
            <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-tight leading-none">
              Relatórios & Analytics
            </h3>
            <p className="text-[6.5px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
              Filtros e Indicadores Financeiros
            </p>
          </div>
        </div>

        <div className="flex flex-nowrap items-center gap-1 shrink-0 justify-end">
          {/* ANTT Filter */}
          <div className="relative w-[88px] sm:w-[98px]">
            <ClipboardList size={9} className="absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select 
              value={anttFilter} 
              onChange={e => setAnttFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-md pl-5 pr-2 py-0.5 text-[8px] font-bold outline-none focus:ring-1 focus:ring-red-500 cursor-pointer uppercase text-slate-800"
            >
              <option value="">ANTT: TODAS</option>
              {filterOptions.antts.map(antt => <option key={antt} value={antt}>{antt}</option>)}
            </select>
          </div>

          {/* FILTRO POR PLACA COM DIGITAÇÃO MANUAL E BOTÃO "+ PLACAS" INTEGRADO */}
          <div className="flex items-center gap-0.5 bg-slate-50 border border-slate-200 rounded-md p-0.5 shadow-2xs">
            <div className="relative w-[88px] sm:w-[102px]">
              <Truck size={9} className="absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input 
                type="text"
                placeholder={selectedPlates.length > 1 ? `${selectedPlates.length} PLACAS` : "PLACA: TODAS"}
                value={selectedPlates.length === 1 ? selectedPlates[0] : plateFilter}
                onChange={e => handlePlateFilterChange(e.target.value)}
                onPaste={e => {
                  const text = e.clipboardData.getData('text');
                  if (text) {
                    e.preventDefault();
                    handlePlateFilterChange(text);
                  }
                }}
                className="w-full bg-transparent pl-5 pr-1 py-0.5 text-[8px] font-bold outline-none uppercase text-slate-800 placeholder:text-slate-400 font-mono"
                title="Digite a placa para filtrar (aceita digitação manual sem caracteres especiais)"
              />
            </div>

            {/* "+ Placas" Button strictly opening list of plates appearing in this menu */}
            <button
              type="button"
              onClick={() => setIsPlateModalOpen(true)}
              className={`px-1.5 py-0.5 rounded text-[7.5px] font-black uppercase flex items-center gap-0.5 transition-all cursor-pointer ${
                selectedPlates.length > 0 
                  ? 'bg-red-600 text-white shadow-2xs hover:bg-red-700' 
                  : 'bg-red-50 text-red-700 hover:bg-red-600 hover:text-white border border-red-200'
              }`}
              title="Abrir lista de placas do filtro para adicionar múltiplas"
            >
              <Plus size={8} />
              <span>+ Placas</span>
              {selectedPlates.length > 0 && (
                <span className="bg-white text-red-700 px-1 py-0 rounded-full text-[6.5px] font-black leading-none ml-0.5">
                  {selectedPlates.length}
                </span>
              )}
            </button>
          </div>

          {/* Motorista Input */}
          <div className="relative w-[90px] sm:w-[100px]">
            <User size={9} className="absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input 
              type="text"
              placeholder="MOTORISTA..."
              value={nameFilter}
              onChange={e => setNameFilter(e.target.value.toUpperCase())}
              className="w-full bg-slate-50 border border-slate-200 rounded-md pl-5 pr-1 py-0.5 text-[8px] font-bold outline-none focus:ring-1 focus:ring-red-500 uppercase text-slate-800 placeholder:text-slate-400"
            />
          </div>

          {/* Data Início */}
          <div className="relative w-[95px] sm:w-[102px]">
            <Calendar size={9} className="absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input 
              type="date" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-md pl-5 pr-0.5 py-0.5 text-[8px] font-bold outline-none focus:ring-1 focus:ring-red-500 text-slate-800" 
            />
          </div>

          {/* Data Fim */}
          <div className="relative w-[95px] sm:w-[102px]">
            <Calendar size={9} className="absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input 
              type="date" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-md pl-5 pr-0.5 py-0.5 text-[8px] font-bold outline-none focus:ring-1 focus:ring-red-500 text-slate-800" 
            />
          </div>

          {/* Reset Filters button */}
          {(anttFilter || plateFilter || selectedPlates.length > 0 || nameFilter || startDate || endDate) && (
            <button
              onClick={() => {
                setAnttFilter('');
                setPlateFilter('');
                setSelectedPlates([]);
                setNameFilter('');
                setStartDate('');
                setEndDate('');
              }}
              className="px-1.5 py-0.5 rounded-md bg-red-50 border border-red-200 text-red-600 hover:bg-red-600 hover:text-white transition-all text-[7.5px] font-black uppercase flex items-center gap-0.5 cursor-pointer shrink-0"
              title="Limpar todos os filtros"
            >
              <FilterX size={9} />
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* ACTIVE PLATES TAGS (WHEN MULTIPLE PLATES ARE FILTERED) */}
      {selectedPlates.length > 0 && (
        <div className="shrink-0 bg-red-50/90 border border-red-200/90 rounded-lg px-2.5 py-1 flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
          <span className="text-[7.5px] font-black text-red-700 uppercase shrink-0">Placas Filtradas ({selectedPlates.length}):</span>
          <div className="flex items-center gap-1 flex-wrap">
            {selectedPlates.map(p => (
              <span 
                key={p} 
                className="bg-white border border-red-300 text-red-700 text-[8px] font-black px-1.5 py-0.2 rounded-md flex items-center gap-1 shadow-2xs"
              >
                {p}
                <button 
                  onClick={() => handleTogglePlate(p)}
                  className="text-red-400 hover:text-red-700 cursor-pointer"
                  title="Remover placa do filtro"
                >
                  <X size={9} />
                </button>
              </span>
            ))}
            <button 
              onClick={() => {
                setSelectedPlates([]);
                setPlateFilter('');
              }}
              className="text-[7.5px] font-bold text-red-500 hover:text-red-800 underline ml-1 cursor-pointer"
            >
              Remover todas
            </button>
          </div>
        </div>
      )}

      {/* 2. EXECUTIVE FINANCIAL & VOLUME KPIS BAR (EXACT 4 REQUESTED CARDS) */}
      <div className="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-2">
        {/* CARD 1: VALOR TOTAL DE TONELADA */}
        <div className="bg-white p-2.5 rounded-xl border border-slate-200/90 shadow-xs flex items-center justify-between hover:border-slate-300 transition-all">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="bg-amber-50 p-2 rounded-lg text-amber-600 border border-amber-100 shrink-0">
              <Scale size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest leading-none">Total de Tonelada</p>
              <h3 className="text-sm font-black text-slate-900 mt-1 leading-none truncate">
                {financialTotals.totalWeightTn.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} <span className="text-[9px] font-bold text-amber-600">TN</span>
              </h3>
              <p className="text-[6.5px] font-bold text-slate-400 mt-1 leading-none">
                {filteredTrips.length} viagens registradas
              </p>
            </div>
          </div>
          <div className="h-6 w-12 opacity-60 shrink-0 hidden sm:block">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={volumeTrend}>
                <Area type="monotone" dataKey="val" stroke="#f59e0b" fill="#fef3c7" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CARD 2: VALOR TOTAL DO FRETE EMPRESA */}
        <div className="bg-white p-2.5 rounded-xl border border-slate-200/90 shadow-xs flex items-center justify-between hover:border-slate-300 transition-all">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="bg-emerald-50 p-2 rounded-lg text-emerald-600 border border-emerald-100 shrink-0">
              <DollarSign size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest leading-none">Total Frete Empresa</p>
              <h3 className="text-sm font-black text-emerald-700 mt-1 leading-none truncate">
                {formatCurrency(financialTotals.totalCompanyFreight)}
              </h3>
              <p className="text-[6.5px] font-bold text-slate-400 mt-1 leading-none">
                Faturamento bruto
              </p>
            </div>
          </div>
          <div className="h-6 w-12 opacity-60 shrink-0 hidden sm:block">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={volumeTrend}>
                <Area type="monotone" dataKey="val" stroke="#10b981" fill="#d1fae5" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CARD 3: VALOR TOTAL FRETE MOTORISTA */}
        <div className="bg-white p-2.5 rounded-xl border border-slate-200/90 shadow-xs flex items-center justify-between hover:border-slate-300 transition-all">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="bg-blue-50 p-2 rounded-lg text-blue-600 border border-blue-100 shrink-0">
              <Truck size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest leading-none">Total Frete Motorista</p>
              <h3 className="text-sm font-black text-blue-700 mt-1 leading-none truncate">
                {formatCurrency(financialTotals.totalDriverFreight)}
              </h3>
              <p className="text-[6.5px] font-bold text-slate-400 mt-1 leading-none">
                Custo com motoristas
              </p>
            </div>
          </div>
          <div className="h-6 w-12 opacity-60 shrink-0 hidden sm:block">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={volumeTrend}>
                <Area type="monotone" dataKey="val" stroke="#3b82f6" fill="#dbeafe" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CARD 4: PORCENTUAL DE FATURAMENTO DA MÉDIA GERAL */}
        <div className="bg-white p-2.5 rounded-xl border border-slate-200/90 shadow-xs flex items-center justify-between hover:border-slate-300 transition-all">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600 border border-indigo-100 shrink-0">
              <Percent size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest leading-none">Margem Média Geral</p>
              <h3 className={`text-sm font-black mt-1 leading-none truncate ${financialTotals.marginPercentage >= 0 ? 'text-indigo-700' : 'text-red-600'}`}>
                {financialTotals.marginPercentage.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
              </h3>
              <p className="text-[6.5px] font-bold text-slate-400 mt-1 leading-none">
                R$/Tn Média: {formatCurrency(financialTotals.avgTonPrice)}
              </p>
            </div>
          </div>
          <div className="h-6 w-12 opacity-60 shrink-0 hidden sm:block">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={volumeTrend}>
                <Area type="monotone" dataKey="val" stroke="#6366f1" fill="#e0e7ff" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 3. MAIN ANALYTICS DASHBOARD */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-2 overflow-hidden">
        
        {/* COL 1: RANKING MOTORISTAS WITH R$/TON, FRETE EMPRESA & FRETE MOTORISTA */}
        <div className="lg:col-span-5 h-full bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs flex flex-col min-h-0 overflow-hidden">
          <div className="flex items-center justify-between pb-2 mb-1.5 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-1.5">
              <div className="bg-slate-900 p-1 rounded-md text-white shadow-2xs"><Award size={12} /></div>
              <div>
                <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-tight leading-none">Top 10 Motoristas</h4>
                <p className="text-[6.5px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">R$/Ton · Frete Empresa · Frete Motorista</p>
              </div>
            </div>
            <span className="text-[8px] font-black text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-md">
              Top {driverRanking.length} Motorista{driverRanking.length === 1 ? '' : 's'}
            </span>
          </div>
          
          <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-1.5 custom-scrollbar">
            {driverRanking.map((item, index) => (
              <div 
                key={item.name} 
                onClick={() => {
                  if (onNavigateToTrips) {
                    onNavigateToTrips({
                      driverName: item.name,
                      plate: item.plate || plateFilter,
                      antt: anttFilter,
                      startDate,
                      endDate
                    });
                  }
                }}
                className="p-2 bg-slate-50/90 rounded-xl border border-slate-200/80 hover:bg-red-50/40 hover:border-red-400 transition-all flex flex-col gap-1.5 shadow-2xs cursor-pointer group select-none"
                title={`Clique para ver as viagens do motorista "${item.name}" no menu Lançar Viagens`}
              >
                {/* Header: Position, Name, Route (Origem ➔ Destino), Plate & Count/Tons */}
                <div className="flex items-center justify-between relative z-10 gap-1.5 min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <div className={`w-5 h-5 rounded-lg shrink-0 flex items-center justify-center font-black text-[8px] ${
                      index === 0 ? 'bg-amber-400 text-white shadow-xs' : 
                      index === 1 ? 'bg-slate-300 text-slate-800' : 
                      index === 2 ? 'bg-amber-600 text-white' : 
                      'bg-white text-slate-500 border border-slate-200'
                    }`}>
                      {index + 1}º
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                        <span className="text-[9.5px] font-black text-slate-900 uppercase truncate leading-tight shrink-0">{item.name}</span>
                        {item.topRoute && (
                          <div 
                            className="inline-flex items-center gap-1 bg-white border border-slate-200 text-slate-700 px-1.5 py-0.2 rounded-md text-[7.5px] font-bold min-w-0 truncate max-w-[210px] shadow-2xs"
                            title={item.allRoutesTooltip || item.routeDisplay}
                          >
                            <span className="text-slate-800 uppercase truncate font-black">{item.topRoute.origin}</span>
                            <span className="text-red-500 font-black text-[8px] shrink-0">➔</span>
                            <span className="text-slate-800 uppercase truncate font-black">{item.topRoute.destination}</span>
                            {item.extraRoutesCount > 0 && (
                              <span className="text-[6.5px] text-red-600 font-black shrink-0 bg-red-50 px-1 py-0 rounded border border-red-200 ml-0.5">
                                +{item.extraRoutesCount}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <span className="text-[7.5px] font-bold text-slate-400 uppercase tracking-wider leading-none mt-0.5">{item.plate || 'SEM PLACA'}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[8.5px] font-black text-slate-900 tabular-nums bg-white border border-slate-200 px-1.5 py-0.5 rounded-md shadow-2xs">
                      {item.count} {item.count === 1 ? 'viagem' : 'viagens'} · {item.totalTons.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} TN
                    </span>
                  </div>
                </div>

                {/* Metric Badges: R$/Ton | Frete Empresa | Frete Motorista */}
                <div className="grid grid-cols-3 gap-1 pt-1 border-t border-slate-200/60">
                  <div className="bg-white border border-slate-200 p-1 rounded-md text-center shadow-2xs">
                    <div className="text-[6.5px] font-black text-slate-400 uppercase tracking-wider leading-none">R$/Ton Média</div>
                    <div className="text-[8px] font-black text-slate-800 tabular-nums mt-0.5">
                      {formatCurrency(item.avgTonPrice)}
                    </div>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 p-1 rounded-md text-center shadow-2xs">
                    <div className="text-[6.5px] font-black text-emerald-600 uppercase tracking-wider leading-none">Frete Empresa</div>
                    <div className="text-[8px] font-black text-emerald-700 tabular-nums mt-0.5">
                      {formatCurrency(item.totalCompanyFreight)}
                    </div>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 p-1 rounded-md text-center shadow-2xs">
                    <div className="text-[6.5px] font-black text-blue-600 uppercase tracking-wider leading-none">Frete Motorista</div>
                    <div className="text-[8px] font-black text-blue-700 tabular-nums mt-0.5">
                      {formatCurrency(item.totalDriverFreight)}
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-200/80 h-1 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-700 ${index === 0 ? 'bg-amber-500' : 'bg-red-600'}`} 
                    style={{ width: `${(item.count / (driverRanking[0]?.count || 1)) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            {driverRanking.length === 0 && (
              <div className="text-center py-10">
                <Users size={20} className="text-slate-200 mx-auto mb-1" />
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Sem lançamentos para os filtros selecionados</p>
              </div>
            )}
          </div>
        </div>

        {/* COL 2: EXPANDED MAP & FLOW CHART */}
        <div className="lg:col-span-4 h-full flex flex-col space-y-2 min-h-0 overflow-hidden">
          {/* MAPA EXPANDIDO NO SENTIDO VERTICAL */}
          <div className="flex-1 min-h-[330px] sm:min-h-[360px] bg-white p-2 rounded-xl border border-slate-200 shadow-xs flex flex-col relative overflow-hidden">
            <div className="w-full h-full rounded-lg overflow-hidden ring-1 ring-slate-100 relative">
              <MapContainer 
                center={mapData.center[0] !== 0 ? mapData.center : [-15.7801, -47.9292]} 
                zoom={mapData.center[0] !== 0 ? 6 : 4} 
                zoomControl={false} 
                attributionControl={false}
                preferCanvas={true}
                style={{ height: '100%', width: '100%' }}
                minZoom={3}
                maxBounds={[[-35, -75], [6, -33]]}
              >
                <TileLayer 
                  key={mapLayer}
                  attribution={MAP_LAYERS[mapLayer].attribution}
                  url={MAP_LAYERS[mapLayer].url}
                  subdomains={MAP_LAYERS[mapLayer].subdomains}
                />
                
                {/* Connecting Route Lines between Origins & Destinations */}
                {showRoutes && mapData.routes.map((r, i) => (
                  <Polyline
                    key={`route-${i}`}
                    positions={[r.fromPos, r.toPos]}
                    pathOptions={{
                      color: '#2563eb',
                      weight: 2,
                      opacity: 0.65,
                      dashArray: '5, 5'
                    }}
                  >
                    <Popup>
                      <div className="p-1 min-w-[120px] text-center">
                        <div className="font-black text-[9px] text-slate-800 uppercase">{r.fromName} ➔ {r.toName}</div>
                        <div className="text-[8px] font-bold text-slate-600 mt-0.5">{r.count} {r.count === 1 ? 'viagem' : 'viagens'} · {r.totalTons.toFixed(1)} TN</div>
                      </div>
                    </Popup>
                  </Polyline>
                ))}

                {/* City Markers: Discreet Flag Labels without Any Auxiliary Geometric Figures */}
                {displayedPoints.map((p) => {
                  const isBoth = p.type === 'both';
                  const isOrigin = p.type === 'origin';
                  const color = isBoth ? '#d97706' : isOrigin ? '#dc2626' : '#2563eb';
                  const roleLabel = isBoth ? 'Origem & Destino' : isOrigin ? 'Origem' : 'Destino';

                  return (
                    <Marker 
                      key={p.key} 
                      position={p.pos} 
                      icon={L.divIcon({
                        className: 'discreet-city-flag',
                        html: `
                          <div style="display:inline-flex; align-items:center; gap:2.5px; transform:translate(-50%, -50%); background:rgba(255,255,255,0.92); border:1px solid #cbd5e1; border-radius:3px; padding:1px 4px; cursor:pointer; pointer-events:auto; box-shadow:0 1px 2px rgba(0,0,0,0.08); white-space:nowrap; backdrop-filter:blur(2px);">
                            <span style="color:${color}; font-size:8px; line-height:1;" title="${roleLabel}">⚑</span>
                            <span style="font-size:8px; font-weight:700; color:#334155; text-transform:uppercase; letter-spacing:-0.01em;">${p.cityName}${p.state ? `-${p.state}` : ''}</span>
                            <span style="font-size:7px; font-weight:800; color:${color};">(${p.totalTrips})</span>
                          </div>
                        `,
                        iconSize: [0, 0],
                        iconAnchor: [0, 0],
                        popupAnchor: [0, -10]
                      })}
                    >
                      <Popup>
                        <div className="p-1 min-w-[150px] max-w-[220px]">
                          <div className="flex items-center justify-between gap-2 mb-1 pb-1 border-b border-slate-100">
                            <span className={`text-[7.5px] font-black uppercase px-1.5 py-0.2 rounded-md ${
                              isBoth ? 'bg-amber-100 text-amber-800' : isOrigin ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {roleLabel}
                            </span>
                            <span className="text-[7.5px] font-bold text-slate-400 uppercase">{p.state}</span>
                          </div>

                          <div className="font-black text-xs text-slate-900 uppercase leading-tight mb-1.5">
                            {p.fullName}
                          </div>

                          <div className="grid grid-cols-2 gap-1 mb-2 text-center">
                            <div className="bg-slate-50 p-1 rounded-md border border-slate-100">
                              <span className="text-[6.5px] font-bold text-slate-400 uppercase block">Total Viagens</span>
                              <span className="text-[9px] font-black text-slate-900">{p.totalTrips}</span>
                            </div>
                            <div className="bg-slate-50 p-1 rounded-md border border-slate-100">
                              <span className="text-[6.5px] font-bold text-slate-400 uppercase block">Volume Total</span>
                              <span className="text-[9px] font-black text-slate-900">{p.totalTons.toFixed(1)} TN</span>
                            </div>
                          </div>

                          {p.routesOut.length > 0 && (
                            <div className="border-t border-slate-100 pt-1 mb-1">
                              <span className="text-[7px] font-black text-red-600 uppercase block mb-0.5">Destinos Atendidos:</span>
                              <div className="space-y-0.5 max-h-[60px] overflow-y-auto custom-scrollbar">
                                {p.routesOut.slice(0, 3).map(([dest, cnt]) => (
                                  <div key={dest} className="flex justify-between text-[7px] text-slate-600 font-bold">
                                    <span className="truncate">➔ {dest}</span>
                                    <span className="text-slate-900 font-black">{cnt}x</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {p.routesIn.length > 0 && (
                            <div className="border-t border-slate-100 pt-1">
                              <span className="text-[7px] font-black text-blue-600 uppercase block mb-0.5">Origens Recebidas:</span>
                              <div className="space-y-0.5 max-h-[60px] overflow-y-auto custom-scrollbar">
                                {p.routesIn.slice(0, 3).map(([orig, cnt]) => (
                                  <div key={orig} className="flex justify-between text-[7px] text-slate-600 font-bold">
                                    <span className="truncate">➔ {orig}</span>
                                    <span className="text-slate-900 font-black">{cnt}x</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}

                <MapUpdater center={mapData.center} points={displayedPoints} />
                <ZoomControls points={displayedPoints} center={mapData.center} mapLayer={mapLayer} onSelectLayer={setMapLayer} />
              </MapContainer>

              {/* Floating Top Bar on Map: Filter Pills & Route Toggle */}
              <div className="absolute top-2.5 left-2.5 z-[1000] flex flex-wrap items-center gap-1.5 pointer-events-auto max-w-[calc(100%-150px)]">
                {/* Filter Pills */}
                <div className="bg-white/95 backdrop-blur-xs p-0.5 rounded-lg border border-slate-200/90 shadow-2xs flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => setMapFilter('all')}
                    className={`px-2 py-0.5 rounded text-[7.5px] font-black uppercase transition-all cursor-pointer ${
                      mapFilter === 'all' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                    title="Ver todas as cidades mapeadas"
                  >
                    Todas ({mapData.totalCities})
                  </button>
                  <button
                    type="button"
                    onClick={() => setMapFilter('origins')}
                    className={`px-2 py-0.5 rounded text-[7.5px] font-black uppercase transition-all cursor-pointer ${
                      mapFilter === 'origins' ? 'bg-red-600 text-white shadow-2xs' : 'text-slate-600 hover:text-red-700 hover:bg-red-50'
                    }`}
                    title="Filtrar apenas cidades de origem"
                  >
                    Origens ({mapData.originCitiesCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setMapFilter('destinations')}
                    className={`px-2 py-0.5 rounded text-[7.5px] font-black uppercase transition-all cursor-pointer ${
                      mapFilter === 'destinations' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:text-blue-700 hover:bg-blue-50'
                    }`}
                    title="Filtrar apenas cidades de destino"
                  >
                    Destinos ({mapData.destCitiesCount})
                  </button>
                </div>

                {/* Route Toggle */}
                {mapData.routes.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowRoutes(!showRoutes)}
                    className={`bg-white/95 backdrop-blur-xs px-2 py-0.5 rounded-lg border border-slate-200/90 shadow-2xs text-[7.5px] font-black uppercase flex items-center gap-1 transition-all cursor-pointer ${
                      showRoutes ? 'text-blue-600 border-blue-300 bg-blue-50/70 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Exibir/Ocultar rotas entre cidades"
                  >
                    <Route size={10} className={showRoutes ? 'text-blue-600' : 'text-slate-400'} />
                    <span>Rotas ({mapData.routes.length})</span>
                  </button>
                )}

                {/* Syncing indicator */}
                {isGeocoding && (
                  <div className="bg-white/95 backdrop-blur-xs px-2 py-0.5 rounded-lg border border-slate-200/90 shadow-2xs flex items-center gap-1 text-[7px] font-black text-slate-600 uppercase">
                    <Loader2 size={10} className="text-red-600 animate-spin" />
                    <span>Mapeando cidades...</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RECENT FLOW CHART */}
          <div className="h-[120px] shrink-0 bg-white p-2 rounded-xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-1 shrink-0">
              <div className="flex items-center gap-1.5">
                <div className="bg-slate-900 p-1 rounded-md text-white"><TrendingUp size={12} /></div>
                <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-tight">Fluxo de Viagens Recentes (Últimos 7 dias)</h4>
              </div>
            </div>
            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={volumeTrend} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 7, fill: '#94a3b8' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 7, fill: '#94a3b8' }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', fontSize: '9px', fontWeight: 'bold' }} />
                  <Area type="monotone" dataKey="val" stroke="#ef4444" fillOpacity={1} fill="url(#colorVal)" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* COL 3: TODAS AS ORIGENS & TODOS OS DESTINOS */}
        <div className="lg:col-span-3 h-full flex flex-col space-y-2 min-h-0 overflow-hidden">
          
          {/* TODAS AS ORIGENS */}
          <div className="flex-1 min-h-0 bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
            <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-1.5">
                <div className="bg-red-50 p-1 rounded-md text-red-600"><MapPin size={12} /></div>
                <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-tight">Todas as Origens</h4>
              </div>
              <span className="text-[8px] font-black text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.2 rounded-md">
                {originStats.length} Cidades
              </span>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-1 p-0.5">
              {originStats.map((item, i) => (
                <div 
                  key={item.name} 
                  onClick={() => {
                    if (onNavigateToTrips) {
                      onNavigateToTrips({
                        origin: item.name,
                        antt: anttFilter,
                        plate: plateFilter,
                        selectedPlates: selectedPlates,
                        driverName: nameFilter,
                        startDate: startDate,
                        endDate: endDate
                      });
                    }
                  }}
                  className="flex items-center justify-between p-1.5 bg-slate-50 border border-slate-200/80 rounded-lg hover:border-red-400 hover:bg-red-50/40 hover:shadow-xs transition-all text-[8.5px] cursor-pointer group select-none"
                  title={`Clique para ver as viagens com origem "${item.name}" no menu Lançar Viagens (respeitando os filtros ativos)`}
                >
                  <div className="flex items-center gap-1.5 min-w-0 pr-1">
                    <span className="w-2 h-2 rounded-full shrink-0 group-hover:scale-125 transition-transform" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="font-black text-slate-900 uppercase leading-tight truncate group-hover:text-red-700 transition-colors">
                      {item.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="font-black text-red-700 bg-red-50 border border-red-200 group-hover:bg-red-600 group-hover:text-white transition-colors text-[7.5px] px-1.5 py-0.2 rounded-md">
                      {item.value} {item.value === 1 ? 'viagem' : 'viagens'}
                    </span>
                    <ArrowRight size={10} className="text-red-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </div>
                </div>
              ))}
              {originStats.length === 0 && (
                <div className="text-center py-6 text-slate-400 text-[8px] font-bold uppercase">
                  Nenhuma origem registrada
                </div>
              )}
            </div>
          </div>

          {/* TODOS OS DESTINOS */}
          <div className="flex-1 min-h-0 bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
            <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-1.5">
                <div className="bg-indigo-50 p-1 rounded-md text-indigo-600"><Target size={12} /></div>
                <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-tight">Todos os Destinos</h4>
              </div>
              <span className="text-[8px] font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded-md">
                {destinationStats.length} Cidades
              </span>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-1 p-0.5">
              {destinationStats.map((item, i) => (
                <div 
                  key={item.name} 
                  onClick={() => {
                    if (onNavigateToTrips) {
                      onNavigateToTrips({
                        destination: item.name,
                        antt: anttFilter,
                        plate: plateFilter,
                        selectedPlates: selectedPlates,
                        driverName: nameFilter,
                        startDate: startDate,
                        endDate: endDate
                      });
                    }
                  }}
                  className="flex items-center justify-between p-1.5 bg-slate-50 border border-slate-200/80 rounded-lg hover:border-indigo-400 hover:bg-indigo-50/40 hover:shadow-xs transition-all text-[8.5px] cursor-pointer group select-none"
                  title={`Clique para ver as viagens com destino "${item.name}" no menu Lançar Viagens (respeitando os filtros ativos)`}
                >
                  <div className="flex items-center gap-1.5 min-w-0 pr-1">
                    <span className="w-2 h-2 rounded-full shrink-0 group-hover:scale-125 transition-transform" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="font-black text-slate-900 uppercase leading-tight truncate group-hover:text-indigo-700 transition-colors">
                      {item.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="font-black text-indigo-700 bg-indigo-50 border border-indigo-200 group-hover:bg-indigo-600 group-hover:text-white transition-colors text-[7.5px] px-1.5 py-0.2 rounded-md">
                      {item.value} {item.value === 1 ? 'viagem' : 'viagens'}
                    </span>
                    <ArrowRight size={10} className="text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </div>
                </div>
              ))}
              {destinationStats.length === 0 && (
                <div className="text-center py-6 text-slate-400 text-[8px] font-bold uppercase">
                  Nenhum destino registrado
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* 4. MODAL: ADICIONAR / FILTRAR PLACAS QUE APARECEM NA LISTA DE FILTRO */}
      {isPlateModalOpen && (
        <div className="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="bg-red-600 p-1.5 rounded-lg text-white">
                  <Truck size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-tight">Adicionar Placas com Viagens</h3>
                  <p className="text-[8px] text-slate-300 font-bold uppercase tracking-wider">
                    Mostrando apenas placas com viagens realizadas no sistema
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsPlateModalOpen(false)}
                className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-3.5 space-y-2.5 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
              {/* Search in existing filter plates */}
              <div className="flex items-center justify-between gap-2">
                <div className="relative flex-1">
                  <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={plateSearchText}
                    onChange={e => setPlateSearchText(e.target.value.toUpperCase())}
                    placeholder="Filtrar por placa ou motorista..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-7 pr-3 py-1.5 text-[9px] font-bold uppercase outline-none focus:ring-1 focus:ring-red-500 text-slate-800"
                  />
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={handleSelectAllPlates}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[8px] font-black uppercase transition-all cursor-pointer"
                  >
                    Marcar Todas
                  </button>
                  <button
                    type="button"
                    onClick={handleClearSelectedPlates}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[8px] font-black uppercase transition-all cursor-pointer"
                  >
                    Limpar
                  </button>
                </div>
              </div>

              {/* Plates List with Checkboxes (STRICTLY FROM availableFilterPlates) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-[42vh] overflow-y-auto custom-scrollbar p-0.5">
                {availableFilterPlates
                  .filter(p => !plateSearchText || p.plate.includes(plateSearchText) || (p.driverName && p.driverName.toUpperCase().includes(plateSearchText)))
                  .map(p => {
                    const isSelected = selectedPlates.includes(p.plate);
                    return (
                      <div
                        key={p.plate}
                        onClick={() => handleTogglePlate(p.plate)}
                        className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-1.5 select-none ${
                          isSelected 
                            ? 'bg-red-50 border-red-400 shadow-2xs' 
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                        }`}
                      >
                        <div className="min-w-0 flex flex-col">
                          <div className="flex items-center gap-1">
                            <span className={`text-[10px] font-black uppercase leading-tight ${isSelected ? 'text-red-700' : 'text-slate-900'}`}>
                              {p.plate}
                            </span>
                            <span className="text-[6.5px] font-black px-1 py-0.2 rounded bg-slate-200/80 text-slate-700">
                              {p.tripCount} {p.tripCount === 1 ? 'vg' : 'vgs'}
                            </span>
                          </div>
                          {p.driverName ? (
                            <span className="text-[7px] font-bold text-slate-400 uppercase truncate mt-0.5">
                              {p.driverName}
                            </span>
                          ) : (
                            <span className="text-[6.5px] font-semibold text-slate-400 uppercase tracking-tight mt-0.5">
                              {p.tripCount} viagens
                            </span>
                          )}
                        </div>
                        <div className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-red-600 text-white' : 'border border-slate-300 bg-white text-transparent'
                        }`}>
                          <Check size={10} />
                        </div>
                      </div>
                    );
                  })}
                {availableFilterPlates.length === 0 && (
                  <div className="col-span-full text-center py-6 text-slate-400 text-[9px] font-bold uppercase">
                    Nenhuma placa disponível no sistema
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <span className="text-[9px] font-black text-slate-600 uppercase">
                {selectedPlates.length} de {availableFilterPlates.length} placa(s) selecionada(s)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPlateModalOpen(false)}
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  Aplicar aos Relatórios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ReportsView;
