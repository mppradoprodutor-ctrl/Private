
import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, Calendar, Percent, UserCheck, AlertCircle, MapPin, Hash, CreditCard, FileText, Building2, Zap } from 'lucide-react';
import { Trip, Driver, Freight } from '../types';
import { resolveTripServiceTaker, isInvalidTakerName } from '../services/takerResolver';

interface TripFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (trip: Omit<Trip, 'id' | 'createdAt'>) => void;
  initialData?: Trip;
  drivers?: Driver[];
  freights?: Freight[];
}

const TripFormModal: React.FC<TripFormModalProps> = ({ isOpen, onClose, onSubmit, initialData, drivers = [], freights = [] }) => {
  const emptyForm: Omit<Trip, 'id' | 'createdAt'> = {
    date: new Date().toISOString().split('T')[0],
    origin: '',
    originState: '',
    destination: '',
    destinationState: '',
    dischargeTerminal: '',
    cteNumber: '',
    invoiceNumber: '',
    companyTariff: 0,
    driverTariff: 0,
    truckPlate: '',
    driverName: '',
    serviceTaker: '',
    product: '',
    weight: 0,
    paymentType: 'À Vista',
    notes: '',
    pendingDocument: '',
    status: 'Carregado',
    mdfeStatus: 'Pendente',
    deductIcms: false,
    icmsRate: 0,
    adNote: '',
    sdNote: ''
  };

  const [formData, setFormData] = useState<Omit<Trip, 'id' | 'createdAt'>>(emptyForm);
  const [isAutoFilled, setIsAutoFilled] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        date: initialData.date || '',
        origin: initialData.origin || '',
        originState: initialData.originState || '',
        destination: initialData.destination || '',
        destinationState: initialData.destinationState || '',
        dischargeTerminal: initialData.dischargeTerminal || '',
        cteNumber: initialData.cteNumber || '',
        invoiceNumber: initialData.invoiceNumber || '',
        companyTariff: initialData.companyTariff || 0,
        driverTariff: initialData.driverTariff || 0,
        truckPlate: initialData.truckPlate || '',
        driverName: initialData.driverName || '',
        serviceTaker: initialData.serviceTaker || '',
        product: initialData.product || '',
        weight: initialData.weight || 0,
        paymentType: initialData.paymentType || 'À Vista',
        notes: initialData.notes || '',
        pendingDocument: initialData.pendingDocument || '',
        status: initialData.status || 'Carregado',
        mdfeStatus: initialData.mdfeStatus || 'Pendente',
        deductIcms: initialData.deductIcms || false,
        icmsRate: initialData.icmsRate || 0,
        adNote: initialData.adNote || '',
        sdNote: initialData.sdNote || '',
        orderNumber: initialData.orderNumber,
        operationalUnitCnpj: initialData.operationalUnitCnpj,
        operationalUnitName: initialData.operationalUnitName,
        operationalUnitCompanyName: initialData.operationalUnitCompanyName,
        operationalUnitIe: initialData.operationalUnitIe,
        operationalUnitStreet: initialData.operationalUnitStreet,
        operationalUnitNumber: initialData.operationalUnitNumber,
        operationalUnitNeighborhood: initialData.operationalUnitNeighborhood,
        operationalUnitCity: initialData.operationalUnitCity,
        operationalUnitState: initialData.operationalUnitState
      });
      
      const found = drivers.find(d => d.truckPlate.toUpperCase() === initialData.truckPlate.toUpperCase());
      setIsAutoFilled(!!found);
    } else {
      setFormData(emptyForm);
      setIsAutoFilled(false);
    }
  }, [initialData, isOpen, drivers]);

  const handleAutoResize = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    target.style.height = 'auto';
    target.style.height = `${target.scrollHeight}px`;
  };

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        const textareas = document.querySelectorAll('textarea');
        textareas.forEach(ta => {
          ta.style.height = 'auto';
          ta.style.height = `${ta.scrollHeight}px`;
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, formData.notes]);

  const financialCalculations = useMemo(() => {
    // Cálculo de margem baseado na diferença direta por tonelada ou peso total
    const weightFactor = formData.weight > 0 ? (formData.weight / 1000) : 1;
    const totalCompanyRevenue = formData.companyTariff * weightFactor;
    const icmsDeduction = formData.deductIcms ? (totalCompanyRevenue * (formData.icmsRate / 100)) : 0;
    const netRevenue = totalCompanyRevenue - icmsDeduction;
    const totalDriverCost = formData.driverTariff * weightFactor;
    const profit = netRevenue - totalDriverCost;
    const margin = totalCompanyRevenue > 0 ? (profit / totalCompanyRevenue) * 100 : 0;

    return { totalCompanyRevenue, icmsDeduction, netRevenue, totalDriverCost, profit, margin };
  }, [formData.companyTariff, formData.driverTariff, formData.weight, formData.deductIcms, formData.icmsRate]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let submitData = { ...formData };
    
    // Normalization: Santa Cruz das Palmeiras is always in SP
    if (submitData.origin.toUpperCase().includes('SANTA CRUZ DAS PALMEIRAS')) {
      submitData.originState = 'SP';
    }
    if (submitData.destination.toUpperCase().includes('SANTA CRUZ DAS PALMEIRAS')) {
      submitData.destinationState = 'SP';
    }

    const finalPaymentType = (submitData.paymentType.toUpperCase() === 'CF' || submitData.paymentType.toUpperCase() === 'CARTA FRETE') 
      ? 'Carta Frete' 
      : submitData.paymentType;
    
    if (submitData.sdNote && submitData.sdNote.trim() !== '') {
      submitData.sdFlag = true;
      submitData.status = 'Finalizado';
    }

    if (isInvalidTakerName(submitData.serviceTaker)) {
      const resolved = resolveTripServiceTaker(submitData, freights, []);
      if (resolved) {
        submitData.serviceTaker = resolved;
      }
    }

    onSubmit({ ...submitData, paymentType: finalPaymentType });
    onClose();
  };

  const normalizeText = (text: string) => 
    (text || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    
    if (name === 'selectedRoute') {
      const selectedFreight = freights.find(f => f.id === value);
      if (selectedFreight) {
        setFormData(prev => ({
          ...prev,
          location: selectedFreight.location || selectedFreight.collectionAddress || '',
          origin: selectedFreight.origin,
          originState: selectedFreight.state || '',
          destination: selectedFreight.destination,
          destinationState: selectedFreight.destinationState || '',
          serviceTaker: selectedFreight.serviceTaker,
          companyTariff: selectedFreight.companyTariff,
          driverTariff: selectedFreight.driverTariff,
          dischargeTerminal: selectedFreight.dischargeTerminal,
          product: selectedFreight.product,
          deductIcms: selectedFreight.deductIcms,
          icmsRate: selectedFreight.icmsRate
        }));
      }
      return;
    }

    if (name === 'truckPlate') {
      const formattedPlate = String(val).toUpperCase();
      const foundDriver = drivers.find(d => d.truckPlate.toUpperCase() === formattedPlate);
      
      setIsAutoFilled(!!foundDriver);
      
      setFormData(prev => ({
        ...prev,
        truckPlate: formattedPlate,
        driverName: foundDriver ? foundDriver.name : (formattedPlate.length < prev.truckPlate.length ? '' : prev.driverName)
      }));
    } else if (name === 'origin') {
      const cityNorm = normalizeText(String(val));
      const match = freights.find(f => normalizeText(f.origin) === cityNorm);
      setFormData(prev => {
        const updated = {
          ...prev,
          origin: val,
          originState: (match && match.state) ? match.state : prev.originState
        };
        if (isInvalidTakerName(updated.serviceTaker)) {
          const autoTaker = resolveTripServiceTaker(updated, freights, []);
          if (autoTaker) updated.serviceTaker = autoTaker;
        }
        return updated;
      });
    } else if (name === 'destination') {
      const cityNorm = normalizeText(String(val));
      const match = freights.find(f => normalizeText(f.destination) === cityNorm);
      setFormData(prev => {
        const updated = {
          ...prev,
          destination: val,
          destinationState: (match && match.destinationState) ? match.destinationState : prev.destinationState
        };
        if (isInvalidTakerName(updated.serviceTaker)) {
          const autoTaker = resolveTripServiceTaker(updated, freights, []);
          if (autoTaker) updated.serviceTaker = autoTaker;
        }
        return updated;
      });
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: (name.includes('Tariff') || name === 'weight' || name === 'icmsRate') ? Number(val) : val
      }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-2 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl relative max-h-[96vh] flex flex-col animate-in zoom-in duration-200">
        <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-xl">
          <div className="flex items-center gap-2">
             <div className="bg-red-700 p-1.5 rounded-lg text-white shadow"><Calendar size={16} /></div>
             <div>
                <h3 className="text-sm font-black text-slate-900 tracking-tight leading-none">{initialData ? 'Editar Viagem' : 'Lançar Viagem'}</h3>
                <p className="text-[8px] text-slate-500 font-medium">Todos os campos sincronizados com o layout do Excel.</p>
             </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-red-700 rounded-full hover:bg-slate-100 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 custom-scrollbar">
          <form id="tripForm" onSubmit={handleSubmit} className="space-y-3">
            {/* Seletor de Rota Rápido */}
            {freights.length > 0 && !initialData?.id && (
              <div className="bg-blue-50 p-2 rounded-lg border border-blue-100 animate-in slide-in-from-top-1">
                <label className="block text-[7px] font-black text-blue-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                  <Zap size={8} className="text-blue-600 animate-bounce" /> Atalho: Selecionar Rota da Base de Fretes
                </label>
                <select 
                  name="selectedRoute" 
                  onChange={handleChange}
                  className="w-full bg-white border border-blue-200 rounded-md px-2.5 py-1.5 text-[10px] font-bold outline-none focus:ring-1 focus:ring-blue-100 transition-all appearance-none cursor-pointer"
                >
                  <option value="">-- Selecione uma Rota --</option>
                  {freights.map(f => (
                    <option key={f.id} value={f.id}>{f.origin} {'->'} {f.destination} ({f.serviceTaker})</option>
                  ))}
                </select>
              </div>
            )}

            {/* Bloco 1: Logística e Datas */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[7.5px] font-black text-slate-400 uppercase tracking-widest mb-0.5 flex items-center gap-0.5"><Calendar size={8}/> Data Viagem</label>
                <input type="date" required name="date" value={formData.date} onChange={handleChange} className="w-full bg-slate-50 border border-slate-150 rounded-lg px-2 py-1 text-[10px] font-black outline-none focus:ring-1 focus:ring-red-100 transition-all" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[7.5px] font-black text-slate-400 uppercase tracking-widest mb-0.5 flex items-center gap-0.5"><Building2 size={8}/> Cliente Tomador (Coluna O)</label>
                <input name="serviceTaker" value={formData.serviceTaker} onChange={handleChange} placeholder="Nome da Empresa / Cliente" className="w-full bg-slate-50 border border-slate-150 rounded-lg px-2 py-1 text-[10px] font-bold outline-none focus:ring-1 focus:ring-red-100 transition-all" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="block text-[7.5px] font-black text-slate-400 uppercase tracking-widest mb-0.5">MDFE</label>
                <select name="mdfeStatus" value={formData.mdfeStatus} onChange={handleChange} className="w-full bg-slate-50 border border-slate-150 rounded-lg px-2 py-1 text-[10px] font-black outline-none appearance-none cursor-pointer">
                  <option value="Pendente">Pendente</option>
                  <option value="Baixado">Baixado</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[7.5px] font-black text-slate-400 uppercase tracking-widest mb-0.5 flex items-center gap-0.5"><MapPin size={8}/> Origem Coleta</label>
                <div className="flex gap-1.5">
                  <input name="origin" value={formData.origin} onChange={handleChange} placeholder="Cidade" className="flex-1 bg-slate-50 border border-slate-150 rounded-lg px-2 py-1 text-[10px] font-bold outline-none focus:ring-1 focus:ring-red-100 transition-all" />
                  <input name="originState" value={formData.originState} onChange={handleChange} placeholder="UF" maxLength={2} className="w-12 text-center bg-slate-50 border border-slate-150 rounded-lg px-1.5 py-1 text-[10px] font-black uppercase outline-none focus:ring-1 focus:ring-red-100 transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-[7.5px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Mnemônico / UF</label>
                <div className="flex items-center text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-100 rounded-lg px-2 py-1 h-[26px]">
                  PR/SP/MS/MG
                </div>
              </div>
            </div>

            {/* Bloco 2: Destino */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
              <div className="sm:col-span-2">
                <label className="block text-[7.5px] font-black text-slate-400 uppercase tracking-widest mb-0.5 flex items-center gap-0.5"><MapPin size={8}/> Destino Carga</label>
                <div className="flex gap-1.5">
                  <input name="destination" value={formData.destination} onChange={handleChange} placeholder="Cidade" className="flex-1 bg-slate-50 border border-slate-150 rounded-lg px-2 py-1 text-[10px] font-bold outline-none focus:ring-1 focus:ring-red-100 transition-all" />
                  <input name="destinationState" value={formData.destinationState} onChange={handleChange} placeholder="UF" maxLength={2} className="w-12 text-center bg-slate-50 border border-slate-150 rounded-lg px-1.5 py-1 text-[10px] font-black uppercase outline-none focus:ring-1 focus:ring-red-100 transition-all" />
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[7.5px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Terminal Descarga</label>
                <input name="dischargeTerminal" value={formData.dischargeTerminal} onChange={handleChange} placeholder="Nome do Terminal" className="w-full bg-slate-50 border border-slate-150 rounded-lg px-2 py-1 text-[10px] font-bold outline-none focus:ring-1 focus:ring-red-100 transition-all" />
              </div>
            </div>

            {/* Bloco 3: Documentação e Pagamento */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="block text-[7.5px] font-black text-slate-400 uppercase tracking-widest mb-0.5 flex items-center gap-0.5"><Hash size={8}/> CTE</label>
                <input name="cteNumber" value={formData.cteNumber} onChange={handleChange} placeholder="0000" className="w-full bg-slate-50 border border-slate-150 rounded-lg px-2 py-1 text-[10px] font-black outline-none focus:ring-1 focus:ring-red-100 transition-all" />
              </div>
              <div>
                <label className="block text-[7.5px] font-black text-slate-400 uppercase tracking-widest mb-0.5 flex items-center gap-0.5"><Hash size={8}/> NFE</label>
                <input name="invoiceNumber" value={formData.invoiceNumber} onChange={handleChange} placeholder="0000" className="w-full bg-slate-50 border border-slate-150 rounded-lg px-2 py-1 text-[10px] font-black outline-none focus:ring-1 focus:ring-red-100 transition-all" />
              </div>
              <div>
                <label className="block text-[7.5px] font-black text-slate-400 uppercase tracking-widest mb-0.5 flex items-center gap-0.5"><CreditCard size={8}/> Pagamento</label>
                <input name="paymentType" value={formData.paymentType} onChange={handleChange} placeholder="À Vista / Pix" className="w-full bg-slate-50 border border-slate-150 rounded-lg px-2 py-1 text-[10px] font-bold outline-none focus:ring-1 focus:ring-red-100 transition-all" />
              </div>
              <div>
                <label className="block text-[7.5px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Peso (KG)</label>
                <input type="number" name="weight" value={formData.weight || ''} onChange={handleChange} placeholder="0" className="w-full bg-slate-50 border border-slate-150 rounded-lg px-2 py-1 text-[10px] font-black outline-none focus:ring-1 focus:ring-red-100 transition-all" />
              </div>
            </div>

            {/* Bloco 4: Veículo e Motorista (Slightly reduced in size and height) */}
            <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[7.5px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Placa Caminhão</label>
                <input 
                  required 
                  name="truckPlate" 
                  value={formData.truckPlate} 
                  onChange={handleChange} 
                  placeholder="ABC1234" 
                  className="w-full bg-white border border-red-100 rounded-lg px-2.5 py-1.5 text-sm font-black text-red-700 uppercase outline-none focus:border-red-400 focus:ring-1 focus:ring-red-100 transition-all placeholder:text-red-100" 
                />
              </div>
              <div className="relative">
                <div className="flex items-center justify-between mb-0.5">
                  <label className="block text-[7.5px] font-black text-slate-400 uppercase tracking-widest">Motorista</label>
                  {isAutoFilled && (
                    <span className="flex items-center gap-0.5 text-[6.5px] font-black text-blue-600 bg-blue-50 px-1 py-0.2 rounded uppercase border border-blue-100 shrink-0">
                      <UserCheck size={6} /> OK
                    </span>
                  )}
                </div>
                <input 
                  required 
                  name="driverName" 
                  value={formData.driverName} 
                  onChange={handleChange} 
                  placeholder="Nome do motorista..."
                  className={`w-full border rounded-lg px-2.5 py-1.5 text-xs font-black outline-none transition-all ${isAutoFilled ? 'bg-blue-50/10 border-blue-100 text-slate-800' : 'bg-white border-slate-150 text-slate-800 focus:ring-1 focus:ring-red-100'}`} 
                />
              </div>
            </div>

            {/* Bloco 5: Tarifas e Margem */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-center">
              <div>
                <label className="block text-[7.5px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Tarifa Tomador (Pl. O)</label>
                <input type="number" step="0.01" name="companyTariff" value={formData.companyTariff || ''} placeholder="0.00" onChange={handleChange} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-black text-slate-800 outline-none focus:border-red-600 focus:ring-1 focus:ring-red-100 transition-all" />
              </div>
              <div>
                <label className="block text-[7.5px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Tarifa Motorista (TON)</label>
                <input type="number" step="0.01" name="driverTariff" value={formData.driverTariff || ''} placeholder="0.00" onChange={handleChange} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-black text-slate-800 outline-none focus:border-red-600 focus:ring-1 focus:ring-red-100 transition-all" />
              </div>
              <div className="col-span-2 bg-red-950 px-3 py-1 bg-gradient-to-r from-red-950 to-slate-950 rounded-lg text-center shadow">
                 <div className="flex justify-between items-center h-full">
                   <div>
                     <p className="text-[6px] font-black text-red-400 uppercase tracking-wider text-left">Margem Estimada</p>
                     <p className="text-[10px] font-black text-emerald-400 text-left">
                       {financialCalculations.margin.toFixed(1)}% ({new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(financialCalculations.profit)})
                     </p>
                   </div>
                   <div className="text-right">
                     <p className="text-[6px] font-black text-red-400 uppercase tracking-wider text-right">Faturamento Líquido</p>
                     <p className="text-[10px] font-black text-white text-right">
                       {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(financialCalculations.netRevenue)}
                     </p>
                   </div>
                 </div>
              </div>
            </div>

            {/* Bloco 6: Anotações */}
            <div>
              <label className="block text-[7.5px] font-black text-slate-400 uppercase tracking-widest mb-0.5 flex items-center gap-1"><FileText size={8}/> Anotações</label>
              <textarea 
                name="notes" 
                value={formData.notes} 
                onChange={handleChange} 
                onInput={handleAutoResize}
                rows={1} 
                placeholder="Observações da viagem..." 
                className="w-full bg-slate-50 border border-slate-150 rounded-lg px-2 py-1 text-[10px] font-medium outline-none focus:ring-1 focus:ring-red-100 transition-all resize-none overflow-hidden" 
              />
            </div>
          </form>
        </div>

        <div className="px-4 py-2.5 border-t border-slate-100 flex items-center justify-end gap-2 sticky bottom-0 bg-slate-50 z-10 rounded-b-xl">
          <button onClick={onClose} className="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-red-700 transition-colors">
            Descartar
          </button>
          <button form="tripForm" type="submit" className="px-5 py-2 bg-red-700 text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-red-800 shadow shadow-red-900/30 transition-all flex items-center gap-1.5 active:scale-95">
            <Save size={12} />
            {initialData ? 'Atualizar' : 'Lançar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TripFormModal;
