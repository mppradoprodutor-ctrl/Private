
import React, { useState, useEffect } from 'react';
import { X, Save, Building2, Package, DollarSign, Navigation, FileText } from 'lucide-react';
import { ThirdPartyFreight } from '../types';

interface ThirdPartyFreightFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<ThirdPartyFreight, 'id' | 'createdAt'>) => void;
  initialData?: ThirdPartyFreight;
}

const ThirdPartyFreightFormModal: React.FC<ThirdPartyFreightFormModalProps> = ({ isOpen, onClose, onSubmit, initialData }) => {
  const [formData, setFormData] = useState<Omit<ThirdPartyFreight, 'id' | 'createdAt'>>({
    carrier: '',
    product: '',
    origin: '',
    destination: '',
    freightRate: 0,
    distanceKm: 0,
    notes: ''
  });

  useEffect(() => {
    if (initialData && isOpen) {
      setFormData({
        carrier: initialData.carrier,
        product: initialData.product,
        origin: initialData.origin,
        destination: initialData.destination,
        freightRate: initialData.freightRate,
        distanceKm: initialData.distanceKm,
        notes: initialData.notes || ''
      });
    } else if (isOpen) {
      setFormData({
        carrier: '',
        product: '',
        origin: '',
        destination: '',
        freightRate: 0,
        distanceKm: 0,
        notes: ''
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 bg-slate-900/60 backdrop-blur-md">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
        <div className="px-5 py-2.5 bg-red-950 flex items-center justify-between border-b border-red-900">
          <div className="flex items-center gap-2.5">
             <div className="bg-red-600 p-1.5 rounded-lg text-white shadow-md"><Building2 size={16} /></div>
             <div>
                <h3 className="text-sm font-black text-white uppercase leading-none">Frete Dia</h3>
                <p className="text-red-400 text-[8px] font-bold uppercase tracking-wider mt-0.5">Gestão de Operação Externa</p>
             </div>
          </div>
          <button onClick={onClose} className="p-1 text-red-200/50 hover:text-white transition-colors"><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div>
            <label className="block text-[7.5px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Transportadora</label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
              <input 
                required 
                value={formData.carrier} 
                onChange={e => setFormData({...formData, carrier: e.target.value})} 
                className="w-full bg-slate-50 border border-slate-100 rounded-lg pl-8 pr-3 py-1.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-red-100" 
                placeholder="Nome da Transportadora..." 
              />
            </div>
          </div>

          <div>
            <label className="block text-[7.5px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Produto</label>
            <div className="relative">
              <Package className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
              <input 
                required 
                value={formData.product} 
                onChange={e => setFormData({...formData, product: e.target.value})} 
                className="w-full bg-slate-50 border border-slate-100 rounded-lg pl-8 pr-3 py-1.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-red-100" 
                placeholder="Ex: Milho, Soja..." 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[7.5px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Cidade Origem</label>
              <input 
                required 
                value={formData.origin} 
                onChange={e => setFormData({...formData, origin: e.target.value})} 
                className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-red-100" 
                placeholder="Maringá-PR" 
              />
            </div>
            <div>
              <label className="block text-[7.5px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Cidade Destino</label>
              <input 
                required 
                value={formData.destination} 
                onChange={e => setFormData({...formData, destination: e.target.value})} 
                className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-red-100" 
                placeholder="Santos-SP" 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[7.5px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Tarifa Frete (R$)</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={12} />
                <input 
                  type="number" 
                  step="0.01" 
                  required 
                  value={formData.freightRate || ''} 
                  onChange={e => setFormData({...formData, freightRate: Number(e.target.value)})} 
                  className="w-full bg-slate-50 border border-slate-100 rounded-lg pl-7 pr-3 py-1.5 text-xs font-black outline-none focus:ring-2 focus:ring-red-100" 
                  placeholder="0,00"
                />
              </div>
            </div>
            <div>
              <label className="block text-[7.5px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Distância Total (KM)</label>
              <div className="relative">
                <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={12} />
                <input 
                  type="number" 
                  step="1"
                  min="0"
                  required 
                  value={formData.distanceKm || ''} 
                  onChange={e => setFormData({...formData, distanceKm: Number(e.target.value)})} 
                  className="w-full bg-slate-50 border border-slate-100 rounded-lg pl-7 pr-3 py-1.5 text-xs font-black outline-none focus:ring-2 focus:ring-red-100" 
                  placeholder="Ex: 650"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[7.5px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1 flex items-center gap-1">
              <FileText size={10} className="text-slate-400" /> Anotação / Observações
            </label>
            <div className="relative">
              <textarea 
                value={formData.notes || ''} 
                onChange={e => {
                  setFormData({...formData, notes: e.target.value});
                  e.target.style.height = 'auto';
                  e.target.style.height = `${e.target.scrollHeight}px`;
                }} 
                rows={2}
                className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-red-100 resize-none overflow-hidden transition-all text-slate-800 leading-relaxed" 
                placeholder="Digite aqui as anotações (com quebras de linha)..." 
                style={{ minHeight: '52px' }}
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="w-full bg-red-700 text-white font-black text-[9px] uppercase tracking-wider py-2.5 rounded-lg shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all mt-3 hover:bg-red-800"
          >
            <Save size={14} /> Salvar Frete Terceiro
          </button>
        </form>
      </div>
    </div>
  );
};

export default ThirdPartyFreightFormModal;
