import React from 'react';
import { Notebook, PlusCircle, Calendar, Edit2, Trash2 } from 'lucide-react';
import { Note } from '../types';

interface NotesViewProps {
  notes: Note[];
  onAdd: () => void;
  onEdit: (note: Note) => void;
  onRemove: (id: string) => void;
}

const NotesView: React.FC<NotesViewProps> = ({ notes, onAdd, onEdit, onRemove }) => {
  return (
    <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-4">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase leading-none mb-1">Bloco de Notas</h2>
          <p className="text-slate-400 font-medium text-xs">Gestão de contatos, observações e informações importantes.</p>
        </div>
        <button 
          onClick={onAdd}
          className="bg-red-700 text-white px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider shadow-md hover:bg-red-800 flex items-center gap-2 transition-all active:scale-95"
        >
          <PlusCircle size={12} /> Nova Nota
        </button>
      </div>

      {notes.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-12 text-center animate-in fade-in duration-300">
          <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Notebook className="text-slate-200" size={32} />
          </div>
          <h3 className="text-base font-black text-slate-450 uppercase tracking-wider">Nenhuma nota cadastrada</h3>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5">
          {notes.map((note) => (
            <div 
              key={note.id} 
              onClick={() => onEdit(note)}
              className="bg-white rounded-xl p-2.5 border border-slate-200 shadow-sm transition-all hover:shadow-md hover:border-red-200 group flex flex-col justify-between relative overflow-hidden cursor-pointer"
            >
              <div>
                <div className="flex justify-between items-start mb-1.5 relative z-10">
                  <div className="bg-slate-50 p-1 rounded-lg text-slate-400 group-hover:bg-red-700 group-hover:text-white transition-all duration-300 shadow-sm">
                    <Notebook size={13} />
                  </div>
                  <div className="flex items-center gap-0.5">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(note);
                      }}
                      className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all flex items-center gap-0.5 text-[8.5px] font-bold"
                      title="Editar / Ver Conteúdo"
                    >
                      <Edit2 size={11} />
                      <span>Editar</span>
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemove(note.id);
                      }}
                      className="p-1 text-slate-300 hover:text-red-700 hover:bg-red-50 rounded-md transition-all"
                      title="Remover Nota"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
                
                <div className="relative z-10 my-1">
                  <h4 className="text-xs font-black tracking-tight leading-snug text-slate-900 uppercase break-words group-hover:text-red-700 transition-colors line-clamp-2">
                    {note.title}
                  </h4>
                </div>
              </div>

              <div className="flex items-center gap-1 text-slate-400 pt-2 border-t border-slate-100 relative z-10 transition-colors mt-2">
                <Calendar size={9} />
                <span className="text-[7.5px] font-black uppercase tracking-wider">
                  {new Date(note.createdAt).toLocaleDateString('pt-BR')} {new Date(note.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {/* Decorative background element */}
              <div className="absolute -right-10 -bottom-10 bg-slate-50/50 w-20 h-20 rounded-full scale-0 group-hover:scale-100 transition-transform duration-500 -z-0"></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotesView;
