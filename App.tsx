
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  Users, Truck, PlusCircle, FileSpreadsheet, Search, LayoutDashboard,
  LogOut, Bell, ArrowRight, TrendingUp, MapPin, Filter, RefreshCw,
  X, CheckCircle2, Info, Scale, DollarSign, Map as MapIcon, Hash, Check, Edit2, Pencil,
  Calendar, ClipboardList, ClipboardCheck, FileText, Download, Upload, Database,
  Clock as ClockIcon, Trophy, Package, Building2,
  ChevronRight, PieChart, BarChart3, UserCheck, CopyX, FileWarning,
  FilterX, Save, RotateCcw, AlertTriangle, Medal, CreditCard, Wallet, Banknote,
  Navigation,
  Globe,
  Cloud,
  CloudOff,
  ListOrdered,
  Maximize,
  Minimize,
  Briefcase,
  Layers,
  Award,
  Zap,
  Ticket,
  Activity,
  User,
  Fingerprint,
  ChevronDown,
  StickyNote,
  Undo2,
  Trash2,
  UserMinus,
  Phone,
  Printer,
  Loader2
} from 'lucide-react';
import { Driver, Freight, Trip, ViewState, Reminder, ThirdPartyFreight, Shipment, Note, OperationalUnit } from './types';
import * as XLSX from 'xlsx';
import { parseCityState, geocode } from './services/geocodingService';
import DriverList from './components/DriverList';
import DriverFormModal from './components/DriverFormModal';
import ExcelImportModal from './components/ExcelImportModal';
import FreightList from './components/FreightList';
import FreightImportModal from './components/FreightImportModal';
import FreightFormModal from './components/FreightFormModal';
import TripList from './components/TripList';
import TripImportModal from './components/TripImportModal';
import TripFormModal from './components/TripFormModal';
import LoadingOrderView from './components/LoadingOrderView';
import OperationalUnitModal from './components/OperationalUnitModal';
import ReminderView from './components/ReminderView';
import ReminderFormModal from './components/ReminderFormModal';
import ShipmentView from './components/ShipmentView';
import MarketView from './components/MarketView';
import ThirdPartyFreightList from './components/ThirdPartyFreightList';
import ThirdPartyFreightFormModal from './components/ThirdPartyFreightFormModal';
import ReportsView, { ReportsNavigateFilters } from './components/ReportsView';
import NotesView from './components/NotesView';
import NoteFormModal from './components/NoteFormModal';

import MapView from './components/MapView';

import { 
  auth, 
  subscribeToUserCollection, 
  saveUserDocument, 
  deleteUserDocument, 
  deleteAllUserDocuments,
  batchSaveCollection,
  isUserDatabaseEmpty,
  subscribeToDriversPage,
  loadDriversPage,
  subscribeToTripsPage,
  loadTripsPage,
  getTripsAggregate,
  countUserCollection
} from './lib/firebase';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { AuthModal } from './components/AuthModal';
import { resolveTripServiceTaker, isInvalidTakerName } from './services/takerResolver';

