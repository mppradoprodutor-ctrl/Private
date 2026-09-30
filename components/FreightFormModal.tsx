
import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, MapPin, DollarSign, Package, Loader2, TrendingUp, Percent, Check, FileText, AlertCircle, ToggleLeft, ToggleRight } from 'lucide-react';
import { Freight } from '../types';
import { GoogleGenAI } from "@google/genai";

interface FreightFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (freight: Omit<Freight, 'id' | 'createdAt'>) => void;
  initialData?: Freight;
}

const FreightFormModal: React.FC<FreightFormModalProps> = ({ isOpen, onClose, onSubmit, initialData }) => {
  const emptyForm: Omit<Freight, 'id' | 'createdAt'> = {
    location: '',
    origin: '',
    state: '',
    destination: '',
    destinationState: '',
    dischargeTerminal: '',
    companyTariff: 0,
    driverTariff: 0,
    serviceTaker: '',
    product: '',
    collectionAddress: '',
    destinationAddress: '',
    restrictions: '',
    notes: '',
    axles: [],
    distance: '',
    deductIcms: false,
    icmsRate: 0,
    active: true
  };

  const [formData, setFormData] = useState<Omit<Freight, 'id' | 'createdAt'>>(emptyForm);
  const [isFetchingIcms, setIsFetchingIcms] = useState(false);

  const availableAxles = ['4', '5', '6', '7', '9'];

  useEffect(() => {
    if (initialData) {
      setFormData({
        location: initialData.location || '',
        origin: initialData.origin || '',
        state: initialData.state || '',
        destination: initialData.destination || '',
        destinationState: initialData.destinationState || '',
        dischargeTerminal: initialData.dischargeTerminal || '',
        companyTariff: initialData.companyTariff || 0,
        driverTariff: initialData.driverTariff || 0,
        serviceTaker: initialData.serviceTaker || '',
        product: initialData.product || '',
        collectionAddress: initialData.collectionAddress || '',
        destinationAddress: initialData.destinationAddress || '',
        restrictions: initialData.restrictions || '',
        notes: initialData.notes || '',
        axles: Array.isArray(initialData.axles) ? initialData.axles : (initialData.axles ? [initialData.axles] : []),
        distance: initialData.distance || '',
        deductIcms: initialData.deductIcms || false,
        icmsRate: initialData.icmsRate || 0,
        active: initialData.active ?? true
      });
    } else {
      setFormData(emptyForm);
    }
  }, [initialData, isOpen]);

  useEffect(() => {
    const fetchIcmsRate = async () => {
      if (formData.deductIcms && formData.state && formData.destinationState && formData.state.length === 2 && formData.destinationState.length === 2) {
        setIsFetchingIcms(true);
        try {
          const ai = new GoogleGenAI({ apiKey: (process.env.GEMINI_API_KEY as string) });
          const prompt = `Retorne apenas o número (sem símbolos) da alíquota de ICMS padrão para transporte rodoviário de carga partindo de ${formData.state} para ${formData.destinationState} no Brasil. Exemplo: 12 ou 7 ou 18.`;
          
          const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
          });

          const text = response.text || "";
          const rate = parseFloat(text.replace(/[^0-9.]/g, ''));
          if (!isNaN(rate)) {
            setFormData(prev => ({ ...prev, icmsRate: rate }));
          }
        } catch (error) {
          console.error("Erro ao buscar ICMS:", error);
        } finally {
          setIsFetchingIcms(false);
        }
      }
    };

    fetchIcmsRate();
  }, [formData.state, formData.destinationState, formData.deductIcms]);

  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure DOM is ready and textareas resize smoothly
      const timer = setTimeout(() => {
        const textareas = document.querySelectorAll('textarea');
        textareas.forEach(ta => {
          ta.style.height = 'auto';
          ta.style.height = `${Math.max(28, ta.scrollHeight)}px`;
        });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [
    isOpen, 
    formData.restrictions, 
    formData.notes, 
    formData.collectionAddress, 
    formData.destinationAddress, 
    formData.dischargeTerminal, 
    formData.serviceTaker, 
    formData.product
  ]);

  const financialCalculations = useMemo(() => {
    const grossFreight = formData.companyTariff;
    const icmsAmount = formData.deductIcms ? (grossFreight * (formData.icmsRate / 100)) : 0;
    const netRevenue = grossFreight - icmsAmount;
    const profit = netRevenue - formData.driverTariff;
    const margin = grossFreight > 0 ? (profit / grossFreight) * 100 : 0;

    return { icmsAmount, netRevenue, profit, margin };
  }, [formData.companyTariff, formData.driverTariff, formData.deductIcms, formData.icmsRate]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let submitData = { ...formData };
    // Normalization: Santa Cruz das Palmeiras is always in SP
    if (submitData.origin && submitData.origin.toUpperCase().includes('SANTA CRUZ DAS PALMEIRAS')) {
      submitData.state = 'SP';
    }
    if (submitData.destination && submitData.destination.toUpperCase().includes('SANTA CRUZ DAS PALMEIRAS')) {
      submitData.destinationState = 'SP';
    }

    const trimmedOrigin = (submitData.origin || '').trim();
    const trimmedDest = (submitData.destination || '').trim();
    const trimmedTaker = (submitData.serviceTaker || '').trim();
    const trimmedProd = (submitData.product || '').trim();

    // Se nem origem nem destino forem informados, gera identificador legível para o card
    const finalOrigin = trimmedOrigin || (trimmedDest ? 'A DEFINIR' : (trimmedTaker ? `ROTA ${trimmedTaker}` : (trimmedProd ? `FRETE ${trimmedProd}` : 'A DEFINIR')));
    const finalDest = trimmedDest || (trimmedOrigin ? 'A DEFINIR' : 'A DEFINIR');

    onSubmit({
      ...submitData,
      location: (submitData.location || '').trim(),
      origin: finalOrigin,
      state: (submitData.state || '').trim().toUpperCase(),
      destination: finalDest,
      destinationState: (submitData.destinationState || '').trim().toUpperCase(),
      companyTariff: Number(submitData.companyTariff) || 0,
      driverTariff: Number(submitData.driverTariff) || 0,
      dischargeTerminal: (submitData.dischargeTerminal || '').trim(),
      serviceTaker: trimmedTaker,
      product: trimmedProd || 'Geral',
      collectionAddress: (submitData.collectionAddress || '').trim(),
      destinationAddress: (submitData.destinationAddress || '').trim(),
      restrictions: (submitData.restrictions || '').trim(),
      notes: (submitData.notes || '').trim(),
      distance: (submitData.distance || '').trim()
    });
    onClose();
  };

  const handleAutoResize = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    target.style.height = 'auto';
    target.style.height = `${target.scrollHeight}px`;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: (name.includes('Tariff') || name === 'icmsRate') ? Number(val) : val
    }));
  };

  const toggleActive = () => {
    setFormData(prev => ({ ...prev, active: !prev.active }));
  };

  const toggleAxle = (axle: string) => {
    setFormData(prev => {
      const currentAxles = prev.axles || [];
      if (currentAxles.includes(axle)) {
        return { ...prev, axles: currentAxles.filter(a => a !== axle) };
      } else {
        if (currentAxles.length >= 4) return prev; 
        return { ...prev, axles: [...currentAxles, axle] };
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 bg-slate-900/50 backdrop-blur-sm overflow-hidden">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl relative max-h-[98vh] flex flex-col animate-in zoom-in duration-200">
        {/* Header com Toggle de Status embutido */}
        <div className="px-5 py-2 border-b border-slate-100 flex items-center justify-between bg-white z-10 rounded-t-xl shrink-0">
          <div className="flex items-center gap-2">
             <div className="bg-blue-50 p-1.5 rounded-lg text-blue-600"><MapPin size={16} /></div>
             <div>
                 <h3 className="text-xs font-black text-slate-900 tracking-tight leading-none">{initialData ? 'Editar Rota' : 'Nova Rota na Base'}</h3>
                 <p className="text-[8px] text-slate-400 font-medium">Preencha os campos desejados (nenhum campo é obrigatório para salvar).</p>
              </div>
          </div>

          <div className="flex items-center gap-3">
             <button 
              type="button" 
              onClick={toggleActive} 
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all font-black text-[8px] uppercase tracking-wider border ${formData.active ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-red-50 text-red-700 border-red-300'}`}
             >
                {formData.active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                {formData.active ? 'Rota Ativa' : 'Rota Inativa'}
             </button>
             <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors">
              <X size={16} />
             </button>
          </div>
        </div>

        {/* Form Content - Compact Grid sem rolagem */}
        <div className="px-5 py-3 space-y-2.5 overflow-y-auto no-scrollbar max-h-[82vh]">
          <form id="freightForm" onSubmit={handleSubmit} className="space-y-2.5">
            
            {/* LINHA 1: Local, Origem, Destino e Tarifas */}
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-2">
                <label className="block text-[7.5px] font-black text-slate-400 uppercase tracking-widest mb-0.5 ml-0.5">Local</label>
                <input name="location" placeholder="Ex: Silo, Fazenda..." value={formData.location || ''} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-bold outline-none focus:ring-1 focus:ring-blue-100 transition-all" />
              </div>
              <div className="col-span-2">
                <label className="block text-[7.5px] font-black text-slate-400 uppercase tracking-widest mb-0.5 ml-0.5">Origem (Cidade)</label>
                <input name="origin" placeholder="Ex: Maringá" value={formData.origin} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-bold outline-none focus:ring-1 focus:ring-blue-100 transition-all" />
              </div>
              <div className="col-span-1">
                <label className="block text-[7.5px] font-black text-slate-400 uppercase tracking-widest mb-0.5 text-center">UF</label>
                <input name="state" value={formData.state} onChange={handleChange} placeholder="PR" maxLength={2} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-1 py-1 text-[11px] font-bold uppercase outline-none focus:ring-1 focus:ring-blue-100 transition-all text-center" />
              </div>
              <div className="col-span-2">
                <label className="block text-[7.5px] font-black text-slate-400 uppercase tracking-widest mb-0.5 ml-0.5">Destino Final</label>
                <input name="destination" placeholder="Ex: Paranaguá" value={formData.destination} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-bold outline-none focus:ring-1 focus:ring-blue-100 transition-all" />
              </div>
              <div className="col-span-1">
                <label className="block text-[7.5px] font-black text-slate-400 uppercase tracking-widest mb-0.5 text-center">UF</label>
                <input name="destinationState" value={formData.destinationState} onChange={handleChange} placeholder="PR" maxLength={2} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-1 py-1 text-[11px] font-bold uppercase outline-none focus:ring-1 focus:ring-blue-100 transition-all text-center" />
              </div>
              <div className="col-span-2">
                <div className="flex justify-between items-center mb-0.5">
                  <label className="block text-[7.5px] font-black text-slate-400 uppercase tracking-widest">Tarifa Empresa</label>
                </div>
                <input type="number" step="0.01" name="companyTariff" value={formData.companyTariff || ''} onChange={handleChange} placeholder="R$ 0,00" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-black text-slate-900 outline-none focus:ring-1 focus:ring-blue-100 transition-all" />
              </div>
              <div className="col-span-2">
                <label className="block text-[7.5px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Tarifa Motorista</label>
                <input type="number" step="0.01" name="driverTariff" value={formData.driverTariff || ''} onChange={handleChange} placeholder="R$ 0,00" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-black text-slate-900 outline-none focus:ring-1 focus:ring-blue-100 transition-all" />
              </div>
            </div>

            {/* LINHA 2: Barra de Dedução ICMS & Logística */}
            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-5 bg-slate-900 px-3 py-1 rounded-lg border border-slate-800 flex items-center justify-between text-white">
                <div className="flex items-center gap-1.5">
                  <Percent size={12} className="text-blue-400" />
                  <span className="text-[8px] font-black uppercase tracking-wider">Dedução ICMS</span>
                  <label className="relative inline-flex items-center cursor-pointer ml-1">
                    <input type="checkbox" name="deductIcms" checked={formData.deductIcms} onChange={handleChange} className="sr-only peer" />
                    <div className="w-7 h-4 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {formData.deductIcms && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <span className="text-[7px] text-slate-400 uppercase font-bold">%</span>
                      <input 
                        type="number" 
                        name="icmsRate" 
                        value={formData.icmsRate} 
                        onChange={handleChange} 
                        className="w-10 bg-slate-800 border border-slate-700 rounded px-1 py-0.5 text-white text-[9px] font-black outline-none text-center" 
                      />
                      {isFetchingIcms && <Loader2 size={9} className="animate-spin text-blue-400" />}
                    </div>
                    <span className="text-[7.5px] font-bold text-emerald-400 truncate max-w-[110px]">
                      Líq: {financialCalculations.netRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-1 text-[8px] font-bold text-amber-400">
                  <TrendingUp size={9} />
                  <span>{financialCalculations.margin.toFixed(1)}%</span>
                </div>
              </div>

              <div className="col-span-2">
                <label className="block text-[7.5px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Terminal Descarga</label>
                <textarea 
                  name="dischargeTerminal" 
                  value={formData.dischargeTerminal} 
                  onChange={handleChange} 
                  onInput={handleAutoResize}
                  rows={1}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-semibold outline-none focus:ring-1 focus:ring-blue-100 transition-all resize-none overflow-hidden whitespace-pre-wrap break-words leading-snug" 
                />
              </div>
              <div className="col-span-2">
                <label className="block text-[7.5px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Tomador Serviço</label>
                <textarea 
                  name="serviceTaker" 
                  value={formData.serviceTaker} 
                  onChange={handleChange} 
                  onInput={handleAutoResize}
                  rows={1}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-semibold outline-none focus:ring-1 focus:ring-blue-100 transition-all resize-none overflow-hidden whitespace-pre-wrap break-words leading-snug" 
                />
              </div>
              <div className="col-span-3">
                <label className="block text-[7.5px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Produto Predominante</label>
                <div className="relative">
                  <Package className="absolute left-2 top-2 text-slate-300" size={11} />
                  <textarea 
                    name="product" 
                    value={formData.product} 
                    onChange={handleChange} 
                    onInput={handleAutoResize}
                    rows={1}
                    placeholder="Ex: Milho, Soja..." 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-6 pr-2 py-1 text-[11px] font-semibold outline-none focus:ring-1 focus:ring-blue-100 transition-all resize-none overflow-hidden whitespace-pre-wrap break-words leading-snug" 
                  />
                </div>
              </div>
            </div>

            {/* LINHA 3: Eixos & Endereços */}
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-4">
                <label className="block text-[7.5px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Configuração de Eixos</label>
                <div className="flex gap-1">
                  {availableAxles.map(axle => (
                    <button
                      key={axle}
                      type="button"
                      onClick={() => toggleAxle(axle)}
                      className={`flex-1 py-1 rounded-md text-[8.5px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-0.5 border ${
                        formData.axles?.includes(axle) 
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                          : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-blue-200'
                      }`}
                    >
                      {formData.axles?.includes(axle) && <Check size={8} />}
                      {axle}E
                    </button>
                  ))}
                </div>
              </div>

              <div className="col-span-4">
                <label className="block text-[7.5px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Endereço de Coleta</label>
                <textarea 
                  name="collectionAddress" 
                  value={formData.collectionAddress} 
                  onChange={handleChange} 
                  onInput={handleAutoResize}
                  rows={1}
                  placeholder="Endereço ou Ponto de Coleta..." 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-medium outline-none focus:ring-1 focus:ring-blue-100 transition-all resize-none overflow-hidden whitespace-pre-wrap break-words leading-snug" 
                />
              </div>

              <div className="col-span-4">
                <label className="block text-[7.5px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Endereço de Destino</label>
                <textarea 
                  name="destinationAddress" 
                  value={formData.destinationAddress} 
                  onChange={handleChange} 
                  onInput={handleAutoResize}
                  rows={1}
                  placeholder="Endereço de Destino/Entrega..." 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-medium outline-none focus:ring-1 focus:ring-blue-100 transition-all resize-none overflow-hidden whitespace-pre-wrap break-words leading-snug" 
                />
              </div>
            </div>

            {/* LINHA 4: Restrições & Anotações Gerais */}
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-6">
                <label className="block text-[7.5px] font-black text-slate-400 uppercase tracking-widest mb-0.5 flex items-center gap-1">
                  <AlertCircle size={9} className="text-amber-500" /> Restrições Operacionais
                </label>
                <textarea 
                  name="restrictions" 
                  value={formData.restrictions} 
                  onChange={handleChange} 
                  onInput={handleAutoResize}
                  rows={1}
                  placeholder="Ex: Não carregar em dias de chuva, horários limitados..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-medium outline-none focus:ring-1 focus:ring-blue-100 transition-all resize-none overflow-hidden whitespace-pre-wrap break-words leading-snug" 
                />
              </div>
              <div className="col-span-6">
                <label className="block text-[7.5px] font-black text-slate-400 uppercase tracking-widest mb-0.5 flex items-center gap-1">
                  <FileText size={9} className="text-blue-500" /> Anotações Gerais
                </label>
                <textarea 
                  name="notes" 
                  value={formData.notes} 
                  onChange={handleChange} 
                  onInput={handleAutoResize}
                  rows={1}
                  placeholder="Observações adicionais sobre a rota..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-medium outline-none focus:ring-1 focus:ring-blue-100 transition-all resize-none overflow-hidden whitespace-pre-wrap break-words leading-snug" 
                />
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-5 py-2 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50 z-10 rounded-b-xl shrink-0">
          <button onClick={onClose} className="px-3 py-1 text-[9px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-800 transition-colors">
            Cancelar
          </button>
          <button form="freightForm" type="submit" className="px-4 py-1.5 bg-blue-600 text-white text-[9px] font-black uppercase tracking-wider rounded-lg hover:bg-blue-700 shadow transition-all flex items-center gap-1.5 active:scale-95">
            <Save size={11} />
            {initialData ? 'Atualizar Rota' : 'Salvar Rota'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FreightFormModal;
