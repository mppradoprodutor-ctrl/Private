import React, { useState, useEffect, useRef } from 'react';
import { X, Save } from 'lucide-react';
import { Driver } from '../types';

interface DriverFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (driver: Omit<Driver, 'id' | 'createdAt'>) => void;
  initialData?: Driver;
}

/**
 * Converte para LETRAS MAIÚSCULAS e remove todos os caracteres especiais e acentos.
 * Se allowSpaces = true, mantém apenas letras A-Z, números 0-9 e espaços normais.
 * Se allowSpaces = false, remove também todos os espaços e pontuações (apenas A-Z e 0-9).
 */
export const sanitizeDriverText = (val: string | undefined | null, allowSpaces = true): string => {
  if (!val) return '';
  // 1. Remove acentuação (á -> A, é -> E, ç -> C, etc.) e converte para maiúsculo
  let cleaned = String(val)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();

  // 2. Remove caracteres especiais
  if (allowSpaces) {
    // Permite apenas A-Z, 0-9 e espaço
    cleaned = cleaned.replace(/[^A-Z0-9 ]/g, '');
  } else {
    // Permite apenas A-Z e 0-9
    cleaned = cleaned.replace(/[^A-Z0-9]/g, '');
  }

  return cleaned;
};

/**
 * Função para telefone: permite digitar qualquer caractere, mas o sistema ajusta
 * mantendo estritamente apenas letras e números (A-Z, 0-9), removendo qualquer outro tipo de caractere.
 */
export const sanitizePhoneAlphanumeric = (val: string | undefined | null): string => {
  if (!val) return '';
  return String(val)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
};

