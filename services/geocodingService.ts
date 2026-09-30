
import { GoogleGenAI } from "@google/genai";

// Persistent cache using localStorage
const CACHE_KEY = 'transpanorama_geocoding_cache_v2';
const ROUTE_CACHE_KEY = 'transpanorama_route_cache';

const UF_MAP: Record<string, string> = {
  'AC': 'Acre', 'AL': 'Alagoas', 'AP': 'Amapá', 'AM': 'Amazonas', 'BA': 'Bahia',
  'CE': 'Ceará', 'DF': 'Distrito Federal', 'ES': 'Espírito Santo', 'GO': 'Goiás',
  'MA': 'Maranhão', 'MT': 'Mato Grosso', 'MS': 'Mato Grosso do Sul', 'MG': 'Minas Gerais',
  'PA': 'Pará', 'PB': 'Paraíba', 'PR': 'Paraná', 'PE': 'Pernambuco', 'PI': 'Piauí',
  'RJ': 'Rio de Janeiro', 'RN': 'Rio Grande do Norte', 'RS': 'Rio Grande do Sul',
  'RO': 'Rondônia', 'RR': 'Roraima', 'SC': 'Santa Catarina', 'SP': 'São Paulo',
  'SE': 'Sergipe', 'TO': 'Tocantins'
};

