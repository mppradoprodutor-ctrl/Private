import React, { useMemo, useState } from 'react';
import { Plus, Minus, Rows3, Columns3, Trash2 } from 'lucide-react';

type Cell = string;

const initialRows = 12;
const initialColumns = 8;

export default function ExcelView() {
  const [rows, setRows] = useState<Cell[][]>(() => Array.from({ length: initialRows }, () => Array(initialColumns).fill('')));
  const [fontSize, setFontSize] = useState(14);

  const columnLabels = useMemo(() => Array.from({ length: rows[0]?.length ?? initialColumns }, (_, index) => {
    let label = '';
    let current = index;
    do {
      label = String.fromCharCode(65 + (current % 26)) + label;
      current = Math.floor(current / 26) - 1;
    } while (current >= 0);
    return label;
  }), [rows]);

  const updateCell = (rowIndex: number, columnIndex: number, value: string) => {
    setRows(current => current.map((row, r) => r === rowIndex ? row.map((cell, c) => c === columnIndex ? value : cell) : row));
  };

  const addRow = () => setRows(current => [...current, Array(current[0]?.length ?? initialColumns).fill('')]);
  const addColumn = () => setRows(current => current.map(row => [...row, '']));
  const removeRow = () => setRows(current => current.length > 1 ? current.slice(0, -1) : current);
  const removeColumn = () => setRows(current => current[0]?.length > 1 ? current.map(row => row.slice(0, -1)) : current);

  return (
    <section className="animate-in fade-in duration-300 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tight text-slate-900">Excel</h2>
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Planilha rápida para organizar dados</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button onClick={addRow} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[9px] font-black uppercase text-slate-700 shadow-sm hover:border-red-300 hover:text-red-700"><Plus size={13} /> Nova linha</button>
          <button onClick={addColumn} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[9px] font-black uppercase text-slate-700 shadow-sm hover:border-red-300 hover:text-red-700"><Plus size={13} /> Nova coluna</button>
          <button onClick={removeRow} className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[9px] font-black uppercase text-slate-500 hover:text-red-700"><Trash2 size={12} /> Linha</button>
          <button onClick={removeColumn} className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[9px] font-black uppercase text-slate-500 hover:text-red-700"><Trash2 size={12} /> Coluna</button>
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 shadow-sm">
            <button onClick={() => setFontSize(size => Math.max(10, size - 1))} aria-label="Diminuir tamanho do texto" className="rounded p-1 text-slate-500 hover:bg-slate-100"><Minus size={13} /></button>
            <span className="min-w-8 text-center text-[9px] font-black text-slate-700">{fontSize}px</span>
            <button onClick={() => setFontSize(size => Math.min(28, size + 1))} aria-label="Aumentar tamanho do texto" className="rounded p-1 text-slate-500 hover:bg-slate-100"><Plus size={13} /></button>
          </div>
        </div>
      </div>
      <div className="overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm" style={{ fontFamily: 'Arial, sans-serif' }}>
        <table className="min-w-full border-collapse" style={{ fontSize }}>
          <thead><tr className="bg-slate-100 text-slate-600">
            <th className="sticky left-0 z-10 w-10 border-b border-r border-slate-200 bg-slate-100 px-2 py-2 text-center text-[10px] font-black">#</th>
            {columnLabels.map(label => <th key={label} className="min-w-32 border-b border-r border-slate-200 px-3 py-2 text-left text-[10px] font-black">{label}</th>)}
          </tr></thead>
          <tbody>{rows.map((row, rowIndex) => <tr key={rowIndex} className="hover:bg-red-50/30">
            <th className="sticky left-0 z-10 border-b border-r border-slate-200 bg-slate-50 px-2 py-1 text-center text-[10px] font-black text-slate-500">{rowIndex + 1}</th>
            {row.map((cell, columnIndex) => <td key={columnIndex} className="border-b border-r border-slate-200 p-0"><input value={cell} onChange={event => updateCell(rowIndex, columnIndex, event.target.value)} className="w-full min-w-32 bg-transparent px-3 py-2 text-slate-800 outline-none focus:bg-red-50/60 focus:ring-1 focus:ring-inset focus:ring-red-300" aria-label={`Linha ${rowIndex + 1}, coluna ${columnLabels[columnIndex]}`} /></td>)}
          </tr>)}</tbody>
        </table>
      </div>
    </section>
  );
}
