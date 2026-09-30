
import React, { useMemo, useState, useRef } from 'react';
import { Trash2, MapPin, Building2, ArrowRightLeft, TrendingUp, Package, Info, Download, FileText, Loader2, Eye, EyeOff, Maximize2, Minimize2, CopyX, Camera, MonitorPlay, Briefcase, DollarSign, Scale, Percent, X, RotateCcw, Columns, Layers, Table } from 'lucide-react';
import { toBlob } from 'html-to-image';
import { saveAs } from 'file-saver';
import { Freight } from '../types';

interface FreightListProps {
  freights: Freight[];
  onRemove: (id: string) => void;
  onEdit: (freight: Freight) => void;
  onDuplicate: (freight: Freight) => void;
}

const FreightList: React.FC<FreightListProps> = ({ freights, onRemove, onEdit, onDuplicate }) => {
  const [showCompanyFreight, setShowCompanyFreight] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [viewMode, setViewMode] = useState<'columns' | 'ultra' | 'table'>('columns');
  const expandedRef = useRef<HTMLDivElement>(null);

  const handleDownloadHDImage = async () => {
    if (!expandedRef.current) return;
    try {
      setIsExporting(true);
      // Export high-resolution image using 3x pixel ratio
      const blob = await toBlob(expandedRef.current, {
        pixelRatio: 3,
        cacheBust: true,
        backgroundColor: '#f8fafc',
      });
      
      if (blob) {
        saveAs(blob, `base_de_fretes_estendida_HD_${new Date().toISOString().slice(0, 10)}.png`);
      }
    } catch (err) {
      console.error('Erro ao capturar tela em alta resolução:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const calculateFinancials = (f: Freight) => {
    const icmsAmount = f.deductIcms ? (f.companyTariff * (f.icmsRate / 100)) : 0;
    const netRevenue = f.companyTariff - icmsAmount;
    const profit = netRevenue - f.driverTariff;
    const margin = f.companyTariff > 0 ? (profit / f.companyTariff) * 100 : 0;
    return { icmsAmount, netRevenue, profit, margin };
  };

  const groupedFreights = useMemo<Record<string, Freight[]>>(() => {
    const groups: Record<string, Freight[]> = {};
    freights.forEach(f => {
      const p = f.product || 'Sem Produto';
      if (!groups[p]) groups[p] = [];
      groups[p].push(f);
    });

    // Sort freights within each group by origin, then destination
    Object.keys(groups).forEach(product => {
      groups[product].sort((a, b) => {
        const originCompare = (a.origin || '').localeCompare(b.origin || '', 'pt-BR', { sensitivity: 'base' });
        if (originCompare !== 0) return originCompare;
        return (a.destination || '').localeCompare(b.destination || '', 'pt-BR', { sensitivity: 'base' });
      });
    });

    return groups;
  }, [freights]);

  const sortedGroupedEntries = useMemo(() => {
    return (Object.entries(groupedFreights) as [string, Freight[]][])
      .sort(([nameA], [nameB]) => nameA.localeCompare(nameB, 'pt-BR', { sensitivity: 'base' }));
  }, [groupedFreights]);

  const tableSortedFreights = useMemo(() => {
    return [...freights].sort((a, b) => {
      const prodA = a.product || 'Sem Produto';
      const prodB = b.product || 'Sem Produto';
      const prodCompare = prodA.localeCompare(prodB, 'pt-BR', { sensitivity: 'base' });
      if (prodCompare !== 0) return prodCompare;

      const origA = a.origin || '';
      const origB = b.origin || '';
      const origCompare = origA.localeCompare(origB, 'pt-BR', { sensitivity: 'base' });
      if (origCompare !== 0) return origCompare;

      const destA = a.destination || '';
      const destB = b.destination || '';
      return destA.localeCompare(destB, 'pt-BR', { sensitivity: 'base' });
    });
  }, [freights]);

  const productStats = useMemo<Record<string, { totalProfit: number; avgMargin: number }>>(() => {
    const stats: Record<string, { totalProfit: number; avgMargin: number }> = {};
    (Object.entries(groupedFreights) as [string, Freight[]][]).forEach(([product, pFreights]) => {
      let totalProfit = 0;
      let totalMargin = 0;
      pFreights.forEach(f => {
        const { profit, margin } = calculateFinancials(f);
        totalProfit += profit;
        totalMargin += margin;
      });
      stats[product] = {
        totalProfit,
        avgMargin: pFreights.length > 0 ? totalMargin / pFreights.length : 0
      };
    });
    return stats;
  }, [groupedFreights]);

  if (freights.length === 0) {
    return (
      <div className="bg-white border-2 border-dashed border-slate-200 rounded-[2rem] p-20 text-center animate-in fade-in duration-500">
        <MapPin className="text-slate-200 mx-auto mb-4" size={48} />
        <h3 className="text-xl font-black text-slate-900 tracking-tight">Base de Fretes Vazia</h3>
        <p className="text-slate-400 mt-2 text-sm font-medium">Importe uma planilha ou adicione rotas manualmente para começar.</p>
      </div>
    );
  }

  return (
    <div 
      ref={expandedRef}
      className={`animate-in fade-in slide-in-from-bottom-4 duration-500 ${
        isExpanded 
          ? 'bg-[#f8fafc] text-slate-900 overflow-hidden h-screen w-screen fixed inset-0 z-[100] flex flex-col p-3 gap-2' 
          : 'space-y-4'
      }`}
    >
      {/* Header in Fullscreen Extended View */}
      {isExpanded ? (
        <div className="flex items-center justify-between shrink-0 bg-white border border-slate-200 px-3 py-2 rounded-xl shadow-sm flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="bg-red-600 p-1.5 rounded-lg text-white shadow-md shadow-red-600/20">
              <MonitorPlay size={16} />
            </div>
            <div>
              <h1 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight uppercase leading-none">
                Base de Fretes — Visualização Estendida
              </h1>
              <p className="text-[9.5px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                Todas as colunas alocadas em tela única
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            {/* View Mode Toggle */}
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                type="button"
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
                type="button"
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
                type="button"
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

            <button 
              onClick={handleDownloadHDImage}
              disabled={isExporting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg text-[9.5px] font-black uppercase tracking-wider transition-all active:scale-95 flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
              title="Baixar todo o conteúdo em alta resolução (3x HD PNG)"
            >
              {isExporting ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />}
              {isExporting ? 'Gerando HD...' : 'Baixar Imagem HD'}
            </button>

            <button 
              onClick={() => setShowCompanyFreight(!showCompanyFreight)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9.5px] font-black uppercase tracking-wider transition-all border cursor-pointer ${
                showCompanyFreight 
                  ? 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200' 
                  : 'bg-red-600 text-white border-red-600 hover:bg-red-700 shadow-sm'
              }`}
            >
              {showCompanyFreight ? <EyeOff size={11} /> : <Eye size={11} />}
              {showCompanyFreight ? 'Ocultar Frete Empresa' : 'Mostrar Frete Empresa'}
            </button>
            
            <button 
              onClick={() => setIsExpanded(false)}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <RotateCcw size={12} />
              Voltar para Tela Inicial
            </button>
          </div>
        </div>
      ) : (
        /* Global Actions Bar - Normal Mode */
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="bg-red-50 p-1.5 rounded-xl text-red-600">
              <TrendingUp size={18} />
            </div>
            <div>
              <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-wider">Base de Fretes</h4>
              <p className="text-[9.5px] text-slate-400 font-bold uppercase mt-0.5">Gerencie e visualize suas rotas</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            {/* View Mode Toggle */}
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                type="button"
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
                type="button"
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
                type="button"
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

            <button 
              onClick={() => setIsExpanded(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 text-white hover:bg-black border border-slate-900 rounded-xl text-[9.5px] font-black uppercase tracking-wider hover:shadow-lg transition-all active:scale-95 cursor-pointer"
              title="Expandir Visualização"
            >
              <Maximize2 size={11} />
              Expandir
            </button>
            <button 
              onClick={() => setShowCompanyFreight(!showCompanyFreight)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[9.5px] font-black uppercase tracking-wider transition-all border cursor-pointer ${
                showCompanyFreight 
                  ? 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200' 
                  : 'bg-red-600 text-white border-red-700 hover:bg-red-700 shadow-lg shadow-red-600/20'
              }`}
            >
              {showCompanyFreight ? <EyeOff size={11} /> : <Eye size={11} />}
              {showCompanyFreight ? 'Ocultar Frete Empresa' : 'Mostrar Frete Empresa'}
            </button>
          </div>
        </div>
      )}

      {/* Main Content Body: Columns, Ultra, or Table Mode */}
      {viewMode === 'table' ? (
        /* TABLE VIEW OPTION (COMPACT LIGHT THEME) */
        <div className={`bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs ${isExpanded ? 'flex-1 min-h-0 flex flex-col' : ''}`}>
          <div className={`overflow-y-auto custom-scrollbar ${isExpanded ? 'flex-1' : 'max-h-[70vh]'}`}>
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 z-10 text-slate-700">
                <tr>
                  <th className="px-3 py-2 text-[9.5px] font-black uppercase">Produto</th>
                  <th className="px-3 py-2 text-[9.5px] font-black uppercase">Origem ➔ Destino</th>
                  <th className="px-3 py-2 text-[9.5px] font-black uppercase">Tomador de Serviço</th>
                  <th className="px-3 py-2 text-[9.5px] font-black uppercase">Restrições / Anotações</th>
                  <th className="px-3 py-2 text-[9.5px] font-black text-emerald-700 uppercase text-right">Frete Motorista</th>
                  {showCompanyFreight && (
                    <>
                      <th className="px-3 py-2 text-[9.5px] font-black text-slate-900 uppercase text-right">Frete Empresa</th>
                      <th className="px-3 py-2 text-[9.5px] font-black text-red-700 uppercase text-right">Lucro / Margem</th>
                    </>
                  )}
                  <th className="px-3 py-2 text-[9.5px] font-black uppercase text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {tableSortedFreights.map((freight) => {
                  const { profit, margin } = calculateFinancials(freight);
                  return (
                    <tr 
                      key={freight.id} 
                      onClick={() => onEdit(freight)}
                      className={`hover:bg-red-50/40 transition-colors cursor-pointer group ${
                        !freight.active ? 'opacity-40 grayscale' : ''
                      }`}
                    >
                      <td className="px-3 py-2 font-black text-slate-900 uppercase whitespace-nowrap">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] border border-slate-200 font-bold">
                          {freight.product || 'Sem Produto'}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-bold text-slate-800 whitespace-nowrap">
                        <span className="font-bold text-slate-400 text-[9px] mr-1">[{freight.state || 'UF'}]</span>
                        {freight.location && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8.5px] font-bold bg-blue-50 text-blue-700 border border-blue-100 mr-1">
                            {freight.location}
                          </span>
                        )}
                        {freight.origin || 'S/ Origem'} <span className="text-red-600 font-black mx-1">➔</span> {freight.destination || 'S/ Destino'}
                      </td>
                      <td className="px-3 py-2 font-bold text-slate-600 whitespace-nowrap">
                        {freight.serviceTaker || 'N/A'}
                      </td>
                      <td className="px-3 py-2 text-[10px] whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          {freight.restrictions && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-50 border border-amber-100 text-amber-700 font-bold truncate max-w-[140px]" title={freight.restrictions}>
                              {freight.restrictions}
                            </span>
                          )}
                          {freight.notes && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-50 border border-blue-100 text-blue-700 font-bold truncate max-w-[140px]" title={freight.notes}>
                              {freight.notes}
                            </span>
                          )}
                          {!freight.restrictions && !freight.notes && <span className="text-slate-300">-</span>}
                        </div>
                      </td>
                      <td className="px-3 py-2 font-black text-emerald-700 text-right whitespace-nowrap">
                        {formatCurrency(freight.driverTariff)}
                      </td>
                      {showCompanyFreight && (
                        <>
                          <td className="px-3 py-2 font-black text-slate-900 text-right whitespace-nowrap">
                            {formatCurrency(freight.companyTariff)}
                          </td>
                          <td className="px-3 py-2 font-black text-red-700 text-right whitespace-nowrap">
                            {formatCurrency(profit)} ({margin.toFixed(1)}%)
                          </td>
                        </>
                      )}
                      <td className="px-3 py-2 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1" onClick={e => e.stopPropagation()}>
                          <button 
                            onClick={() => onDuplicate(freight)}
                            className="p-1 text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer"
                            title="Duplicar Rota"
                          >
                            <CopyX size={13} />
                          </button>
                          <button 
                            onClick={() => onRemove(freight.id)}
                            className="p-1 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                            title="Remover Rota"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* COLUMNS VIEW (COMPACT OR SUPER COMPACT/ULTRA) */
        <div 
          className={
            isExpanded 
              ? 'flex-1 min-h-0 w-full flex flex-row gap-1.5 overflow-hidden items-stretch pb-1' 
              : 'flex flex-nowrap gap-3 pb-6 custom-scrollbar w-full overflow-x-auto h-auto'
          }
        >
          {sortedGroupedEntries.map(([product, productFreights]) => {
            const stats = productStats[product];
            return (
              <div 
                key={product} 
                className={
                  isExpanded 
                    ? 'flex-1 min-w-0 h-full flex flex-col gap-1 bg-slate-100/80 border border-slate-200/90 rounded-xl p-1.5 shadow-sm overflow-hidden' 
                    : 'w-[305px] shrink-0 flex flex-col gap-1.5'
                }
              >
                {/* Column Header */}
                <div className="bg-white border border-slate-200 rounded-lg p-1.5 shadow-sm space-y-1 shrink-0">
                  <div className="flex items-center justify-between min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0"></div>
                      <h3 className="text-[10px] sm:text-[10.5px] font-black uppercase tracking-tight text-slate-900 truncate">
                        {product}
                      </h3>
                    </div>
                    <span className="text-[8px] font-extrabold px-1.5 py-0.2 rounded-full shrink-0 bg-red-50 text-red-700">
                      {productFreights.length} Lanç.
                    </span>
                  </div>
                  
                  {showCompanyFreight && (
                    <div className="grid grid-cols-2 gap-1 pt-1 border-t border-slate-100">
                      <div>
                        <p className="text-[7.5px] font-black text-slate-400 uppercase tracking-wider leading-none">Média Margem</p>
                        <p className="text-[9.5px] font-black text-emerald-600 leading-none mt-0.5">{stats.avgMargin.toFixed(1)}%</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[7.5px] font-black text-slate-400 uppercase tracking-wider leading-none">Média Lucro</p>
                        <p className="text-[9.5px] font-black text-slate-900 leading-none mt-0.5">
                          {formatCurrency(stats.totalProfit / productFreights.length)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Items List inside Column */}
                <div className={`space-y-1 ${
                  isExpanded ? 'flex-1 min-h-0 overflow-y-auto no-scrollbar pr-0.5' : ''
                }`}>
                  {productFreights.map((freight) => {
                    const { profit, margin } = calculateFinancials(freight);
                    
                    return viewMode === 'ultra' ? (
                      /* SUPER COMPACT / ULTRA STRIP MODE */
                      <div 
                        key={freight.id} 
                        onClick={() => onEdit(freight)}
                        className={`group relative bg-white border border-slate-200 hover:border-red-300 rounded-md p-1.5 space-y-1 transition-all shadow-2xs hover:shadow-xs cursor-pointer ${
                          !freight.active ? 'opacity-40 grayscale' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1 font-black text-slate-900 text-[9.5px] uppercase truncate min-w-0">
                            <span className="font-bold text-slate-400 text-[8px]">[{freight.state || 'UF'}]</span>
                            {freight.location && (
                              <span className="text-blue-600 font-bold text-[8.5px] truncate max-w-[80px]">[{freight.location}]</span>
                            )}
                            <span className="text-slate-700 truncate">{freight.origin || 'S/ Origem'}</span>
                            <ArrowRightLeft size={8} className="text-red-500 shrink-0 mx-0.5" />
                            <span className="text-slate-900 font-extrabold truncate">{freight.destination || 'S/ Destino'}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[9px] font-extrabold shrink-0">
                            <span className="text-emerald-600">{formatCurrency(freight.driverTariff)}</span>
                            {showCompanyFreight && (
                              <>
                                <span className="text-slate-300">|</span>
                                <span className="text-slate-900">{formatCurrency(freight.companyTariff)}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[8px] pt-1 border-t border-slate-100">
                          <div className="flex items-center gap-1 truncate min-w-0 text-slate-500">
                            <span className="truncate">{freight.serviceTaker || 'N/A'}</span>
                            {freight.restrictions && <span className="text-amber-700 truncate">({freight.restrictions})</span>}
                            {freight.notes && <span className="text-blue-700 truncate">({freight.notes})</span>}
                          </div>
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={e => e.stopPropagation()}>
                            <button 
                              onClick={() => onDuplicate(freight)}
                              className="p-0.5 text-slate-300 hover:text-emerald-600 transition-all cursor-pointer"
                              title="Duplicar Rota"
                            >
                              <CopyX size={9} />
                            </button>
                            <button 
                              onClick={() => onRemove(freight.id)}
                              className="p-0.5 text-slate-300 hover:text-red-600 transition-all cursor-pointer"
                              title="Remover Rota"
                            >
                              <Trash2 size={9} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* COMPACT CARDS MODE */
                      <div 
                        key={freight.id} 
                        onClick={() => onEdit(freight)}
                        className={
                          isExpanded 
                            ? `group relative bg-white border border-slate-200 hover:border-red-300 hover:shadow-md rounded-md p-1.5 transition-all duration-200 cursor-pointer ${
                                !freight.active ? 'opacity-40 grayscale' : ''
                              }`
                            : `group relative bg-white border border-slate-100 rounded-md p-2 hover:border-red-200 hover:shadow-sm transition-all duration-200 cursor-pointer ${
                                !freight.active ? 'opacity-50 grayscale' : ''
                              }`
                        }
                      >
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center flex-wrap gap-1 text-[10px] sm:text-[10.5px] font-black text-slate-900 leading-tight">
                              <span className="font-bold shrink-0 text-[8.5px] text-slate-400">
                                [{freight.state || 'UF'}]
                              </span>
                              {freight.location && (
                                <span className="inline-flex items-center px-1 py-0.2 rounded text-[8px] font-black bg-blue-50 text-blue-700 border border-blue-100 shrink-0">
                                  {freight.location}
                                </span>
                              )}
                              <span className="truncate">{freight.origin || 'S/ Origem'}</span>
                              <ArrowRightLeft size={8} className="text-red-500 shrink-0 mx-0.5" />
                              <span className="truncate">{freight.destination || 'S/ Destino'}</span>
                            </div>

                            <div className="flex items-center gap-1.5 mt-1">
                              <div className="flex items-center gap-1 shrink-0 max-w-[85px]">
                                <Building2 size={8} className="text-slate-400 shrink-0" />
                                <span className="text-[8px] font-bold text-slate-500 truncate">
                                  {freight.serviceTaker || 'N/A'}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-1 min-w-0">
                                {freight.restrictions ? (
                                  <div className="flex items-center gap-0.5 px-1 py-0.2 rounded text-[7.5px] font-black uppercase tracking-tight truncate bg-amber-50 border border-amber-100 text-amber-700">
                                    <Info size={7} className="shrink-0" />
                                    <span className="truncate">{freight.restrictions}</span>
                                  </div>
                                ) : null}
                                {freight.notes ? (
                                  <div className="flex items-center gap-0.5 px-1 py-0.2 rounded text-[7.5px] font-black uppercase tracking-tight truncate bg-blue-50 border border-blue-100 text-blue-700" title={freight.notes}>
                                    <FileText size={7} className="shrink-0" />
                                    <span className="truncate">{freight.notes}</span>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            {showCompanyFreight && (
                              <p className="text-[9.5px] sm:text-[10px] font-black leading-none mb-0.5 text-slate-900">
                                {formatCurrency(freight.companyTariff)}
                              </p>
                            )}
                            <p className="text-[9px] sm:text-[9.5px] font-bold text-emerald-600 leading-none">
                              {formatCurrency(freight.driverTariff)}
                            </p>
                            {showCompanyFreight && (
                              <div className="mt-1 h-0.5 w-full rounded-full overflow-hidden bg-slate-100">
                                <div 
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    margin > 15 ? 'bg-emerald-500' : margin > 8 ? 'bg-amber-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${Math.min(margin * 3, 100)}%` }}
                                />
                              </div>
                            )}
                          </div>

                          {!isExpanded && (
                            <div className="flex flex-col gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={(e) => { e.stopPropagation(); onDuplicate(freight); }}
                                className="p-0.5 text-slate-300 hover:text-emerald-600 transition-all cursor-pointer"
                                title="Duplicar Rota"
                              >
                                <CopyX size={10} />
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); onRemove(freight.id); }}
                                className="p-0.5 text-slate-300 hover:text-red-600 transition-all cursor-pointer"
                                title="Remover Rota"
                              >
                                <Trash2 size={10} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FreightList;
