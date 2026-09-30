
import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Bell, Type, FileText, Clock } from 'lucide-react';
import { Reminder } from '../types';

interface ReminderFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Reminder, 'id' | 'viewed' | 'createdAt'>) => void;
  initialData?: Reminder;
}

const ReminderFormModal: React.FC<ReminderFormModalProps> = ({ isOpen, onClose, onSubmit, initialData }) => {
  const [subject, setSubject] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  };

  useEffect(() => {
    if (initialData && isOpen) {
      const dt = new Date(initialData.time);
      setSubject(initialData.subject);
      setNote(initialData.note);
      setDate(dt.toISOString().split('T')[0]);
      setTime(dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false }));
      // Adjust height after state update
      setTimeout(adjustHeight, 0);
    } else if (isOpen) {
      setSubject('');
      setNote('');
      setDate(new Date().toISOString().split('T')[0]);
      setTime('');
      setTimeout(adjustHeight, 0);
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const isoDateTime = new Date(`${date}T${time}`).toISOString();
    onSubmit({
      subject,
      note,
      time: isoDateTime
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200 my-auto">
        <div className="px-5 py-2.5 bg-red-950 flex items-center justify-between border-b border-red-900">
          <div className="flex items-center gap-2.5">
             <div className="bg-red-600 p-1.5 rounded-lg text-white shadow-md"><Bell size={16} /></div>
             <div>
                <h3 className="text-sm font-black text-white uppercase leading-none">
                  {initialData ? 'Editar Lembrete' : 'Novo Lembrete'}
                </h3>
                <p className="text-red-400 text-[8px] font-bold uppercase tracking-wider mt-0.5">Agendar Alerta Operacional</p>
             </div>
          </div>
          <button onClick={onClose} className="p-1 text-red-200/50 hover:text-white transition-colors"><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3 max-h-[85vh] overflow-y-auto no-scrollbar">
          <div>
            <label className="block text-[7.5px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Assunto</label>
            <div className="relative">
              <Type className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
              <input 
                required 
                value={subject} 
                onChange={e => setSubject(e.target.value)}
                placeholder="Ex: Reunião com Tomador..." 
                className="w-full bg-slate-50 border border-slate-100 rounded-lg pl-8 pr-3 py-1.5 text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-red-100 transition-all" 
              />
            </div>
          </div>

          <div>
            <label className="block text-[7.5px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Anotação</label>
            <div className="relative">
              <FileText className="absolute left-3 top-2 text-slate-300" size={14} />
              <textarea 
                ref={textareaRef}
                required 
                value={note} 
                onChange={e => {
                  setNote(e.target.value);
                  adjustHeight();
                }}
                placeholder="Detalhes do lembrete..." 
                rows={3}
                className="w-full bg-slate-50 border border-slate-100 rounded-lg pl-8 pr-3 py-1.5 text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-red-100 transition-all resize-none overflow-hidden" 
              ></textarea>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[7.5px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Data</label>
              <input 
                type="date" 
                required 
                value={date} 
                onChange={e => setDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-red-100" 
              />
            </div>
            <div>
              <label className="block text-[7.5px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Hora</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                <input 
                  type="time" 
                  required 
                  value={time} 
                  onChange={e => setTime(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-lg pl-8 pr-3 py-1.5 text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-red-100" 
                />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button 
              type="submit" 
              className="w-full bg-red-700 text-white font-black text-[9px] uppercase tracking-wider py-2.5 rounded-lg shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <Save size={14} /> {initialData ? 'Salvar Alterações' : 'Salvar Lembrete'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReminderFormModal;
