import React, { useState, useMemo } from 'react';
import { 
  Package, Calendar, MapPin, Truck, Activity, Building2,
  TrendingUp, Scale, ArrowRight, DollarSign, Filter,
  Columns, Table, ArrowUpRight, ArrowDownRight, Layers,
  PlusCircle, FileSpreadsheet, Edit2, Trash2, CheckCircle2,
  Clock, RefreshCw, BarChart2, PieChart, Sparkles, Download
} from 'lucide-react';
import { Shipment, Trip, Driver, Freight } from '../types';
import ShipmentImportModal from './ShipmentImportModal';
import ShipmentFormModal from './ShipmentFormModal';

interface ShipmentViewProps {
  shipments: Shipment[];
  trips?: Trip[];
  freights?: Freight[];
  drivers?: Driver[];
  onImport: (data: Shipment[]) => void;
  onDelete: (id: string) => void;
  onEdit: (shipment: Shipment) => void;
  onAdd: (data: Omit<Shipment, 'id' | 'createdAt'>) => void;
  onClearAll: (ids: string[]) => void;
  filters: {
    startDate: string;
    endDate: string;
    destinationFilter: string;
    plateFilter: string;
    productFilter: string;
    showDuplicates: boolean;
    statusFilter: 'all' | 'loaded' | 'pending';
    originFilter: string;
  };
  setFilters: {
    setStartDate: (v: string) => void;
    setEndDate: (v: string) => void;
    setDestinationFilter: (v: string) => void;
    setPlateFilter: (v: string) => void;
    setProductFilter: (v: string) => void;
    setShowDuplicates: (v: boolean) => void;
    setStatusFilter: (v: 'all' | 'loaded' | 'pending') => void;
    setOriginFilter: (v: string) => void;
  };
}

// Product Detection Engine
const detectProduct = (rawProduct?: string, notes?: string, terminal?: string, taker?: string, obs?: string): string => {
  const raw = (rawProduct || '').toUpperCase().trim();
  
  // Direct matches if valid product is provided
  if (raw && raw !== 'OUTROS' && raw !== 'NÃO INFORMADO' && raw !== 'N/I' && raw !== 'DIVERSOS') {
    if (raw.includes('MILHO')) return 'MILHO';
    if (raw.includes('SOJA') && !raw.includes('FARELO')) return 'SOJA';
    if (raw.includes('FARELO')) return 'FARELO DE SOJA';
    if (raw.includes('ADUBO') || raw.includes('FERTILIZANTE') || raw.includes('NPK') || raw.includes('URÉIA') || raw.includes('UREIA')) return 'ADUBO / FERTILIZANTE';
    if (raw.includes('TRIGO')) return 'TRIGO';
    if (raw.includes('AÇUCA') || raw.includes('ACUCA')) return 'AÇÚCAR';
    if (raw.includes('SAL')) return 'SAL';
    if (raw.includes('SORGO')) return 'SORGO';
    if (raw.includes('ARROZ')) return 'ARROZ';
    if (raw.includes('ALGODÃO') || raw.includes('ALGODAO')) return 'ALGODÃO';
    if (raw.includes('CALCÁRIO') || raw.includes('CALCARIO')) return 'CALCÁRIO';
    return raw;
  }

  // Fallback: Smart scan of text fields (notes, terminal, taker, obs)
  const combinedText = `${notes || ''} ${terminal || ''} ${taker || ''} ${obs || ''}`.toUpperCase();
  if (combinedText.includes('MILHO')) return 'MILHO';
  if (combinedText.includes('SOJA') && !combinedText.includes('FARELO')) return 'SOJA';
  if (combinedText.includes('FARELO')) return 'FARELO DE SOJA';
  if (combinedText.includes('ADUBO') || combinedText.includes('FERTILIZANTE') || combinedText.includes('URÉIA') || combinedText.includes('UREIA')) return 'ADUBO / FERTILIZANTE';
  if (combinedText.includes('TRIGO')) return 'TRIGO';
  if (combinedText.includes('AÇUCA') || combinedText.includes('ACUCA')) return 'AÇÚCAR';
  if (combinedText.includes('SAL')) return 'SAL';
  if (combinedText.includes('SORGO')) return 'SORGO';
  if (combinedText.includes('ARROZ')) return 'ARROZ';
  if (combinedText.includes('ALGODÃO') || combinedText.includes('ALGODAO')) return 'ALGODÃO';
  if (combinedText.includes('CALCÁRIO') || combinedText.includes('CALCARIO')) return 'CALCÁRIO';

  return 'DIVERSOS / OUTROS';
};

