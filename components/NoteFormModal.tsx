import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Notebook, Mail, Phone, Plus, Trash2 } from 'lucide-react';
import { Note } from '../types';

interface NoteFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (note: Partial<Note>) => void;
  note?: Note | null;
}

const NoteFormModal: React.FC<NoteFormModalProps> = ({ isOpen, onClose, onSave, note }) => {
  const [formData, setFormData] = useState<Partial<Note>>({
    title: '',
    content: '',
    emails: [],
    phones: []
  });

  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const contentRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (note) {
      setFormData(note);
    } else {
      setFormData({
        title: '',
        content: '',
        emails: [],
        phones: []
      });
    }
  }, [note, isOpen]);

  useEffect(() => {
    if (isOpen && contentRef.current) {
      contentRef.current.style.height = 'auto';
      contentRef.current.style.height = `${Math.max(120, contentRef.current.scrollHeight)}px`;
    }
  }, [formData.content, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title?.trim()) return;
    onSave(formData);
    onClose();
  };

  const addEmail = () => {
    if (newEmail && !formData.emails?.includes(newEmail)) {
      setFormData({ ...formData, emails: [...(formData.emails || []), newEmail] });
      setNewEmail('');
    }
  };

  const removeEmail = (email: string) => {
    setFormData({ ...formData, emails: formData.emails?.filter(e => e !== email) });
  };

  const addPhone = () => {
    if (newPhone && !formData.phones?.includes(newPhone)) {
      setFormData({ ...formData, phones: [...(formData.phones || []), newPhone] });
      setNewPhone('');
    }
  };

  const removePhone = (phone: string) => {
    setFormData({ ...formData, phones: formData.phones?.filter(p => p !== phone) });
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[95vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="bg-red-600 text-white p-2.5 rounded-xl">
              <Notebook size={18} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 uppercase tracking-tight leading-none">
                {note ? 'Editar Nota' : 'Nova Nota'}
              </h3>
              <p className="text-slate-400 font-bold text-[9px] uppercase tracking-widest mt-0.5">Organize informações e contatos vitais.</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 text-slate-400 hover:text-red-600 transition-all hover:bg-red-50 rounded-full cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4 custom-scrollbar">
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-450 uppercase tracking-widest pl-0.5">Título do Documento</label>
              <input
                required
                type="text"
                placeholder="Ex: Contatos Transportadora X"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-red-600 focus:bg-white rounded-lg transition-all outline-none text-slate-800 font-semibold placeholder:text-slate-300 text-xs"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-450 uppercase tracking-widest pl-0.5">Conteúdo das Anotações</label>
              <textarea
                ref={contentRef}
                required
                placeholder="Escreva aqui suas anotações detalhadas..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-red-600 focus:bg-white rounded-lg transition-all outline-none text-slate-800 font-medium placeholder:text-slate-300 resize-none overflow-hidden text-xs leading-relaxed"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Emails section */}
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-450 uppercase tracking-widest flex items-center gap-1.5">
                  <Mail size={10} className="text-slate-400" /> Listagem de E-mails
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="email"
                    placeholder="email@exemplo.com"
                    className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-red-600 text-xs font-semibold text-slate-855 placeholder:text-slate-300"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addEmail(); } }}
                  />
                  <button 
                    type="button"
                    onClick={addEmail}
                    className="bg-slate-900 text-white p-2 rounded-lg hover:bg-slate-800 transition-colors shrink-0"
                  >
                    <Plus size={14} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1 max-h-[80px] overflow-y-auto custom-scrollbar pt-1">
                  {formData.emails?.map(email => (
                    <div key={email} className="flex items-center gap-1.5 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 animate-in fade-in transition-all">
                      <span className="text-[8px] font-bold text-slate-600">{email}</span>
                      <button 
                        type="button"
                        onClick={() => removeEmail(email)}
                        className="text-slate-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Phones section */}
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-455 uppercase tracking-widest flex items-center gap-1.5">
                  <Phone size={10} className="text-slate-400" /> Listagem de Telefones
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="(00) 00000-0000"
                    className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-red-600 text-xs font-semibold text-slate-855 placeholder:text-slate-300"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPhone(); } }}
                  />
                  <button 
                    type="button"
                    onClick={addPhone}
                    className="bg-slate-900 text-white p-2 rounded-lg hover:bg-slate-800 transition-colors shrink-0"
                  >
                    <Plus size={14} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1 max-h-[80px] overflow-y-auto custom-scrollbar pt-1">
                  {formData.phones?.map(phone => (
                    <div key={phone} className="flex items-center gap-1.5 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 animate-in fade-in transition-all">
                      <span className="text-[8px] font-bold text-slate-600">{phone}</span>
                      <button 
                        type="button"
                        onClick={() => removePhone(phone)}
                        className="text-slate-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </form>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className="bg-red-600 text-white px-5 py-2 rounded-lg text-xs font-semibold shadow-md hover:bg-red-700 transition-all flex items-center gap-2"
          >
            <Save size={14} /> Finalizar Registro
          </button>
        </div>
      </div>
    </div>
  );
};

export default NoteFormModal;
