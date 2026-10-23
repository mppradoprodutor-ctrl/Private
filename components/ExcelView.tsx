import React, { useMemo, useRef, useState } from 'react';
import { Plus, Minus, Trash2, Printer, Palette } from 'lucide-react';

type Cell = { value: string; color: string; background: string };

const initialRows = 12;
const initialColumns = 8;

export default function ExcelView() {
  const emptyCell = (): Cell => ({ value: '', color: '#1e293b', background: '#ffffff' });
  const [rows, setRows] = useState<Cell[][]>(() => Array.from({ length: initialRows }, () => Array.from({ length: initialColumns }, emptyCell)));
  const [fontSize, setFontSize] = useState(14);
  const [tableZoom, setTableZoom] = useState(100);
  const [selectedCell, setSelectedCell] = useState({ row: 0, column: 0 });
  const cellRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const basicColors = ['#000000', '#ffffff', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#64748b'];

  const columnLabels = useMemo(() => Array.from({ length: rows[0]?.length ?? initialColumns }, (_, index) => {
    let label = '';
    let current = index;
    do {
      label = String.fromCharCode(65 + (current % 26)) + label;
      current = Math.floor(current / 26) - 1;
    } while (current >= 0);
    return label;
  }), [rows]);

  const updateCell = (rowIndex: number, columnIndex: number, patch: Partial<Cell>) => {
    setRows(current => current.map((row, r) => r === rowIndex ? row.map((cell, c) => c === columnIndex ? { ...cell, ...patch } : cell) : row));
  };

  const addRow = () => setRows(current => [...current, Array.from({ length: current[0]?.length ?? initialColumns }, emptyCell)]);
  const addColumn = () => setRows(current => current.map(row => [...row, emptyCell()]));
  const moveToNextRow = (rowIndex: number, columnIndex: number) => {
    const nextRow = rowIndex + 1;
    if (nextRow >= rows.length) addRow();
    setSelectedCell({ row: nextRow, column: columnIndex });
    requestAnimationFrame(() => cellRefs.current[`${nextRow}-${columnIndex}`]?.focus());
  };
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
          <button onClick={() => setTableZoom(zoom => Math.max(60, zoom - 10))} className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[9px] font-black uppercase text-slate-700 shadow-sm hover:border-red-300" title="Diminuir zoom da tabela"><Minus size={13} /> Zoom -</button>
          <button onClick={() => setTableZoom(zoom => Math.min(150, zoom + 10))} className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[9px] font-black uppercase text-slate-700 shadow-sm hover:border-red-300" title="Aumentar zoom da tabela"><Plus size={13} /> Zoom +</button>
          <button onClick={() => window.print()} className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[9px] font-black uppercase text-slate-700 shadow-sm hover:border-red-300"><Printer size={13} /> PDF</button>
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 shadow-sm">
            <button onClick={() => setFontSize(size => Math.max(10, size - 1))} aria-label="Diminuir tamanho do texto" className="rounded p-1 text-slate-500 hover:bg-slate-100"><Minus size={13} /></button>
            <span className="min-w-8 text-center text-[9px] font-black text-slate-700">{fontSize}px</span>
            <button onClick={() => setFontSize(size => Math.min(28, size + 1))} aria-label="Aumentar tamanho do texto" className="rounded p-1 text-slate-500 hover:bg-slate-100"><Plus size={13} /></button>
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 shadow-sm" title="Cor do texto"><Palette size={12} className="text-slate-500" />{basicColors.map(color => <button key={`text-${color}`} onClick={() => updateCell(selectedCell.row, selectedCell.column, { color })} aria-label={`Cor do texto ${color}`} className="size-3 rounded-full border border-slate-300" style={{ backgroundColor: color }} />)}</div>
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 shadow-sm" title="Cor do fundo"><span className="text-[9px] font-black text-slate-500">Fundo</span>{basicColors.map(color => <button key={`bg-${color}`} onClick={() => updateCell(selectedCell.row, selectedCell.column, { background: color })} aria-label={`Cor do fundo ${color}`} className="size-3 rounded-full border border-slate-300" style={{ backgroundColor: color }} />)}</div>
        </div>
      </div>
      <div className="excel-print-area overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm" style={{ fontFamily: 'Arial, sans-serif' }}>
        <div style={{ zoom: tableZoom / 100 }}>
        <table className="min-w-full border-collapse" style={{ fontSize }}>
          <thead><tr className="bg-slate-100 text-slate-600">
            <th className="sticky left-0 z-10 w-10 border-b border-r border-slate-200 bg-slate-100 px-2 py-2 text-center text-[10px] font-black">#</th>
            {columnLabels.map(label => <th key={label} className="min-w-32 border-b border-r border-slate-200 px-3 py-2 text-left text-[10px] font-black">{label}</th>)}
          </tr></thead>
          <tbody>{rows.map((row, rowIndex) => <tr key={rowIndex} className="hover:bg-red-50/30">
            <th className="sticky left-0 z-10 border-b border-r border-slate-200 bg-slate-50 px-2 py-1 text-center text-[10px] font-black text-slate-500">{rowIndex + 1}</th>
            {row.map((cell, columnIndex) => <td key={columnIndex} className="border-b border-r border-slate-200 p-0"><input ref={element => { cellRefs.current[`${rowIndex}-${columnIndex}`] = element; }} value={cell.value} onFocus={() => setSelectedCell({ row: rowIndex, column: columnIndex })} onChange={event => updateCell(rowIndex, columnIndex, { value: event.target.value })} onKeyDown={event => { if (event.key === 'Enter' && !event.nativeEvent.isComposing && event.keyCode !== 229) { event.preventDefault(); moveToNextRow(rowIndex, columnIndex); } }} className="w-full min-w-32 bg-transparent px-3 py-2 outline-none focus:bg-red-50/60 focus:ring-1 focus:ring-inset focus:ring-red-300" style={{ color: cell.color, backgroundColor: cell.background }} aria-label={`Linha ${rowIndex + 1}, coluna ${columnLabels[columnIndex]}`} /></td>)}
          </tr>)}</tbody>
        </table>
        </div>
      </div>
      <style>{`@media print { @page { size: auto; margin: 0; } html, body { margin: 0 !important; padding: 0 !important; background: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } body > * { visibility: hidden !important; } .excel-print-area, .excel-print-area * { visibility: visible !important; } .excel-print-area { position: absolute !important; inset: 0 !important; width: 100% !important; overflow: visible !important; border: 0 !important; box-shadow: none !important; } .excel-print-area > div { zoom: 1 !important; } }`}</style>
    </section>
  );
}