const normalizeStr = (str?: string) => 
  (str || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim().replace(/[^A-Z0-9]/g, '');

// Lookup product from Base de Fretes matching origin and destination
const findProductFromFreights = (
  origin: string,
  destination: string,
  itemProduct?: string,
  dischargeTerminal?: string,
  freightsList: Freight[] = [],
  notes?: string,
  serviceTaker?: string,
  obs?: string
): string => {
  const normOrig = normalizeStr(origin);
  const normDest = normalizeStr(destination);
  const normTerm = normalizeStr(dischargeTerminal);

  if (freightsList && freightsList.length > 0) {
    // 1. Look for exact Origin + Destination + Terminal match in Base de Fretes
    if (normTerm) {
      const matchWithTerm = freightsList.find(f => {
        const fOrig = normalizeStr(f.origin);
        const fDest = normalizeStr(f.destination);
        const fTerm = normalizeStr(f.dischargeTerminal);
        const origOk = normOrig.includes(fOrig) || fOrig.includes(normOrig);
        const destOk = normDest.includes(fDest) || fDest.includes(normDest);
        const termOk = normTerm.includes(fTerm) || fTerm.includes(normTerm);
        return origOk && destOk && termOk && f.product && f.product.trim().length > 0;
      });
      if (matchWithTerm?.product?.trim()) {
        return detectProduct(matchWithTerm.product, notes, dischargeTerminal, serviceTaker, obs);
      }
    }

    // 2. Look for exact Origin + Destination match in Base de Fretes
    const matchRoute = freightsList.find(f => {
      const fOrig = normalizeStr(f.origin);
      const fDest = normalizeStr(f.destination);
      const origOk = normOrig.includes(fOrig) || fOrig.includes(normOrig);
      const destOk = normDest.includes(fDest) || fDest.includes(normDest);
      return origOk && destOk && f.product && f.product.trim().length > 0;
    });

    if (matchRoute?.product?.trim()) {
      return detectProduct(matchRoute.product, notes, dischargeTerminal, serviceTaker, obs);
    }

    // 3. Match Origin only if itemProduct is missing or generic
    const matchOriginOnly = freightsList.find(f => {
      const fOrig = normalizeStr(f.origin);
      const origOk = normOrig.includes(fOrig) || fOrig.includes(normOrig);
      return origOk && f.product && f.product.trim().length > 0;
    });

    const rawProd = (itemProduct || '').toUpperCase().trim();
    if (matchOriginOnly?.product?.trim() && (!rawProd || rawProd === 'OUTROS' || rawProd === 'N/I' || rawProd === 'DIVERSOS')) {
      return detectProduct(matchOriginOnly.product, notes, dischargeTerminal, serviceTaker, obs);
    }
  }

  // Fallback to direct detection using trip product or text fields
  return detectProduct(itemProduct, notes, dischargeTerminal, serviceTaker, obs);
};

const ShipmentView: React.FC<ShipmentViewProps> = ({ 
  shipments, trips = [], freights = [], drivers = [], onImport, onDelete, onEdit, onAdd, onClearAll,
  filters, setFilters
}) => {
  const {
    startDate, endDate, destinationFilter, plateFilter,
    productFilter, statusFilter, originFilter
  } = filters;

  const {
    setStartDate, setEndDate, setDestinationFilter, setPlateFilter,
    setProductFilter, setStatusFilter, setOriginFilter
  } = setFilters;

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingShipment, setEditingShipment] = useState<Shipment | null>(null);
  const [viewMode, setViewMode] = useState<'columns' | 'ultra' | 'table'>('columns');
  const [searchQuery, setSearchQuery] = useState('');

  // Period Presets
  const handleSetPeriod = (period: 'today' | 'week' | 'month' | 'year' | 'all') => {
    const now = new Date();
    if (period === 'all') {
      setStartDate('');
      setEndDate('');
      return;
    }
    if (period === 'today') {
      const todayStr = now.toISOString().split('T')[0];
      setStartDate(todayStr);
      setEndDate(todayStr);
      return;
    }
    if (period === 'week') {
      const first = now.getDate() - now.getDay();
      const firstDay = new Date(now.setDate(first)).toISOString().split('T')[0];
      const lastDay = new Date().toISOString().split('T')[0];
      setStartDate(firstDay);
      setEndDate(lastDay);
      return;
    }
    if (period === 'month') {
      const y = now.getFullYear();
      const m = now.getMonth();
      const firstDay = new Date(y, m, 1).toISOString().split('T')[0];
      const lastDay = new Date(y, m + 1, 0).toISOString().split('T')[0];
      setStartDate(firstDay);
      setEndDate(lastDay);
      return;
    }
    if (period === 'year') {
      const y = now.getFullYear();
      setStartDate(`${y}-01-01`);
      setEndDate(`${y}-12-31`);
      return;
    }
  };

  // Process all trips into unified shipment items
  const processedItems = useMemo(() => {
    const list: Array<{
      id: string;
      originalTripId?: string;
      isTrip: boolean;
      date: string;
      origin: string;
      destination: string;
      product: string;
      driver: string;
      plate: string;
      weightKg: number;
      weightTn: number;
      companyTariff: number;
      driverTariff: number;
      companyFreightTotal: number;
      driverFreightTotal: number;
      icmsDeduction: number;
      netMargin: number;
      marginPercent: number;
      status: string;
      isFinalized?: boolean;
      sdFlag?: boolean;
      sdNote?: string;
      cte?: string;
      invoice?: string;
      dischargeTerminal?: string;
      serviceTaker?: string;
      notes?: string;
      rawObject: any;
    }> = [];

    // Process Trips from "Lançar Viagens"
    trips.forEach(t => {
      const weightKg = typeof t.weight === 'number' ? t.weight : (parseFloat(String(t.weight || '0').replace(',', '.')) || 0);
      const effectiveWeight = weightKg > 0 ? weightKg : 1000;
      const weightTn = weightKg / 1000;

      const companyTariff = t.companyTariff || 0;
      const driverTariff = t.driverTariff || 0;

      const companyFreightTotal = companyTariff * (effectiveWeight / 1000);
      const icmsDeduction = t.deductIcms ? (companyFreightTotal * ((t.icmsRate || 0) / 100)) : 0;
      const driverFreightTotal = driverTariff * (effectiveWeight / 1000);
      const netMargin = (companyFreightTotal - icmsDeduction) - driverFreightTotal;
      const marginPercent = companyFreightTotal > 0 ? (netMargin / companyFreightTotal) * 100 : 0;

      const orig = t.origin + (t.originState ? `/${t.originState}` : '');
      const dest = t.destination + (t.destinationState ? `/${t.destinationState}` : '');

      const identifiedProduct = findProductFromFreights(
        t.origin,
        t.destination,
        t.product,
        t.dischargeTerminal,
        freights,
        t.notes,
        t.serviceTaker,
        ''
      );

      const isFinalized = !!t.sdFlag || t.status === 'Finalizado';
      const effectiveStatus = isFinalized ? 'Finalizado' : (t.status || 'Pendente');

      list.push({
        id: `trip_${t.id}`,
        originalTripId: t.id,
        isTrip: true,
        isFinalized,
        date: t.date || '',
        origin: orig,
        destination: dest,
        product: identifiedProduct,
        driver: t.driverName || 'N/A',
        plate: (t.truckPlate || 'S/ PLACA').toUpperCase().trim(),
        weightKg,
        weightTn,
        companyTariff,
        driverTariff,
        companyFreightTotal,
        driverFreightTotal,
        icmsDeduction,
        netMargin,
        marginPercent,
        status: effectiveStatus,
        sdFlag: t.sdFlag,
        sdNote: t.sdNote,
        cte: t.cteNumber,
        invoice: t.invoiceNumber,
        dischargeTerminal: t.dischargeTerminal,
        serviceTaker: t.serviceTaker,
        notes: t.notes,
        rawObject: t
      });
    });

    // Process direct Shipments if any
    shipments.forEach(s => {
      const weightKg = s.weight || 0;
      const weightTn = weightKg / 1000;
      
      // Parse PPTE / PPTM if available
      const companyTariff = parseFloat(s.ppte?.replace('R$', '').replace('.', '').replace(',', '.') || '0') || 0;
      const driverTariff = parseFloat(s.pptm?.replace('R$', '').replace('.', '').replace(',', '.') || '0') || 0;

      const effectiveWeight = weightKg > 0 ? weightKg : 1000;
      const companyFreightTotal = companyTariff * (effectiveWeight / 1000);
      const driverFreightTotal = driverTariff * (effectiveWeight / 1000);
      const netMargin = companyFreightTotal - driverFreightTotal;
      const marginPercent = companyFreightTotal > 0 ? (netMargin / companyFreightTotal) * 100 : 0;

      const identifiedProduct = findProductFromFreights(
        s.origin || '',
        s.destination || '',
        s.product,
        '',
        freights,
        s.obs,
        s.client || s.branch,
        s.obs
      );

      const normPlate = (s.plate || '').toUpperCase().trim().replace(/[^A-Z0-9]/g, '');
      const matchingTrip = trips.find(t => {
        const tPlate = (t.truckPlate || '').toUpperCase().trim().replace(/[^A-Z0-9]/g, '');
        return tPlate && tPlate === normPlate && (!s.shipmentDate || !t.date || s.shipmentDate === t.date);
      });

      const isFinalized = s.status?.toLowerCase().includes('finaliz') || (matchingTrip && (matchingTrip.sdFlag || matchingTrip.status === 'Finalizado'));
      const effectiveStatus = isFinalized ? 'Finalizado' : (s.status || 'Pendente');

      list.push({
        id: s.id,
        isTrip: false,
        isFinalized: !!isFinalized,
        date: s.shipmentDate || '',
        origin: s.origin || 'N/I',
        destination: s.destination || 'N/I',
        product: identifiedProduct,
        driver: s.driver || 'N/I',
        plate: (s.plate || 'S/ PLACA').toUpperCase().trim(),
        weightKg,
        weightTn,
        companyTariff,
        driverTariff,
        companyFreightTotal,
        driverFreightTotal,
        icmsDeduction: 0,
        netMargin,
        marginPercent,
        status: effectiveStatus,
        cte: s.dispatch,
        serviceTaker: s.client || s.branch,
        notes: s.obs,
        rawObject: s
      });
    });

    return list;
  }, [trips, shipments, freights]);

  // Filter items based on user criteria
  const filteredItems = useMemo(() => {
    return processedItems.filter(item => {
      // Date filter
      if (startDate && item.date < startDate) return false;
      if (endDate && item.date > endDate) return false;

      // Status filter
      if (statusFilter === 'loaded' && !item.status.toLowerCase().includes('carregado')) return false;
      if (statusFilter === 'pending' && (item.status.toLowerCase().includes('carregado') || item.status.toLowerCase().includes('finaliz') || item.isFinalized)) return false;
      if (statusFilter === 'finalized' && !(item.status.toLowerCase().includes('finaliz') || item.isFinalized)) return false;

      // Search query (plate, driver, origin, destination, product)
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match = 
          item.plate.toLowerCase().includes(q) ||
          item.driver.toLowerCase().includes(q) ||
          item.origin.toLowerCase().includes(q) ||
          item.destination.toLowerCase().includes(q) ||
          item.product.toLowerCase().includes(q) ||
          (item.serviceTaker && item.serviceTaker.toLowerCase().includes(q));
        if (!match) return false;
      }

      // Specific product filter
      if (productFilter && item.product !== productFilter.toUpperCase()) return false;

      // Specific destination filter
      if (destinationFilter && !item.destination.toLowerCase().includes(destinationFilter.toLowerCase())) return false;

      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [processedItems, startDate, endDate, statusFilter, searchQuery, productFilter, destinationFilter]);

  // Financial KPIs
  const kpis = useMemo(() => {
    let totalFaturado = 0;
    let totalPago = 0;
    let totalIcms = 0;
    let totalWeightTn = 0;

    filteredItems.forEach(item => {
      totalFaturado += item.companyFreightTotal;
      totalPago += item.driverFreightTotal;
      totalIcms += item.icmsDeduction;
      totalWeightTn += item.weightTn;
    });

    const saldoLiquido = (totalFaturado - totalIcms) - totalPago;
    const margemPercent = totalFaturado > 0 ? (saldoLiquido / totalFaturado) * 100 : 0;

    return {
      totalFaturado,
      totalPago,
      saldoLiquido,
      margemPercent,
      totalCount: filteredItems.length,
      totalWeightTn
    };
  }, [filteredItems]);

  // Group items by Product
  const groupedByProduct = useMemo(() => {
    const groups: Record<string, typeof filteredItems> = {};

    filteredItems.forEach(item => {
      const prodKey = item.product || 'OUTROS';
      if (!groups[prodKey]) {
        groups[prodKey] = [];
      }
      groups[prodKey].push(item);
    });

    // Calculate product subtotals and sort products by Total Faturado descending
    return Object.entries(groups)
      .map(([productName, items]) => {
        let prodFaturado = 0;
        let prodPago = 0;
        let prodIcms = 0;
        let prodWeightTn = 0;

        items.forEach(it => {
          prodFaturado += it.companyFreightTotal;
          prodPago += it.driverFreightTotal;
          prodIcms += it.icmsDeduction;
          prodWeightTn += it.weightTn;
        });

        const prodSaldo = (prodFaturado - prodIcms) - prodPago;
        const prodMargem = prodFaturado > 0 ? (prodSaldo / prodFaturado) * 100 : 0;

        return {
          productName,
          items,
          count: items.length,
          prodFaturado,
          prodPago,
          prodSaldo,
          prodMargem,
          prodWeightTn
        };
      })
      .sort((a, b) => b.prodFaturado - a.prodFaturado);
  }, [filteredItems]);

  // Available products list
  const availableProducts = useMemo(() => {
    const set = new Set<string>();
    processedItems.forEach(item => {
      if (item.product) set.add(item.product);
    });
    return Array.from(set).sort();
  }, [processedItems]);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const formatTn = (tn: number) => 
    new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(tn) + ' TN';

  // Product Icon helper
  const getProductBadge = (name: string) => {
    const p = name.toUpperCase();
    if (p.includes('MILHO')) return { icon: '🌽', color: 'from-amber-500/10 via-amber-500/5 to-white text-amber-900 border-amber-200' };
    if (p.includes('SOJA')) return { icon: '🫘', color: 'from-emerald-500/10 via-emerald-500/5 to-white text-emerald-900 border-emerald-200' };
    if (p.includes('ADUBO') || p.includes('FERTILIZANTE')) return { icon: '🧪', color: 'from-blue-500/10 via-blue-500/5 to-white text-blue-900 border-blue-200' };
    if (p.includes('TRIGO') || p.includes('FARELO')) return { icon: '🌾', color: 'from-orange-500/10 via-orange-500/5 to-white text-orange-900 border-orange-200' };
    if (p.includes('SAL')) return { icon: '🧂', color: 'from-slate-200/50 via-slate-100 to-white text-slate-800 border-slate-300' };
    return { icon: '📦', color: 'from-red-500/10 via-red-500/5 to-white text-red-900 border-red-200' };
  };

  return (
    <div className="h-[calc(100vh-4.2rem)] flex flex-col overflow-hidden bg-slate-100 text-slate-800 p-2 sm:p-2.5 space-y-2 rounded-2xl border border-slate-200 shadow-md">
      
      {/* 1. TOP CONTROL BAR - PERIOD FILTERS & QUICK ACTIONS */}
      <div className="shrink-0 bg-white border border-slate-200/90 rounded-xl p-2 flex flex-wrap items-center justify-between gap-2 shadow-xs">
        
        {/* Title & View Switcher */}
        <div className="flex items-center gap-2.5">
          <div className="bg-gradient-to-br from-red-600 to-red-700 p-1.5 rounded-lg text-white shadow-sm shadow-red-200">
            <Package size={17} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-tight leading-none">Painel de Embarques</h2>
              <span className="bg-red-50 text-red-700 border border-red-200 text-[9.5px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                {kpis.totalCount} Viagens
              </span>
            </div>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">Visão Executiva Agrupada por Produto</p>
          </div>
        </div>

        {/* Date Period Selector & Quick Presets */}
        <div className="flex flex-wrap items-center gap-1.5">
          
          {/* Quick Presets */}
          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button 
              onClick={() => handleSetPeriod('today')} 
              className="px-2 py-0.5 text-[9.5px] font-black uppercase rounded text-slate-600 hover:text-slate-900 hover:bg-white transition-all cursor-pointer"
            >
              Hoje
            </button>
            <button 
              onClick={() => handleSetPeriod('week')} 
              className="px-2 py-0.5 text-[9.5px] font-black uppercase rounded text-slate-600 hover:text-slate-900 hover:bg-white transition-all cursor-pointer"
            >
              Semana
            </button>
            <button 
              onClick={() => handleSetPeriod('month')} 
              className="px-2 py-0.5 text-[9.5px] font-black uppercase rounded text-slate-600 hover:text-slate-900 hover:bg-white transition-all cursor-pointer"
            >
              Mês
            </button>
            <button 
              onClick={() => handleSetPeriod('year')} 
              className="px-2 py-0.5 text-[9.5px] font-black uppercase rounded text-slate-600 hover:text-slate-900 hover:bg-white transition-all cursor-pointer"
            >
              Ano
            </button>
            <button 
              onClick={() => handleSetPeriod('all')} 
              className="px-2 py-0.5 text-[9.5px] font-black uppercase rounded text-slate-600 hover:text-slate-900 hover:bg-white transition-all cursor-pointer"
            >
              Tudo
            </button>
          </div>

          {/* Date Inputs */}
          <div className="flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 text-[10px]">
            <Calendar size={12} className="text-red-600 shrink-0" />
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-slate-900 font-bold outline-none cursor-pointer"
            />
            <span className="text-slate-400 font-bold text-[9px]">até</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-slate-900 font-bold outline-none cursor-pointer"
            />
          </div>

          {/* Search Box */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 w-36 sm:w-44">
            <Filter size={12} className="text-slate-400 shrink-0" />
            <input 
              type="text" 
              placeholder="Buscar viagem..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-[10px] font-semibold text-slate-900 placeholder:text-slate-400 outline-none w-full"
            />
          </div>

          {/* Product Filter Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
            <Package size={12} className="text-red-600 shrink-0" />
            <select
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
              className="bg-transparent text-slate-900 font-black text-[10px] outline-none cursor-pointer uppercase max-w-[130px]"
            >
              <option value="" className="bg-white text-slate-900">TODOS OS PRODUTOS</option>
              {availableProducts.map(p => (
                <option key={p} value={p} className="bg-white text-slate-900">{p}</option>
              ))}
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode('columns')}
              className={`px-2 py-0.5 rounded text-[9.5px] font-black uppercase flex items-center gap-1 transition-all cursor-pointer ${
                viewMode === 'columns' 
                  ? 'bg-red-600 text-white shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Cards Compactos"
            >
              <Columns size={11} /> Compacto
            </button>
            <button
              onClick={() => setViewMode('ultra')}
              className={`px-2 py-0.5 rounded text-[9.5px] font-black uppercase flex items-center gap-1 transition-all cursor-pointer ${
                viewMode === 'ultra' 
                  ? 'bg-red-600 text-white shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Lista Resumida de Alta Densidade"
            >
              <Layers size={11} /> Super Compacto
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-2 py-0.5 rounded text-[9.5px] font-black uppercase flex items-center gap-1 transition-all cursor-pointer ${
                viewMode === 'table' 
                  ? 'bg-red-600 text-white shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Visão em Tabela Completa"
            >
              <Table size={11} /> Tabela
            </button>
          </div>
        </div>
      </div>

      {/* 2. TOP EXECUTIVE KPIS BAR */}
      <div className="shrink-0 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-1.5">
        
        {/* TOTAL FATURADO (FRETE EMPRESA) */}
        <div className="bg-white border border-emerald-200/90 rounded-xl p-2 relative overflow-hidden shadow-xs hover:border-emerald-300 transition-all">
          <div className="flex justify-between items-start">
            <span className="text-[8.5px] font-black text-slate-500 uppercase tracking-wider">Total Faturado</span>
            <span className="text-[8px] font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">PPTE</span>
          </div>
          <h3 className="text-sm sm:text-base font-black text-emerald-700 tracking-tight mt-0.5">
            {formatCurrency(kpis.totalFaturado)}
          </h3>
          <p className="text-[8.5px] font-bold text-slate-400 uppercase tracking-tight truncate">Receita Bruta Empresa</p>
        </div>

        {/* TOTAL PAGO (FRETE MOTORISTA) */}
        <div className="bg-white border border-amber-200/90 rounded-xl p-2 relative overflow-hidden shadow-xs hover:border-amber-300 transition-all">
          <div className="flex justify-between items-start">
            <span className="text-[8.5px] font-black text-slate-500 uppercase tracking-wider">Total Pago</span>
            <span className="text-[8px] font-black text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">PPTM</span>
          </div>
          <h3 className="text-sm sm:text-base font-black text-amber-700 tracking-tight mt-0.5">
            {formatCurrency(kpis.totalPago)}
          </h3>
          <p className="text-[8.5px] font-bold text-slate-400 uppercase tracking-tight truncate">Custo Terceiros</p>
        </div>

        {/* SALDO LÍQUIDO */}
        <div className="bg-white border border-red-200/90 rounded-xl p-2 relative overflow-hidden shadow-xs hover:border-red-300 transition-all">
          <div className="flex justify-between items-start">
            <span className="text-[8.5px] font-black text-slate-500 uppercase tracking-wider">Saldo Líquido</span>
            <span className="text-[8px] font-black text-red-700 bg-red-50 px-1.5 py-0.2 rounded border border-red-200">LUCRO</span>
          </div>
          <h3 className={`text-sm sm:text-base font-black tracking-tight mt-0.5 ${kpis.saldoLiquido >= 0 ? 'text-red-700' : 'text-slate-900'}`}>
            {formatCurrency(kpis.saldoLiquido)}
          </h3>
          <p className="text-[8.5px] font-bold text-slate-400 uppercase tracking-tight truncate">Resultado Operacional</p>
        </div>

        {/* PORCENTUAL DE MARGEM LÍQUIDA */}
        <div className="bg-white border border-purple-200/90 rounded-xl p-2 relative overflow-hidden shadow-xs hover:border-purple-300 transition-all">
          <div className="flex justify-between items-start">
            <span className="text-[8.5px] font-black text-slate-500 uppercase tracking-wider">Margem Líquida %</span>
            <span className="text-[8px] font-black text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200">% RENT.</span>
          </div>
          <h3 className="text-sm sm:text-base font-black text-purple-700 tracking-tight mt-0.5">
            {kpis.margemPercent.toFixed(1)}%
          </h3>
          <p className="text-[8.5px] font-bold text-slate-400 uppercase tracking-tight truncate">Aproveitamento Financeiro</p>
        </div>

        {/* VOLUME TOTAL & VIAGENS */}
        <div className="hidden lg:block bg-white border border-slate-200/90 rounded-xl p-2 relative overflow-hidden shadow-xs hover:border-slate-300 transition-all">
          <div className="flex justify-between items-start">
            <span className="text-[8.5px] font-black text-slate-500 uppercase tracking-wider">Total Operado</span>
            <span className="text-[8px] font-black text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">TN / REG.</span>
          </div>
          <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight mt-0.5">
            {formatTn(kpis.totalWeightTn)}
          </h3>
          <p className="text-[8.5px] font-bold text-slate-400 uppercase tracking-tight truncate">{kpis.totalCount} Viagens Cadastradas</p>
        </div>
      </div>

      {/* 3. MAIN DASHBOARD BODY (FIT TO SCREEN) */}
      <div className="flex-1 min-h-0 relative overflow-hidden">
        
        {filteredItems.length === 0 ? (
          <div className="h-full bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center p-8 text-center space-y-3 shadow-xs">
            <div className="bg-red-50 p-4 rounded-full text-red-600 border border-red-100">
              <Package size={36} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Nenhuma viagem encontrada no período</h3>
              <p className="text-xs text-slate-500 mt-1">Ajuste as datas no topo ou limpe os filtros de busca para visualizar os embarques.</p>
            </div>
            <button 
              onClick={() => handleSetPeriod('all')} 
              className="bg-red-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase hover:bg-red-700 transition-all shadow-sm cursor-pointer"
            >
              Exibir Todas as Datas
            </button>
          </div>
        ) : viewMode === 'columns' || viewMode === 'ultra' ? (
          
          /* COLUMN VIEW GROUPED BY PRODUCT */
          <div className="h-full overflow-x-auto overflow-y-hidden flex gap-2 pb-1 custom-scrollbar">
            {groupedByProduct.map(group => {
              const badge = getProductBadge(group.productName);
              return (
                <div 
                  key={group.productName} 
                  className="w-[290px] sm:w-[320px] shrink-0 h-full flex flex-col bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-sm transition-all hover:border-red-300"
                >
                  {/* PRODUCT COLUMN HEADER */}
                  <div className={`shrink-0 p-2 bg-gradient-to-r ${badge.color} border-b border-slate-200 space-y-1`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-base shrink-0">{badge.icon}</span>
                        <div className="min-w-0">
                          <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider block">PRODUTO CARREGADO</span>
                          <h3 className="text-xs sm:text-[12.5px] font-black text-slate-900 uppercase tracking-wide truncate" title={group.productName}>
                            {group.productName}
                          </h3>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="bg-red-600 text-white text-[8.5px] font-black px-2 py-0.5 rounded-full block shadow-xs">
                          {group.count} {group.count === 1 ? 'viagem' : 'viagens'}
                        </span>
                        <span className="text-[8px] font-black text-slate-700 mt-0.5 block">{formatTn(group.prodWeightTn)}</span>
                      </div>
                    </div>

                    {/* Column Subtotals */}
                    <div className="grid grid-cols-3 gap-1 pt-1 border-t border-slate-200/80 text-center">
                      <div className="bg-emerald-50/80 border border-emerald-100 p-1 rounded">
                        <span className="text-[8px] font-black text-emerald-800 uppercase block">Faturado</span>
                        <span className="text-[10px] sm:text-[10.5px] font-black text-emerald-700">{formatCurrency(group.prodFaturado)}</span>
                      </div>
                      <div className="bg-amber-50/80 border border-amber-100 p-1 rounded">
                        <span className="text-[8px] font-black text-amber-800 uppercase block">Pago</span>
                        <span className="text-[10px] sm:text-[10.5px] font-black text-amber-700">{formatCurrency(group.prodPago)}</span>
                      </div>
                      <div className="bg-red-50/80 border border-red-100 p-1 rounded">
                        <span className="text-[8px] font-black text-red-800 uppercase block">Saldo</span>
                        <span className="text-[10px] sm:text-[10.5px] font-black text-red-700">{formatCurrency(group.prodSaldo)}</span>
                      </div>
                    </div>
                  </div>

                  {/* COLUMN ITEMS LIST (INNER SCROLLBAR ONLY) */}
                  <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-1.5 space-y-1.5 bg-slate-50/40">
                    {group.items.map(item => (
                      viewMode === 'ultra' ? (
                        /* ULTRA COMPACT SINGLE-BOX STRIP */
                        <div 
                          key={item.id}
                          className="bg-white border border-slate-200 hover:border-red-300 rounded-md p-1.5 space-y-1 transition-all shadow-2xs hover:shadow-xs"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1 font-black text-slate-900 text-[9.5px] uppercase truncate min-w-0">
                              <MapPin size={10} className="text-red-600 shrink-0" />
                              <span className="text-slate-700 truncate">{item.origin}</span>
                              <span className="text-red-600 shrink-0 font-black">➔</span>
                              <span className="text-slate-900 font-extrabold truncate">{item.destination}</span>
                            </div>
                            <span className={`shrink-0 text-[8px] font-black px-1.5 py-0.5 rounded uppercase flex items-center gap-0.5 ${
                              item.status.toLowerCase().includes('finaliz') || item.isFinalized
                                ? 'bg-emerald-600 text-white border border-emerald-700 shadow-xs font-black'
                                : item.status.toLowerCase().includes('carregado') 
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                                  : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}>
                              {item.status.toLowerCase().includes('finaliz') || item.isFinalized ? '✓ Finalizado' : item.status}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[8.5px] pt-1 border-t border-slate-100">
                            <div className="flex items-center gap-1 truncate min-w-0">
                              <span className="font-black text-slate-900">{item.plate}</span>
                              <span className="text-slate-500 truncate max-w-[75px]">({item.driver})</span>
                              <span className="font-bold text-slate-700 ml-0.5">{formatTn(item.weightTn)}</span>
                            </div>
                            <div className="flex items-center gap-1 font-extrabold shrink-0">
                              <span className="text-emerald-700">R$ {item.companyFreightTotal.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                              <span className="text-slate-300">|</span>
                              <span className="text-red-700 bg-red-50 px-1 py-0.2 rounded border border-red-200">
                                R$ {item.netMargin.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* COMPACT SUMMARIZED CARD MODE */
                        <div 
                          key={item.id}
                          className="bg-white border border-slate-200 hover:border-red-300 rounded-lg p-2 space-y-1.5 transition-all shadow-2xs hover:shadow-xs"
                        >
                          {/* ORIGIN & DESTINATION + STATUS */}
                          <div className="flex items-center justify-between gap-1 pb-1 border-b border-slate-100">
                            <div className="flex items-center gap-1 text-[10px] sm:text-[10.5px] font-black text-slate-900 uppercase truncate min-w-0">
                              <MapPin size={11} className="text-red-600 shrink-0" />
                              <span className="text-slate-700 truncate">{item.origin}</span>
                              <span className="text-red-600 shrink-0 font-black">➔</span>
                              <span className="text-slate-900 font-extrabold truncate">{item.destination}</span>
                            </div>
                            <span className={`shrink-0 text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1 ${
                              item.status.toLowerCase().includes('finaliz') || item.isFinalized
                                ? 'bg-emerald-600 text-white border border-emerald-700 shadow-xs font-black'
                                : item.status.toLowerCase().includes('carregado') 
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                                  : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}>
                              {item.status.toLowerCase().includes('finaliz') || item.isFinalized ? (
                                <>
                                  <CheckCircle2 size={10} className="text-white shrink-0" /> Finalizado
                                </>
                              ) : (
                                item.status
                              )}
                            </span>
                          </div>

                          {/* FREIGHT VALUES (EMPRESA & MOTORISTA) */}
                          <div className="grid grid-cols-2 gap-1.5 bg-slate-50 p-1.5 rounded border border-slate-200/80">
                            <div>
                              <span className="text-[8px] font-bold text-slate-400 uppercase block">Empresa</span>
                              <span className="text-[11px] sm:text-[11.5px] font-black text-emerald-700 block">{formatCurrency(item.companyFreightTotal)}</span>
                              <span className="text-[8px] font-semibold text-slate-500">R$ {item.companyTariff}/t</span>
                            </div>
                            <div>
                              <span className="text-[8px] font-bold text-slate-400 uppercase block">Motorista</span>
                              <span className="text-[11px] sm:text-[11.5px] font-black text-amber-700 block">{formatCurrency(item.driverFreightTotal)}</span>
                              <span className="text-[8px] font-semibold text-slate-500">R$ {item.driverTariff}/t</span>
                            </div>
                          </div>

                          {/* VEHICLE & MARGIN FOOTER */}
                          <div className="flex justify-between items-center text-[9px] font-bold text-slate-600 pt-0.5">
                            <div className="flex items-center gap-1 min-w-0">
                              <Truck size={11} className="text-slate-400 shrink-0" />
                              <span className="font-black text-slate-900">{item.plate}</span>
                              <span className="text-slate-500 truncate max-w-[85px]">({item.driver})</span>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-[8px] sm:text-[8.5px] font-black text-red-700 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                                Lucro: {formatCurrency(item.netMargin)} ({item.marginPercent.toFixed(0)}%)
                              </span>
                            </div>
                          </div>

                          {/* METADATA: DATE & WEIGHT */}
                          <div className="flex justify-between items-center text-[8px] font-semibold text-slate-400 pt-1 border-t border-slate-100">
                            <span>Data: {item.date}</span>
                            <span className="font-black text-slate-800">Peso: {formatTn(item.weightTn)}</span>
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (

          /* TABLE VIEW OPTION (COMPACT LIGHT THEME) */
          <div className="h-full bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col shadow-xs">
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 z-10 text-slate-700">
                  <tr>
                    <th className="px-3 py-2 text-[9.5px] font-black uppercase">Data</th>
                    <th className="px-3 py-2 text-[9.5px] font-black uppercase">Produto</th>
                    <th className="px-3 py-2 text-[9.5px] font-black uppercase">Origem ➔ Destino</th>
                    <th className="px-3 py-2 text-[9.5px] font-black uppercase">Veículo / Motorista</th>
                    <th className="px-3 py-2 text-[9.5px] font-black uppercase text-right">Peso (TN)</th>
                    <th className="px-3 py-2 text-[9.5px] font-black text-emerald-700 uppercase text-right">Frete Empresa</th>
                    <th className="px-3 py-2 text-[9.5px] font-black text-amber-700 uppercase text-right">Frete Motorista</th>
                    <th className="px-3 py-2 text-[9.5px] font-black text-red-700 uppercase text-right">Saldo Líquido</th>
                    <th className="px-3 py-2 text-[9.5px] font-black uppercase text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredItems.map(item => (
                    <tr key={item.id} className="hover:bg-red-50/40 transition-colors">
                      <td className="px-3 py-2 font-bold text-slate-700 whitespace-nowrap">{item.date}</td>
                      <td className="px-3 py-2 font-black text-slate-900 uppercase whitespace-nowrap">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] border border-slate-200">
                          {item.product}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-bold text-slate-800 whitespace-nowrap">
                        {item.origin} <span className="text-red-600 font-black mx-1">➔</span> {item.destination}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className="font-black text-slate-900">{item.plate}</span>
                        <span className="text-slate-500 text-[10px] ml-1">({item.driver})</span>
                      </td>
                      <td className="px-3 py-2 font-black text-slate-800 text-right whitespace-nowrap">{formatTn(item.weightTn)}</td>
                      <td className="px-3 py-2 font-black text-emerald-700 text-right whitespace-nowrap">{formatCurrency(item.companyFreightTotal)}</td>
                      <td className="px-3 py-2 font-black text-amber-700 text-right whitespace-nowrap">{formatCurrency(item.driverFreightTotal)}</td>
                      <td className="px-3 py-2 font-black text-red-700 text-right whitespace-nowrap">
                        {formatCurrency(item.netMargin)} ({item.marginPercent.toFixed(0)}%)
                      </td>
                      <td className="px-3 py-2 text-center whitespace-nowrap">
                        <span className={`text-[8.5px] font-black px-2.5 py-0.5 rounded uppercase inline-flex items-center gap-1 ${
                          item.status.toLowerCase().includes('finaliz') || item.isFinalized
                            ? 'bg-emerald-600 text-white border border-emerald-700 shadow-xs' 
                            : item.status.toLowerCase().includes('carregado') 
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}>
                          {item.status.toLowerCase().includes('finaliz') || item.isFinalized ? '✓ Finalizado' : item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default ShipmentView;
