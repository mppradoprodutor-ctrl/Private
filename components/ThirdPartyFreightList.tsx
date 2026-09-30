
import React, { useMemo } from 'react';
import { Trash2, MapPin, Building2, ArrowRightLeft, Navigation, Package, CopyX, FileText } from 'lucide-react';
import { ThirdPartyFreight } from '../types';

interface ThirdPartyFreightListProps {
  freights: ThirdPartyFreight[];
  onRemove: (id: string) => void;
  onEdit: (freight: ThirdPartyFreight) => void;
  onDuplicate: (freight: ThirdPartyFreight) => void;
}

const ThirdPartyFreightList: React.FC<ThirdPartyFreightListProps> = ({ freights, onRemove, onEdit, onDuplicate }) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const groupedFreights = useMemo<Record<string, ThirdPartyFreight[]>>(() => {
    const groups: Record<string, ThirdPartyFreight[]> = {};
    freights.forEach(f => {
      const p = f.product || 'Sem Produto';
      if (!groups[p]) groups[p] = [];
      groups[p].push(f);
    });
    return groups;
  }, [freights]);

  const productStats = useMemo<Record<string, { avgRate: number; totalDistance: number }>>(() => {
    const stats: Record<string, { avgRate: number; totalDistance: number }> = {};
    (Object.entries(groupedFreights) as [string, ThirdPartyFreight[]][]).forEach(([product, pFreights]) => {
      let totalRate = 0;
      let totalDistance = 0;
      pFreights.forEach(f => {
        totalRate += f.freightRate;
        totalDistance += f.distanceKm;
      });
      stats[product] = {
        avgRate: pFreights.length > 0 ? totalRate / pFreights.length : 0,
        totalDistance: totalDistance
      };
    });
    return stats;
  }, [groupedFreights]);

  if (freights.length === 0) {
    return (
      <div className="bg-white border-2 border-dashed border-slate-200 rounded-[2rem] p-20 text-center animate-in fade-in duration-500">
        <MapPin className="text-slate-200 mx-auto mb-4" size={48} />
        <h3 className="text-xl font-black text-slate-900 tracking-tight">Sem Frete Dia</h3>
        <p className="text-slate-400 mt-2 text-sm font-medium">Cadastre novas rotas para gerenciar fretes externos.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-nowrap gap-3 overflow-x-auto pb-6 w-full custom-scrollbar animate-in fade-in slide-in-from-bottom-4 duration-500">
      {(Object.entries(groupedFreights) as [string, ThirdPartyFreight[]][]).map(([product, productFreights]) => {
        const stats = productStats[product];
        return (
          <div key={product} className="w-[240px] shrink-0 flex flex-col gap-1.5">
            {/* Column Header */}
            <div className="bg-white border border-slate-200 rounded-lg p-1.5 shadow-sm space-y-0.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
                  <h3 className="text-[9px] font-black uppercase tracking-[0.1em] text-slate-900 truncate max-w-[165px]">{product}</h3>
                </div>
                <span className="text-[7.5px] font-bold text-slate-400 bg-slate-50 px-1 py-0.5 rounded-full shrink-0">{productFreights.length} Lançamentos</span>
              </div>
              
              <div className="grid grid-cols-2 gap-1.5 pt-0.5 border-t border-slate-50">
                <div>
                  <p className="text-[6.5px] font-black text-slate-400 uppercase tracking-widest leading-none">Média Tarifa</p>
                  <p className="text-[10px] font-black text-blue-600 leading-none mt-0.5">{formatCurrency(stats.avgRate)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[6.5px] font-black text-slate-400 uppercase tracking-widest leading-none">Distância Total</p>
                  <p className="text-[10px] font-black text-slate-900 leading-none mt-0.5">{stats.totalDistance} KM</p>
                </div>
              </div>
            </div>

            {/* Lines */}
            <div className="space-y-1">
              {productFreights.map((freight) => (
                <div 
                  key={freight.id} 
                  onClick={() => onEdit(freight)}
                  className="group relative bg-white border border-slate-100 rounded-md p-1.5 hover:border-blue-200 hover:shadow-sm transition-all duration-200 cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 text-[9px] font-black text-slate-900">
                        <span className="truncate">{freight.origin}</span>
                        <ArrowRightLeft size={5} className="text-slate-300 shrink-0" />
                        <span className="truncate">{freight.destination}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="flex items-center gap-0.5 shrink-0 max-w-[75px] truncate">
                          <Building2 size={5} className="text-slate-300" />
                          <span className="text-[7px] font-bold text-slate-400 truncate">{freight.carrier}</span>
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <Navigation size={5} className="text-blue-500" />
                          <span className="text-[7px] font-black text-blue-600">{freight.distanceKm} KM</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-[9px] font-black text-slate-900 leading-none">{formatCurrency(freight.freightRate)}</p>
                      <div className="mt-0.5 h-0.5 w-full bg-slate-50 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full w-full opacity-30" />
                      </div>
                    </div>

                    <div className="flex flex-col gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => { e.stopPropagation(); onDuplicate(freight); }}
                        className="p-0.5 text-slate-300 hover:text-emerald-600 transition-all cursor-pointer"
                        title="Duplicar"
                      >
                        <CopyX size={9} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onRemove(freight.id); }}
                        className="p-0.5 text-slate-300 hover:text-red-600 transition-all cursor-pointer"
                        title="Remover"
                      >
                        <Trash2 size={9} />
                      </button>
                    </div>
                  </div>

                  {freight.notes && (
                    <div className="mt-1 pt-1 border-t border-slate-100 text-[8px] font-medium text-slate-600 whitespace-pre-wrap break-words leading-tight bg-slate-50/80 p-1.5 rounded border border-slate-100 flex gap-1 items-start">
                      <FileText size={9} className="text-slate-400 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">{freight.notes}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ThirdPartyFreightList;
