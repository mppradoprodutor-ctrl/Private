'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Minus, Plus, Printer, Trash2, X, Pencil } from 'lucide-react';

type Cell = { value: string; color: string; background: string; fontSize?: number };
type Sheet = { id: string; name: string; rows: Cell[][] };
const storageKey = 'gera-excel-workbook-v1';
const createCell = (): Cell => ({ value: '', color: '#1e293b', background: '#fff', fontSize: 14 });
const createRows = () => Array.from({ length: 12 }, () => Array.from({ length: 8 }, createCell));
const createSheet = (name: string): Sheet => ({ id: crypto.randomUUID(), name, rows: createRows() });

export default function ExcelView() {
  const [sheets, setSheets] = useState<Sheet[]>(() => { try { const saved = localStorage.getItem(storageKey); return saved ? JSON.parse(saved) : [createSheet('Planilha 1')]; } catch { return [createSheet('Planilha 1')]; } });
  const [activeId, setActiveId] = useState('');
  const [zoom, setZoom] = useState(100);
  const [activeCell, setActiveCell] = useState({ row: 0, column: 0 });
  const [editingName, setEditingName] = useState(false);
  const refs = useRef<Record<string, HTMLDivElement | null>>({});
  const sheet = sheets.find(item => item.id === activeId) ?? sheets[0];
  const rows = sheet?.rows ?? createRows();
  useEffect(() => { if (!activeId && sheets[0]) setActiveId(sheets[0].id); }, [activeId, sheets]);
  useEffect(() => { localStorage.setItem(storageKey, JSON.stringify(sheets)); }, [sheets]);
  const labels = useMemo(() => Array.from({ length: rows[0]?.length ?? 8 }, (_, i) => String.fromCharCode(65 + i)), [rows]);
  const updateSheet = (fn: (value: Sheet) => Sheet) => setSheets(current => current.map(item => item.id === sheet?.id ? fn(item) : item));
  const updateCell = (row: number, column: number, patch: Partial<Cell>) => updateSheet(value => ({ ...value, rows: value.rows.map((line, r) => r === row ? line.map((cell, c) => c === column ? { ...cell, ...patch } : cell) : line) }));
  const focusCell = (row: number, column: number) => { setActiveCell({ row, column }); requestAnimationFrame(() => refs.current[`${row}-${column}`]?.focus()); };
  const move = (row: number, column: number) => { if (row >= 0 && row < rows.length && column >= 0 && column < rows[0].length) focusCell(row, column); };
  const addRow = () => updateSheet(value => ({ ...value, rows: [...value.rows, Array.from({ length: value.rows[0].length }, createCell)] }));
  const addColumn = () => updateSheet(value => ({ ...value, rows: value.rows.map(line => [...line, createCell()]) }));
  const deleteRow = () => updateSheet(value => value.rows.length <= 1 ? value : ({ ...value, rows: value.rows.filter((_, index) => index !== activeCell.row) }));
  const deleteColumn = () => updateSheet(value => value.rows[0].length <= 1 ? value : ({ ...value, rows: value.rows.map(line => line.filter((_, index) => index !== activeCell.column)) }));
  const changeSelectedTextSize = (delta: number) => {
    const element = refs.current[`${activeCell.row}-${activeCell.column}`];
    const selection = window.getSelection();
    const hasSelection = Boolean(element && selection && selection.rangeCount > 0 && !selection.isCollapsed && element.contains(selection.anchorNode));
    if (hasSelection && selection) {
      const range = selection.getRangeAt(0);
      const span = document.createElement('span');
      span.style.fontSize = `${Math.max(8, (parseFloat(getComputedStyle(element!).fontSize) || 14) + delta)}px`;
      span.appendChild(range.extractContents());
      range.insertNode(span);
      updateCell(activeCell.row, activeCell.column, { value: element!.innerHTML });
      selection.removeAllRanges();
      selection.addRange(range);
      return;
    }
    setSheets(current => current.map(workbook => workbook.id !== sheet?.id ? workbook : {
      ...workbook,
      rows: workbook.rows.map(line => line.map(cell => ({ ...cell, fontSize: Math.max(8, (cell.fontSize ?? 14) + delta) }))),
    }));
  };
  const buttons = 'rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[9px] font-black uppercase text-slate-700 hover:border-red-300';
  return <section className="animate-in fade-in duration-300 space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black uppercase text-slate-900">Excel</h2><p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Planilhas salvas automaticamente</p></div><div className="flex flex-wrap items-center gap-1.5">
      <select value={sheet?.id ?? ''} onChange={e => setActiveId(e.target.value)} className={buttons} aria-label="Selecionar planilha">{sheets.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
      <button className={buttons} onClick={() => { const next = createSheet(`Planilha ${sheets.length + 1}`); setSheets(value => [...value, next]); setActiveId(next.id); }}><Plus data-icon="inline-start" /> Nova página</button>
      <button className={buttons} disabled={sheets.length < 2} onClick={() => { const next = sheets.filter(item => item.id !== sheet.id); setSheets(next); setActiveId(next[0].id); }}><X data-icon="inline-start" /> Remover</button>
      <button className={buttons} onClick={() => setEditingName(value => !value)}><Pencil data-icon="inline-start" /> Nomear</button>
      <span className="flex flex-col gap-0.5"><button className={buttons} onClick={() => updateSheet(value => ({ ...value, rows: [...value.rows, Array.from({ length: value.rows[0].length }, createCell)] }))}>Nova linha</button><button className={`${buttons} border-red-100 text-red-700`} onClick={deleteRow}>Excluir linha</button></span><span className="flex flex-col gap-0.5"><button className={buttons} onClick={addColumn}>Nova coluna</button><button className={`${buttons} border-red-100 text-red-700`} onClick={deleteColumn}>Excluir coluna</button></span>
      <button className={buttons} onClick={() => setZoom(value => Math.max(60, value - 10))}><Minus data-icon="inline-start" /> Zoom -</button><button className={buttons} onClick={() => setZoom(value => Math.min(150, value + 10))}><Plus data-icon="inline-start" /> Zoom +</button>
      <button className={buttons} onClick={() => changeSelectedTextSize(-2)}><Minus data-icon="inline-start" /> Texto -</button><button className={buttons} onClick={() => changeSelectedTextSize(2)}><Plus data-icon="inline-start" /> Texto +</button><button className={buttons} onClick={() => window.print()}><Printer data-icon="inline-start" /> PDF</button>
    </div></div>
    {editingName && <input autoFocus defaultValue={sheet?.name} onBlur={e => { updateSheet(value => ({ ...value, name: e.target.value.trim() || value.name })); setEditingName(false); }} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }} className="w-52 rounded-lg border border-red-200 px-2 py-1.5 text-[10px] font-bold outline-none" aria-label="Nome da página" />}
    <div className="excel-print-area overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm"><div style={{ zoom: zoom / 100 }}><table className="min-w-full border-collapse" style={{ fontFamily: 'Arial, sans-serif' }}><thead><tr className="bg-slate-100 text-slate-600"><th className="border p-2 text-[10px]">#</th>{labels.map(label => <th key={label} className="min-w-32 border p-2 text-left text-[10px]">{label}</th>)}</tr></thead><tbody>{rows.map((line, row) => <tr key={row}><th className="border bg-slate-50 p-1 text-[10px]">{row + 1}</th>{line.map((cell, column) => <td key={column} className="border p-0"><div ref={node => { refs.current[`${row}-${column}`] = node; }} contentEditable suppressContentEditableWarning onFocus={() => setActiveCell({ row, column })} onBlur={e => updateCell(row, column, { value: e.currentTarget.innerHTML })} onKeyDown={e => { const key = e.key; if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(key)) { e.preventDefault(); const offsets: Record<string, [number, number]> = { ArrowUp: [-1,0], ArrowDown: [1,0], ArrowLeft: [0,-1], ArrowRight: [0,1] }; const [dr, dc] = offsets[key]; move(row + dr, column + dc); } if (key === 'Enter') { e.preventDefault(); move(row + 1, column); } }} dangerouslySetInnerHTML={{ __html: cell.value }} className="min-w-32 px-3 py-2 outline-none focus:bg-red-50/60" style={{ color: cell.color, backgroundColor: cell.background, fontSize: cell.fontSize }} /> </td>)}</tr>)}</tbody></table></div></div>
    <style>{`@media print { @page { margin: 0; } body > * { visibility: hidden !important; } .excel-print-area, .excel-print-area * { visibility: visible !important; } .excel-print-area { position: absolute !important; inset: 0 !important; border: 0 !important; box-shadow: none !important; } }`}</style>
  </section>;
}