const DriverFormModal: React.FC<DriverFormModalProps> = ({ isOpen, onClose, onSubmit, initialData }) => {
  const emptyForm: Omit<Driver, 'id' | 'createdAt'> = {
    truckPlate: '',
    trailer1: '',
    trailer2: '',
    dolly: '',
    name: '',
    phone: '',
    cnh: '',
    rg: '',
    cpf: '',
    trailerType: '',
    netWeight: 0,
    grossWeight: 0,
    axisCount: 0,
    trailerModel: '',
    antt: '',
    renavam: '',
    notes: '',
    state: ''
  };

  const [formData, setFormData] = useState<Omit<Driver, 'id' | 'createdAt'>>(emptyForm);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen && notesRef.current) {
      notesRef.current.style.height = 'auto';
      notesRef.current.style.height = `${notesRef.current.scrollHeight}px`;
    }
  }, [formData.notes, isOpen]);

  useEffect(() => {
    if (initialData) {
      setFormData({
        truckPlate: sanitizeDriverText(initialData.truckPlate, false),
        trailer1: sanitizeDriverText(initialData.trailer1, false),
        trailer2: sanitizeDriverText(initialData.trailer2, false),
        dolly: sanitizeDriverText(initialData.dolly, false),
        name: sanitizeDriverText(initialData.name, true),
        phone: sanitizePhoneAlphanumeric(initialData.phone),
        cnh: sanitizeDriverText(initialData.cnh, false),
        rg: sanitizeDriverText(initialData.rg, false),
        cpf: sanitizeDriverText(initialData.cpf, false),
        trailerType: sanitizeDriverText(initialData.trailerType, true),
        netWeight: initialData.netWeight || 0,
        grossWeight: initialData.grossWeight || 0,
        axisCount: initialData.axisCount || 0,
        trailerModel: sanitizeDriverText(initialData.trailerModel, true),
        antt: sanitizeDriverText(initialData.antt, true),
        renavam: sanitizeDriverText(initialData.renavam, false),
        notes: sanitizeDriverText(initialData.notes, true),
        state: sanitizeDriverText(initialData.state, false).slice(0, 2)
      });
    } else {
      setFormData(emptyForm);
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = sanitizeDriverText(formData.name, true).replace(/\s+/g, ' ').trim();
    if (!cleanName) return;

    onSubmit({
      name: cleanName,
      phone: sanitizePhoneAlphanumeric(formData.phone),
      cpf: sanitizeDriverText(formData.cpf, false),
      rg: sanitizeDriverText(formData.rg, false),
      cnh: sanitizeDriverText(formData.cnh, false),
      truckPlate: sanitizeDriverText(formData.truckPlate, false),
      state: sanitizeDriverText(formData.state, false).slice(0, 2),
      antt: sanitizeDriverText(formData.antt, true).trim(),
      renavam: sanitizeDriverText(formData.renavam, false),
      trailer1: sanitizeDriverText(formData.trailer1, false),
      trailer2: sanitizeDriverText(formData.trailer2, false),
      dolly: sanitizeDriverText(formData.dolly, false),
      trailerType: sanitizeDriverText(formData.trailerType, true).trim(),
      trailerModel: sanitizeDriverText(formData.trailerModel, true).replace(/\s+/g, ' ').trim(),
      notes: sanitizeDriverText(formData.notes, true).replace(/\s+/g, ' ').trim(),
      netWeight: Number(formData.netWeight) || 0,
      grossWeight: Number(formData.grossWeight) || 0,
      axisCount: Number(formData.axisCount) || 0
    });
    onClose();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Tratamento numérico
    if (name.includes('Weight') || name === 'axisCount') {
      setFormData(prev => ({
        ...prev,
        [name]: Number(value) || 0
      }));
      return;
    }

    // Tratamento estrito do telefone: aceita qualquer caractere digitado, mas ajusta para apenas letras e números
    if (name === 'phone') {
      const sanitized = sanitizePhoneAlphanumeric(value);
      setFormData(prev => ({
        ...prev,
        phone: sanitized
      }));
      return;
    }

    // Campos de texto com espaço permitido (Nome, Modelo, Observações, Tipo, ANTT)
    if (name === 'name' || name === 'trailerModel' || name === 'notes' || name === 'trailerType' || name === 'antt') {
      const sanitized = sanitizeDriverText(value, true);
      setFormData(prev => ({
        ...prev,
        [name]: sanitized
      }));
      return;
    }

    // Campos de texto estritos sem espaço nem pontuação (Placas, Documentos, UF)
    let sanitized = sanitizeDriverText(value, false);
    if (name === 'state') {
      sanitized = sanitized.slice(0, 2);
    }

    setFormData(prev => ({
      ...prev,
      [name]: sanitized
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl relative max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-2xl">
          <div>
            <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">{initialData ? 'Editar Cadastro' : 'Novo Cadastro'}</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-0.5">
              Dados salvos em MAIÚSCULO e sem caracteres especiais. Apenas o Nome Completo é obrigatório.
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer">
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-5">
          <form id="driverForm" onSubmit={handleSubmit} className="space-y-4">
            
            {/* Seção Motorista */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1 h-3.5 bg-red-600 rounded-full"></div>
                <h4 className="font-bold text-slate-800 uppercase text-[10px] tracking-wider">Informações do Motorista</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                <div className="col-span-1 sm:col-span-4">
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1">
                    Nome Completo <span className="text-red-500 font-bold">*</span>
                  </label>
                  <input 
                    required 
                    name="name" 
                    placeholder="EX: JOAO SILVA" 
                    value={formData.name} 
                    onChange={handleChange} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:ring-1 focus:ring-red-500 transition-all uppercase" 
                  />
                </div>
                <div className="col-span-1 sm:col-span-2">
                  <div className="flex items-center justify-between ml-1 mb-1">
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Telefone</label>
                    <span className="text-[7px] font-bold text-slate-400">Letras e números</span>
                  </div>
                  <input 
                    type="text"
                    name="phone" 
                    placeholder="EX: 44999998888" 
                    value={formData.phone} 
                    onChange={handleChange} 
                    onPaste={e => {
                      e.preventDefault();
                      const pasteText = e.clipboardData.getData('text');
                      if (pasteText) {
                        const cleaned = sanitizePhoneAlphanumeric(pasteText);
                        setFormData(prev => ({
                          ...prev,
                          phone: sanitizePhoneAlphanumeric(prev.phone + cleaned)
                        }));
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:ring-1 focus:ring-red-500 transition-all uppercase font-mono" 
                    title="Digite qualquer caractere: o sistema ajusta automaticamente para apenas letras e números"
                  />
                </div>
                <div className="col-span-1 sm:col-span-2">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1">CPF</label>
                  <input 
                    name="cpf" 
                    placeholder="EX: 12345678900" 
                    value={formData.cpf} 
                    onChange={handleChange} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-slate-800 outline-none focus:ring-1 focus:ring-red-500 transition-all uppercase" 
                  />
                </div>
                <div className="col-span-1 sm:col-span-2">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1">RG</label>
                  <input 
                    name="rg" 
                    placeholder="EX: 123456789" 
                    value={formData.rg} 
                    onChange={handleChange} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-slate-800 outline-none focus:ring-1 focus:ring-red-500 transition-all uppercase" 
                  />
                </div>
                <div className="col-span-1 sm:col-span-2">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1">CNH</label>
                  <input 
                    name="cnh" 
                    placeholder="EX: 12345678900" 
                    value={formData.cnh} 
                    onChange={handleChange} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-slate-800 outline-none focus:ring-1 focus:ring-red-500 transition-all uppercase" 
                  />
                </div>
              </div>
            </div>

            {/* Seção Veículo */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1 h-3.5 bg-red-600 rounded-full"></div>
                <h4 className="font-bold text-slate-800 uppercase text-[10px] tracking-wider">Dados do Veículo</h4>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1">Placa Cavalo</label>
                  <input 
                    name="truckPlate" 
                    placeholder="ABC1D23" 
                    value={formData.truckPlate} 
                    onChange={handleChange} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-slate-800 outline-none focus:ring-1 focus:ring-red-500 transition-all uppercase" 
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1">Estado (UF)</label>
                  <input 
                    name="state" 
                    value={formData.state} 
                    onChange={handleChange} 
                    maxLength={2}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:ring-1 focus:ring-red-500 transition-all uppercase" 
                    placeholder="SP" 
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1">ANTT</label>
                  <input 
                    name="antt" 
                    placeholder="EX: 12345678" 
                    value={formData.antt} 
                    onChange={handleChange} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:ring-1 focus:ring-red-500 transition-all uppercase" 
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1">RENAVAM</label>
                  <input 
                    name="renavam" 
                    placeholder="EX: 12345678900" 
                    value={formData.renavam} 
                    onChange={handleChange} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:ring-1 focus:ring-red-500 transition-all uppercase" 
                  />
                </div>
              </div>
            </div>

            {/* Seção Implementos */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1 h-3.5 bg-red-600 rounded-full"></div>
                <h4 className="font-bold text-slate-800 uppercase text-[10px] tracking-wider">Implementos</h4>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1">Placa Carreta 1</label>
                  <input 
                    name="trailer1" 
                    placeholder="ABC1234" 
                    value={formData.trailer1} 
                    onChange={handleChange} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-slate-800 outline-none focus:ring-1 focus:ring-red-500 transition-all uppercase" 
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1">Placa Carreta 2</label>
                  <input 
                    name="trailer2" 
                    placeholder="DEF5678" 
                    value={formData.trailer2} 
                    onChange={handleChange} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-slate-800 outline-none focus:ring-1 focus:ring-red-500 transition-all uppercase" 
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1">Placa Dolly</label>
                  <input 
                    name="dolly" 
                    placeholder="GHI9012" 
                    value={formData.dolly} 
                    onChange={handleChange} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-slate-800 outline-none focus:ring-1 focus:ring-red-500 transition-all uppercase" 
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1">Tipo Carreta</label>
                  <select 
                    name="trailerType" 
                    value={formData.trailerType} 
                    onChange={handleChange} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:ring-1 focus:ring-red-500 transition-all uppercase"
                  >
                      <option value="">SELECIONE UM TIPO</option>
                      <option value="TAMPA">TAMPA</option>
                      <option value="BASCULANTE">BASCULANTE</option>
                      <option value="GAIOLA">GAIOLA</option>
                      <option value="PISO MOVEL">PISO MOVEL</option>
                      <option value="TANQUE">TANQUE</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1">Qtd Eixos</label>
                  <input 
                    type="number" 
                    name="axisCount" 
                    value={formData.axisCount || ''} 
                    onChange={handleChange} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:ring-1 focus:ring-red-500 transition-all" 
                  />
                </div>
                <div>
                   <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1">Modelo Implemento</label>
                   <input 
                     name="trailerModel" 
                     placeholder="EX: RANDON 3 EIXOS" 
                     value={formData.trailerModel} 
                     onChange={handleChange} 
                     className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:ring-1 focus:ring-red-500 transition-all uppercase" 
                   />
                </div>
                <div>
                   <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1">Peso Líquido (kg)</label>
                   <input 
                     type="number" 
                     name="netWeight" 
                     value={formData.netWeight || ''} 
                     onChange={handleChange} 
                     className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:ring-1 focus:ring-red-500 transition-all" 
                   />
                </div>
                <div>
                   <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1">Peso Bruto / PBT (kg)</label>
                   <input 
                     type="number" 
                     name="grossWeight" 
                     value={formData.grossWeight || ''} 
                     onChange={handleChange} 
                     className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:ring-1 focus:ring-red-500 transition-all" 
                   />
                </div>
              </div>
            </div>

            <div className="space-y-0.5">
               <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1">Observações</label>
               <textarea 
                 ref={notesRef}
                 name="notes" 
                 placeholder=""
                 value={formData.notes} 
                 onChange={handleChange} 
                 rows={1} 
                 className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:ring-1 focus:ring-red-500 transition-all resize-none overflow-hidden uppercase"
               ></textarea>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 sticky bottom-0 bg-white z-10 rounded-b-2xl">
          <button onClick={onClose} className="px-5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer">
            Cancelar
          </button>
          <button form="driverForm" type="submit" className="px-5 py-2 bg-red-600 text-white text-xs font-black uppercase tracking-wider rounded-lg hover:bg-red-700 shadow-md shadow-red-500/10 transition-all flex items-center gap-2 cursor-pointer">
            <Save size={14} />
            {initialData ? 'Salvar Alterações' : 'Salvar Motorista'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DriverFormModal;