const DigitalClock: React.FC = () => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="flex flex-col items-end text-white/90 select-none">
      <div className="flex items-center gap-2 font-black text-xl tracking-tighter leading-none">
        <ClockIcon size={16} className="text-red-400" />
        {time.toLocaleTimeString('pt-BR')}
      </div>
      <div className="text-[9px] font-bold uppercase tracking-widest text-white/50 mt-1">
        {time.toLocaleDateString('pt-BR', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');

  // Keep a ref of the user so callbacks can access it without triggering recreation
  const userRef = useRef<FirebaseUser | null>(null);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Helper for generating unique IDs safely
  const generateId = useCallback(() => {
    try {
      return crypto.randomUUID();
    } catch (e) {
      return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
    }
  }, []);

  const [notification, setNotification] = useState<{message: string, type: 'success' | 'info'} | null>(null);

  const showNotification = useCallback((message: string, type: 'success' | 'info' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  // Helper for safe localStorage access
  const safeSetItem = useCallback((key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e: any) {
      if (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014) {
        console.error(`Storage quota exceeded for key: ${key}`, e);
        
        // If it's trips, we can try to "auto-repair" aggressively
        if (key === 'tp_system_trips') {
          try {
            const data: Trip[] = JSON.parse(value);
            
            // Level 1: Strip attachments from trips older than 1 month (more aggressive than 3)
            const oneMonthAgo = new Date();
            oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
            
            const repairedData1 = data.map(t => {
              const tripDate = new Date(t.date || t.createdAt);
              if (tripDate < oneMonthAgo && (t as any).attachments && (t as any).attachments.length > 0) {
                const { attachments, ...rest } = t as any;
                return rest as Trip;
              }
              return t;
            });
            
            try {
              const val1 = JSON.stringify(repairedData1);
              localStorage.setItem(key, val1);
              setTrips(repairedData1);
              showNotification("LIMPEZA AUTOMÁTICA: Anexos com +1 mês removidos para liberar espaço.", "info");
              return true;
            } catch (e1) {
              // Level 2: Strip ALL attachments from ALL trips
              const repairedData2 = data.map(t => {
                const { attachments, ...rest } = t as any;
                return rest as Trip;
              });
              try {
                const val2 = JSON.stringify(repairedData2);
                localStorage.setItem(key, val2);
                setTrips(repairedData2);
                showNotification("LIMPEZA CRÍTICA: TODOS os anexos foram removidos para salvar os dados.", "info");
                return true;
              } catch (e2) {
                // Level 3: Keep only the last 300 trips
                const repairedData3 = data.slice(0, 300);
                try {
                  const val3 = JSON.stringify(repairedData3);
                  localStorage.setItem(key, val3);
                  setTrips(repairedData3);
                  showNotification("LIMPEZA DE EMERGÊNCIA: Viagens antigas removidas por falta de espaço.", "info");
                  return true;
                } catch (e3) {
                  console.error("Critical storage failure even after level 3 repair", e3);
                }
              }
            }
          } catch (repairErr) {
            console.error("Failed to parse data for repair", repairErr);
          }
        }

        showNotification("ERRO DE ARMAZENAMENTO! Faça backup e limpe dados no menu Banco de Dados. O navegador está cheio.", "info");
      }
      return false;
    }
  }, [showNotification]);

  const [drivers, setDrivers] = useState<Driver[]>(() => {
    try {
      const val = localStorage.getItem('tp_system_drivers');
      return val && Array.isArray(JSON.parse(val)) ? JSON.parse(val) : [];
    } catch (e) {
      return [];
    }
  });
  const [freights, setFreights] = useState<Freight[]>(() => {
    try {
      const val = localStorage.getItem('tp_system_freights');
      return val && Array.isArray(JSON.parse(val)) ? JSON.parse(val) : [];
    } catch (e) {
      return [];
    }
  });
  const [thirdPartyFreights, setThirdPartyFreights] = useState<ThirdPartyFreight[]>(() => {
    try {
      const val = localStorage.getItem('tp_system_third_party');
      return val && Array.isArray(JSON.parse(val)) ? JSON.parse(val) : [];
    } catch (e) {
      return [];
    }
  });
  const [trips, setTrips] = useState<Trip[]>(() => {
    try {
      const val = localStorage.getItem('tp_system_trips');
      if (!val) return [];
      const parsed = JSON.parse(val);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((trip: Trip) => {
        if (!trip) return null;
        let updatedTrip = { ...trip };
        if ((updatedTrip as any).attachments) {
          delete (updatedTrip as any).attachments;
        }
        const type = trip.paymentType || '';
        if (type.toUpperCase() === 'CF') {
          updatedTrip.paymentType = 'Carta Frete';
        }
        if (trip.status === 'Finalizado' || trip.sdFlag) {
          updatedTrip.status = 'Finalizado';
          updatedTrip.sdFlag = true;
        } else if (trip.status === 'Concluída' as any || trip.status === 'Carregado' as any) {
          updatedTrip.status = 'Carregado';
        }
        return updatedTrip;
      }).filter(Boolean) as Trip[];
    } catch (e) {
      return [];
    }
  });
  const [tripsHistory, setTripsHistory] = useState<Trip[][]>([]);
  const [reminders, setReminders] = useState<Reminder[]>(() => {
    try {
      const val = localStorage.getItem('tp_system_reminders');
      return val && Array.isArray(JSON.parse(val)) ? JSON.parse(val) : [];
    } catch (e) {
      return [];
    }
  });
  const [shipments, setShipments] = useState<Shipment[]>(() => {
    try {
      const val = localStorage.getItem('tp_system_shipments');
      return val && Array.isArray(JSON.parse(val)) ? JSON.parse(val) : [];
    } catch (e) {
      return [];
    }
  });
  const [notes, setNotes] = useState<Note[]>(() => {
    try {
      const val = localStorage.getItem('tp_system_notes');
      return val && Array.isArray(JSON.parse(val)) ? JSON.parse(val) : [];
    } catch (e) {
      return [];
    }
  });
  const [companyName, setCompanyName] = useState<string>(() => {
    try {
      return localStorage.getItem('tp_system_company_name') || 'MY SYSTEM';
    } catch (e) {
      return 'MY SYSTEM';
    }
  });
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [operationalUnits, setOperationalUnits] = useState<OperationalUnit[]>(() => {
    try {
      const saved = localStorage.getItem('tp_system_operational_units');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    const legacyCnpj = (typeof window !== 'undefined' && localStorage.getItem('tp_system_company_cnpj')) || '29.543.880/0001-24';
    const legacyName = (typeof window !== 'undefined' && localStorage.getItem('tp_system_company_name')) || 'MY SYSTEM';
    return [
      { 
        id: 'unit-matriz', 
        cnpj: legacyCnpj, 
        companyName: legacyName,
        name: 'Matriz', 
        city: 'Maringá',
        state: 'PR',
        isDefault: true, 
        createdAt: new Date().toISOString() 
      }
    ];
  });
  const [activeOperationalUnitId, setActiveOperationalUnitId] = useState<string>(() => {
    try {
      return localStorage.getItem('tp_system_active_unit_id') || 'unit-matriz';
    } catch (e) {
      return 'unit-matriz';
    }
  });
  const [isOperationalUnitModalOpen, setIsOperationalUnitModalOpen] = useState(false);

  const activeOperationalUnit = useMemo(() => {
    return operationalUnits.find(u => u.id === activeOperationalUnitId) || operationalUnits[0] || {
      id: 'unit-matriz',
      cnpj: '29.543.880/0001-24',
      companyName: 'MY SYSTEM',
      name: 'Matriz'
    };
  }, [operationalUnits, activeOperationalUnitId]);

  const companyCnpj = activeOperationalUnit.cnpj;
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Helper for normalization
  const normalizeText = useCallback((text: any) => 
    String(text || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim(), []);

  // Helper for extracting DDD from phone
  const extractDdd = useCallback((phone: string | undefined | null): string => {
    if (!phone) return '';
    const clean = phone.replace(/\D/g, ''); // leave only digits
    if (!clean) return '';
    if (clean.startsWith('0')) {
      if (clean.length >= 3) {
        return clean.substring(1, 3);
      }
      return '';
    } else {
      if (clean.length >= 2) {
        return clean.substring(0, 2);
      }
      return '';
    }
  }, []);

  const driversRef = useRef(drivers);
  const freightsRef = useRef(freights);
  const thirdPartyFreightsRef = useRef(thirdPartyFreights);
  const tripsRef = useRef(trips);
  const remindersRef = useRef(reminders);
  const shipmentsRef = useRef(shipments);
  const notesRef = useRef(notes);
  const operationalUnitsRef = useRef(operationalUnits);

  useEffect(() => {
    driversRef.current = drivers;
    freightsRef.current = freights;
    thirdPartyFreightsRef.current = thirdPartyFreights;
    tripsRef.current = trips;
    remindersRef.current = reminders;
    shipmentsRef.current = shipments;
    notesRef.current = notes;
    operationalUnitsRef.current = operationalUnits;
  }, [drivers, freights, thirdPartyFreights, trips, reminders, shipments, notes, operationalUnits]);

  useEffect(() => {
    const handleFsChange = () => {
      const doc = document as any;
      const isFs = !!(doc.fullscreenElement || doc.mozFullScreenElement || doc.webkitFullscreenElement || doc.msFullscreenElement);
      setIsFullscreen(isFs);
    };
    
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    document.addEventListener('mozfullscreenchange', handleFsChange);
    document.addEventListener('MSFullscreenChange', handleFsChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
      document.removeEventListener('mozfullscreenchange', handleFsChange);
      document.removeEventListener('MSFullscreenChange', handleFsChange);
    };
  }, []);

  const toggleFullScreen = () => {
    const doc = window.document as any;
    const docEl = doc.documentElement;

    const request = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;
    const exit = doc.exitFullscreen || doc.mozCancelFullScreen || doc.webkitExitFullscreen || doc.msExitFullscreen;

    const isCurrentlyFs = !!(doc.fullscreenElement || doc.mozFullScreenElement || doc.webkitFullscreenElement || doc.msFullscreenElement);

    if (!isCurrentlyFs) {
      if (request) {
        try {
          const res = request.call(docEl);
          if (res && typeof res.catch === 'function') {
            res.catch((err: any) => {
              console.warn(`Erro ao tentar entrar em tela cheia: ${err?.message || err}`);
            });
          }
        } catch (err: any) {
          console.warn(`Erro ao tentar entrar em tela cheia: ${err?.message || err}`);
        }
      }
    } else {
      if (exit) {
        try {
          const res = exit.call(doc);
          if (res && typeof res.catch === 'function') {
            res.catch(() => {});
          }
        } catch (e) {
          console.warn("Erro ao sair de tela cheia:", e);
        }
      }
    }
  };

  useEffect(() => {
    const autoSaveTimer = setInterval(() => {
      safeSetItem('tp_system_drivers', JSON.stringify(driversRef.current));
      safeSetItem('tp_system_freights', JSON.stringify(freightsRef.current));
      safeSetItem('tp_system_third_party', JSON.stringify(thirdPartyFreightsRef.current));
      safeSetItem('tp_system_trips', JSON.stringify(tripsRef.current));
      safeSetItem('tp_system_reminders', JSON.stringify(remindersRef.current));
      safeSetItem('tp_system_shipments', JSON.stringify(shipmentsRef.current));
      safeSetItem('tp_system_notes', JSON.stringify(notesRef.current));
      safeSetItem('tp_system_operational_units', JSON.stringify(operationalUnitsRef.current));
    }, 60000);
    return () => clearInterval(autoSaveTimer);
  }, []);

  // FILTROS MOTORISTAS
  const [driverSearch, setDriverSearch] = useState('');
  const [driverPlateFilter, setDriverPlateFilter] = useState('');
  const [driverCpfFilter, setDriverCpfFilter] = useState('');
  const [driverAnttFilter, setDriverAnttFilter] = useState('');
  const [driverTrailerTypeFilter, setDriverTrailerTypeFilter] = useState('');
  const [driverAxlesFilter, setDriverAxlesFilter] = useState('');
  const [driverDddFilter, setDriverDddFilter] = useState('');
  
  const [debouncedDriverSearch, setDebouncedDriverSearch] = useState('');
  const [debouncedDriverPlate, setDebouncedDriverPlate] = useState('');
  const [debouncedDriverCpf, setDebouncedDriverCpf] = useState('');
  const [debouncedDriverAntt, setDebouncedDriverAntt] = useState('');
  const [debouncedTripCode, setDebouncedTripCode] = useState('');
  const [tripCursor, setTripCursor] = useState<any>();
  const [tripHasMore, setTripHasMore] = useState(false);
  const [isTripsLoading, setIsTripsLoading] = useState(false);
  const tripsLoadMoreRef = useRef<HTMLDivElement>(null);
  const [driverCursor, setDriverCursor] = useState<any>();
  const [driverHasMore, setDriverHasMore] = useState(false);
  const [driverTotal, setDriverTotal] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedDriverSearch(driverSearch), 400);
    return () => clearTimeout(timer);
  }, [driverSearch]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedDriverPlate(driverPlateFilter), 400);
    return () => clearTimeout(timer);
  }, [driverPlateFilter]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedDriverCpf(driverCpfFilter), 400);
    return () => clearTimeout(timer);
  }, [driverCpfFilter]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedDriverAntt(driverAnttFilter), 400);
    return () => clearTimeout(timer);
  }, [driverAnttFilter]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedTripCode(tripCteFilter), 400);
    return () => clearTimeout(timer);
  }, [tripCteFilter]);

  // FILTROS BASE DE FRETE
  const [freightOriginFilter, setFreightOriginFilter] = useState('');
  const [freightDestFilter, setFreightDestFilter] = useState('');
  const [freightTakerFilter, setFreightTakerFilter] = useState('');
  const [freightProductFilter, setFreightProductFilter] = useState('');
  const [freightStatusFilter, setFreightStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [freightNotesFilter, setFreightNotesFilter] = useState('');

  // FILTROS LANÇAR VIAGENS
  const [tripOriginFilter, setTripOriginFilter] = useState('');
  const [tripDestinationFilter, setTripDestinationFilter] = useState('');
  const [tripTakerFilter, setTripTakerFilter] = useState('');
  const [tripCteFilter, setTripCteFilter] = useState('');
  const [tripPlateFilter, setTripPlateFilter] = useState('');
  const [tripSelectedPlates, setTripSelectedPlates] = useState<string[]>([]);
  const [tripAnttFilter, setTripAnttFilter] = useState('');
  const [tripDriverFilter, setTripDriverFilter] = useState('');
  const [tripNfFilter, setTripNfFilter] = useState('');
  const [tripStatusListFilter, setTripStatusListFilter] = useState<'all' | 'Carregado' | 'Pendente'>('all');
  const [tripDocFilter, setTripDocFilter] = useState<'all' | 'Pendente' | 'OK'>('all');
  const [tripMdfeFilter, setTripMdfeFilter] = useState<'all' | 'Baixado' | 'Pendente'>('all');
  const [tripAdFilter, setTripAdFilter] = useState<'all' | 'Pendente'>('all');
  const [tripSdFilter, setTripSdFilter] = useState<'all' | 'Pendente'>('all');
  const [tripWeightFilter, setTripWeightFilter] = useState<'all' | 'withoutWeight'>('all');
  const [tripStartDate, setTripStartDate] = useState('');
  const [tripEndDate, setTripEndDate] = useState('');
  const [tripPaymentTypeFilter, setTripPaymentTypeFilter] = useState<string>('');

  // VALORES ÚNICOS PARA FILTROS DE VIAGENS (SELECTS)
  const uniqueTripOrigins = useMemo(() => {
    const map: Record<string, string> = {};
    const allOrigins = [...trips.map(t => t.origin), ...freights.map(f => f.origin)];
    allOrigins.forEach(origin => {
      if (origin) {
        const norm = normalizeText(origin);
        if (norm && norm !== 'ORIGEM' && !map[norm]) {
          map[norm] = origin.toUpperCase().trim();
        }
      }
    });
    return Object.values(map).sort();
  }, [trips, freights, normalizeText]);

  const uniqueTripDestinations = useMemo(() => {
    const map: Record<string, string> = {};
    const allDestinations = [...trips.map(t => t.destination), ...freights.map(f => f.destination)];
    allDestinations.forEach(dest => {
      if (dest) {
        const norm = normalizeText(dest);
        if (norm && norm !== 'DESTINO' && !map[norm]) {
          map[norm] = dest.toUpperCase().trim();
        }
      }
    });
    return Object.values(map).sort();
  }, [trips, freights, normalizeText]);

  const uniqueTripTakers = useMemo(() => {
    const takers = new Set<string>();
    trips.forEach(t => {
      const taker = resolveTripServiceTaker(t, freights, shipments);
      if (taker && !isInvalidTakerName(taker)) takers.add(taker.trim().toUpperCase());
    });
    freights.forEach(f => {
      if (f.serviceTaker && !isInvalidTakerName(f.serviceTaker)) takers.add(f.serviceTaker.trim().toUpperCase());
    });
    return Array.from(takers).sort();
  }, [trips, freights, shipments]);

  const uniqueTripPlates = useMemo(() => Array.from(new Set(trips.map(t => t.truckPlate))).sort(), [trips]);

  // FILTROS FRETE TERCEIRO
  const [tpOriginFilter, setTpOriginFilter] = useState('');
  const [tpDestFilter, setTpDestFilter] = useState('');
  const [tpProdFilter, setTpProdFilter] = useState('');
  const [tpCarrierFilter, setTpCarrierFilter] = useState('');
  const [tpDistFilter, setTpDistFilter] = useState('');

  // FILTROS DASHBOARD
  const [dashStartDate, setDashStartDate] = useState('');
  const [dashEndDate, setDashEndDate] = useState('');
  const [dashTakerFilter, setDashTakerFilter] = useState('');
  const [rankingViewMode, setRankingViewMode] = useState<'table' | 'split'>('table');

  // FILTROS EMBARQUE (SHIPMENT)
  const [shipmentStartDate, setShipmentStartDate] = useState('');
  const [shipmentEndDate, setShipmentEndDate] = useState('');
  const [shipmentDestinationFilter, setShipmentDestinationFilter] = useState('');
  const [shipmentPlateFilter, setShipmentPlateFilter] = useState('');
  const [shipmentProductFilter, setShipmentProductFilter] = useState('');
  const [shipmentShowDuplicates, setShipmentShowDuplicates] = useState(false);
  const [shipmentStatusFilter, setShipmentStatusFilter] = useState<'all' | 'loaded' | 'pending'>('all');
  const [shipmentOriginFilter, setShipmentOriginFilter] = useState('');

  // MODAIS E ESTADOS DE EDIÇÃO
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isFreightFormOpen, setIsFreightFormOpen] = useState(false);
  const [isThirdPartyFormOpen, setIsThirdPartyFormOpen] = useState(false);
  const [isTripFormOpen, setIsTripFormOpen] = useState(false);
  const [isReminderFormOpen, setIsReminderFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isFreightImportOpen, setIsFreightImportOpen] = useState(false);
  const [isTripImportOpen, setIsTripImportOpen] = useState(false);
  const [isNoteFormOpen, setIsNoteFormOpen] = useState(false);
  const [isDeleteAllDriversModalOpen, setIsDeleteAllDriversModalOpen] = useState(false);
  const [isDeletingAllDrivers, setIsDeletingAllDrivers] = useState(false);
  
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [editingFreight, setEditingFreight] = useState<Freight | null>(null);
  const [editingThirdParty, setEditingThirdParty] = useState<ThirdPartyFreight | null>(null);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [shouldFlashReminders, setShouldFlashReminders] = useState(false);

  // ESTADO PARA DISPARO DO PDF DE VIAGENS
  const [printTripsPdfTrigger, setPrintTripsPdfTrigger] = useState<(() => Promise<void>) | null>(null);
  const [isPrintingTripsPdfTop, setIsPrintingTripsPdfTop] = useState(false);

  const handleSaveName = useCallback(() => {
    const val = tempName.trim() || 'MY SYSTEM';
    setCompanyName(val);
    safeSetItem('tp_system_company_name', val);
    setIsEditingName(false);
    showNotification("Nome do sistema atualizado com sucesso!", "success");
  }, [tempName, safeSetItem, showNotification]);

  const saveOperationalUnits = useCallback(async (data: OperationalUnit[]) => {
    setOperationalUnits(data);
    safeSetItem('tp_system_operational_units', JSON.stringify(data));
    if (userRef.current) {
      try {
        const uid = userRef.current.uid;
        const oldMap = new Map<string, OperationalUnit>(operationalUnitsRef.current.map(u => [u.id, u]));
        const newMap = new Map<string, OperationalUnit>(data.map(u => [u.id, u]));
        for (const id of oldMap.keys()) {
          if (!newMap.has(id)) await deleteUserDocument(uid, 'operational_units', id);
        }
        for (const [id, item] of newMap.entries()) {
          const oldItem = oldMap.get(id);
          if (!oldItem || JSON.stringify(oldItem) !== JSON.stringify(item)) {
            await saveUserDocument(uid, 'operational_units', item);
          }
        }
      } catch (err) {
        console.error("Erro ao sincronizar unidades operacionais:", err);
      }
    }
  }, [safeSetItem]);

  const handleSaveOperationalUnit = useCallback((unitData: Omit<OperationalUnit, 'id' | 'createdAt'>, editId?: string) => {
    let nextUnits: OperationalUnit[];
    let targetActiveId = activeOperationalUnitId;

    if (editId) {
      nextUnits = operationalUnits.map(u => {
        if (u.id === editId) {
          return {
            ...u,
            ...unitData
          };
        }
        if (unitData.isDefault) {
          return { ...u, isDefault: false };
        }
        return u;
      });
      if (unitData.isDefault) {
        targetActiveId = editId;
      }
      showNotification("Unidade Operacional atualizada com sucesso!", "success");
    } else {
      const newUnit: OperationalUnit = {
        id: generateId(),
        ...unitData,
        isDefault: unitData.isDefault || operationalUnits.length === 0,
        createdAt: new Date().toISOString()
      };
      if (newUnit.isDefault) {
        nextUnits = [newUnit, ...operationalUnits.map(u => ({ ...u, isDefault: false }))];
        targetActiveId = newUnit.id;
      } else {
        nextUnits = [newUnit, ...operationalUnits];
      }
      showNotification("Novo CNPJ e Unidade cadastrados com sucesso!", "success");
    }

    if (targetActiveId !== activeOperationalUnitId) {
      setActiveOperationalUnitId(targetActiveId);
      safeSetItem('tp_system_active_unit_id', targetActiveId);
    }

    saveOperationalUnits(nextUnits);
  }, [operationalUnits, activeOperationalUnitId, safeSetItem, saveOperationalUnits, showNotification]);

  const handleDeleteOperationalUnit = useCallback((id: string) => {
    if (operationalUnits.length <= 1) {
      showNotification("Não é possível excluir o único CNPJ cadastrado.", "info");
      return;
    }
    const nextUnits = operationalUnits.filter(u => u.id !== id);
    if (activeOperationalUnitId === id) {
      const fallbackId = nextUnits[0].id;
      setActiveOperationalUnitId(fallbackId);
      safeSetItem('tp_system_active_unit_id', fallbackId);
    }
    saveOperationalUnits(nextUnits);
    showNotification("CNPJ removido da Unidade Operacional.", "success");
  }, [operationalUnits, activeOperationalUnitId, safeSetItem, saveOperationalUnits, showNotification]);

  const handleSelectActiveOperationalUnit = useCallback((id: string) => {
    setActiveOperationalUnitId(id);
    safeSetItem('tp_system_active_unit_id', id);
    const selected = operationalUnits.find(u => u.id === id);
    if (selected) {
      showNotification(`Unidade ativa: ${selected.name || 'CNPJ'} (${selected.cnpj})`, "info");
    }
  }, [operationalUnits, safeSetItem, showNotification]);



  const saveDrivers = useCallback(async (data: Driver[]) => {
    setDrivers(data);
    safeSetItem('tp_system_drivers', JSON.stringify(data));
    if (userRef.current) {
      try {
        const uid = userRef.current.uid;
        const oldMap = new Map<string, Driver>(driversRef.current.map(d => [d.id, d]));
        const newMap = new Map<string, Driver>(data.map(d => [d.id, d]));
        for (const id of oldMap.keys()) {
          if (!newMap.has(id)) await deleteUserDocument(uid, 'drivers', id);
        }
        for (const [id, item] of newMap.entries()) {
          const oldItem = oldMap.get(id);
          if (!oldItem || JSON.stringify(oldItem) !== JSON.stringify(item)) {
            await saveUserDocument(uid, 'drivers', item);
          }
        }
      } catch (err) {
        console.error("Erro ao sincronizar motoristas:", err);
      }
    }
  }, [safeSetItem]);

  const handleRemoveDuplicateDrivers = useCallback(() => {
    const seenNames = new Set<string>();
    const uniqueDrivers: Driver[] = [];
    let removedCount = 0;

    drivers.forEach(driver => {
      const name = driver.name ? driver.name.trim() : '';
      if (!name) {
        uniqueDrivers.push(driver);
        return;
      }
      if (seenNames.has(name)) {
        removedCount++;
      } else {
        seenNames.add(name);
        uniqueDrivers.push(driver);
      }
    });

    if (removedCount > 0) {
      saveDrivers(uniqueDrivers);
      showNotification(`${removedCount} motorista(s) duplicado(s) com nome idêntico removido(s)!`, "success");
    } else {
      showNotification("Nenhum motorista com nome duplicado encontrado.", "info");
    }
  }, [drivers, saveDrivers, showNotification]);

  const handleConfirmDeleteAllDrivers = useCallback(async () => {
    if (drivers.length === 0) return;
    setIsDeletingAllDrivers(true);
    try {
      const totalDeleted = drivers.length;
      driversRef.current = [];
      setDrivers([]);
      safeSetItem('tp_system_drivers', JSON.stringify([]));

      if (userRef.current) {
        const uid = userRef.current.uid;
        await deleteAllUserDocuments(uid, 'drivers');
      }

      setIsDeleteAllDriversModalOpen(false);
      showNotification(`Todos os ${totalDeleted} motoristas foram excluídos com sucesso!`, "success");
    } catch (err) {
      console.error("Erro ao excluir todos os motoristas:", err);
      showNotification("Erro ao excluir motoristas da nuvem. Verifique a conexão.", "error");
    } finally {
      setIsDeletingAllDrivers(false);
    }
  }, [drivers, safeSetItem, showNotification]);

  const handleExportDriversExcel = useCallback((driversToExport: Driver[]) => {
    if (driversToExport.length === 0) {
      showNotification("Nenhum motorista corresponde aos filtros ativos para exportar.", "info");
      return;
    }
    try {
      const exportData = driversToExport.map(d => ({
        'Placa Cavalo': d.truckPlate ? d.truckPlate.trim().toUpperCase() : '',
        'Carreta 1': d.trailer1 ? d.trailer1.trim().toUpperCase() : '',
        'Carreta 2': d.trailer2 ? d.trailer2.trim().toUpperCase() : '',
        'Dolly': d.dolly ? d.dolly.trim().toUpperCase() : '',
        'Nome Completo': d.name ? d.name.trim() : '',
        'Telefone': d.phone ? d.phone.trim() : '',
        'CPF': d.cpf ? d.cpf.trim() : '',
        'RG': d.rg ? d.rg.trim() : '',
        'CNH': d.cnh ? d.cnh.trim() : '',
        'Tipo Reboque': d.trailerType ? d.trailerType.trim() : '',
        'Modelo Reboque': d.trailerModel ? d.trailerModel.trim() : '',
        'Qtd Eixos': d.axisCount !== undefined && d.axisCount !== null && d.axisCount > 0 ? d.axisCount : '',
        'Peso Líquido': d.netWeight !== undefined && d.netWeight !== null && d.netWeight > 0 ? d.netWeight : '',
        'Peso Bruto': d.grossWeight !== undefined && d.grossWeight !== null && d.grossWeight > 0 ? d.grossWeight : '',
        'ANTT': d.antt ? d.antt.trim() : '',
        'RENAVAM': d.renavam ? d.renavam.trim() : '',
        'UF': d.state ? d.state.trim().toUpperCase() : '',
        'Observações': d.notes ? d.notes.trim() : '',
        'Data de Cadastro': d.createdAt ? (d.createdAt.includes('T') ? d.createdAt.split('T')[0].split('-').reverse().join('/') : d.createdAt) : ''
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      worksheet['!cols'] = [
        { wch: 14 }, // Placa Cavalo
        { wch: 12 }, // Carreta 1
        { wch: 12 }, // Carreta 2
        { wch: 10 }, // Dolly
        { wch: 25 }, // Nome Completo
        { wch: 16 }, // Telefone
        { wch: 16 }, // CPF
        { wch: 14 }, // RG
        { wch: 14 }, // CNH
        { wch: 15 }, // Tipo Reboque
        { wch: 18 }, // Modelo Reboque
        { wch: 10 }, // Qtd Eixos
        { wch: 14 }, // Peso Líquido
        { wch: 14 }, // Peso Bruto
        { wch: 14 }, // ANTT
        { wch: 14 }, // RENAVAM
        { wch: 6 },  // UF
        { wch: 25 }, // Observações
        { wch: 16 }  // Data de Cadastro
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Motoristas");
      XLSX.writeFile(workbook, "motoristas_completo.xlsx");
      showNotification("Lista completa de motoristas exportada com sucesso em Excel!", "success");
    } catch (e) {
      console.error("Erro ao exportar excel:", e);
      showNotification("Erro ao gerar arquivo Excel.", "info");
    }
  }, [showNotification]);

  const handleDownloadDriversTemplate = useCallback(() => {
    try {
      const templateData = [
        {
          'Placa Cavalo': 'ABC1D23',
          'Carreta 1': 'DEF2G34',
          'Carreta 2': 'GHI3J45',
          'Dolly': 'JKL4M56',
          'Nome Completo': 'JOÃO DA SILVA',
          'Telefone': '(44) 99999-9999',
          'CNH': '12345678900',
          'RG': '12345678',
          'CPF': '123.456.789-00',
          'Tipo Reboque': 'Basculante',
          'Peso Líquido': 15000,
          'Peso Bruto': 45000,
          'Qtd Eixos': 9,
          'Modelo Reboque': 'Randon 2023',
          'ANTT': '12345678',
          'RENAVAM': '123456789',
          'Observações': 'Exemplo de cadastro completo',
          'UF': 'PR'
        }
      ];

      const worksheet = XLSX.utils.json_to_sheet(templateData);
      worksheet['!cols'] = [
        { wch: 14 }, // Placa Cavalo
        { wch: 12 }, // Carreta 1
        { wch: 12 }, // Carreta 2
        { wch: 10 }, // Dolly
        { wch: 25 }, // Nome Completo
        { wch: 16 }, // Telefone
        { wch: 14 }, // CNH
        { wch: 12 }, // RG
        { wch: 15 }, // CPF
        { wch: 15 }, // Tipo Reboque
        { wch: 14 }, // Peso Líquido
        { wch: 14 }, // Peso Bruto
        { wch: 10 }, // Qtd Eixos
        { wch: 16 }, // Modelo Reboque
        { wch: 12 }, // ANTT
        { wch: 14 }, // RENAVAM
        { wch: 28 }, // Observações
        { wch: 6 }   // UF
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Modelo Motoristas");
      XLSX.writeFile(workbook, "modelo_cadastro_motoristas.xlsx");
      showNotification("Planilha modelo com todos os campos baixada com sucesso!", "success");
    } catch (e) {
      console.error("Erro ao gerar modelo excel:", e);
      showNotification("Erro ao gerar planilha modelo.", "info");
    }
  }, [showNotification]);

  const saveFreights = useCallback(async (data: Freight[]) => {
    setFreights(data);
    safeSetItem('tp_system_freights', JSON.stringify(data));
    if (userRef.current) {
      try {
        const uid = userRef.current.uid;
        const oldMap = new Map<string, Freight>(freightsRef.current.map(f => [f.id, f]));
        const newMap = new Map<string, Freight>(data.map(f => [f.id, f]));
        for (const id of oldMap.keys()) {
          if (!newMap.has(id)) await deleteUserDocument(uid, 'freights', id);
        }
        for (const [id, item] of newMap.entries()) {
          const oldItem = oldMap.get(id);
          if (!oldItem || JSON.stringify(oldItem) !== JSON.stringify(item)) {
            await saveUserDocument(uid, 'freights', item);
          }
        }
      } catch (err) {
        console.error("Erro ao sincronizar fretes:", err);
      }
    }
  }, [safeSetItem]);

  const saveThirdPartyFreights = useCallback(async (data: ThirdPartyFreight[]) => {
    setThirdPartyFreights(data);
    safeSetItem('tp_system_third_party', JSON.stringify(data));
    if (userRef.current) {
      try {
        const uid = userRef.current.uid;
        const oldMap = new Map<string, ThirdPartyFreight>(thirdPartyFreightsRef.current.map(tp => [tp.id, tp]));
        const newMap = new Map<string, ThirdPartyFreight>(data.map(tp => [tp.id, tp]));
        for (const id of oldMap.keys()) {
          if (!newMap.has(id)) await deleteUserDocument(uid, 'third_party', id);
        }
        for (const [id, item] of newMap.entries()) {
          const oldItem = oldMap.get(id);
          if (!oldItem || JSON.stringify(oldItem) !== JSON.stringify(item)) {
            await saveUserDocument(uid, 'third_party', item);
          }
        }
      } catch (err) {
        console.error("Erro ao sincronizar fretes terceiros:", err);
      }
    }
  }, [safeSetItem]);

  const saveTrips = useCallback(async (data: Trip[]) => {
    setTripsHistory(prev => [trips, ...prev].slice(0, 10));
    setTrips(data);
    safeSetItem('tp_system_trips', JSON.stringify(data));
    if (userRef.current) {
      try {
        const uid = userRef.current.uid;
        const oldMap = new Map<string, Trip>(tripsRef.current.map(t => [t.id, t]));
        const newMap = new Map<string, Trip>(data.map(t => [t.id, t]));
        for (const id of oldMap.keys()) {
          if (!newMap.has(id)) await deleteUserDocument(uid, 'trips', id);
        }
        for (const [id, item] of newMap.entries()) {
          const oldItem = oldMap.get(id);
          if (!oldItem || JSON.stringify(oldItem) !== JSON.stringify(item)) {
            await saveUserDocument(uid, 'trips', item);
          }
        }
      } catch (err) {
        console.error("Erro ao sincronizar viagens:", err);
      }
    }
  }, [trips, safeSetItem]);

  // Retroactive update for Trips UFs and Service Takers based on Freight/Shipment database
  useEffect(() => {
    if (trips.length > 0) {
      const needsUpdate = trips.some(trip => {
        const needsOriginState = !trip.originState && !!trip.origin;
        const needsDestState = !trip.destinationState && !!trip.destination;
        const rawTaker = (trip.serviceTaker || '').trim();
        const canResolveTaker = isInvalidTakerName(rawTaker) && !!resolveTripServiceTaker(trip, freights, shipments);
        return needsOriginState || needsDestState || canResolveTaker;
      });

      if (needsUpdate) {
        let hasChanges = false;
        const updatedTrips = trips.map(trip => {
          let updatedOrigin = false;
          let updatedDest = false;
          let updatedTaker = false;
          let newOriginState = trip.originState;
          let newDestinationState = trip.destinationState;
          let newServiceTaker = trip.serviceTaker;

          if (!trip.originState && trip.origin && freights.length > 0) {
            const orgNorm = normalizeText(trip.origin);
            const match = freights.find(f => normalizeText(f.origin) === orgNorm);
            if (match && match.state) {
              newOriginState = match.state;
              updatedOrigin = true;
            }
          }

          if (!trip.destinationState && trip.destination && freights.length > 0) {
            const destNorm = normalizeText(trip.destination);
            const match = freights.find(f => normalizeText(f.destination) === destNorm);
            if (match && match.destinationState) {
              newDestinationState = match.destinationState;
              updatedDest = true;
            }
          }

          const rawTaker = (trip.serviceTaker || '').trim();
          if (isInvalidTakerName(rawTaker)) {
            const resolved = resolveTripServiceTaker(trip, freights, shipments);
            if (resolved && !isInvalidTakerName(resolved)) {
              newServiceTaker = resolved;
              updatedTaker = true;
            }
          }

          if (updatedOrigin || updatedDest || updatedTaker) {
            hasChanges = true;
            return { 
              ...trip, 
              originState: newOriginState, 
              destinationState: newDestinationState,
              serviceTaker: newServiceTaker
            };
          }
          return trip;
        });

        if (hasChanges) {
          saveTrips(updatedTrips);
        }
      }
    }
  }, [freights, trips, shipments, normalizeText, saveTrips]);

  const undoTrips = useCallback(() => {
    if (tripsHistory.length === 0) return;
    const previousState = tripsHistory[0];
    setTripsHistory(prev => prev.slice(1));
    setTrips(previousState);
    safeSetItem('tp_system_trips', JSON.stringify(previousState));
    showNotification("Ação de viagens desfeita!", "info");
  }, [tripsHistory, showNotification, safeSetItem]);

  const saveReminders = useCallback(async (data: Reminder[]) => {
    setReminders(data);
    safeSetItem('tp_system_reminders', JSON.stringify(data));
    if (userRef.current) {
      try {
        const uid = userRef.current.uid;
        const oldMap = new Map<string, Reminder>(remindersRef.current.map(r => [r.id, r]));
        const newMap = new Map<string, Reminder>(data.map(r => [r.id, r]));
        for (const id of oldMap.keys()) {
          if (!newMap.has(id)) await deleteUserDocument(uid, 'reminders', id);
        }
        for (const [id, item] of newMap.entries()) {
          const oldItem = oldMap.get(id);
          if (!oldItem || JSON.stringify(oldItem) !== JSON.stringify(item)) {
            await saveUserDocument(uid, 'reminders', item);
          }
        }
      } catch (err) {
        console.error("Erro ao sincronizar lembretes:", err);
      }
    }
  }, [safeSetItem]);

  const saveShipments = useCallback(async (data: Shipment[]) => {
    setShipments(data);
    safeSetItem('tp_system_shipments', JSON.stringify(data));
    if (userRef.current) {
      try {
        const uid = userRef.current.uid;
        const oldMap = new Map<string, Shipment>(shipmentsRef.current.map(s => [s.id, s]));
        const newMap = new Map<string, Shipment>(data.map(s => [s.id, s]));
        for (const id of oldMap.keys()) {
          if (!newMap.has(id)) await deleteUserDocument(uid, 'shipments', id);
        }
        for (const [id, item] of newMap.entries()) {
          const oldItem = oldMap.get(id);
          if (!oldItem || JSON.stringify(oldItem) !== JSON.stringify(item)) {
            await saveUserDocument(uid, 'shipments', item);
          }
        }
      } catch (err) {
        console.error("Erro ao sincronizar embarques:", err);
      }
    }
  }, [safeSetItem]);

  const saveNotes = useCallback(async (data: Note[]) => {
    setNotes(data);
    safeSetItem('tp_system_notes', JSON.stringify(data));
    if (userRef.current) {
      try {
        const uid = userRef.current.uid;
        const oldMap = new Map<string, Note>(notesRef.current.map(n => [n.id, n]));
        const newMap = new Map<string, Note>(data.map(n => [n.id, n]));
        for (const id of oldMap.keys()) {
          if (!newMap.has(id)) await deleteUserDocument(uid, 'notes', id);
        }
        for (const [id, item] of newMap.entries()) {
          const oldItem = oldMap.get(id);
          if (!oldItem || JSON.stringify(oldItem) !== JSON.stringify(item)) {
            await saveUserDocument(uid, 'notes', item);
          }
        }
      } catch (err) {
        console.error("Erro ao sincronizar notas:", err);
      }
    }
  }, [safeSetItem]);

  const handleToggleReminderComplete = useCallback((id: string) => {
    saveReminders(reminders.map(r => r.id === id ? { ...r, completed: !r.completed } : r));
    showNotification("Status do lembrete atualizado!", "success");
  }, [reminders, saveReminders, showNotification]);

  useEffect(() => {
    const checkReminders = () => {
      const active = reminders.length > 0 && reminders.some(r => !r.completed);
      setShouldFlashReminders(active);
    };

    checkReminders();
    const timer = setInterval(checkReminders, 5000);
    return () => clearInterval(timer);
  }, [reminders]);

  useEffect(() => {
    if (currentView === 'reminders') {
      const now = new Date();
      const updatedReminders = reminders.map(r => {
        if (!r.viewed && new Date(r.time) <= now) {
          return { ...r, viewed: true };
        }
        return r;
      });
      
      const changed = updatedReminders.some((r, i) => r.viewed !== reminders[i].viewed);
      if (changed) {
        saveReminders(updatedReminders);
      }
    }
  }, [currentView, reminders, saveReminders]);

  const cleanupSubsRef = useRef<(() => void)[]>([]);

  const clearSubscriptions = useCallback(() => {
    if (cleanupSubsRef.current.length > 0) {
      cleanupSubsRef.current.forEach(unsub => {
        try {
          unsub();
        } catch (e) {
          console.error("Erro ao cancelar inscrição:", e);
        }
      });
      cleanupSubsRef.current = [];
    }
  }, []);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      // Clear any existing subscriptions first
      clearSubscriptions();

      if (firebaseUser) {
        setUser(firebaseUser);
        setSyncStatus('syncing');
        showNotification(`Conectado à nuvem como ${firebaseUser.email}!`, "success");

        try {
          const uid = firebaseUser.uid;
          const isEmpty = await isUserDatabaseEmpty(uid);

          if (isEmpty) {
            showNotification("Sincronizando seus dados locais com o banco em nuvem...", "info");
            
            if (driversRef.current.length > 0) await batchSaveCollection(uid, 'drivers', driversRef.current);
            if (freightsRef.current.length > 0) await batchSaveCollection(uid, 'freights', freightsRef.current);
            if (thirdPartyFreightsRef.current.length > 0) await batchSaveCollection(uid, 'third_party', thirdPartyFreightsRef.current);
            if (tripsRef.current.length > 0) await batchSaveCollection(uid, 'trips', tripsRef.current);
            if (remindersRef.current.length > 0) await batchSaveCollection(uid, 'reminders', remindersRef.current);
            if (shipmentsRef.current.length > 0) await batchSaveCollection(uid, 'shipments', shipmentsRef.current);
            if (notesRef.current.length > 0) await batchSaveCollection(uid, 'notes', notesRef.current);
            if (operationalUnitsRef.current.length > 0) await batchSaveCollection(uid, 'operational_units', operationalUnitsRef.current);

            showNotification("Banco em nuvem inicializado com sucesso!", "success");
          }

          const driverFilters = {
            name: debouncedDriverSearch,
            cpfCnh: debouncedDriverCpf,
            plate: debouncedDriverPlate,
            antt: debouncedDriverAntt,
          };
          const unsubDrivers = subscribeToDriversPage<Driver>(uid, driverFilters, (items, lastDoc, hasMore) => {
            setDrivers(items);
            setDriverCursor(lastDoc);
            setDriverHasMore(hasMore);
            safeSetItem('tp_system_drivers', JSON.stringify(items));
          });
          cleanupSubsRef.current.push(unsubDrivers);
          countUserCollection(uid, 'drivers', driverFilters).then(setDriverTotal).catch(console.error);

          const unsubFreights = subscribeToUserCollection<Freight>(uid, 'freights', (items) => {
            if (JSON.stringify(freightsRef.current) !== JSON.stringify(items)) {
              setFreights(items);
              safeSetItem('tp_system_freights', JSON.stringify(items));
            }
          });
          cleanupSubsRef.current.push(unsubFreights);

          const unsubThirdParty = subscribeToUserCollection<ThirdPartyFreight>(uid, 'third_party', (items) => {
            if (JSON.stringify(thirdPartyFreightsRef.current) !== JSON.stringify(items)) {
              setThirdPartyFreights(items);
              safeSetItem('tp_system_third_party', JSON.stringify(items));
            }
          });
          cleanupSubsRef.current.push(unsubThirdParty);

          setIsTripsLoading(true);
          const unsubTrips = subscribeToTripsPage<Trip>(uid, { code: debouncedTripCode }, (items, lastDoc, hasMore) => {
            setTrips(items);
            setTripCursor(lastDoc);
            setTripHasMore(hasMore);
            setIsTripsLoading(false);
            safeSetItem('tp_system_trips', JSON.stringify(items));
          });
          cleanupSubsRef.current.push(unsubTrips);
          getTripsAggregate(uid).catch(error => console.error('[Firestore] agregado de viagens', error));

          const unsubReminders = subscribeToUserCollection<Reminder>(uid, 'reminders', (items) => {
            if (JSON.stringify(remindersRef.current) !== JSON.stringify(items)) {
              setReminders(items);
              safeSetItem('tp_system_reminders', JSON.stringify(items));
            }
          });
          cleanupSubsRef.current.push(unsubReminders);

          const unsubShipments = subscribeToUserCollection<Shipment>(uid, 'shipments', (items) => {
            if (JSON.stringify(shipmentsRef.current) !== JSON.stringify(items)) {
              setShipments(items);
              safeSetItem('tp_system_shipments', JSON.stringify(items));
            }
          });
          cleanupSubsRef.current.push(unsubShipments);

          const unsubNotes = subscribeToUserCollection<Note>(uid, 'notes', (items) => {
            if (JSON.stringify(notesRef.current) !== JSON.stringify(items)) {
              setNotes(items);
              safeSetItem('tp_system_notes', JSON.stringify(items));
            }
          });
          cleanupSubsRef.current.push(unsubNotes);

          const unsubUnits = subscribeToUserCollection<OperationalUnit>(uid, 'operational_units', (items) => {
            if (items.length > 0 && JSON.stringify(operationalUnitsRef.current) !== JSON.stringify(items)) {
              setOperationalUnits(items);
              safeSetItem('tp_system_operational_units', JSON.stringify(items));
            }
          });
          cleanupSubsRef.current.push(unsubUnits);

          setSyncStatus('synced');

        } catch (err) {
          console.error("Erro na sincronização inicial:", err);
          setSyncStatus('error');
          showNotification("Erro ao sincronizar com a nuvem.", "info");
        }
      } else {
        setUser(null);
        setSyncStatus('idle');
      }
    });

    return () => {
      unsubscribeAuth();
      clearSubscriptions();
    };
  }, [safeSetItem, showNotification, clearSubscriptions, debouncedDriverSearch, debouncedDriverPlate, debouncedDriverCpf, debouncedDriverAntt, debouncedTripCode]);

  const loadMoreTrips = useCallback(async () => {
    const currentUser = userRef.current;
    if (!currentUser || !tripCursor || !tripHasMore || isTripsLoading) return;
    setIsTripsLoading(true);
    try {
      const page = await loadTripsPage<Trip>(currentUser.uid, { code: debouncedTripCode }, tripCursor);
      setTrips(previous => [...previous, ...page.items.filter(item => !previous.some(existing => existing.id === item.id))]);
      setTripCursor(page.lastDoc);
      setTripHasMore(page.hasMore);
    } catch (error) {
      console.error('[Firestore] carregar mais viagens', error);
    } finally {
      setIsTripsLoading(false);
    }
  }, [tripCursor, tripHasMore, isTripsLoading, debouncedTripCode]);

  useEffect(() => {
    const sentinel = tripsLoadMoreRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0]?.isIntersecting) loadMoreTrips();
    }, { rootMargin: '240px' });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMoreTrips]);

  const handleThirdPartySubmit = useCallback((data: Omit<ThirdPartyFreight, 'id' | 'createdAt'>) => {
    const isExisting = editingThirdParty && thirdPartyFreights.some(tp => tp.id === editingThirdParty.id);
    if (isExisting) {
      saveThirdPartyFreights(thirdPartyFreights.map(tp => tp.id === editingThirdParty!.id ? { ...data, id: tp.id, createdAt: tp.createdAt } : tp));
      showNotification("Frete terceiro atualizado!", "success");
    } else {
      saveThirdPartyFreights([{ ...data, id: generateId(), createdAt: new Date().toISOString() }, ...thirdPartyFreights]);
      showNotification("Frete terceiro cadastrado!", "success");
    }
    setIsThirdPartyFormOpen(false);
    setEditingThirdParty(null);
  }, [editingThirdParty, thirdPartyFreights, saveThirdPartyFreights, showNotification]);

  const handleExportBackup = () => {
    const fullData = {
      version: "3.5",
      timestamp: new Date().toISOString(),
      drivers, freights, thirdPartyFreights, trips, reminders, shipments, notes, operationalUnits
    };
    const blob = new Blob([JSON.stringify(fullData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tp_system_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification("Backup exportado!", "success");
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const json = JSON.parse(evt.target?.result as string);
        if (json.drivers) saveDrivers(json.drivers);
        if (json.freights) saveFreights(json.freights);
        if (json.thirdPartyFreights) saveThirdPartyFreights(json.thirdPartyFreights);
        if (json.trips) saveTrips(json.trips);
        if (json.reminders) saveReminders(json.reminders);
        if (json.shipments) saveShipments(json.shipments);
        if (json.notes) saveNotes(json.notes);
        if (json.operationalUnits) saveOperationalUnits(json.operationalUnits);
        showNotification("Dados restaurados!", "success");
        setCurrentView('dashboard');
      } catch (err) {
        showNotification("Erro no arquivo.", "info");
      }
    };
    reader.readAsText(file);
  };

  // MEMOS DE FILTRAGEM
  const filteredDrivers = useMemo(() => {
    const searchNorm = normalizeText(driverSearch);
    const searchWords = searchNorm ? searchNorm.split(/\s+/).filter(Boolean) : [];
    const plateNorm = normalizeText(driverPlateFilter).replace(/[^A-Z0-9]/g, '');
    const cpfClean = (driverCpfFilter || '').replace(/\D/g, '');
    const anttNorm = normalizeText(driverAnttFilter);
    const typeNorm = normalizeText(driverTrailerTypeFilter);

    return drivers
      .filter(d => {
        const nameNorm = normalizeText(d.name);
        const truckPlateNorm = normalizeText(d.truckPlate).replace(/[^A-Z0-9]/g, '');
        const trailer1Norm = normalizeText(d.trailer1).replace(/[^A-Z0-9]/g, '');
        const trailer2Norm = normalizeText(d.trailer2).replace(/[^A-Z0-9]/g, '');
        const dollyNorm = normalizeText(d.dolly).replace(/[^A-Z0-9]/g, '');
        const dCpfClean = (d.cpf || '').replace(/\D/g, '');
        const dCnhClean = (d.cnh || '').replace(/\D/g, '');
        const dRgClean = (d.rg || '').replace(/\D/g, '');
        const dPhoneClean = (d.phone || '').replace(/\D/g, '');

        // Search matching (all words in search query must match driver name or plate/doc)
        const matchesName = searchWords.length === 0 || searchWords.every(word => {
          const cleanWord = word.replace(/[^A-Z0-9]/g, '');
          return nameNorm.includes(word) || 
            (cleanWord && truckPlateNorm.includes(cleanWord)) ||
            (cleanWord && dCpfClean.includes(cleanWord)) ||
            (cleanWord && dPhoneClean.includes(cleanWord));
        });
        
        const matchesPlate = !plateNorm || 
          truckPlateNorm.includes(plateNorm) || 
          trailer1Norm.includes(plateNorm) || 
          trailer2Norm.includes(plateNorm) || 
          dollyNorm.includes(plateNorm);
        
        const matchesCpf = !cpfClean || dCpfClean.includes(cpfClean) || dCnhClean.includes(cpfClean) || dRgClean.includes(cpfClean);
        
        const dAnttNorm = normalizeText(d.antt);
        const matchesAntt = !anttNorm || dAnttNorm.includes(anttNorm);
        
        const matchesType = !typeNorm || normalizeText(d.trailerType) === typeNorm;
        const matchesAxles = !driverAxlesFilter || String(d.axisCount) === driverAxlesFilter;
        const matchesDdd = !driverDddFilter || extractDdd(d.phone) === driverDddFilter;
        
        return matchesName && matchesPlate && matchesCpf && matchesAntt && matchesType && matchesAxles && matchesDdd;
      })
      .sort((a, b) => {
        const nameA = (a.name || '').trim();
        const nameB = (b.name || '').trim();
        return nameA.localeCompare(nameB, 'pt-BR', { sensitivity: 'base', numeric: true });
      });
  }, [drivers, driverSearch, driverPlateFilter, driverCpfFilter, driverAnttFilter, driverTrailerTypeFilter, driverAxlesFilter, driverDddFilter, normalizeText, extractDdd]);

  const filteredFreights = useMemo(() => {
    return freights.filter(f => {
      const matchesOrigin = !freightOriginFilter || normalizeText(f.origin) === normalizeText(freightOriginFilter);
      const matchesDest = !freightDestFilter || normalizeText(f.destination) === normalizeText(freightDestFilter);
      const matchesTaker = !freightTakerFilter || normalizeText(f.serviceTaker) === normalizeText(freightTakerFilter);
      const matchesProduct = !freightProductFilter || f.product === freightProductFilter;
      const matchesStatus = freightStatusFilter === 'all' || (freightStatusFilter === 'active' ? f.active : !f.active);
      const matchesNotes = !freightNotesFilter || 
        (f.notes && f.notes.toLowerCase().includes(freightNotesFilter.toLowerCase())) || 
        (f.restrictions && f.restrictions.toLowerCase().includes(freightNotesFilter.toLowerCase()));
      return matchesOrigin && matchesDest && matchesTaker && matchesProduct && matchesStatus && matchesNotes;
    });
  }, [freights, freightOriginFilter, freightDestFilter, freightTakerFilter, freightProductFilter, freightStatusFilter, freightNotesFilter, normalizeText]);

  const filteredTripsList = useMemo(() => {
    const driverSearchNorm = normalizeText(tripDriverFilter);
    const driverWords = driverSearchNorm ? driverSearchNorm.split(/\s+/).filter(Boolean) : [];

    return trips.filter(t => {
      const tDate = t.date ? new Date(t.date).getTime() : 0;
      const start = tripStartDate ? new Date(tripStartDate).getTime() : Number.NEGATIVE_INFINITY;
      const end = tripEndDate ? new Date(tripEndDate).getTime() : Number.POSITIVE_INFINITY;
      const matchesDate = (!tripStartDate || (t.date && tDate >= start)) && 
                          (!tripEndDate || (t.date && tDate <= end));

      const matchesOrigin = !tripOriginFilter || normalizeText(t.origin) === normalizeText(tripOriginFilter);
      const matchesDestination = !tripDestinationFilter || normalizeText(t.destination) === normalizeText(tripDestinationFilter);
      const effectiveTaker = resolveTripServiceTaker(t, freights, shipments) || t.serviceTaker || '';
      const matchesTaker = !tripTakerFilter || (effectiveTaker && effectiveTaker.trim().toUpperCase() === tripTakerFilter.toUpperCase());
      const matchesCte = !tripCteFilter || (t.cteNumber && t.cteNumber.includes(tripCteFilter));
      
      // Placa (multi-placas selecionadas ou placa digitada)
      let matchesPlate = true;
      const tPlate = t.truckPlate ? t.truckPlate.trim().toUpperCase() : '';
      const cleanTPlate = tPlate.replace(/[^a-zA-Z0-9]/g, '');

      if (tripSelectedPlates.length > 0) {
        matchesPlate = !!tPlate && (
          tripSelectedPlates.includes(tPlate) ||
          tripSelectedPlates.some(sp => sp.replace(/[^a-zA-Z0-9]/g, '') === cleanTPlate)
        );
      } else if (tripPlateFilter) {
        const cleanFilter = tripPlateFilter.trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        matchesPlate = cleanTPlate.includes(cleanFilter) || tPlate.includes(tripPlateFilter.trim().toUpperCase());
      }

      // Motorista pelo caminhão (placa)
      const tripDriver = drivers.find(d => d.truckPlate && t.truckPlate && normalizeText(d.truckPlate) === normalizeText(t.truckPlate));

      // Filtro ANTT
      const matchesAntt = !tripAnttFilter || (tripDriver && tripDriver.antt && tripDriver.antt.trim().toUpperCase() === tripAnttFilter.trim().toUpperCase());

      // Filtro Motorista
      let matchesDriver = true;
      if (driverWords.length > 0) {
        const driverFromPlate = tripDriver?.name || '';
        const normTripDriver = normalizeText(t.driverName);
        const normPlateDriver = normalizeText(driverFromPlate);
        
        matchesDriver = driverWords.every(word => 
          normTripDriver.includes(word) || normPlateDriver.includes(word)
        );
      }

      const matchesNf = !tripNfFilter || (t.invoiceNumber && t.invoiceNumber.includes(tripNfFilter));
      const isDocPending = t.pendingDocument && t.pendingDocument.trim() !== "";
      const weightValue = typeof t.weight === 'number' ? t.weight : parseFloat(String(t.weight || '0').replace(',', '.'));
      const hasWeight = !isNaN(weightValue) && weightValue > 0;
      const hasSaldo = (t.sdNote && t.sdNote.trim() !== '') || !!t.sdFlag || t.status === 'Finalizado';
      const matchesMdfe = tripMdfeFilter === 'all' || (t.mdfeStatus || 'Pendente') === tripMdfeFilter;
      const matchesAd = tripAdFilter === 'all' || (!t.adNote || t.adNote.trim() === '');
      const matchesSd = tripSdFilter === 'all' || (!t.sdNote || t.sdNote.trim() === '');
      const matchesWeight = tripWeightFilter === 'all' || (!hasWeight && !hasSaldo);
      const matchesPaymentType = !tripPaymentTypeFilter || (() => {
        const pType = String(t.paymentType || '').toLowerCase();
        if (tripPaymentTypeFilter === 'pix') return pType.includes('pix');
        if (tripPaymentTypeFilter === 'cf') return pType.includes('cf') || pType.includes('carta');
        if (tripPaymentTypeFilter === 'pagbem') return pType.includes('pagbem');
        if (tripPaymentTypeFilter === 'outros') return !pType.includes('pix') && !pType.includes('cf') && !pType.includes('carta') && !pType.includes('pagbem');
        return true;
      })();
      
      return matchesDate && matchesOrigin && matchesDestination && matchesTaker && matchesCte && matchesPlate && matchesAntt && matchesDriver && matchesNf && matchesMdfe && matchesPaymentType && matchesAd && matchesSd && matchesWeight;
    }).sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      if (dateA !== dateB) return dateB - dateA;
      
      const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return createdB - createdA;
    });
  }, [trips, drivers, freights, shipments, tripOriginFilter, tripDestinationFilter, tripCteFilter, tripPlateFilter, tripSelectedPlates, tripAnttFilter, tripDriverFilter, tripNfFilter, tripStatusListFilter, tripDocFilter, tripMdfeFilter, tripAdFilter, tripSdFilter, tripWeightFilter, tripStartDate, tripEndDate, tripTakerFilter, tripPaymentTypeFilter, normalizeText]);

  const tripStats = useMemo(() => {
    let totalProfit = 0;
    let totalRevenue = 0;
    let count = 0;

    filteredTripsList.forEach(t => {
      const weight = typeof t.weight === 'number' ? t.weight : parseFloat(String(t.weight || 0).replace(',', '.'));
      const companyTariff = typeof t.companyTariff === 'number' ? t.companyTariff : parseFloat(String(t.companyTariff || 0).replace(',', '.'));
      const driverTariff = typeof t.driverTariff === 'number' ? t.driverTariff : parseFloat(String(t.driverTariff || 0).replace(',', '.'));
      const icmsRate = typeof t.icmsRate === 'number' ? t.icmsRate : parseFloat(String(t.icmsRate || 0).replace(',', '.'));

      const effectiveWeight = weight > 0 ? weight : 1000;
      const weightFactor = effectiveWeight / 1000;
      
      const gross = companyTariff * weightFactor;
      const icms = t.deductIcms ? (gross * (icmsRate / 100)) : 0;
      const driverCost = driverTariff * weightFactor;
      const profit = gross - icms - driverCost;

      totalProfit += profit;
      totalRevenue += gross;
      count++;
    });

    const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    return { totalProfit, avgMargin, count };
  }, [filteredTripsList]);

  // RESUMO TEXTUAL DOS FILTROS APLICADOS EM LANÇAR VIAGENS (PARA O PDF E RELATÓRIOS)
  const tripFilterSummary = useMemo(() => {
    const parts: string[] = [];
    if (tripStartDate && tripEndDate) {
      parts.push(`Período: ${tripStartDate.split('-').reverse().join('/')} a ${tripEndDate.split('-').reverse().join('/')}`);
    } else if (tripStartDate) {
      parts.push(`A partir de: ${tripStartDate.split('-').reverse().join('/')}`);
    } else if (tripEndDate) {
      parts.push(`Até: ${tripEndDate.split('-').reverse().join('/')}`);
    }

    if (tripTakerFilter) parts.push(`Tomador: ${tripTakerFilter}`);
    if (tripOriginFilter) parts.push(`Origem: ${tripOriginFilter}`);
    if (tripDestinationFilter) parts.push(`Destino: ${tripDestinationFilter}`);
    if (tripAnttFilter) parts.push(`ANTT: ${tripAnttFilter}`);
    if (tripSelectedPlates.length > 0) parts.push(`Placas (${tripSelectedPlates.length}): ${tripSelectedPlates.join(', ')}`);
    if (tripDriverFilter) parts.push(`Motorista: ${tripDriverFilter}`);
    if (tripPlateFilter) parts.push(`Placa: ${tripPlateFilter}`);
    if (tripCteFilter) parts.push(`CTE: ${tripCteFilter}`);
    if (tripNfFilter) parts.push(`NF: ${tripNfFilter}`);
    if (tripMdfeFilter !== 'all') parts.push(`MDFE: ${tripMdfeFilter}`);
    if (tripAdFilter !== 'all') parts.push(`AD: ${tripAdFilter}`);
    if (tripSdFilter !== 'all') parts.push(`SD: ${tripSdFilter}`);
    if (tripWeightFilter !== 'all') parts.push(`Sem Peso Inserido`);
    if (tripPaymentTypeFilter) parts.push(`Faturamento: ${tripPaymentTypeFilter.toUpperCase()}`);

    return parts.length > 0 ? parts.join(' • ') : 'Todos os registros (Sem filtros ativos)';
  }, [
    tripStartDate, tripEndDate, tripTakerFilter, tripOriginFilter,
    tripDestinationFilter, tripDriverFilter, tripPlateFilter, tripSelectedPlates,
    tripAnttFilter, tripCteFilter, tripNfFilter, tripMdfeFilter, tripAdFilter,
    tripSdFilter, tripWeightFilter, tripPaymentTypeFilter
  ]);

  const filteredThirdParty = useMemo(() => {
    return thirdPartyFreights.filter(tp => {
      const matchesOrigin = !tpOriginFilter || tp.origin === tpOriginFilter;
      const matchesDest = !tpDestFilter || tp.destination === tpDestFilter;
      const matchesProd = !tpProdFilter || tp.product === tpProdFilter;
      const matchesCarrier = !tpCarrierFilter || tp.carrier === tpCarrierFilter;
      const matchesDist = !tpDistFilter || tp.distanceKm === Number(tpDistFilter);
      return matchesOrigin && matchesDest && matchesProd && matchesCarrier && matchesDist;
    });
  }, [thirdPartyFreights, tpOriginFilter, tpDestFilter, tpProdFilter, tpCarrierFilter, tpDistFilter]);

  // VALORES ÚNICOS PARA FILTROS (SELECTS)
  const tpOrigins = useMemo(() => Array.from(new Set(thirdPartyFreights.map(f => f.origin))).sort(), [thirdPartyFreights]);
  const tpDestinations = useMemo(() => Array.from(new Set(thirdPartyFreights.map(f => f.destination))).sort(), [thirdPartyFreights]);
  const tpProducts = useMemo(() => Array.from(new Set(thirdPartyFreights.map(f => f.product))).sort(), [thirdPartyFreights]);
  const tpCarriers = useMemo(() => Array.from(new Set(thirdPartyFreights.map(f => f.carrier))).sort(), [thirdPartyFreights]);
  const tpDistances = useMemo(() => Array.from(new Set(thirdPartyFreights.map(f => f.distanceKm))).sort((a: number, b: number) => a - b), [thirdPartyFreights]);

  // VALORES ÚNICOS PARA BASES DE FRETE (SELECTS)
  const frOrigins = useMemo(() => {
    const map: Record<string, string> = {};
    freights.forEach(f => {
      if (f.origin) {
        const norm = normalizeText(f.origin);
        if (norm && norm !== 'ORIGEM' && !map[norm]) {
          map[norm] = f.origin.toUpperCase().trim();
        }
      }
    });
    return Object.values(map).sort();
  }, [freights, normalizeText]);

  const frDestinations = useMemo(() => {
    const map: Record<string, string> = {};
    freights.forEach(f => {
      if (f.destination) {
        const norm = normalizeText(f.destination);
        if (norm && norm !== 'DESTINO' && !map[norm]) {
          map[norm] = f.destination.toUpperCase().trim();
        }
      }
    });
    return Object.values(map).sort();
  }, [freights, normalizeText]);

  const frTakers = useMemo(() => {
    const map: Record<string, string> = {};
    freights.forEach(f => {
      if (f.serviceTaker) {
        const norm = normalizeText(f.serviceTaker);
        if (norm && norm !== 'TOMADOR' && !map[norm]) {
          map[norm] = f.serviceTaker.toUpperCase().trim();
        }
      }
    });
    return Object.values(map).sort();
  }, [freights, normalizeText]);

  const frProducts = useMemo(() => Array.from(new Set(freights.map(f => f.product))).sort(), [freights]);

  const frNotes = useMemo(() => {
    const set = new Set<string>();
    freights.forEach(f => {
      if (f.notes && f.notes.trim()) set.add(f.notes.trim());
      if (f.restrictions && f.restrictions.trim()) set.add(f.restrictions.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
  }, [freights]);

  const uniqueTrailerTypes = useMemo(() => {
    const map = new Map<string, string>();
    drivers.forEach(d => {
      if (d.trailerType) {
        const norm = normalizeText(d.trailerType);
        if (norm && !map.has(norm)) {
          map.set(norm, d.trailerType.toUpperCase().trim());
        }
      }
    });
    return Array.from(map.values()).sort();
  }, [drivers, normalizeText]);

  const uniqueAxleCounts = useMemo<number[]>(() => {
    const set = new Set<number>();
    drivers.forEach(d => {
      if (typeof d.axisCount === 'number') {
        set.add(d.axisCount);
      }
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [drivers]);

  const uniqueDdds = useMemo<string[]>(() => {
    const set = new Set<string>();
    drivers.forEach(d => {
      const ddd = extractDdd(d.phone);
      if (ddd && ddd.length === 2) {
        set.add(ddd);
      }
    });
    return Array.from(set).sort();
  }, [drivers, extractDdd]);

  const uniqueTakers = useMemo(() => {
    const map: Record<string, string> = {};
    trips.forEach(t => {
      const taker = resolveTripServiceTaker(t, freights, shipments) || t.serviceTaker;
      if (taker && !isInvalidTakerName(taker)) {
        const norm = normalizeText(taker);
        if (!map[norm]) {
          map[norm] = taker.toUpperCase().trim();
        }
      }
    });
    freights.forEach(f => {
      if (f.serviceTaker && !isInvalidTakerName(f.serviceTaker)) {
        const norm = normalizeText(f.serviceTaker);
        if (!map[norm]) {
          map[norm] = f.serviceTaker.toUpperCase().trim();
        }
      }
    });
    return Object.values(map).sort();
  }, [trips, freights, shipments, normalizeText]);

  const dashStats = useMemo(() => {
    const filtered = trips.filter(t => {
      // Consistent date filtering with filteredTripsList
      const tDate = t.date ? new Date(t.date).getTime() : 0;
      const start = dashStartDate ? new Date(dashStartDate).getTime() : Number.NEGATIVE_INFINITY;
      const end = dashEndDate ? new Date(dashEndDate).getTime() : Number.POSITIVE_INFINITY;
      const matchesDate = (!dashStartDate || (t.date && tDate >= start)) && 
                          (!dashEndDate || (t.date && tDate <= end));
      
      const effectiveTaker = resolveTripServiceTaker(t, freights, shipments) || t.serviceTaker || '';
      const matchesTaker = !dashTakerFilter || normalizeText(effectiveTaker) === normalizeText(dashTakerFilter);
      return matchesDate && matchesTaker;
    });
    
    let grossRevenue = 0;
    let netRevenue = 0;
    let totalWeightKg = 0;
    
    const payments = { pix: 0, cf: 0, pagbem: 0, outros: 0 };
    const takerStatsMap: Record<string, { 
      weight: number; 
      gross: number; 
      net: number; 
      tripCount: number; 
      dates: string[]; 
    }> = {};

    filtered.forEach(t => {
      // Robust parsing of numeric values
      const weight = typeof t.weight === 'number' ? t.weight : parseFloat(String(t.weight || 0).replace(',', '.'));
      const companyTariff = typeof t.companyTariff === 'number' ? t.companyTariff : parseFloat(String(t.companyTariff || 0).replace(',', '.'));
      const driverTariff = typeof t.driverTariff === 'number' ? t.driverTariff : parseFloat(String(t.driverTariff || 0).replace(',', '.'));
      const icmsRate = typeof t.icmsRate === 'number' ? t.icmsRate : parseFloat(String(t.icmsRate || 0).replace(',', '.'));

      const weightFactor = (weight || 0) / 1000;
      const gross = (companyTariff || 0) * weightFactor;
      const icms = t.deductIcms ? (gross * ((icmsRate || 0) / 100)) : 0;
      const driverCost = (driverTariff || 0) * weightFactor;
      const profit = (gross - icms - driverCost);

      grossRevenue += gross;
      netRevenue += profit;
      totalWeightKg += (weight || 0);

      const resolvedTaker = resolveTripServiceTaker(t, freights, shipments);
      const rawTaker = (t.serviceTaker || '').trim();
      const taker = resolvedTaker 
        ? resolvedTaker.toUpperCase() 
        : (!isInvalidTakerName(rawTaker) ? rawTaker.toUpperCase() : '');

      if (taker) {
        if (!takerStatsMap[taker]) {
          takerStatsMap[taker] = { weight: 0, gross: 0, net: 0, tripCount: 0, dates: [] };
        }
        takerStatsMap[taker].weight += (weight || 0);
        takerStatsMap[taker].gross += gross;
        takerStatsMap[taker].net += profit;
        takerStatsMap[taker].tripCount += 1;
        if (t.date) {
          takerStatsMap[taker].dates.push(t.date);
        }
      }

      const pType = String(t.paymentType || '').toLowerCase();
      if (pType.includes('pix')) payments.pix++;
      else if (pType.includes('cf') || pType.includes('carta')) payments.cf++;
      else if (pType.includes('pagbem')) payments.pagbem++;
      else payments.outros++;
    });

    const monthNames = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

    const ranking = Object.entries(takerStatsMap)
      .map(([name, data]) => {
        // Calculate trip month period (first to last month)
        let period = '';
        if (data.dates.length > 0) {
          const sortedDates = [...data.dates].sort();
          const firstDateStr = sortedDates[0];
          const lastDateStr = sortedDates[sortedDates.length - 1];

          const parseDate = (dStr: string) => {
            if (dStr.includes('/')) {
              const parts = dStr.split('/');
              if (parts.length === 3) return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
            }
            return new Date(dStr);
          };

          const d1 = parseDate(firstDateStr);
          const d2 = parseDate(lastDateStr);

          if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
            const m1 = monthNames[d1.getMonth()] + '/' + String(d1.getFullYear()).slice(-2);
            const m2 = monthNames[d2.getMonth()] + '/' + String(d2.getFullYear()).slice(-2);
            period = (m1 === m2) ? m1 : `${m1} a ${m2}`;
          }
        }

        const margin = data.gross > 0 ? (data.net / data.gross) * 100 : 0;

        return { 
          name, 
          weight: data.weight,
          gross: data.gross,
          net: data.net,
          margin,
          tripCount: data.tripCount,
          period
        };
      })
      .sort((a, b) => {
        // Ranking baseado na quantidade de viagens cadastradas no menu Lançar Viagens
        if (b.tripCount !== a.tripCount) {
          return b.tripCount - a.tripCount;
        }
        if (b.weight !== a.weight) {
          return b.weight - a.weight;
        }
        return b.gross - a.gross;
      });

    const pendingTripsCount = filtered.filter(t => {
      // Se preencheu o saldo (sdNote preenchido, sdFlag ativo ou status Finalizado), NÃO está pendente!
      const hasSaldo = (t.sdNote && t.sdNote.trim() !== '') || !!t.sdFlag || t.status === 'Finalizado';
      if (hasSaldo) return false;

      // Status marcado como Pendente
      if (t.status === 'Pendente') return true;

      // Sem peso informado
      const weightValue = typeof t.weight === 'number' ? t.weight : parseFloat(String(t.weight || '0').replace(',', '.'));
      return isNaN(weightValue) || weightValue <= 0;
    }).length;

    const profitPercentage = grossRevenue > 0 ? (netRevenue / grossRevenue) * 100 : 0;

    return { 
      grossRevenue, 
      netRevenue, 
      profitPercentage, 
      payments, 
      ranking, 
      tripsCount: filtered.length, 
      pendingTripsCount,
      totalWeightKg,
      driversCount: drivers.length,
      freightsCount: freights.length
    };
  }, [trips, freights, shipments, drivers.length, freights.length, dashStartDate, dashEndDate, dashTakerFilter, normalizeText]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const formatKg = (val: number) => new Intl.NumberFormat('pt-BR').format(val) + ' KG';
  const formatTn = (val: number) => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val / 1000) + ' TN';

  const resetTripFilters = () => {
    setTripOriginFilter('');
    setTripDestinationFilter('');
    setTripTakerFilter('');
    setTripCteFilter('');
    setTripPlateFilter('');
    setTripSelectedPlates([]);
    setTripAnttFilter('');
    setTripDriverFilter('');
    setTripNfFilter('');
    setTripStatusListFilter('all');
    setTripDocFilter('all');
    setTripMdfeFilter('all');
    setTripAdFilter('all');
    setTripSdFilter('all');
    setTripWeightFilter('all');
    setTripStartDate('');
    setTripEndDate('');
    setTripPaymentTypeFilter('');
  };

  const handleNavigateFromReports = useCallback((filters: ReportsNavigateFilters) => {
    setCurrentView('trips');

    // Origem
    if (filters.origin) {
      const matched = uniqueTripOrigins.find(o => normalizeText(o) === normalizeText(filters.origin || '')) || filters.origin.toUpperCase().trim();
      setTripOriginFilter(matched);
      setTripDestinationFilter('');
    } else if (filters.destination) {
      const matched = uniqueTripDestinations.find(d => normalizeText(d) === normalizeText(filters.destination || '')) || filters.destination.toUpperCase().trim();
      setTripDestinationFilter(matched);
      setTripOriginFilter('');
    } else {
      setTripOriginFilter('');
      setTripDestinationFilter('');
    }

    // ANTT
    setTripAnttFilter(filters.antt || '');

    // Placas (múltiplas placas ou placa única)
    if (filters.selectedPlates && filters.selectedPlates.length > 0) {
      setTripSelectedPlates(filters.selectedPlates);
      if (filters.selectedPlates.length === 1) {
        setTripPlateFilter(filters.selectedPlates[0]);
      } else {
        setTripPlateFilter('');
      }
    } else if (filters.plate) {
      setTripPlateFilter(filters.plate);
      setTripSelectedPlates([]);
    } else {
      setTripPlateFilter('');
      setTripSelectedPlates([]);
    }

    // Motorista
    setTripDriverFilter(filters.driverName || '');

    // Período
    setTripStartDate(filters.startDate || '');
    setTripEndDate(filters.endDate || '');

    // Resetar outros filtros secundários de viagens
    setTripTakerFilter('');
    setTripCteFilter('');
    setTripNfFilter('');
    setTripStatusListFilter('all');
    setTripDocFilter('all');
    setTripMdfeFilter('all');
    setTripAdFilter('all');
    setTripSdFilter('all');
    setTripWeightFilter('all');
    setTripPaymentTypeFilter('');

    const targetDesc = filters.origin 
      ? `origem "${filters.origin}"` 
      : filters.destination 
        ? `destino "${filters.destination}"` 
        : filters.driverName 
          ? `motorista "${filters.driverName}"` 
          : 'filtro de relatório';
    showNotification(`Navegado para Lançar Viagens filtrando por ${targetDesc}!`, 'info');
  }, [uniqueTripOrigins, uniqueTripDestinations, normalizeText, showNotification]);

  const handleTakerClick = (takerName: string) => {
    setCurrentView('trips');
    setTripTakerFilter(isInvalidTakerName(takerName) ? '' : takerName);
    setTripStartDate(dashStartDate);
    setTripEndDate(dashEndDate);
    setTripOriginFilter('');
    setTripDestinationFilter('');
    setTripCteFilter('');
    setTripPlateFilter('');
    setTripDriverFilter('');
    setTripNfFilter('');
    setTripStatusListFilter('all');
    setTripDocFilter('all');
    setTripMdfeFilter('all');
    setTripAdFilter('all');
    setTripSdFilter('all');
    setTripWeightFilter('all');
    setTripPaymentTypeFilter('');
  };

  const handlePaymentTypeClick = (pType: string) => {
    setCurrentView('trips');
    setTripPaymentTypeFilter(pType);
    setTripStartDate(dashStartDate);
    setTripEndDate(dashEndDate);
    setTripTakerFilter(dashTakerFilter);
    setTripOriginFilter('');
    setTripDestinationFilter('');
    setTripCteFilter('');
    setTripPlateFilter('');
    setTripDriverFilter('');
    setTripNfFilter('');
    setTripStatusListFilter('all');
    setTripDocFilter('all');
    setTripMdfeFilter('all');
    setTripAdFilter('all');
    setTripSdFilter('all');
    setTripWeightFilter('all');
  };

  // SIDEBAR ITEMS MEMO
  const menuItems = useMemo(() => [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'reminders', label: 'Lembretes', icon: Bell, alert: shouldFlashReminders },
    { id: 'shipments', label: 'Embarque', icon: Package },
    { id: 'loadingOrder', label: 'Ordem Carregamento', icon: FileText },
    { id: 'trips', label: 'Lançar Viagens', icon: ClipboardList },
    { id: 'reports', label: 'Relatórios', icon: BarChart3 },
    { id: 'drivers', label: 'Motoristas', icon: Users },
    { id: 'freights', label: 'Base de Fretes', icon: MapIcon },
    { id: 'map', label: 'Mapa', icon: Globe },
    { id: 'database', label: 'Banco de Dados', icon: Database },
    { id: 'notes', label: 'Notas', icon: StickyNote },
  ], [shouldFlashReminders]);

  // STABLE CALLBACKS FOR DRIVERS
  const handleRemoveDriver = useCallback((id: string) => {
    saveDrivers(drivers.filter(d => d.id !== id));
  }, [drivers]);

  const handleEditDriver = useCallback((d: Driver) => {
    setEditingDriver(d);
    setIsFormOpen(true);
  }, []);

  return (
    <div className="min-h-screen bg-[#f8fafc] flex font-inter text-slate-900 overflow-hidden">
      <aside className="w-60 bg-red-950 text-white flex-shrink-0 flex flex-col hidden md:flex sticky top-0 h-screen shadow-2xl z-20 overflow-y-auto no-scrollbar">
        <div className="p-4 px-5 flex items-center gap-2.5 shrink-0 border-b border-red-900/30">
          <div className="bg-red-600 p-1.5 rounded-lg shadow-lg shrink-0"><Truck size={20} /></div>
          {isEditingName ? (
            <div className="flex items-center gap-1 flex-1 min-w-0">
              <input
                type="text"
                autoFocus
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveName();
                  if (e.key === 'Escape') setIsEditingName(false);
                }}
                className="bg-red-900/90 border border-red-500/80 rounded px-2 py-0.5 text-white font-black text-xs uppercase tracking-tight outline-none focus:ring-2 focus:ring-red-400 w-full shadow-inner"
                placeholder="MY SYSTEM"
              />
              <button
                type="button"
                onClick={handleSaveName}
                className="p-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-xs active:scale-95 shrink-0 flex items-center justify-center"
                title="Salvar Nome"
              >
                <Check size={12} />
              </button>
              <button
                type="button"
                onClick={() => setIsEditingName(false)}
                className="p-1 rounded bg-white/10 hover:bg-white/20 text-red-200 hover:text-white transition-all shrink-0 flex items-center justify-center"
                title="Cancelar"
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            <div
              onClick={() => {
                setTempName(companyName);
                setIsEditingName(true);
              }}
              className="group flex items-center gap-1.5 cursor-pointer select-none flex-1 min-w-0"
              title="Clique para editar o nome do sistema a qualquer momento"
            >
              <h1 className="text-base font-black tracking-tighter uppercase truncate group-hover:text-red-200 transition-colors">
                {companyName}
              </h1>
              <span className="opacity-0 group-hover:opacity-100 text-red-300 hover:text-white transition-opacity p-0.5 rounded hover:bg-white/10 shrink-0">
                <Edit2 size={11} />
              </span>
            </div>
          )}
        </div>
        <nav className="flex-1 px-3 py-2 space-y-0.5 flex flex-col justify-center">
          {menuItems.map(item => (
            <button 
              key={item.id} 
              onClick={() => setCurrentView(item.id as any)} 
              className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                currentView === item.id 
                  ? 'bg-red-700 text-white shadow-md' 
                  : item.alert 
                    ? 'bg-red-600 text-white animate-pulse shadow-lg shadow-red-600/50'
                    : 'text-red-200/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon size={16} className={item.alert ? 'animate-bounce' : ''} /> {item.label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-red-900/50 shrink-0">
          <button className="flex items-center gap-2.5 w-full px-3 py-2 text-red-200/60 hover:text-white rounded-lg text-xs font-bold transition-all">
            <LogOut size={16} /> Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto no-scrollbar">
        <header className="h-16 bg-red-950 border-b border-red-900 flex items-center justify-between px-8 shrink-0 z-30 shadow-lg">
          <div className="flex flex-col">
            <div className="text-[9px] font-black text-red-400 uppercase tracking-widest leading-none mb-1 flex items-center gap-1.5">
              <Building2 size={11} className="text-red-400" />
              <span>Unidade Operacional</span>
            </div>
            <div className="flex items-center gap-2">
              {operationalUnits.length > 1 ? (
                <div className="relative flex items-center">
                  <select
                    value={activeOperationalUnit.id}
                    onChange={(e) => handleSelectActiveOperationalUnit(e.target.value)}
                    className="bg-red-900/90 hover:bg-red-900 border border-red-700/80 rounded-lg px-2.5 py-1 text-white font-mono font-black text-xs tracking-tight outline-none focus:ring-2 focus:ring-red-400 cursor-pointer shadow-inner pr-7 appearance-none"
                    title="Alternar CNPJ ativo da Unidade Operacional"
                  >
                    {operationalUnits.map(unit => (
                      <option key={unit.id} value={unit.id} className="bg-slate-900 text-white font-sans py-1">
                        {unit.cnpj} — {unit.companyName || unit.name || 'Unidade'}{unit.city ? ` (${unit.city}/${unit.state || ''})` : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={12} className="text-red-300 absolute right-2 pointer-events-none" />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsOperationalUnitModalOpen(true)}
                  className="group flex items-center gap-1.5 cursor-pointer select-none bg-red-900/70 hover:bg-red-900 border border-red-700/60 rounded-lg px-2.5 py-1 transition-all"
                  title="Clique para gerenciar os CNPJs e dados da Unidade Operacional"
                >
                  <span className="text-white font-mono font-black text-xs tracking-tight leading-none group-hover:text-red-200 transition-colors">
                    CNPJ {activeOperationalUnit.cnpj}
                  </span>
                  {(activeOperationalUnit.companyName || activeOperationalUnit.name) && (
                    <span className="text-[10px] text-red-300 font-bold truncate max-w-[140px]">
                      ({activeOperationalUnit.companyName || activeOperationalUnit.name})
                    </span>
                  )}
                  <Pencil size={10} className="text-red-400 group-hover:text-white transition-colors ml-1" />
                </button>
              )}

              {/* Botão Adicionar Mais CNPJ */}
              <button
                type="button"
                onClick={() => setIsOperationalUnitModalOpen(true)}
                className="bg-red-800 hover:bg-red-700 active:scale-95 text-white px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border border-red-600/70 shadow-xs flex items-center gap-1 cursor-pointer transition-all hover:border-red-500"
                title="Adicionar mais CNPJ à Unidade Operacional"
              >
                <PlusCircle size={12} /> Adicionar
              </button>
            </div>
          </div>
          <div className="flex items-center gap-6">
            {/* Cloud Sync Status Widget */}
            {user ? (
              <div className="flex items-center gap-3 bg-emerald-950/40 border border-emerald-500/20 px-3.5 py-1.5 rounded-2xl">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Cloud size={16} className="text-emerald-400" />
                    <span className="absolute -top-1 -right-1 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  </div>
                  <div className="hidden xl:block text-left">
                    <p className="text-[7px] font-black text-emerald-400 uppercase tracking-widest leading-none mb-0.5">Sincronizado</p>
                    <p className="text-[9px] font-bold text-emerald-100 truncate max-w-[120px] leading-none">{user.email}</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    signOut(auth);
                    showNotification("Desconectado do banco em nuvem.", "info");
                  }}
                  className="bg-emerald-800/40 hover:bg-red-700/40 text-emerald-200 hover:text-white p-1 rounded-lg border border-emerald-500/10 hover:border-red-500/10 transition-all text-[8px] font-black uppercase tracking-widest ml-1"
                  title="Sair da Conta em Nuvem"
                >
                  <LogOut size={12} />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setIsAuthModalOpen(true)} 
                className="bg-white/5 hover:bg-white/10 text-white/70 hover:text-white px-3.5 py-2 rounded-2xl border border-white/10 transition-all flex items-center gap-2"
                title="Trabalhar de qualquer computador (Sincronizar em Nuvem)"
              >
                <CloudOff size={16} className="text-red-400 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest hidden lg:block">Sincronizar</span>
              </button>
            )}

            <button 
              onClick={toggleFullScreen} 
              className="bg-white/5 hover:bg-white/10 text-white/70 hover:text-white p-2.5 rounded-2xl border border-white/10 transition-all flex items-center gap-2"
              title={isFullscreen ? "Sair da Tela Cheia" : "Tela Cheia"}
            >
              {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
              <span className="text-[10px] font-black uppercase tracking-widest hidden lg:block">Tela Cheia</span>
            </button>
            <DigitalClock />
          </div>
        </header>

        {notification && (
          <div className="fixed top-20 right-8 z-[100] animate-in slide-in-from-right-10 fade-in duration-200">
            <div className="flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border bg-white border-red-100 text-red-900">
              <CheckCircle2 className="text-red-600" size={20} />
              <p className="text-sm font-bold">{notification.message}</p>
            </div>
          </div>
        )}

        <div className={`flex-1 overflow-y-auto ${currentView === 'dashboard' ? 'p-3 sm:p-4' : 'p-6'} custom-scrollbar`}>
          <div className={`max-w-[1700px] mx-auto w-full ${currentView === 'dashboard' ? 'space-y-3' : 'space-y-5'}`}>
            
            {currentView === 'dashboard' && (
              <div className="space-y-3 animate-in fade-in duration-300">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2.5 bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div>
                      <h2 className="text-xs font-black text-slate-900 uppercase tracking-tight">Dashboard Executivo</h2>
                      <p className="text-slate-400 text-[8px] font-bold uppercase tracking-wider">Resumo Financeiro e Ranking de Produtividade</p>
                    </div>

                    <div className="hidden xl:flex items-center gap-2 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/80">
                      <div className="bg-slate-900 p-1 rounded-md text-white">
                        <Scale size={11} />
                      </div>
                      <div>
                        <p className="text-[7px] font-black text-slate-400 uppercase tracking-wider leading-none mb-0.5">Total Carregado</p>
                        <p className="text-[11px] font-black text-slate-900 leading-none">{formatTn(dashStats.totalWeightKg)}</p>
                      </div>
                    </div>

                    <div 
                      onClick={() => {
                        setCurrentView('trips');
                        setTripWeightFilter('withoutWeight');
                        setTripStartDate(dashStartDate);
                        setTripEndDate(dashEndDate);
                        setTripTakerFilter(dashTakerFilter);
                      }}
                      className="hidden xl:flex items-center gap-2 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/80 cursor-pointer hover:bg-red-50 hover:border-red-200 transition-all"
                      title="Ver Viagens Pendentes em Lançar Viagens"
                    >
                      <div className="bg-red-600 p-1 rounded-md text-white">
                        <ClockIcon size={11} />
                      </div>
                      <div>
                        <p className="text-[7px] font-black text-slate-400 uppercase tracking-wider leading-none mb-0.5">Viagens Pendentes</p>
                        <p className="text-[11px] font-black text-red-600 leading-none">{dashStats.pendingTripsCount}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="bg-slate-50 border border-slate-200/80 p-1 rounded-xl flex items-center gap-2">
                      <button 
                        onClick={() => { setDashStartDate(''); setDashEndDate(''); setDashTakerFilter(''); }}
                        className="p-1.5 text-slate-400 hover:text-red-700 transition-colors"
                        title="Limpar Filtros"
                      >
                        <FilterX size={14} />
                      </button>
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Calendar size={13} className="text-slate-400 shrink-0" />
                        <input 
                          type="date" 
                          value={dashStartDate} 
                          onChange={e => setDashStartDate(e.target.value)} 
                          className="bg-white border border-slate-200 rounded-md px-1.5 py-0.5 text-[9.5px] font-black text-slate-700 outline-none" 
                        />
                        <ArrowRight size={9} className="text-slate-300" />
                        <input 
                          type="date" 
                          value={dashEndDate} 
                          onChange={e => setDashEndDate(e.target.value)} 
                          className="bg-white border border-slate-200 rounded-md px-1.5 py-0.5 text-[9.5px] font-black text-slate-700 outline-none" 
                        />
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-xl flex items-center gap-2 min-w-[170px]">
                      <Building2 size={13} className="text-slate-400 shrink-0" />
                      <select 
                        value={dashTakerFilter} 
                        onChange={e => setDashTakerFilter(e.target.value)} 
                        className="w-full bg-transparent text-[9.5px] font-black uppercase tracking-wider outline-none text-slate-700 cursor-pointer"
                      >
                        <option value="">Todos os Tomadores</option>
                        {uniqueTakers.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* 6 KPI Cards Compact */}
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2.5">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col justify-between group hover:shadow-md transition-all border-t-3 border-t-red-700">
                    <div className="flex items-center justify-between gap-1.5 mb-1">
                      <p className="text-slate-400 text-[8px] font-black uppercase tracking-wider truncate">Faturamento Bruto</p>
                      <div className="bg-red-50 w-6 h-6 rounded-lg flex items-center justify-center text-red-600 shrink-0 group-hover:scale-110 transition-transform">
                        <DollarSign size={13} />
                      </div>
                    </div>
                    <h3 className="text-base font-black text-slate-900 tracking-tight leading-tight">{formatCurrency(dashStats.grossRevenue)}</h3>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col justify-between group hover:shadow-md transition-all border-t-3 border-t-red-600">
                    <div className="flex items-center justify-between gap-1.5 mb-1">
                      <p className="text-slate-400 text-[8px] font-black uppercase tracking-wider truncate">Faturamento Líquido</p>
                      <div className="bg-red-50 w-6 h-6 rounded-lg flex items-center justify-center text-red-600 shrink-0 group-hover:scale-110 transition-transform">
                        <Wallet size={13} />
                      </div>
                    </div>
                    <h3 className="text-base font-black text-slate-900 tracking-tight leading-tight">{formatCurrency(dashStats.netRevenue)}</h3>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col justify-between group hover:shadow-md transition-all border-t-3 border-t-emerald-600">
                    <div className="flex items-center justify-between gap-1.5 mb-1">
                      <p className="text-slate-400 text-[8px] font-black uppercase tracking-wider truncate">Margem de Lucro</p>
                      <div className="bg-emerald-50 w-6 h-6 rounded-lg flex items-center justify-center text-emerald-600 shrink-0 group-hover:scale-110 transition-transform">
                        <TrendingUp size={13} />
                      </div>
                    </div>
                    <h3 className="text-base font-black text-emerald-600 tracking-tight leading-tight">{dashStats.profitPercentage.toFixed(2)}%</h3>
                  </div>

                  <div 
                    onClick={() => setCurrentView('trips')}
                    className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col justify-between group hover:shadow-md transition-all border-t-3 border-t-blue-600 cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-1.5 mb-1">
                      <p className="text-slate-400 text-[8px] font-black uppercase tracking-wider truncate">Total Viagens</p>
                      <div className="flex items-center gap-1">
                        {dashStats.pendingTripsCount > 0 && (
                          <span className="bg-red-50 text-red-700 px-1 py-0.2 rounded text-[7px] font-black uppercase leading-tight">
                            {dashStats.pendingTripsCount} pend.
                          </span>
                        )}
                        <div className="bg-blue-50 w-6 h-6 rounded-lg flex items-center justify-center text-blue-600 shrink-0 group-hover:scale-110 transition-transform">
                          <ClipboardList size={13} />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <h3 className="text-base font-black text-slate-900 tracking-tight leading-tight">{dashStats.tripsCount}</h3>
                      <span className="text-[7.5px] font-black text-blue-600 uppercase flex items-center gap-0.5">Ver <ArrowRight size={7.5} /></span>
                    </div>
                  </div>

                  <div 
                    onClick={() => setCurrentView('drivers')}
                    className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col justify-between group hover:shadow-md transition-all border-t-3 border-t-indigo-600 cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-1.5 mb-1">
                      <p className="text-slate-400 text-[8px] font-black uppercase tracking-wider truncate">Frota Ativa</p>
                      <div className="bg-indigo-50 w-6 h-6 rounded-lg flex items-center justify-center text-indigo-600 shrink-0 group-hover:scale-110 transition-transform">
                        <Users size={13} />
                      </div>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <h3 className="text-base font-black text-slate-900 tracking-tight leading-tight">{dashStats.driversCount}</h3>
                      <span className="text-[7.5px] font-black text-indigo-600 uppercase flex items-center gap-0.5">Ver <ArrowRight size={7.5} /></span>
                    </div>
                  </div>

                  <div 
                    onClick={() => setCurrentView('freights')}
                    className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col justify-between group hover:shadow-md transition-all border-t-3 border-t-amber-600 cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-1.5 mb-1">
                      <p className="text-slate-400 text-[8px] font-black uppercase tracking-wider truncate">Base de Fretes</p>
                      <div className="bg-amber-50 w-6 h-6 rounded-lg flex items-center justify-center text-amber-600 shrink-0 group-hover:scale-110 transition-transform">
                        <MapIcon size={13} />
                      </div>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <h3 className="text-base font-black text-slate-900 tracking-tight leading-tight">{dashStats.freightsCount}</h3>
                      <span className="text-[7.5px] font-black text-amber-600 uppercase flex items-center gap-0.5">Ver <ArrowRight size={7.5} /></span>
                    </div>
                  </div>
                </div>

                {/* Ranking de Tomadores Compacto & Modalidades de Pagamento */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
                  {/* Ranking de Tomadores: Ocupa largura ampla e sem scrollbar para ver tudo */}
                  <div className="lg:col-span-8 xl:col-span-9 bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <div className="bg-red-700 p-1.5 rounded-lg text-white shadow-2xs">
                          <Award size={14} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight">Ranking de Tomadores por Viagens</h4>
                            <span className="text-[7.5px] font-bold text-slate-500 bg-slate-100 border border-slate-200/80 px-1.5 py-0.2 rounded uppercase">
                              {dashStats.ranking.length} {dashStats.ranking.length === 1 ? 'tomador' : 'tomadores'}
                            </span>
                          </div>
                          <p className="text-[7.5px] text-slate-400 font-bold uppercase tracking-wider">Classificado por Quantidade de Viagens Realizadas (Lançar Viagens)</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <span className="text-[8px] font-black text-slate-700 bg-slate-50 border border-slate-200/90 px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs">
                          <ClipboardList size={10} className="text-red-600 shrink-0" />
                          {dashStats.ranking.reduce((acc, curr) => acc + curr.tripCount, 0)} Viagens Realizadas
                        </span>

                        {dashStats.ranking.length > 5 && (
                          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                            <button
                              onClick={() => setRankingViewMode('table')}
                              className={`px-2 py-0.5 rounded text-[7.5px] font-black uppercase flex items-center gap-1 transition-all ${
                                rankingViewMode === 'table' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                              }`}
                              title="Tabela completa com todas as colunas"
                            >
                              <ListOrdered size={9} /> Tabela
                            </button>
                            <button
                              onClick={() => setRankingViewMode('split')}
                              className={`px-2 py-0.5 rounded text-[7.5px] font-black uppercase flex items-center gap-1 transition-all ${
                                rankingViewMode === 'split' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                              }`}
                              title="Grade em 2 colunas para ver todos sem rolar"
                            >
                              <Layers size={9} /> 2 Colunas
                            </button>
                          </div>
                        )}

                        <Trophy size={14} className="text-amber-500 shrink-0" />
                      </div>
                    </div>

                    {dashStats.ranking.length === 0 ? (
                      <div className="text-center py-6">
                        <Package size={22} className="text-slate-300 mx-auto mb-1.5" />
                        <p className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest">Nenhum tomador com viagens no período</p>
                      </div>
                    ) : rankingViewMode === 'split' ? (
                      /* 2-Column Split Mode for extreme vertical compactness */
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {[0, 1].map(colIdx => {
                          const half = Math.ceil(dashStats.ranking.length / 2);
                          const items = colIdx === 0 
                            ? dashStats.ranking.slice(0, half) 
                            : dashStats.ranking.slice(half);
                          const startIndex = colIdx === 0 ? 0 : half;
                          if (items.length === 0) return null;
                          return (
                            <div key={colIdx} className="overflow-x-auto">
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr className="border-b border-slate-200/80 bg-slate-50/80 text-[7.5px] font-black uppercase text-slate-500 tracking-wider">
                                    <th className="py-1 px-1.5 text-center w-6">#</th>
                                    <th className="py-1 px-1.5">Tomador</th>
                                    <th className="py-1 px-1.5 text-center">Viagens</th>
                                    <th className="py-1 px-1.5 text-right">Peso</th>
                                    <th className="py-1 px-1.5 text-right">Bruto</th>
                                    <th className="py-1 px-1.5 text-right">Margem</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100/90">
                                  {items.map((item, idx) => {
                                    const rankIndex = startIndex + idx;
                                    return (
                                      <tr
                                        key={item.name}
                                        onClick={() => handleTakerClick(item.name)}
                                        className="hover:bg-red-50/60 transition-colors cursor-pointer group text-[9px]"
                                        title={`Clique para visualizar as ${item.tripCount} viagens de ${item.name}`}
                                      >
                                        <td className="py-1 px-1.5 text-center whitespace-nowrap">
                                          <span className={`inline-flex items-center justify-center w-4.5 h-4 rounded font-black text-[7.5px] ${
                                            rankIndex === 0 ? 'bg-amber-400 text-amber-950 font-extrabold shadow-2xs' :
                                            rankIndex === 1 ? 'bg-slate-200 text-slate-800' :
                                            rankIndex === 2 ? 'bg-amber-600 text-white' :
                                            'bg-slate-100 text-slate-600'
                                          }`}>
                                            {rankIndex + 1}º
                                          </span>
                                        </td>
                                        <td className="py-1 px-1.5 font-black text-slate-900 uppercase whitespace-nowrap">
                                          <div className="flex items-center gap-1">
                                            <span className="truncate max-w-[120px] 2xl:max-w-[170px]">{item.name}</span>
                                            {item.period && (
                                              <span className="text-[7px] text-slate-400 font-semibold" title={item.period}>
                                                ({item.period})
                                              </span>
                                            )}
                                          </div>
                                        </td>
                                        <td className="py-1 px-1.5 text-center whitespace-nowrap">
                                          <span className="bg-red-600 group-hover:bg-red-700 text-white px-1.5 py-0.2 rounded font-black text-[8px] uppercase tracking-wider shadow-2xs">
                                            {item.tripCount} {item.tripCount === 1 ? 'vg' : 'vgs'}
                                          </span>
                                        </td>
                                        <td className="py-1 px-1.5 text-right font-bold text-slate-700 tabular-nums whitespace-nowrap">
                                          {formatTn(item.weight)}
                                        </td>
                                        <td className="py-1 px-1.5 text-right font-bold text-slate-800 tabular-nums whitespace-nowrap">
                                          {formatCurrency(item.gross)}
                                        </td>
                                        <td className="py-1 px-1.5 text-right whitespace-nowrap">
                                          <span className={`font-black tabular-nums text-[8.5px] px-1 py-0.2 rounded ${
                                            item.margin >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                                          }`}>
                                            {item.margin.toFixed(1)}%
                                          </span>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      /* Single Table Mode - Compact, full-width */
                      <div className="w-full overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-200/80 bg-slate-50/80 text-[7.5px] font-black uppercase text-slate-500 tracking-wider">
                              <th className="py-1 px-2 text-center w-7">#</th>
                              <th className="py-1 px-2">Tomador / Cliente</th>
                              <th className="py-1 px-2 text-center">Período</th>
                              <th className="py-1 px-2 text-center">Viagens</th>
                              <th className="py-1 px-2 text-right">Peso Total</th>
                              <th className="py-1 px-2 text-right">Faturamento Bruto</th>
                              <th className="py-1 px-2 text-right">Líquido</th>
                              <th className="py-1 px-2 text-right">Margem</th>
                              <th className="py-1 px-1.5 text-center w-5"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100/90">
                            {dashStats.ranking.map((item, index) => {
                              const maxTrips = dashStats.ranking[0]?.tripCount || 1;
                              const tripPercentage = Math.round((item.tripCount / maxTrips) * 100);
                              return (
                                <tr
                                  key={item.name}
                                  onClick={() => handleTakerClick(item.name)}
                                  className="hover:bg-red-50/60 transition-colors cursor-pointer group text-[9.5px]"
                                  title={`Clique para visualizar as ${item.tripCount} viagens de ${item.name} em Lançar Viagens`}
                                >
                                  <td className="py-1.5 px-2 text-center whitespace-nowrap">
                                    <span className={`inline-flex items-center justify-center w-5 h-4.5 rounded font-black text-[8px] ${
                                      index === 0 ? 'bg-amber-400 text-amber-950 font-extrabold shadow-2xs' : 
                                      index === 1 ? 'bg-slate-200 text-slate-800' : 
                                      index === 2 ? 'bg-amber-600 text-white' : 
                                      'bg-slate-100 text-slate-600'
                                    }`}>
                                      {index + 1}º
                                    </span>
                                  </td>
                                  <td className="py-1.5 px-2 font-black text-slate-900 uppercase whitespace-nowrap">
                                    <div className="flex items-center gap-1.5">
                                      <span className="truncate max-w-[200px] xl:max-w-[280px]">{item.name}</span>
                                    </div>
                                  </td>
                                  <td className="py-1.5 px-2 text-center whitespace-nowrap">
                                    {item.period ? (
                                      <span className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200/80 text-slate-600 px-1.5 py-0.2 rounded text-[7.5px] font-bold uppercase tracking-wider">
                                        <Calendar size={7.5} className="text-red-500 shrink-0" />
                                        {item.period}
                                      </span>
                                    ) : (
                                      <span className="text-slate-300 text-[8px]">-</span>
                                    )}
                                  </td>
                                  <td className="py-1.5 px-2 whitespace-nowrap text-center">
                                    <div className="inline-flex items-center gap-1.5">
                                      <span className="bg-red-600 group-hover:bg-red-700 text-white px-2 py-0.5 rounded font-black text-[8.5px] uppercase tracking-wider shadow-2xs">
                                        {item.tripCount} {item.tripCount === 1 ? 'vg' : 'vgs'}
                                      </span>
                                      <div className="w-12 bg-slate-200/80 h-1 rounded-full overflow-hidden hidden sm:block" title={`${tripPercentage}% do 1º colocado`}>
                                        <div className={`h-full ${index === 0 ? 'bg-amber-500' : 'bg-red-600'}`} style={{ width: `${tripPercentage}%` }} />
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-1.5 px-2 text-right font-bold text-slate-700 tabular-nums whitespace-nowrap">
                                    {formatTn(item.weight)}
                                  </td>
                                  <td className="py-1.5 px-2 text-right font-bold text-slate-800 tabular-nums whitespace-nowrap">
                                    {formatCurrency(item.gross)}
                                  </td>
                                  <td className="py-1.5 px-2 text-right font-black text-emerald-700 tabular-nums whitespace-nowrap">
                                    {formatCurrency(item.net)}
                                  </td>
                                  <td className="py-1.5 px-2 text-right whitespace-nowrap">
                                    <span className={`font-black tabular-nums text-[9px] px-1.5 py-0.2 rounded ${
                                      item.margin >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                                    }`}>
                                      {item.margin.toFixed(1)}%
                                    </span>
                                  </td>
                                  <td className="py-1.5 px-1.5 text-center text-slate-300 group-hover:text-red-600 whitespace-nowrap">
                                    <ArrowRight size={10} />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Modalidades de Pagamento Compacto */}
                  <div className="lg:col-span-4 xl:col-span-3 bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <div className="bg-slate-100 p-1.5 rounded-lg text-slate-900"><CreditCard size={14} /></div>
                        <div>
                          <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-tight">Modalidades de Pagamento</h4>
                          <p className="text-[7.5px] text-slate-400 font-bold uppercase tracking-wider">Frequência de Uso</p>
                        </div>
                      </div>
                      <span className="text-[8px] font-black text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                        {dashStats.payments.pix + dashStats.payments.cf + dashStats.payments.pagbem + dashStats.payments.outros} total
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
                      <div 
                        onClick={() => handlePaymentTypeClick('pix')}
                        className="p-2 bg-white rounded-lg border border-slate-200/90 flex items-center justify-between group hover:border-red-400 hover:bg-slate-50/70 transition-all cursor-pointer shadow-2xs"
                      >
                        <div className="flex items-center gap-2">
                          <div className="bg-red-50 p-1.5 rounded-md text-red-600 group-hover:scale-105 transition-transform"><Zap size={13} /></div>
                          <div>
                            <h5 className="text-[8.5px] font-black uppercase tracking-wider text-slate-900">PIX</h5>
                            <p className="text-[6.5px] text-slate-400 font-bold uppercase">Instantâneo</p>
                          </div>
                        </div>
                        <span className="text-base font-black text-slate-900 tabular-nums">{dashStats.payments.pix}</span>
                      </div>

                      <div 
                        onClick={() => handlePaymentTypeClick('cf')}
                        className="p-2 bg-white rounded-lg border border-slate-200/90 flex items-center justify-between group hover:border-red-400 hover:bg-slate-50/70 transition-all cursor-pointer shadow-2xs"
                      >
                        <div className="flex items-center gap-2">
                          <div className="bg-red-50 p-1.5 rounded-md text-red-600 group-hover:scale-105 transition-transform"><Ticket size={13} /></div>
                          <div>
                            <h5 className="text-[8.5px] font-black uppercase tracking-wider text-slate-900">Carta Frete</h5>
                            <p className="text-[6.5px] text-slate-400 font-bold uppercase">Tradicional</p>
                          </div>
                        </div>
                        <span className="text-base font-black text-slate-900 tabular-nums">{dashStats.payments.cf}</span>
                      </div>

                      <div 
                        onClick={() => handlePaymentTypeClick('pagbem')}
                        className="p-2 bg-white rounded-lg border border-slate-200/90 flex items-center justify-between group hover:border-blue-400 hover:bg-slate-50/70 transition-all cursor-pointer shadow-2xs"
                      >
                        <div className="flex items-center gap-2">
                          <div className="bg-slate-100 p-1.5 rounded-md text-blue-600 group-hover:scale-105 transition-transform"><Layers size={13} /></div>
                          <div>
                            <h5 className="text-[8.5px] font-black uppercase tracking-wider text-slate-900">PagBem</h5>
                            <p className="text-[6.5px] text-slate-400 font-bold uppercase">Eletrônico</p>
                          </div>
                        </div>
                        <span className="text-base font-black text-slate-900 tabular-nums">{dashStats.payments.pagbem}</span>
                      </div>

                      <div 
                        onClick={() => handlePaymentTypeClick('outros')}
                        className="p-2 bg-white rounded-lg border border-slate-200/90 flex items-center justify-between group hover:border-slate-400 hover:bg-slate-50/70 transition-all cursor-pointer shadow-2xs"
                      >
                        <div className="flex items-center gap-2">
                          <div className="bg-slate-50 p-1.5 rounded-md text-slate-400 group-hover:scale-105 transition-transform"><Banknote size={13} /></div>
                          <div>
                            <h5 className="text-[8.5px] font-black uppercase tracking-wider text-slate-900">Outros</h5>
                            <p className="text-[6.5px] text-slate-400 font-bold uppercase">Diversos</p>
                          </div>
                        </div>
                        <span className="text-base font-black text-slate-900 tabular-nums">{dashStats.payments.outros}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentView === 'drivers' && (
              <div className="animate-in slide-in-from-bottom-1 fade-in duration-100 space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">Cadastro de Frota</h2>
                    <p className="text-[9px] font-bold text-slate-400">Gerencie os motoristas e veículos da sua frota</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button 
                      onClick={handleRemoveDuplicateDrivers} 
                      className="bg-white text-slate-500 hover:text-red-700 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase border border-slate-200 flex items-center gap-1.5 transition-all hover:bg-slate-50 cursor-pointer"
                      title="Remover motoristas com nomes exatamente duplicados"
                    >
                      <UserMinus size={12} /> Remover Duplicados
                    </button>
                    <button 
                      onClick={() => handleExportDriversExcel(filteredDrivers)} 
                      className="bg-white text-slate-700 hover:text-slate-900 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase border border-slate-200 flex items-center gap-1.5 transition-all hover:bg-slate-50 cursor-pointer"
                      title="Baixar lista completa de motoristas em formato Excel com todos os dados cadastrais"
                    >
                      <Download size={12} /> Contatos (Excel)
                    </button>
                    <button 
                      onClick={handleDownloadDriversTemplate} 
                      className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase flex items-center gap-1.5 transition-all shadow-sm"
                      title="Baixar planilha modelo Excel com TODOS OS CAMPOS para cadastrar novos motoristas"
                    >
                      <FileSpreadsheet size={12} className="text-emerald-600" /> Modelo Excel
                    </button>
                    <button 
                      onClick={() => setIsImportOpen(true)} 
                      className="bg-emerald-600 text-white hover:bg-emerald-700 px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase flex items-center gap-1.5 transition-all shadow-md active:scale-95"
                      title="Importar novos motoristas a partir de planilha Excel"
                    >
                      <Upload size={12} /> Importar Excel
                    </button>
                    <button onClick={() => { setEditingDriver(null); setIsFormOpen(true); }} className="bg-red-700 text-white px-4 py-1.5 rounded-lg text-[9px] font-black uppercase shadow-lg flex items-center gap-1.5 transition-all hover:bg-red-800"><PlusCircle size={12} /> Novo Cadastro</button>
                  </div>
                </div>

                {/* TODOS OS FILTROS DE MOTORISTAS RESTAURADOS */}
                <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-2.5 items-end">
                  <button 
                    onClick={() => {
                      setDriverSearch('');
                      setDriverPlateFilter('');
                      setDriverCpfFilter('');
                      setDriverAnttFilter('');
                      setDriverTrailerTypeFilter('');
                      setDriverAxlesFilter('');
                      setDriverDddFilter('');
                    }}
                    className="p-2 text-slate-400 hover:text-red-700 transition-colors bg-slate-50 rounded-lg border border-slate-100 mb-0.5"
                    title="Limpar Filtros"
                  >
                    <FilterX size={16} />
                  </button>

                  <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5 flex-1 items-end w-full">
                    <div className="space-y-1">
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Motorista</label>
                      <div className="relative">
                        <User size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300" />
                        <input 
                          value={driverSearch} 
                          onChange={e => setDriverSearch(e.target.value)} 
                          className="w-full bg-slate-50 border border-slate-100 rounded-lg pl-8 pr-2.5 py-1.5 text-[11px] font-bold outline-none focus:ring-2 focus:ring-red-100 placeholder-slate-300" 
                          placeholder="Nome..." 
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">CPF / CNH</label>
                      <div className="relative">
                        <Fingerprint size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300" />
                        <input 
                          value={driverCpfFilter} 
                          onChange={e => setDriverCpfFilter(e.target.value)} 
                          className="w-full bg-slate-50 border border-slate-100 rounded-lg pl-8 pr-2.5 py-1.5 text-[11px] font-bold outline-none focus:ring-2 focus:ring-red-100 placeholder-slate-300" 
                          placeholder="Documento..." 
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Placa Cavalo</label>
                      <div className="relative">
                        <Truck size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300" />
                        <input 
                          value={driverPlateFilter} 
                          onChange={e => setDriverPlateFilter(e.target.value)} 
                          className="w-full bg-slate-50 border border-slate-100 rounded-lg pl-8 pr-2.5 py-1.5 text-[11px] font-bold uppercase outline-none focus:ring-2 focus:ring-red-100 placeholder-slate-300" 
                          placeholder="Placa..." 
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">ANTT</label>
                      <div className="relative">
                        <Globe size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300" />
                        <input 
                          value={driverAnttFilter} 
                          onChange={e => setDriverAnttFilter(e.target.value)} 
                          className="w-full bg-slate-50 border border-slate-100 rounded-lg pl-8 pr-2.5 py-1.5 text-[11px] font-bold uppercase outline-none focus:ring-2 focus:ring-red-100 placeholder-slate-300" 
                          placeholder="ANTT..." 
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo / Modelo</label>
                      <div className="relative">
                        <Layers size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                        <select 
                          value={driverTrailerTypeFilter} 
                          onChange={e => setDriverTrailerTypeFilter(e.target.value)} 
                          className="w-full bg-slate-50 border border-slate-100 rounded-lg pl-8 pr-2.5 py-1.5 text-[11px] font-bold outline-none focus:ring-2 focus:ring-red-100 appearance-none cursor-pointer"
                        >
                          <option value="">Todos os Tipos</option>
                          {uniqueTrailerTypes.map(type => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                        <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Filtro Discreto de Eixos */}
                  {uniqueAxleCounts.length > 0 && (
                    <div className="flex items-center gap-2 px-2.5 py-1 bg-white rounded-lg border border-slate-200 shadow-sm w-fit animate-in fade-in slide-in-from-left-4 duration-500">
                      <div className="flex items-center gap-1 text-slate-400">
                        <ListOrdered size={11} />
                        <span className="text-[8.5px] font-black uppercase tracking-wider">Eixos:</span>
                      </div>
                      <div className="flex gap-1">
                        <button 
                          onClick={() => setDriverAxlesFilter('')}
                          className={`px-1.5 py-0.5 rounded-md text-[8.5px] font-bold transition-all border ${
                            driverAxlesFilter === '' 
                              ? 'bg-red-700 text-white border-red-700 shadow-sm' 
                              : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-slate-100'
                          }`}
                        >
                          TODOS
                        </button>
                        {uniqueAxleCounts.map(count => (
                          <button 
                            key={count}
                            onClick={() => setDriverAxlesFilter(String(count))}
                            className={`px-1.5 py-0.5 rounded-md text-[8.5px] font-bold transition-all border ${
                              driverAxlesFilter === String(count) 
                                ? 'bg-red-700 text-white border-red-700 shadow-sm' 
                                : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-slate-100'
                            }`}
                          >
                            {count} E
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Filtro Discreto de DDD */}
                  {uniqueDdds.length > 0 && (
                    <div className="flex items-center gap-2 px-2.5 py-1 bg-white rounded-lg border border-slate-200 shadow-sm max-w-full overflow-hidden animate-in fade-in slide-in-from-left-4 duration-500">
                      <div className="flex items-center gap-1 text-slate-400 shrink-0">
                        <Phone size={11} />
                        <span className="text-[8.5px] font-black uppercase tracking-wider">DDD:</span>
                      </div>
                      <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar py-0.5 whitespace-nowrap">
                        <button 
                          onClick={() => setDriverDddFilter('')}
                          className={`px-1.5 py-0.5 rounded-md text-[8.5px] font-bold transition-all border shrink-0 ${
                            driverDddFilter === '' 
                              ? 'bg-red-700 text-white border-red-700 shadow-sm' 
                              : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-slate-100'
                          }`}
                        >
                          TODOS
                        </button>
                        {uniqueDdds.map(ddd => (
                          <button 
                            key={ddd}
                            onClick={() => setDriverDddFilter(ddd)}
                            className={`px-1.5 py-0.5 rounded-md text-[8.5px] font-bold transition-all border shrink-0 ${
                              driverDddFilter === ddd 
                                ? 'bg-red-700 text-white border-red-700 shadow-sm' 
                                : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-slate-100'
                            }`}
                          >
                            {ddd}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <DriverList 
                  drivers={filteredDrivers} 
                  onRemove={handleRemoveDriver} 
                  onEdit={handleEditDriver} 
                />
              </div>
            )}

            {currentView === 'freights' && (
              <div className="animate-in slide-in-from-bottom-2 fade-in duration-300 space-y-3">
                 <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-slate-900 tracking-tight uppercase">Base de Fretes</h2>
                    <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-100">
                      {filteredFreights.length} / {freights.length} rotas
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingFreight(null); setIsFreightFormOpen(true); }} className="bg-red-700 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase shadow-sm flex items-center gap-1.5 transition-all hover:bg-red-800 cursor-pointer"><PlusCircle size={12} /> Novo Frete</button>
                  </div>
                </div>

                {/* Filtros Discretos e Compactos */}
                <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs grid grid-cols-2 md:grid-cols-5 gap-2 items-end">
                  <div className="relative">
                    <label className="block text-[7.5px] font-black text-slate-400 uppercase tracking-wider mb-0.5 ml-0.5">Origem</label>
                    <div className="relative">
                      <select 
                        value={freightOriginFilter} 
                        onChange={e => setFreightOriginFilter(e.target.value)} 
                        className="w-full bg-slate-50 border border-slate-100 rounded-md pl-6 pr-2 py-1 text-[10px] font-bold outline-none focus:ring-2 focus:ring-red-100 appearance-none cursor-pointer text-slate-700"
                      >
                        <option value="">Todas as Origens</option>
                        {frOrigins.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                      <MapPin size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                  <div className="relative">
                    <label className="block text-[7.5px] font-black text-slate-400 uppercase tracking-wider mb-0.5 ml-0.5">Destino</label>
                    <div className="relative">
                      <select 
                        value={freightDestFilter} 
                        onChange={e => setFreightDestFilter(e.target.value)} 
                        className="w-full bg-slate-50 border border-slate-100 rounded-md pl-6 pr-2 py-1 text-[10px] font-bold outline-none focus:ring-2 focus:ring-red-100 appearance-none cursor-pointer text-slate-700"
                      >
                        <option value="">Todos os Destinos</option>
                        {frDestinations.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                      <Navigation size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                  <div className="relative">
                    <label className="block text-[7.5px] font-black text-slate-400 uppercase tracking-wider mb-0.5 ml-0.5">Tomador</label>
                    <div className="relative">
                      <select 
                        value={freightTakerFilter} 
                        onChange={e => setFreightTakerFilter(e.target.value)} 
                        className="w-full bg-slate-50 border border-slate-100 rounded-md pl-6 pr-2 py-1 text-[10px] font-bold outline-none focus:ring-2 focus:ring-red-100 appearance-none cursor-pointer text-slate-700"
                      >
                        <option value="">Todos os Tomadores</option>
                        {frTakers.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <Building2 size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                  <div className="relative">
                    <label className="block text-[7.5px] font-black text-slate-400 uppercase tracking-wider mb-0.5 ml-0.5">Produto</label>
                    <div className="relative">
                      <select 
                        value={freightProductFilter} 
                        onChange={e => setFreightProductFilter(e.target.value)} 
                        className="w-full bg-slate-50 border border-slate-100 rounded-md pl-6 pr-2 py-1 text-[10px] font-bold outline-none focus:ring-2 focus:ring-red-100 appearance-none cursor-pointer text-slate-700"
                      >
                        <option value="">Todos os Produtos</option>
                        {frProducts.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                      <Package size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                  <div className="relative">
                    <label className="block text-[7.5px] font-black text-slate-400 uppercase tracking-wider mb-0.5 ml-0.5">Status</label>
                    <div className="relative">
                      <select 
                        value={freightStatusFilter} 
                        onChange={e => setFreightStatusFilter(e.target.value as any)}
                        className="w-full bg-slate-50 border border-slate-100 rounded-md pl-6 pr-2 py-1 text-[10px] font-bold outline-none focus:ring-2 focus:ring-red-100 appearance-none cursor-pointer text-slate-700"
                      >
                        <option value="all">Todos os Status</option>
                        <option value="active">Apenas Ativos</option>
                        <option value="inactive">Apenas Inativos</option>
                      </select>
                      <Activity size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <FreightList 
                  freights={filteredFreights} 
                  onRemove={(id) => saveFreights(freights.filter(f => f.id !== id))} 
                  onEdit={(f) => { setEditingFreight(f); setIsFreightFormOpen(true); }} 
                  onDuplicate={(f) => {
                    const duplicated = { ...f, id: generateId(), createdAt: new Date().toISOString() };
                    setEditingFreight(duplicated);
                    setIsFreightFormOpen(true);
                    showNotification("Frete duplicado! Ajuste os dados conforme necessário.", "info");
                  }}
                />
              </div>
            )}

            {currentView === 'shipments' && (
              <ShipmentView 
                shipments={shipments} 
                trips={trips}
                freights={freights}
                drivers={drivers}
                onImport={(data) => { saveShipments([...data, ...shipments]); showNotification(`${data.length} embarques importados!`, "success"); }} 
                onDelete={(id) => { 
                  if (id.startsWith('trip_')) {
                    const tripId = id.replace('trip_', '');
                    saveTrips(trips.filter(t => t.id !== tripId));
                    showNotification("Viagem excluída de Lançar Viagens!", "info");
                  } else {
                    saveShipments(shipments.filter(s => s.id !== id)); 
                    showNotification("Embarque excluído!", "info"); 
                  }
                }}
                onEdit={(s) => { 
                  if ((s as any).isFromTrips) {
                    const tripId = (s as any).originalTripId || s.id.replace('trip_', '');
                    const updatedTrips = trips.map(t => {
                      if (t.id === tripId) {
                        return {
                          ...t,
                          status: (s.status === 'Carregado' ? 'Carregado' : 'Pendente') as any,
                          notes: s.obs || t.notes,
                          weight: s.weight || t.weight,
                          driverName: s.driver || t.driverName,
                          truckPlate: s.plate || t.truckPlate,
                          product: s.product || t.product,
                          serviceTaker: s.client || s.branch || t.serviceTaker
                        };
                      }
                      return t;
                    });
                    saveTrips(updatedTrips);
                    showNotification("Viagem atualizada em Lançar Viagens!", "success");
                  } else {
                    saveShipments(shipments.map(item => item.id === s.id ? s : item)); 
                    showNotification("Embarque atualizado!", "success"); 
                  }
                }}
                onAdd={(data) => { saveShipments([{ ...data, id: generateId(), createdAt: new Date().toISOString() }, ...shipments]); showNotification("Embarque cadastrado!", "success"); }}
                onClearAll={(ids) => { 
                  const shipmentIds = ids.filter(id => !id.startsWith('trip_'));
                  const tripIds = ids.filter(id => id.startsWith('trip_')).map(id => id.replace('trip_', ''));
                  if (shipmentIds.length > 0) saveShipments(shipments.filter(s => !shipmentIds.includes(s.id)));
                  if (tripIds.length > 0) saveTrips(trips.filter(t => !tripIds.includes(t.id)));
                  showNotification("Itens selecionados removidos!", "info"); 
                }}
                filters={{
                  startDate: shipmentStartDate,
                  endDate: shipmentEndDate,
                  destinationFilter: shipmentDestinationFilter,
                  plateFilter: shipmentPlateFilter,
                  productFilter: shipmentProductFilter,
                  showDuplicates: shipmentShowDuplicates,
                  statusFilter: shipmentStatusFilter,
                  originFilter: shipmentOriginFilter
                }}
                setFilters={{
                  setStartDate: setShipmentStartDate,
                  setEndDate: setShipmentEndDate,
                  setDestinationFilter: setShipmentDestinationFilter,
                  setPlateFilter: setShipmentPlateFilter,
                  setProductFilter: setShipmentProductFilter,
                  setShowDuplicates: setShipmentShowDuplicates,
                  setStatusFilter: setShipmentStatusFilter,
                  setOriginFilter: setShipmentOriginFilter
                }}
              />
            )}
            {currentView === 'market' && <MarketView />}
            <div className={currentView === 'map' ? 'block' : 'hidden'}>
              <MapView isVisible={currentView === 'map'} shipments={shipments} freights={freights} />
            </div>
            {currentView === 'loadingOrder' && (
              <LoadingOrderView 
                freights={freights} 
                drivers={drivers} 
                trips={trips} 
                operationalUnits={operationalUnits}
                activeOperationalUnitId={activeOperationalUnit.id}
                onOpenManageUnits={() => setIsOperationalUnitModalOpen(true)}
                onGenerateTrip={(d) => {
                  setEditingTrip({ ...d, id: 'temp-' + Date.now(), createdAt: new Date().toISOString() } as Trip);
                  setIsTripFormOpen(true);
                }} 
              />
            )}
            
            {currentView === 'trips' && (
              <div className="animate-in slide-in-from-bottom-2 fade-in duration-300 space-y-5">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">Lançar Viagens</h2>
                  <div className="flex gap-2 sm:gap-3 items-center">
                    {tripsHistory.length > 0 && (
                      <button 
                        onClick={undoTrips} 
                        className="bg-white text-slate-400 hover:text-blue-600 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase border border-slate-100 flex items-center gap-1.5 transition-all hover:bg-slate-50" 
                        title="Desfazer última ação"
                      >
                        <Undo2 size={12} /> Desfazer
                      </button>
                    )}
                    <button 
                      onClick={async () => {
                        if (printTripsPdfTrigger) {
                          setIsPrintingTripsPdfTop(true);
                          try {
                            await printTripsPdfTrigger();
                            showNotification("Relatório em PDF gerado com sucesso!", "success");
                          } catch (err) {
                            console.error("Erro ao gerar PDF:", err);
                            showNotification("Erro ao gerar relatório em PDF.", "info");
                          } finally {
                            setIsPrintingTripsPdfTop(false);
                          }
                        }
                      }}
                      disabled={isPrintingTripsPdfTop || filteredTripsList.length === 0}
                      className="bg-white text-slate-700 hover:text-red-700 hover:border-red-300 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase border border-slate-200 flex items-center gap-1.5 transition-all hover:bg-slate-50 shadow-2xs cursor-pointer disabled:opacity-40" 
                      title="Imprimir lista de viagens em formato PDF (respeitando os filtros ativos)"
                    >
                      {isPrintingTripsPdfTop ? (
                        <Loader2 size={12} className="animate-spin text-red-600" />
                      ) : (
                        <Printer size={12} className="text-slate-500" />
                      )}
                      <span>{isPrintingTripsPdfTop ? 'Gerando PDF...' : 'Imprimir PDF'}</span>
                    </button>
                    <button onClick={() => setIsTripImportOpen(true)} className="bg-white text-slate-700 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase border border-slate-200 flex items-center gap-2 transition-all hover:bg-slate-50"><FileSpreadsheet size={12} /> Importar</button>
                    <button onClick={() => { setEditingTrip(null); setIsTripFormOpen(true); }} className="bg-red-700 text-white px-4 py-1.5 rounded-xl text-[9px] font-black uppercase shadow-lg flex items-center gap-2 transition-all hover:bg-red-800"><PlusCircle size={12} /> Novo Lançamento</button>
                  </div>
                </div>

                {/* Cards de Resumo da Lista */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-xs flex items-center gap-2.5 text-left">
                    <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 shrink-0">
                      <Hash size={14} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">Viagens Filtradas</p>
                      <h3 className="text-xs font-black text-slate-900 truncate">{tripStats.count}</h3>
                    </div>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-xs flex items-center gap-2.5 text-left">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${tripStats.totalProfit < 0 ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                      <DollarSign size={14} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">Lucro Estimado</p>
                      <h3 className={`text-xs font-black truncate ${tripStats.totalProfit < 0 ? 'text-red-600' : 'text-slate-900'}`}>{formatCurrency(tripStats.totalProfit)}</h3>
                    </div>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-xs flex items-center gap-2.5 text-left">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${tripStats.avgMargin < -1 ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                      <TrendingUp size={14} className={tripStats.avgMargin < -1 ? 'rotate-180' : ''} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">Margem Média</p>
                      <h3 className={`text-xs font-black truncate ${tripStats.avgMargin < -1 ? 'text-red-600' : 'text-slate-900'}`}>{tripStats.avgMargin.toFixed(1)}%</h3>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 items-stretch">
                  <div className="flex flex-col justify-between gap-1">
                    <div className="flex gap-1 items-center flex-wrap">
                      <button 
                        onClick={resetTripFilters}
                        className="p-1.5 text-slate-400 hover:text-red-700 transition-colors bg-white rounded-lg border border-slate-200 shadow-xs cursor-pointer"
                        title="Limpar Filtros"
                      >
                        <FilterX size={14} />
                      </button>

                      <button 
                        onClick={() => setTripMdfeFilter(tripMdfeFilter === 'Pendente' ? 'all' : 'Pendente')}
                        className={`px-2 py-1 transition-all rounded-lg border shadow-xs flex items-center gap-1 cursor-pointer ${
                          tripMdfeFilter === 'Pendente' 
                            ? 'bg-blue-600 text-white border-blue-700 shadow-xs' 
                            : 'bg-white text-slate-400 border-slate-200 hover:text-blue-700'
                        }`}
                        title="Filtrar MDFE Pendente"
                      >
                        <ClipboardList size={13} />
                        <span className="text-[7.5px] font-black uppercase tracking-wider leading-none">
                          {tripMdfeFilter === 'Pendente' ? 'Pendente' : 'MDFE'}
                        </span>
                      </button>

                      <button 
                        onClick={() => setTripAdFilter(tripAdFilter === 'Pendente' ? 'all' : 'Pendente')}
                        className={`px-2 py-1 transition-all rounded-lg border shadow-xs flex items-center gap-1 cursor-pointer ${
                          tripAdFilter === 'Pendente' 
                            ? 'bg-amber-600 text-white border-amber-700 shadow-xs' 
                            : 'bg-white text-slate-400 border-slate-200 hover:text-amber-700'
                        }`}
                        title="Filtrar AD sem dados"
                      >
                        <span className="text-[7.5px] font-black uppercase tracking-wider leading-none">
                          {tripAdFilter === 'Pendente' ? 'AD S/ Dados' : 'AD'}
                        </span>
                      </button>

                      <button 
                        onClick={() => setTripSdFilter(tripSdFilter === 'Pendente' ? 'all' : 'Pendente')}
                        className={`px-2 py-1 transition-all rounded-lg border shadow-xs flex items-center gap-1 cursor-pointer ${
                          tripSdFilter === 'Pendente' 
                            ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs' 
                            : 'bg-white text-slate-400 border-slate-200 hover:text-indigo-700'
                        }`}
                        title="Filtrar SD sem dados"
                      >
                        <span className="text-[7.5px] font-black uppercase tracking-wider leading-none">
                          {tripSdFilter === 'Pendente' ? 'SD S/ Dados' : 'SD'}
                        </span>
                      </button>

                      <button 
                        onClick={() => setTripWeightFilter(tripWeightFilter === 'withoutWeight' ? 'all' : 'withoutWeight')}
                        className={`px-2 py-1 transition-all rounded-lg border shadow-xs flex items-center gap-1 cursor-pointer ${
                          tripWeightFilter === 'withoutWeight' 
                            ? 'bg-rose-600 text-white border-rose-700 shadow-xs' 
                            : 'bg-white text-slate-400 border-slate-200 hover:text-rose-700'
                        }`}
                        title="Filtrar viagens sem peso inserido"
                      >
                        <Scale size={13} />
                        <span className="text-[7.5px] font-black uppercase tracking-wider leading-none">
                          {tripWeightFilter === 'withoutWeight' ? 'S/ Peso' : 'S/ Peso'}
                        </span>
                      </button>

                      <div className="relative">
                        <select 
                          value={tripPaymentTypeFilter} 
                          onChange={e => setTripPaymentTypeFilter(e.target.value)}
                          className={`pl-6 pr-5 py-1 rounded-lg border shadow-xs text-[7.5px] font-black uppercase tracking-wider outline-none appearance-none cursor-pointer transition-all ${
                            tripPaymentTypeFilter !== '' 
                              ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs' 
                              : 'bg-white text-slate-400 border-slate-200 hover:text-emerald-700'
                          }`}
                        >
                          <option value="">Faturamento</option>
                          <option value="pix">PIX</option>
                          <option value="cf">Carta Frete</option>
                          <option value="pagbem">PagBem</option>
                          <option value="outros">Outros</option>
                        </select>
                        <CreditCard size={10} className={`absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none ${tripPaymentTypeFilter !== '' ? 'text-white' : 'text-slate-300'}`} />
                        <ChevronDown size={9} className={`absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none ${tripPaymentTypeFilter !== '' ? 'text-white' : 'text-slate-300'}`} />
                      </div>
                    </div>

                    {/* Filtro discreto manual para Motorista posicionado abaixo do MDFE */}
                    <div className="flex items-center gap-1 flex-wrap">
                      <div className="relative w-full max-w-[260px]">
                        <User size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input 
                          type="text" 
                          placeholder="Motorista (ex: primeiro e último)..." 
                          title="Filtrar motorista: digite partes do nome em qualquer ordem (ex: primeiro e último nome)"
                          value={tripDriverFilter} 
                          onChange={e => setTripDriverFilter(e.target.value)} 
                          className={`w-full bg-white rounded-lg pl-6 pr-6 py-1 text-[8.5px] font-bold outline-none border transition-all uppercase placeholder:normal-case placeholder:text-slate-400 shadow-xs ${
                            tripDriverFilter 
                              ? 'border-blue-500 text-blue-900 bg-blue-50/50 ring-1 ring-blue-400' 
                              : 'border-slate-200 text-slate-700 hover:border-slate-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-400'
                          }`}
                        />
                        {tripDriverFilter && (
                          <button 
                            onClick={() => setTripDriverFilter('')}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 cursor-pointer p-0.5"
                            title="Limpar filtro de motorista"
                          >
                            <X size={10} />
                          </button>
                        )}
                      </div>

                      {/* Badges de filtros ativos vindos de Relatórios (ANTT e Placas Selecionadas) */}
                      {tripAnttFilter && (
                        <div className="flex items-center gap-1 bg-red-50 border border-red-200 text-red-700 px-2 py-1 rounded-lg text-[7.5px] font-black uppercase shadow-xs">
                          <ClipboardList size={10} className="text-red-600" />
                          <span>ANTT: {tripAnttFilter}</span>
                          <button 
                            type="button"
                            onClick={() => setTripAnttFilter('')}
                            className="text-red-400 hover:text-red-700 cursor-pointer ml-0.5"
                            title="Remover filtro ANTT"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      )}

                      {tripSelectedPlates.length > 0 && (
                        <div className="flex items-center gap-1 bg-red-50 border border-red-200 text-red-700 px-2 py-1 rounded-lg text-[7.5px] font-black uppercase shadow-xs">
                          <Truck size={10} className="text-red-600" />
                          <span>{tripSelectedPlates.length} Placas: {tripSelectedPlates.slice(0, 3).join(', ')}{tripSelectedPlates.length > 3 ? '...' : ''}</span>
                          <button 
                            type="button"
                            onClick={() => setTripSelectedPlates([])}
                            className="text-red-400 hover:text-red-700 cursor-pointer ml-0.5"
                            title="Remover filtro de placas"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-white p-1.5 rounded-xl border border-slate-200 shadow-xs grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-1.5 flex-1 min-w-[280px]">
                    <div className="space-y-0.5">
                      <label className="block text-[7.5px] font-black text-slate-400 uppercase tracking-widest ml-1">De</label>
                      <div className="relative">
                        <Calendar size={9} className="absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                        <input 
                          type="date" 
                          value={tripStartDate} 
                          onChange={e => setTripStartDate(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-100 rounded-md pl-5 pr-0.5 py-0.5 text-[8.5px] font-bold outline-none focus:ring-1 focus:ring-red-100" 
                        />
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <label className="block text-[7.5px] font-black text-slate-400 uppercase tracking-widest ml-1">Até</label>
                      <div className="relative">
                        <Calendar size={9} className="absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                        <input 
                          type="date" 
                          value={tripEndDate} 
                          onChange={e => setTripEndDate(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-100 rounded-md pl-5 pr-0.5 py-0.5 text-[8.5px] font-bold outline-none focus:ring-1 focus:ring-red-100" 
                        />
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <label className="block text-[7.5px] font-black text-slate-400 uppercase tracking-widest ml-1">Tomador</label>
                      <div className="relative">
                        <select 
                          value={tripTakerFilter} 
                          onChange={e => setTripTakerFilter(e.target.value)} 
                          className="w-full bg-slate-50 border border-slate-100 rounded-md pl-5 pr-4 py-0.5 text-[8.5px] font-bold outline-none focus:ring-1 focus:ring-red-100 appearance-none cursor-pointer"
                        >
                          <option value="">Todos</option>
                          {uniqueTripTakers.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <Briefcase size={9} className="absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                        <ChevronDown size={10} className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <label className="block text-[7.5px] font-black text-slate-400 uppercase tracking-widest ml-1">Origem</label>
                      <div className="relative">
                        <select 
                          value={tripOriginFilter} 
                          onChange={e => setTripOriginFilter(e.target.value)} 
                          className="w-full bg-slate-50 border border-slate-100 rounded-md pl-5 pr-4 py-0.5 text-[8.5px] font-bold outline-none focus:ring-1 focus:ring-red-100 appearance-none cursor-pointer"
                        >
                          <option value="">Todas</option>
                          {tripOriginFilter && !uniqueTripOrigins.some(o => normalizeText(o) === normalizeText(tripOriginFilter)) && (
                            <option value={tripOriginFilter}>{tripOriginFilter}</option>
                          )}
                          {uniqueTripOrigins.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                        <MapPin size={9} className="absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                        <ChevronDown size={10} className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <label className="block text-[7.5px] font-black text-slate-400 uppercase tracking-widest ml-1">Destino</label>
                      <div className="relative">
                        <select 
                          value={tripDestinationFilter} 
                          onChange={e => setTripDestinationFilter(e.target.value)} 
                          className="w-full bg-slate-50 border border-slate-100 rounded-md pl-5 pr-4 py-0.5 text-[8.5px] font-bold outline-none focus:ring-1 focus:ring-red-100 appearance-none cursor-pointer"
                        >
                          <option value="">Todos</option>
                          {tripDestinationFilter && !uniqueTripDestinations.some(d => normalizeText(d) === normalizeText(tripDestinationFilter)) && (
                            <option value={tripDestinationFilter}>{tripDestinationFilter}</option>
                          )}
                          {uniqueTripDestinations.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <MapPin size={9} className="absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                        <ChevronDown size={10} className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <label className="block text-[7.5px] font-black text-slate-400 uppercase tracking-widest ml-1">CTE</label>
                      <div className="relative">
                        <input 
                          type="text"
                          placeholder="Nº CTE"
                          value={tripCteFilter} 
                          onChange={e => setTripCteFilter(e.target.value)} 
                          className="w-full bg-slate-50 border border-slate-100 rounded-md pl-5 pr-1 py-0.5 text-[8.5px] font-bold outline-none focus:ring-1 focus:ring-red-100 placeholder:text-slate-300"
                        />
                        <Hash size={9} className="absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <label className="block text-[7.5px] font-black text-slate-400 uppercase tracking-widest ml-1">Placa</label>
                      <div className="relative">
                        <input 
                          type="text"
                          placeholder={tripSelectedPlates.length > 0 ? `${tripSelectedPlates.length} PLACAS` : "Placa..."}
                          value={tripSelectedPlates.length > 0 ? (tripSelectedPlates.length === 1 ? tripSelectedPlates[0] : `${tripSelectedPlates.length} PLACAS`) : tripPlateFilter} 
                          onChange={e => {
                            if (tripSelectedPlates.length > 0) setTripSelectedPlates([]);
                            setTripPlateFilter(e.target.value);
                          }} 
                          className="w-full bg-slate-50 border border-slate-100 rounded-md pl-5 pr-1 py-0.5 text-[8.5px] font-bold uppercase outline-none focus:ring-1 focus:ring-red-100 placeholder:text-slate-300"
                        />
                        <Truck size={9} className="absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <label className="block text-[7.5px] font-black text-slate-400 uppercase tracking-widest ml-1">NF</label>
                      <div className="relative">
                        <input 
                          type="text"
                          placeholder="Nº NF"
                          value={tripNfFilter} 
                          onChange={e => setTripNfFilter(e.target.value)} 
                          className="w-full bg-slate-50 border border-slate-100 rounded-md pl-5 pr-1 py-0.5 text-[8.5px] font-bold outline-none focus:ring-1 focus:ring-red-100 placeholder:text-slate-300"
                        />
                        <Hash size={9} className="absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                </div>

                <TripList 
                  trips={filteredTripsList} 
                  drivers={drivers}
                  freights={freights}
                  filterSummary={tripFilterSummary}
                  tripStats={tripStats}
                  systemCompanyName={companyName}
                  onRegisterPrintPdf={(fn) => setPrintTripsPdfTrigger(() => fn)}
                  onRemove={(id) => saveTrips(trips.filter(t => t.id !== id))} 
                  onEdit={(t) => { setEditingTrip(t); setIsTripFormOpen(true); }} 
                  onToggleMdfeStatus={(id) => saveTrips(trips.map(t => t.id === id ? { ...t, mdfeStatus: t.mdfeStatus === 'Baixado' ? 'Pendente' : 'Baixado' } : t))}
                  onToggleSdFlag={(id) => {
                    const target = trips.find(t => t.id === id);
                    const newFlag = !(target?.sdFlag || target?.status === 'Finalizado' || (target?.sdNote && target.sdNote.trim() !== ''));
                    saveTrips(trips.map(t => {
                      if (t.id === id) {
                        const weightValue = typeof t.weight === 'number' ? t.weight : parseFloat(String(t.weight || '0').replace(',', '.'));
                        const hasWeight = !isNaN(weightValue) && weightValue > 0;
                        return {
                          ...t,
                          sdFlag: newFlag,
                          status: (newFlag ? 'Finalizado' : (hasWeight ? 'Carregado' : 'Pendente')) as 'Pendente' | 'Carregado' | 'Finalizado'
                        };
                      }
                      return t;
                    }));
                  }}
                  onUpdateNote={(id, field, value, sdFlag) => saveTrips(trips.map(t => {
                    if (t.id === id) {
                      const updated = { ...t, [field]: value };
                      if (field === 'sdNote') {
                        const hasSaldo = (value && value.trim() !== '') || !!sdFlag;
                        updated.sdFlag = hasSaldo;
                        if (hasSaldo) {
                          updated.status = 'Finalizado';
                        } else if (t.status === 'Finalizado') {
                          const weightValue = typeof t.weight === 'number' ? t.weight : parseFloat(String(t.weight || '0').replace(',', '.'));
                          const hasWeight = !isNaN(weightValue) && weightValue > 0;
                          updated.status = (hasWeight ? 'Carregado' : 'Pendente') as any;
                        }
                      }
                      return updated;
                    }
                    return t;
                  }))}
                  onBatchLiquidateSd={(ids, note) => {
                    saveTrips(trips.map(t => {
                      if (ids.includes(t.id)) {
                        return {
                          ...t,
                          sdFlag: true,
                          status: 'Finalizado' as const,
                          sdNote: note && note.trim() !== '' ? note.trim() : (t.sdNote && t.sdNote.trim() !== '' ? t.sdNote : 'Saldo Liquidado')
                        };
                      }
                      return t;
                    }));
                    showNotification(`${ids.length} viagem(ns) com saldo liquidado com sucesso!`, 'success');
                  }}
                  onBatchRevertSd={(ids) => {
                    saveTrips(trips.map(t => {
                      if (ids.includes(t.id)) {
                        const weightValue = typeof t.weight === 'number' ? t.weight : parseFloat(String(t.weight || '0').replace(',', '.'));
                        const hasWeight = !isNaN(weightValue) && weightValue > 0;
                        return {
                          ...t,
                          sdFlag: false,
                          status: (hasWeight ? 'Carregado' : 'Pendente') as 'Pendente' | 'Carregado' | 'Finalizado',
                          sdNote: ''
                        };
                      }
                      return t;
                    }));
                    showNotification(`${ids.length} viagem(ns) revertida(s) para saldo pendente!`, 'info');
                  }}
                />
                <div ref={tripsLoadMoreRef} className="min-h-8 flex items-center justify-center" aria-live="polite">
                  {isTripsLoading && <div className="h-8 w-full rounded-xl bg-slate-100 animate-pulse" />}
                </div>
              </div>
            )}

            {currentView === 'reports' && (
              <ReportsView 
                trips={trips}
                drivers={drivers}
                onNavigateToTrips={handleNavigateFromReports}
              />
            )}

            {currentView === 'reminders' && (
              <ReminderView 
                reminders={reminders} 
                onRemove={(id) => saveReminders(reminders.filter(r => r.id !== id))} 
                onAdd={() => { setEditingReminder(null); setIsReminderFormOpen(true); }} 
                onEdit={(r) => { setEditingReminder(r); setIsReminderFormOpen(true); }} 
                onToggleComplete={handleToggleReminderComplete}
              />
            )}
            {currentView === 'notes' && (
              <NotesView 
                notes={notes}
                onAdd={() => { setEditingNote(null); setIsNoteFormOpen(true); }}
                onEdit={(n) => { setEditingNote(n); setIsNoteFormOpen(true); }}
                onRemove={(id) => {
                  saveNotes(notes.filter(n => n.id !== id));
                  showNotification("Nota excluída permanentemente!", "info");
                }}
              />
            )}
            {currentView === 'database' && (
              <div className="animate-in slide-in-from-bottom-2 fade-in duration-300 space-y-6">
                <div className="flex flex-col">
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Banco de Dados</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gerencie o armazenamento local do seu sistema</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-8 rounded-[1.5rem] border border-slate-200 flex flex-col items-center text-center transition-all hover:shadow-xl group">
                    <div className="bg-blue-50 p-4 rounded-2xl text-blue-600 mb-4 group-hover:scale-110 transition-transform">
                      <Download size={32} />
                    </div>
                    <h3 className="text-lg font-black uppercase tracking-tighter">Exportar Backup</h3>
                    <p className="text-slate-400 text-xs mt-2">Salve uma cópia completa de todos os seus dados em um arquivo JSON.</p>
                    <button onClick={handleExportBackup} className="w-full bg-blue-600 text-white py-3 rounded-xl font-black text-[10px] uppercase shadow-lg mt-6 hover:bg-blue-700 transition-all active:scale-95">Baixar JSON</button>
                  </div>

                  <div className="bg-white p-8 rounded-[1.5rem] border border-slate-200 flex flex-col items-center text-center transition-all hover:shadow-xl group">
                    <div className="bg-red-50 p-4 rounded-2xl text-red-600 mb-4 group-hover:scale-110 transition-transform">
                      <RotateCcw size={32} />
                    </div>
                    <h3 className="text-lg font-black uppercase tracking-tighter">Restaurar Sistema</h3>
                    <p className="text-slate-400 text-xs mt-2">Importe um arquivo de backup para restaurar os dados do sistema.</p>
                    <label className="w-full bg-red-700 text-white py-3 rounded-xl font-black text-[10px] uppercase shadow-lg mt-6 cursor-pointer flex justify-center items-center gap-3 hover:bg-red-800 transition-all active:scale-95">
                      <Upload size={14} /> Selecionar Arquivo
                      <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
                    </label>
                  </div>

                  <div className="bg-white p-8 rounded-[1.5rem] border border-slate-200 flex flex-col items-center text-center transition-all hover:shadow-xl group">
                    <div className="bg-emerald-50 p-4 rounded-2xl text-emerald-600 mb-4 group-hover:scale-110 transition-transform">
                      <Cloud size={32} />
                    </div>
                    <h3 className="text-lg font-black uppercase tracking-tighter">Sincronizar em Nuvem</h3>
                    <p className="text-slate-400 text-xs mt-2">
                      {user 
                        ? `Conectado como ${user.email}. Seus dados estão sincronizados em tempo real!` 
                        : "Trabalhe de qualquer dispositivo em tempo real sem perder seus dados."}
                    </p>
                    {user ? (
                      <button 
                        onClick={() => {
                          signOut(auth);
                          showNotification("Desconectado do banco em nuvem.", "info");
                        }} 
                        className="w-full bg-slate-900 text-white py-3 rounded-xl font-black text-[10px] uppercase shadow-lg mt-6 hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-2"
                      >
                        <LogOut size={14} /> Desconectar Nuvem
                      </button>
                    ) : (
                      <button 
                        onClick={() => setIsAuthModalOpen(true)} 
                        className="w-full bg-emerald-600 text-white py-3 rounded-xl font-black text-[10px] uppercase shadow-lg mt-6 hover:bg-emerald-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                      >
                        <Cloud size={14} /> Ativar Sincronização
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <ThirdPartyFreightFormModal 
        isOpen={isThirdPartyFormOpen} 
        onClose={() => setIsThirdPartyFormOpen(false)} 
        onSubmit={handleThirdPartySubmit} 
        initialData={editingThirdParty || undefined} 
      />
      <ReminderFormModal 
        isOpen={isReminderFormOpen} 
        onClose={() => setIsReminderFormOpen(false)} 
        onSubmit={(data) => { 
          if(editingReminder) { 
            saveReminders(reminders.map(r => r.id === editingReminder.id ? {...data, id: r.id, viewed: r.viewed, completed: r.completed, createdAt: r.createdAt} : r)); 
          } else { 
            saveReminders([{...data, id: generateId(), viewed: false, completed: false, createdAt: new Date().toISOString()}, ...reminders]); 
          } 
          setIsReminderFormOpen(false); 
        }} 
        initialData={editingReminder || undefined} 
      />
      <DriverFormModal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} onSubmit={(d) => { if(editingDriver) { saveDrivers(drivers.map(x => x.id === editingDriver.id ? {...d, id: x.id, createdAt: x.createdAt} : x)); } else { saveDrivers([{...d, id: generateId(), createdAt: new Date().toISOString()}, ...drivers]); } setIsFormOpen(false); }} initialData={editingDriver || undefined} />
      <TripFormModal 
        isOpen={isTripFormOpen} 
        onClose={() => { setIsTripFormOpen(false); setEditingTrip(null); }} 
        onSubmit={(data) => { 
          const isExisting = editingTrip && trips.some(t => t.id === editingTrip.id);
          if (isExisting) { 
            saveTrips(trips.map(t => t.id === editingTrip!.id ? { ...t, ...data, id: t.id, createdAt: t.createdAt } : t)); 
          } else { 
            saveTrips([{ ...data, id: generateId(), createdAt: new Date().toISOString() }, ...trips]); 
          } 
          setIsTripFormOpen(false); 
          setEditingTrip(null);
        }} 
        initialData={editingTrip || undefined} 
        drivers={drivers} 
        freights={freights}
      />
      <FreightFormModal 
        isOpen={isFreightFormOpen} 
        onClose={() => setIsFreightFormOpen(false)} 
        onSubmit={(data) => { 
          const isExisting = editingFreight && freights.some(f => f.id === editingFreight.id);
          if (isExisting) { 
            saveFreights(freights.map(f => f.id === editingFreight!.id ? {...data, id: f.id, createdAt: f.createdAt} : f)); 
          } else { 
            saveFreights([{...data, id: generateId(), createdAt: new Date().toISOString()}, ...freights]); 
          } 
          setIsFreightFormOpen(false); 
        }} 
        initialData={editingFreight || undefined} 
      />
      <ExcelImportModal isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} onImport={(d) => saveDrivers([...d, ...drivers])} />
      <FreightImportModal isOpen={isFreightImportOpen} onClose={() => setIsFreightImportOpen(false)} onImport={(f) => saveFreights([...f, ...freights])} />
      <NoteFormModal 
        isOpen={isNoteFormOpen}
        onClose={() => { setIsNoteFormOpen(false); setEditingNote(null); }}
        note={editingNote}
        onSave={(data) => {
          if (editingNote) {
            saveNotes(notes.map(n => n.id === editingNote.id ? { ...n, ...data, updatedAt: new Date().toISOString() } as Note : n));
            showNotification("Nota atualizada com sucesso!", "success");
          } else {
            const newNote: Note = {
              ...data,
              id: generateId(),
              createdAt: new Date().toISOString(),
              title: data.title || 'Sem título',
              content: data.content || '',
              emails: data.emails || [],
              phones: data.phones || []
            };
            saveNotes([newNote, ...notes]);
            showNotification("Nova nota criada!", "success");
          }
        }}
      />
      <TripImportModal 
        isOpen={isTripImportOpen} 
        onClose={() => setIsTripImportOpen(false)} 
        onImport={(t) => {
          saveTrips([...t, ...trips]);
        }} 
        drivers={drivers} 
        freights={freights}
      />
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        onSuccess={(email) => {
          showNotification(`Autenticado com sucesso! Dados sincronizados.`, "success");
        }} 
      />

      {/* Modal de Confirmação: Excluir Todos os Motoristas */}
      {isDeleteAllDriversModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-red-100 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-100 shadow-inner">
                <AlertTriangle size={24} />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
                  Excluir Todos os Motoristas?
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                  Você está prestes a excluir <strong className="text-red-700 font-black">{drivers.length} motorista{drivers.length === 1 ? '' : 's'}</strong> da frota.
                </p>
              </div>
            </div>

            <div className="bg-red-50/80 border border-red-200/80 rounded-xl p-3.5 text-xs text-red-800 leading-snug">
              <p className="font-bold flex items-center gap-1.5 text-red-900 mb-1">
                <Trash2 size={13} className="text-red-600 shrink-0" /> Ação irreversível
              </p>
              Esta operação removerá permanentemente todos os registros de motoristas do seu dispositivo e da nuvem.
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeletingAllDrivers}
                onClick={() => setIsDeleteAllDriversModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeletingAllDrivers}
                onClick={handleConfirmDeleteAllDrivers}
                className="px-4 py-2 text-xs font-black uppercase tracking-wider bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md hover:shadow-lg shadow-red-600/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
              >
                {isDeletingAllDrivers ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Excluindo Frota...
                  </>
                ) : (
                  <>
                    <Trash2 size={14} /> Sim, Excluir Todos ({drivers.length})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Gestão de Unidades Operacionais (CNPJs) */}
      <OperationalUnitModal
        isOpen={isOperationalUnitModalOpen}
        onClose={() => setIsOperationalUnitModalOpen(false)}
        units={operationalUnits}
        activeUnitId={activeOperationalUnit.id}
        onSaveUnit={handleSaveOperationalUnit}
        onDeleteUnit={handleDeleteOperationalUnit}
        onSelectActiveUnit={handleSelectActiveOperationalUnit}
      />
    </div>
  );
};

export default App;
