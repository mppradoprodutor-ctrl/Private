'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Minus, Trash2, Printer, Palette, X, Pencil } from 'lucide-react';

type Cell = { value: string; color: string; background: string };
type Sheet = { id: string; name: string; rows: Cell[][] };

const initialRows = 12;
const initialColumns = 8;
const storageKey = 'gera-excel-workbook-v1';

const createCell = (): Cell => ({ value: '', color: '#1e293b', background: '#ffffff' });
const createRows = (): Cell[][] => Array.from({ length: initialRows }, () => Array.from({ length: initialColumns }, createCell));
const createSheet = (name: string): Sheet => ({ id: crypto.randomUUID(), name, rows: createRows() });

export default function ExcelView() {
  const [sheets, setSheets] = useState<Sheet[]>(() => {
    if (typeof window === 'undefined') return [createSheet('Planilha 1')];
    try {
      const saved = window.localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [createSheet('Planilha 1')];
    } catch {
      return [createSheet('Planilha 1')];
    }
  });
  const [activeSheetId, setActiveSheetId] = useState('');
  const [fontSize, setFontSize] = useState(14);
  const [tableZoom, setTableZoom] = useState(100);
  const [selectedCell, setSelectedCell] = useState({ row: 0, column: 0 });
  const cellRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [editingName, setEditingName] = useState(false);
  const basicColors = ['#000000', '#ffffff', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#64748b'];

  const activeSheet = sheets.find(sheet => sheet.id === activeSheetId) ?? sheets[0];
  const rows = activeSheet?.rows ?? createRows();
  const currentSheetId = activeSheet?.id ?? '';

  useEffect(() => {
    if (!activeSheetId && sheets[0]) setActiveSheetId(sheets[0].id);
  }, [activeSheetId, sheets]);

  useEffect(() => {
    if (typeof window !== 'undefined') window.localStorage.setItem(storageKey, JSON.stringify(sheets));
  }, [sheets]);

  const columnLabels = useMemo(() => Array.from({ length: rows[0]?.length ?? initialColumns }, (_, index) => {
    let label = '';
    let current = index;
    do { label = String.fromCharCode(65 + (current % 26)) + label; current = Math.floor(current / 26) - 1; } while (current >= 0);
    return label;
  }), [rows]);

  const updateActiveSheet = (updater: (sheet: Sheet) => Sheet) => setSheets(current => current.map(sheet => sheet.id === currentSheetId ? updater(sheet) : sheet));
  const updateCell = (rowIndex: number, columnIndex: number, patch: Partial<Cell>) => updateActiveSheet(sheet => ({ ...sheet, rows: sheet.rows.map((row, r) => r === rowIndex ? row.map((cell, c) => c === columnIndex ? { ...cell, ...patch } : cell) : row) }));
  const addRow = () => updateActiveSheet(sheet => ({ ...sheet, rows: [...sheet.rows, Array.from({ length: sheet.rows[0]?.length ?? initialColumns }, createCell)] }));
  const addColumn = () => updateActiveSheet(sheet => ({ ...sheet, rows: sheet.rows.map(row => [...row, createCell()]) }));
  const removeRow = () => updateActiveSheet(sheet => ({ ...sheet, rows: sheet.rows.length > 1 ? sheet.rows.slice(0, -1) : sheet.rows }));
  const removeColumn = () => updateActiveSheet(sheet => ({ ...sheet, rows: sheet.rows[0]?.length > 1 ? sheet.rows.map(row => row.slice(0, -1)) : sheet.rows }));
  const moveToCell = (row: number, column: number) => { setSelectedCell({ row, column }); requestAnimationFrame(() => cellRefs.current[`${row}-${column}`]?.focus()); };
  const moveToNextRow = (rowIndex: number, columnIndex: number) => { if (rowIndex + 1 >= rows.length) addRow(); moveToCell(rowIndex + 1, columnIndex); };
  const addSheet = () => { const sheet = createSheet(`Planilha ${sheets.length + 1}`); setSheets(current => [...current, sheet]); setActiveSheetId(sheet.id); };
  const removeSheet = () => { if (sheets.length <= 1 || !activeSheet) return; const next = sheets.filter(sheet => sheet.id !== activeSheet.id); setSheets(next); setActiveSheetId(next[0].id); };
  const renameSheet = (name: string) => updateActiveSheet(sheet => ({ ...sheet, name: name.trim() || sheet.name }));

  return (
    <section className="animate-in fade-in duration-300 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-xl font-black uppercase tracking-tight text-slate-900">Excel</h2><p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Planilhas salvas automaticamente</p></div>
        <div className="flex flex-wrap items-center gap-1.5">
          <select value={currentSheetId} onChange={event => setActiveSheetId(event.target.value)} className="max-w-32 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[9px] font-black uppercase text-slate-700 outline-none" aria-label="Selecionar planilha">{sheets.map(sheet => <option key={sheet.id} value={sheet.id}>{sheet.name}</option>)}</select>
          <button onClick={addSheet} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[9px] font-black uppercase text-slate-700"><Plus size={12} /> Nova página</button>
          <button onClick={removeSheet} disabled={sheets.length <= 1} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[9px] font-black uppercase text-slate-500 disabled:opacity-40"><X size={12} /> Remover</button>
          <button onClick={() => setEditingName(value => !value)} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[9px] font-black uppercase text-slate-700"><Pencil size={12} /> Nomear</button>
          <button onClick={addRow} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[9px] font-black uppercase text-slate-700">Nova linha</button><button onClick={addColumn} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[9px] font-black uppercase text-slate-700">Nova coluna</button>
          <button onClick={removeRow} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[9px] font-black uppercase text-slate-500"><Trash2 size={12} /> Linha</button><button onClick={removeColumn} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[9px] font-black uppercase text-slate-500"><Trash2 size={12} /> Coluna</button>
          <button onClick={() => setTableZoom(zoom => Math.max(60, zoom - 10))} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[9px] font-black uppercase text-slate-700"><Minus size={12} /> Zoom -</button><button onClick={() => setTableZoom(zoom => Math.min(150, zoom + 10))} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[9px] font-black uppercase text-slate-700"><Plus size={12} /> Zoom +</button><button onClick={() => window.print()} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[9px] font-black uppercase text-slate-700"><Printer size={12} /> PDF</button>
        </div>
      </div>
      {editingName && <input autoFocus defaultValue={activeSheet?.name} onBlur={event => { renameSheet(event.target.value); setEditingName(false); }} onKeyDown={event => { if (event.key === 'Enter') { renameSheet(event.currentTarget.value); setEditingName(false); } }} className="w-52 rounded-lg border border-red-200 bg-white px-2 py-1.5 text-[10px] font-bold outline-none" placeholder="Nome da página" aria-label="Nome da página" />}
      <div className="excel-print-area overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm" style={{ fontFamily: 'Arial, sans-serif' }}><div style={{ zoom: tableZoom / 100 }}><table className="min-w-full border-collapse" style={{ fontSize }}><thead><tr className="bg-slate-100 text-slate-600"><th className="sticky left-0 z-10 w-10 border-b border-r border-slate-200 bg-slate-100 px-2 py-2 text-center text-[10px] font-black">#</th>{columnLabels.map(label => <th key={label} className="min-w-32 border-b border-r border-slate-200 px-3 py-2 text-left text-[10px] font-black">{label}</th>)}</tr></thead><tbody>{rows.map((row, rowIndex) => <tr key={rowIndex}>{<th className="sticky left-0 z-10 border-b border-r border-slate-200 bg-slate-50 px-2 py-1 text-center text-[10px] font-black text-slate-500">{rowIndex + 1}</th>}{row.map((cell, columnIndex) => <td key={columnIndex} className="border-b border-r border-slate-200 p-0"><input ref={element => { cellRefs.current[`${rowIndex}-${columnIndex}`] = element; }} value={cell.value} onFocus={() => setSelectedCell({ row: rowIndex, column: columnIndex })} onChange={event => updateCell(rowIndex, columnIndex, { value: event.target.value })} onKeyDown={event => { if (event.nativeEvent.isComposing || event.keyCode === 229) return; const offsets: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }; const offset = offsets[event.key]; if (offset) { const target = { row: rowIndex + offset[0], column: columnIndex + offset[1] }; if (target.row >= 0 && target.row < rows.length && target.column >= 0 && target.column < row.length) { event.preventDefault(); moveToCell(target.row, target.column); return; } } if (event.key === 'Enter') { event.preventDefault(); moveToNextRow(rowIndex, columnIndex); } }} className="w-full min-w-32 bg-transparent px-3 py-2 outline-none focus:bg-red-50/60 focus:ring-1 focus:ring-inset focus:ring-red-300" style={{ color: cell.color, backgroundColor: cell.background }} aria-label={`Linha ${rowIndex + 1}, coluna ${columnLabels[columnIndex]}`} /></td>)}</tr>)}</tbody></table></div></div>
      <style>{`@media print { @page { size: auto; margin: 0; } html, body { margin: 0 !important; padding: 0 !important; background: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } body > * { visibility: hidden !important; } .excel-print-area, .excel-print-area * { visibility: visible !important; } .excel-print-area { position: absolute !important; inset: 0 !important; width: 100% !important; overflow: visible !important; border: 0 !important; box-shadow: none !important; } .excel-print-area > div { zoom: 1 !important; } }`}</style>
    </section>
  );
}
