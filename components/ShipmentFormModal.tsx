
import React, { useState, useEffect } from 'react';
import { X, Save, Package, Calendar, Truck, MapPin, Activity, Scale, Phone, User, Info } from 'lucide-react';
import { Shipment } from '../types';

interface ShipmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Shipment, 'id' | 'createdAt'>) => void;
  editingShipment: Shipment | null;
}

const ShipmentFormModal: React.FC<ShipmentFormModalProps> = ({ isOpen, onClose, onSubmit, editingShipment }) => {
  const [formData, setFormData] = useState({
    shipmentDate: '',
    branch: '',
    driver: '',
    phone: '',
    plate: '',
    weight: 0,
    dispatch: '',
    origin: '',
    destination: '',
    status: '',
    forecast: '',
    operation: '',
    product: '',
    type: '',
    client: '',
    ppte: '',
    pptm: '',
    obs: ''
  });

  useEffect(() => {
    if (editingShipment) {
      setFormData({
        shipmentDate: editingShipment.shipmentDate,
        branch: editingShipment.branch,
        driver: editingShipment.driver,
        phone: editingShipment.phone,
        plate: editingShipment.plate,
        weight: editingShipment.weight,
        dispatch: editingShipment.dispatch,
        origin: editingShipment.origin,
        destination: editingShipment.destination,
        status: editingShipment.status,
        forecast: editingShipment.forecast,
        operation: editingShipment.operation,
        product: editingShipment.product,
        type: editingShipment.type,
        client: editingShipment.client,
        ppte: editingShipment.ppte,
        pptm: editingShipment.pptm,
        obs: editingShipment.obs
      });
    } else {
      setFormData({
        shipmentDate: new Date().toISOString().split('T')[0],
        branch: '',
        driver: '',
        phone: '',
        plate: '',
        weight: 0,
        dispatch: '',
        origin: '',
        destination: '',
        status: 'Pendente',
        forecast: '',
        operation: '',
        product: '',
        type: '',
        client: '',
        ppte: '',
        pptm: '',
        obs: ''
      });
    }
  }, [editingShipment, isOpen]);

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
  }, [isOpen, formData.obs]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let submitData = { ...formData };
    // Normalization: Santa Cruz das Palmeiras is always in SP
    if (submitData.origin.toUpperCase().includes('SANTA CRUZ DAS PALMEIRAS') && !submitData.origin.toUpperCase().includes('SP')) {
      submitData.origin = `${submitData.origin.replace(/,\s*[A-Z]{2}$/i, '').trim()}, SP`;
    }
    if (submitData.destination.toUpperCase().includes('SANTA CRUZ DAS PALMEIRAS') && !submitData.destination.toUpperCase().includes('SP')) {
      submitData.destination = `${submitData.destination.replace(/,\s*[A-Z]{2}$/i, '').trim()}, SP`;
    }

    onSubmit(submitData);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-2 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[95vh]">
        <div className="px-5 py-2.5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="bg-red-600 p-1.5 rounded-lg text-white shadow-md">
              <Package size={16} />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 uppercase leading-none">
                {editingShipment ? 'Editar Embarque' : 'Novo Embarque'}
              </h2>
              <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">Preencha os dados da operação</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg transition-colors text-slate-600">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Dados Básicos */}
            <div className="space-y-2">
              <h4 className="text-[8.5px] font-black text-red-600 uppercase tracking-wider border-b border-red-100 pb-1">Logística Básica</h4>
              
              <div className="space-y-0.5">
                <label className="block text-[7.5px] font-black text-slate-600 uppercase tracking-widest ml-1">Data Embarque</label>
                <div className="relative">
                  <Calendar size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  <input 
                    type="date" 
                    required
                    value={formData.shipmentDate}
                    onChange={e => setFormData({...formData, shipmentDate: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-100 rounded-lg pl-8 pr-2 py-1 text-xs font-semibold outline-none focus:ring-1 focus:ring-red-100" 
                  />
                </div>
              </div>

              <div className="space-y-0.5">
                <label className="block text-[7.5px] font-black text-slate-600 uppercase tracking-widest ml-1">Filial</label>
                <div className="relative">
                  <MapPin size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  <input 
                    type="text" 
                    required
                    placeholder="Ex: Maringá"
                    value={formData.branch}
                    onChange={e => setFormData({...formData, branch: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-100 rounded-lg pl-8 pr-2 py-1 text-xs font-semibold outline-none focus:ring-1 focus:ring-red-100 uppercase" 
                  />
                </div>
              </div>

              <div className="space-y-0.5">
                <label className="block text-[7.5px] font-black text-slate-600 uppercase tracking-widest ml-1">Status</label>
                <div className="relative">
                  <Activity size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  <input 
                    type="text" 
                    required
                    placeholder="Ex: Carregado, Pendente"
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-100 rounded-lg pl-8 pr-2 py-1 text-xs font-semibold outline-none focus:ring-1 focus:ring-red-100 uppercase" 
                  />
                </div>
              </div>
            </div>

            {/* Veículo e Motorista */}
            <div className="space-y-2">
              <h4 className="text-[8.5px] font-black text-red-600 uppercase tracking-wider border-b border-red-100 pb-1">Veículo e Condutor</h4>
              
              <div className="space-y-0.5">
                <label className="block text-[7.5px] font-black text-slate-600 uppercase tracking-widest ml-1">Motorista</label>
                <div className="relative">
                  <User size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  <input 
                    type="text" 
                    required
                    placeholder="Nome completo"
                    value={formData.driver}
                    onChange={e => setFormData({...formData, driver: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-100 rounded-lg pl-8 pr-2 py-1 text-xs font-semibold outline-none focus:ring-1 focus:ring-red-100 uppercase" 
                  />
                </div>
              </div>

              <div className="space-y-0.5">
                <label className="block text-[7.5px] font-black text-slate-600 uppercase tracking-widest ml-1">Telefone</label>
                <div className="relative">
                  <Phone size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  <input 
                    type="text" 
                    placeholder="(00) 00000-0000"
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-100 rounded-lg pl-8 pr-2 py-1 text-xs font-semibold outline-none focus:ring-1 focus:ring-red-100" 
                  />
                </div>
              </div>

              <div className="space-y-0.5">
                <label className="block text-[7.5px] font-black text-slate-600 uppercase tracking-widest ml-1">Placa</label>
                <div className="relative">
                  <Truck size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  <input 
                    type="text" 
                    required
                    placeholder="ABC-1234"
                    value={formData.plate}
                    onChange={e => setFormData({...formData, plate: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-100 rounded-lg pl-8 pr-2 py-1 text-xs font-semibold outline-none focus:ring-1 focus:ring-red-100 uppercase" 
                  />
                </div>
              </div>
            </div>

            {/* Carga e Rota */}
            <div className="space-y-2">
              <h4 className="text-[8.5px] font-black text-red-600 uppercase tracking-wider border-b border-red-100 pb-1">Carga e Rota</h4>
              
              <div className="space-y-0.5">
                <label className="block text-[7.5px] font-black text-slate-600 uppercase tracking-widest ml-1">Peso (KG)</label>
                <div className="relative">
                  <Scale size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  <input 
                    type="number" 
                    required
                    placeholder="0"
                    value={formData.weight}
                    onChange={e => setFormData({...formData, weight: Number(e.target.value)})}
                    className="w-full bg-slate-50 border border-slate-100 rounded-lg pl-8 pr-2 py-1 text-xs font-semibold outline-none focus:ring-1 focus:ring-red-100" 
                  />
                </div>
              </div>

              <div className="space-y-0.5">
                <label className="block text-[7.5px] font-black text-slate-600 uppercase tracking-widest ml-1">Origem</label>
                <div className="relative">
                  <MapPin size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  <input 
                    type="text" 
                    required
                    placeholder="Cidade Origem"
                    value={formData.origin}
                    onChange={e => setFormData({...formData, origin: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-100 rounded-lg pl-8 pr-2 py-1 text-xs font-semibold outline-none focus:ring-1 focus:ring-red-100 uppercase" 
                  />
                </div>
              </div>

              <div className="space-y-0.5">
                <label className="block text-[7.5px] font-black text-slate-600 uppercase tracking-widest ml-1">Destino</label>
                <div className="relative">
                  <MapPin size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  <input 
                    type="text" 
                    required
                    placeholder="Ex: Maringá, Curitiba"
                    value={formData.destination}
                    onChange={e => setFormData({...formData, destination: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-100 rounded-lg pl-8 pr-2 py-1 text-xs font-semibold outline-none focus:ring-1 focus:ring-red-100 uppercase" 
                  />
                </div>
                <p className="text-[7px] font-bold text-slate-400 ml-1 italic leading-none">Separe múltiplos com vírgula</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
             <div className="space-y-0.5">
                <label className="block text-[7.5px] font-black text-slate-600 uppercase tracking-widest ml-1">Envio</label>
                <input type="text" value={formData.dispatch} onChange={e => setFormData({...formData, dispatch: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1 text-xs font-semibold outline-none focus:ring-1 focus:ring-red-100 uppercase" />
             </div>
             <div className="space-y-0.5">
                <label className="block text-[7.5px] font-black text-slate-600 uppercase tracking-widest ml-1">Previsão</label>
                <input type="text" value={formData.forecast} onChange={e => setFormData({...formData, forecast: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1 text-xs font-semibold outline-none focus:ring-1 focus:ring-red-100 uppercase" />
             </div>
             <div className="space-y-0.5">
                <label className="block text-[7.5px] font-black text-slate-600 uppercase tracking-widest ml-1">Operação</label>
                <input type="text" value={formData.operation} onChange={e => setFormData({...formData, operation: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1 text-xs font-semibold outline-none focus:ring-1 focus:ring-red-100 uppercase" />
             </div>
             <div className="space-y-0.5">
                <label className="block text-[7.5px] font-black text-slate-600 uppercase tracking-widest ml-1">Produto</label>
                <input type="text" value={formData.product} onChange={e => setFormData({...formData, product: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1 text-xs font-semibold outline-none focus:ring-1 focus:ring-red-100 uppercase" />
             </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
             <div className="space-y-0.5">
                <label className="block text-[7.5px] font-black text-slate-600 uppercase tracking-widest ml-1">Tipo</label>
                <input type="text" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1 text-xs font-semibold outline-none focus:ring-1 focus:ring-red-100 uppercase" />
             </div>
             <div className="space-y-0.5">
                <label className="block text-[7.5px] font-black text-slate-600 uppercase tracking-widest ml-1">Cliente</label>
                <input type="text" value={formData.client} onChange={e => setFormData({...formData, client: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1 text-xs font-semibold outline-none focus:ring-1 focus:ring-red-100 uppercase" />
             </div>
             <div className="space-y-0.5">
                <label className="block text-[7.5px] font-black text-slate-600 uppercase tracking-widest ml-1">PPTE</label>
                <input type="text" value={formData.ppte} onChange={e => setFormData({...formData, ppte: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1 text-xs font-semibold outline-none focus:ring-1 focus:ring-red-100 uppercase" />
             </div>
             <div className="space-y-0.5">
                <label className="block text-[7.5px] font-black text-slate-600 uppercase tracking-widest ml-1">PPTM</label>
                <input type="text" value={formData.pptm} onChange={e => setFormData({...formData, pptm: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1 text-xs font-semibold outline-none focus:ring-1 focus:ring-red-100 uppercase" />
             </div>
          </div>

          <div className="mt-2 space-y-0.5">
            <label className="block text-[7.5px] font-black text-slate-600 uppercase tracking-widest ml-1">Observações</label>
            <textarea 
              rows={1}
              value={formData.obs}
              onChange={e => setFormData({...formData, obs: e.target.value})}
              onInput={handleAutoResize}
              className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5 text-xs font-semibold outline-none focus:ring-1 focus:ring-red-100 uppercase resize-none overflow-hidden"
            />
          </div>
        </form>

        <div className="px-5 py-2.5 border-t border-slate-100 bg-slate-50/50 flex justify-end items-center gap-2">
          <button 
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider text-slate-600 hover:text-slate-800 transition-all"
          >
            Cancelar
          </button>
          
          <button 
            type="submit"
            onClick={handleSubmit}
            className="bg-red-700 text-white px-5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider shadow-md hover:bg-red-800 transition-all flex items-center gap-2"
          >
            <Save size={12} /> Salvar Embarque
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShipmentFormModal;