const getInitialCache = (): Record<string, [number, number]> => {
  const defaultCache: Record<string, [number, number]> = {
    'lins, sp': [-21.6714, -49.7433],
    'lins sp': [-21.6714, -49.7433],
    'lins': [-21.6714, -49.7433],
    'maringá, pr': [-23.4209, -51.9331],
    'maringá': [-23.4209, -51.9331],
    'curitiba, pr': [-25.4290, -49.2671],
    'curitiba': [-25.4290, -49.2671],
    'são paulo, sp': [-23.5505, -46.6333],
    'são paulo': [-23.5505, -46.6333],
    'osvaldo cruz, sp': [-21.7972, -50.8806],
    'osvaldo cruz sp': [-21.7972, -50.8806],
    'osvaldo cruz': [-21.7972, -50.8806],
    'são miguel do iguaçu, pr': [-25.3482, -54.2378],
    'são miguel do iguaçu pr': [-25.3482, -54.2378],
    'são miguel do iguaçu': [-25.3482, -54.2378],
    'são miguel, pr': [-25.3482, -54.2378],
    'são miguel pr': [-25.3482, -54.2378],
  };

  try {
    const stored = localStorage.getItem(CACHE_KEY);
    if (stored) {
      return { ...defaultCache, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.warn('Failed to load geocoding cache from localStorage', e);
  }
  return defaultCache;
};

const getInitialRouteCache = (): Record<string, { polyline: [number, number][], distance: number }> => {
  try {
    const stored = localStorage.getItem(ROUTE_CACHE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn('Failed to load route cache from localStorage', e);
  }
  return {};
};

export const geocodeCache = getInitialCache();
export const routeCache = getInitialRouteCache();

const saveCache = () => {
  try {
    // Limit cache size to 200 entries to save space
    const keys = Object.keys(geocodeCache);
    if (keys.length > 200) {
      const keysToKeep = keys.slice(-200);
      const newCache: Record<string, [number, number]> = {};
      keysToKeep.forEach(k => { newCache[k] = geocodeCache[k]; });
      localStorage.setItem(CACHE_KEY, JSON.stringify(newCache));
    } else {
      localStorage.setItem(CACHE_KEY, JSON.stringify(geocodeCache));
    }
  } catch (e) {
    console.warn('Failed to save geocoding cache to localStorage', e);
  }
};

export const saveRouteCache = () => {
  try {
    // Limit route cache significantly as polylines are heavy (limit to 50)
    const keys = Object.keys(routeCache);
    if (keys.length > 50) {
      const keysToKeep = keys.slice(-50);
      const newCache: Record<string, { polyline: [number, number][], distance: number }> = {};
      keysToKeep.forEach(k => { newCache[k] = routeCache[k]; });
      localStorage.setItem(ROUTE_CACHE_KEY, JSON.stringify(newCache));
    } else {
      localStorage.setItem(ROUTE_CACHE_KEY, JSON.stringify(routeCache));
    }
  } catch (e) {
    console.warn('Failed to save route cache to localStorage', e);
  }
};

export const getRoute = async (oCoords: [number, number], dCoords: [number, number], signal?: AbortSignal): Promise<{ polyline: [number, number][], distance: number } | null> => {
  const routeKey = `${oCoords.join(',')}_${dCoords.join(',')}`;
  if (routeCache[routeKey]) return routeCache[routeKey];

  try {
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${oCoords[1]},${oCoords[0]};${dCoords[1]},${dCoords[0]}?overview=full&geometries=geojson`;
    const response = await fetch(osrmUrl, { signal });
    if (response.ok) {
      const data = await response.json();
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const coordinates = route.geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]] as [number, number]);
        const roadDist = route.distance / 1000;
        
        const result = { polyline: coordinates, distance: roadDist };
        routeCache[routeKey] = result;
        saveRouteCache();
        return result;
      }
    }
  } catch (err: any) {
    if (err.name === 'AbortError') throw err;
    console.warn("OSRM routing failed:", err);
  }
  return null;
};

// Global rate limiter for Nominatim to respect 1 req/sec policy
let lastRequestTime = 0;
const MIN_REQUEST_DELAY = 1100;

const rateLimit = async (priority = false) => {
  const now = Date.now();
  const timeSinceLast = now - lastRequestTime;
  
  // If high priority, we still respect the limit but we don't let 
  // background tasks block the immediate next available slot
  const delay = priority ? (timeSinceLast < 500 ? 500 : 0) : MIN_REQUEST_DELAY;
  
  if (timeSinceLast < delay) {
    await new Promise(resolve => setTimeout(resolve, delay - timeSinceLast));
  }
  lastRequestTime = Date.now();
};

export const geocode = async (city: string, useAiFallback = true, signal?: AbortSignal, state?: string, isPriority = false): Promise<[number, number] | null> => {
  // Extract state from city string if not explicitly provided
  let cleanCity = (city || '').trim();
  let cleanState = (state || '').trim().toUpperCase();
  
  if (!cleanState) {
    const parsed = parseCityState(cleanCity);
    cleanCity = parsed.city;
    cleanState = parsed.state;
  } else {
    const parsed = parseCityState(cleanCity);
    if (parsed.state === cleanState) {
      cleanCity = parsed.city;
    }
  }

  const normalizedCity = cleanCity.toLowerCase().trim();
  const normalizedState = cleanState.toLowerCase().trim();
  const cacheKey = normalizedState ? `${normalizedCity}, ${normalizedState}` : normalizedCity;
  
  if (geocodeCache[cacheKey]) return geocodeCache[cacheKey];
  if (geocodeCache[normalizedCity] && !normalizedState) return geocodeCache[normalizedCity];

  if (signal?.aborted) return null;

  let query = cleanCity;
  const fullStateName = cleanState ? UF_MAP[cleanState.toUpperCase()] : '';
  
  if (cleanState && !cleanCity.toLowerCase().includes(cleanState.toLowerCase())) {
    query = `${cleanCity}, ${cleanState}`;
  }
  
  if (!query.toLowerCase().trim().endsWith('brasil')) {
    query = `${query}, Brasil`;
  }

  // Use Structured Data for Nominatim
  const NominatimSearch = async () => {
    try {
      await rateLimit(isPriority);
      if (signal?.aborted) return null;

      let url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br`;
      if (cleanState) {
        const stateQuery = fullStateName || cleanState;
        url += `&city=${encodeURIComponent(cleanCity)}&state=${encodeURIComponent(stateQuery)}`;
      } else {
        url += `&q=${encodeURIComponent(query)}`;
      }

      const response = await fetch(url, {
        signal: signal || AbortSignal.timeout(5000), // 5s timeout
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'MySytemApp/1.5'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          const coords: [number, number] = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
          geocodeCache[cacheKey] = coords;
          saveCache();
          return coords;
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError' || err.name === 'TimeoutError') throw err;
      console.warn(`Nominatim geocoding failed for ${query}:`, err);
    }
    return null;
  };

  const nominatimResult = await NominatimSearch();
  if (nominatimResult) return nominatimResult;

  if (!useAiFallback || signal?.aborted) return null;

  // AI Fallback
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({ 
      model: "gemini-3-flash-preview",
      contents: `Retorne apenas as coordenadas geográficas (latitude e longitude) para a cidade: "${query}". Responda estritamente no formato JSON: {"lat": number, "lng": number}.`,
      config: { responseMimeType: "application/json" }
    });

    if (response && response.text) {
      const data = JSON.parse(response.text.trim());
      if (data.lat && data.lng) {
        const coords: [number, number] = [data.lat, data.lng];
        geocodeCache[cacheKey] = coords;
        saveCache();
        return coords;
      }
    }
  } catch (aiErr) {
    console.warn("AI geocoding fallback failed:", aiErr);
  }

  return null;
};

export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Helper to extract city and state from strings like "City, UF", "City - UF", "City/UF" or "City UF"
export const parseCityState = (input: string) => {
  let trimmed = (input || '').trim().replace(/\s+/g, ' ');
  if (!trimmed) return { city: '', state: '' };
  
  const upper = trimmed.toUpperCase();
  // Filter out generic placeholders
  if (['ORIGEM', 'DESTINO', 'CIDADE', 'CARGA', 'DESCARGA', 'COLETA'].includes(upper)) {
    return { city: '', state: '' };
  }

  // Common typo fix
  if (upper.includes('PALMENRIAS')) {
    trimmed = trimmed.replace(/Palmenrias/i, 'Palmeiras');
  }

  // Force SP for Santa Cruz das Palmeiras
  if (trimmed.toUpperCase().includes('SANTA CRUZ DAS PALMEIRAS')) {
    const match = trimmed.match(/^(.+?)(?:,\s*|\s+-\s*|\s*\/\s*|\s+)([A-Z]{2})$/i);
    // If it already has a state, we might want to respect it UNLESS it's wrong, 
    // but the user says it's ALWAYS in SP in this system context.
    if (match) {
      return {
        city: match[1].trim(),
        state: 'SP'
      };
    }
    return {
      city: trimmed.replace(/\s+[A-Z]{2}$/i, '').trim(),
      state: 'SP'
    };
  }

  // Match "City, UF", "City - UF", "City/UF" or "City UF" where UF is 2 letters at the end
  const match = trimmed.match(/^(.+?)(?:,\s*|\s+-\s*|\s*\/\s*|\s+)([A-Z]{2})$/i);
  if (match) {
    return {
      city: match[1].trim(),
      state: match[2].toUpperCase().trim()
    };
  }
  return {
    city: trimmed,
    state: ''
  };
};
