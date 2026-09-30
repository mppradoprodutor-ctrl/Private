
import React from 'react';
import { Bell, Trash2, Calendar, Clock, PlusCircle, AlertTriangle, Edit2, CheckCircle2, Circle } from 'lucide-react';
import { Reminder } from '../types';

interface ReminderViewProps {
  reminders: Reminder[];
  onRemove: (id: string) => void;
  onAdd: () => void;
  onEdit: (reminder: Reminder) => void;
  onToggleComplete: (id: string) => void;
}

const ReminderView: React.FC<ReminderViewProps> = ({ reminders, onRemove, onAdd, onEdit, onToggleComplete }) => {
  const isExpired = (time: string) => new Date(time) <= new Date();

  return (
    <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-4">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase leading-none mb-1">Lembretes & Tarefas</h2>
          <p className="text-slate-400 font-medium text-xs">Agendamento de compromissos e alertas operacionais.</p>
        </div>
        <button 
          onClick={onAdd}
          className="bg-red-700 text-white px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider shadow-md hover:bg-red-800 flex items-center gap-2 transition-all active:scale-95"
        >
          <PlusCircle size={12} /> Novo Lembrete
        </button>
      </div>

      {reminders.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-12 text-center animate-in fade-in duration-300">
          <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bell className="text-slate-200" size={32} />
          </div>
          <h3 className="text-base font-black text-slate-400 uppercase tracking-wider">Nenhum lembrete agendado</h3>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {reminders.map((reminder) => {
            const expired = isExpired(reminder.time) && !reminder.completed;
            const completed = !!reminder.completed;
            return (
              <div 
                key={reminder.id} 
                className={`bg-white rounded-xl p-3 border transition-all hover:shadow-md ${
                  completed 
                    ? 'opacity-60 border-emerald-100 bg-emerald-50/10' 
                    : expired 
                      ? 'border-red-100 shadow-red-950/5 ring-1 ring-red-500/10' 
                      : 'border-slate-100'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className={`p-1 rounded-md ${
                    completed 
                      ? 'bg-emerald-600 text-white' 
                      : expired 
                        ? 'bg-red-600 text-white animate-pulse' 
                        : 'bg-slate-100 text-slate-400'
                  }`}>
                    {completed ? <CheckCircle2 size={12} /> : expired ? <AlertTriangle size={12} /> : <Clock size={12} />}
                  </div>
                  <div className="flex gap-0.5">
                    <button 
                      onClick={() => onToggleComplete(reminder.id)}
                      className={`p-1 rounded-md transition-colors ${completed ? 'text-emerald-600 hover:text-emerald-700' : 'text-slate-300 hover:text-emerald-600'}`}
                      title={completed ? "Marcar como Pendente" : "Marcar como Concluído"}
                    >
                      {completed ? <CheckCircle2 size={11} /> : <Circle size={11} />}
                    </button>
                    <button 
                      onClick={() => onEdit(reminder)}
                      className="p-1 text-slate-300 hover:text-blue-600 transition-colors rounded-md"
                      title="Editar Lembrete"
                    >
                      <Edit2 size={11} />
                    </button>
                    <button 
                      onClick={() => onRemove(reminder.id)}
                      className="p-1 text-slate-300 hover:text-red-700 transition-colors rounded-md"
                      title="Remover Lembrete"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
                
                <h4 className={`text-xs font-black tracking-tight leading-tight mb-1 ${
                  completed 
                    ? 'text-emerald-700 line-through' 
                    : expired 
                      ? 'text-red-700 font-extrabold' 
                      : 'text-slate-900'
                }`}>
                  {reminder.subject}
                </h4>
                <p className={`text-slate-500 text-[9px] mb-2 line-clamp-2 leading-relaxed font-semibold ${completed ? 'line-through opacity-50' : ''}`}>
                  {reminder.note}
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Calendar size={8} />
                    <span className="text-[7px] font-black uppercase tracking-wider">
                      {new Date(reminder.time).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${completed ? 'text-emerald-800' : 'text-red-800'}`}>
                    <Clock size={8} />
                    <span className="text-[7px] font-black uppercase tracking-wider">
                      {new Date(reminder.time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ReminderView;
