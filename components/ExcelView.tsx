'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Minus, Plus, Printer, Trash2, X, Pencil } from 'lucide-react';

type Cell = { value: string; color: string; background: string; fontSize?: number; textAlign?: 'left' | 'center' };
type Sheet = { id: string; name: string; rows: Cell[][]; columnWidths: number[]; columnNames: string[]; rowHeaderWidth: number };
type CellPosition = { row: number; column: number };
const storageKey = 'gera-excel-workbook-v1';
const createCell = (): Cell => ({ value: '', color: '#1e293b', background: '#fff', fontSize: 14 });
const createRows = () => Array.from({ length: 12 }, () => Array.from({ length: 8 }, createCell));
const createSheet = (name: string): Sheet => ({ id: crypto.randomUUID(), name, rows: createRows(), columnWidths: Array(8).fill(128), columnNames: Array.from({ length: 8 }, (_, index) => String.fromCharCode(65 + index)), rowHeaderWidth: 42 });
const formatColors = ['#1e293b', '#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#2563eb', '#9333ea'];

export default function ExcelView() {
  const [sheets, setSheets] = useState<Sheet[]>(() => { try { const saved = localStorage.getItem(storageKey); const parsed = saved ? JSON.parse(saved) as Partial<Sheet>[] : []; return parsed.length ? parsed.map(item => ({ ...item, columnWidths: item.columnWidths?.length ? item.columnWidths : Array(item.rows?.[0]?.length ?? 8).fill(128), columnNames: item.columnNames?.length ? item.columnNames : Array.from({ length: item.rows?.[0]?.length ?? 8 }, (_, index) => String.fromCharCode(65 + index)), rowHeaderWidth: item.rowHeaderWidth ?? 42 } as Sheet)) : [createSheet('Planilha 1')]; } catch { return [createSheet('Planilha 1')]; } });
  const [activeId, setActiveId] = useState('');
  const [zoom, setZoom] = useState(100);
  const [activeCell, setActiveCell] = useState({ row: 0, column: 0 });
  const [selectedCells, setSelectedCells] = useState<CellPosition[]>([]);
  const [editingName, setEditingName] = useState(false);
  const [draggingRow, setDraggingRow] = useState<number | null>(null);
  const refs = useRef<Record<string, HTMLDivElement | null>>({});
  const sheet = sheets.find(item => item.id === activeId) ?? sheets[0];
  const rows = sheet?.rows ?? createRows();
  useEffect(() => { if (!activeId && sheets[0]) setActiveId(sheets[0].id); }, [activeId, sheets]);
  useEffect(() => { setActiveCell({ row: 0, column: 0 }); setSelectedCells([]); }, [sheet?.id]);
  useEffect(() => { localStorage.setItem(storageKey, JSON.stringify(sheets)); }, [sheets]);
  const labels = sheet?.columnNames ?? Array.from({ length: rows[0]?.length ?? 8 }, (_, i) => String.fromCharCode(65 + i));
  const renameColumn = (column: number, name: string) => updateSheet(value => ({ ...value, columnNames: value.columnNames.map((current, index) => index === column ? name : current) }));
  const updateSheet = (fn: (value: Sheet) => Sheet) => setSheets(current => current.map(item => item.id === sheet?.id ? fn(item) : item));
  const updateCell = (row: number, column: number, patch: Partial<Cell>) => updateSheet(value => ({ ...value, rows: value.rows.map((line, r) => r === row ? line.map((cell, c) => c === column ? { ...cell, ...patch } : cell) : line) }));
  const updateSelectedCells = (style: Partial<Cell>) => {
    const lista = selectedCells?.length > 0 ? selectedCells : [activeCell];
    lista.forEach(cell => updateCell(cell.row, cell.column, style));
  };
  const selectCell = (row: number, column: number, extend: boolean) => {
    if (extend) {
      const minRow = Math.min(activeCell.row, row);
      const maxRow = Math.max(activeCell.row, row);
      const minColumn = Math.min(activeCell.column, column);
      const maxColumn = Math.max(activeCell.column, column);
      setSelectedCells(Array.from({ length: maxRow - minRow + 1 }, (_, rowOffset) =>
        Array.from({ length: maxColumn - minColumn + 1 }, (_, columnOffset) => ({
          row: minRow + rowOffset,
          column: minColumn + columnOffset,
        })),
      ).flat());
    } else {
      setSelectedCells([]);
    }
    setActiveCell({ row, column });
  };
  const reorderRows = (from: number, to: number) => updateSheet(value => {
    const nextRows = [...value.rows];
    const [movedRow] = nextRows.splice(from, 1);
    nextRows.splice(to, 0, movedRow);
    return { ...value, rows: nextRows };
  });
  const focusCell = (row: number, column: number) => { setActiveCell({ row, column }); requestAnimationFrame(() => refs.current[`${row}-${column}`]?.focus()); };
  const move = (row: number, column: number) => { if (row >= 0 && row < rows.length && column >= 0 && column < rows[0].length) focusCell(row, column); };
  const addRow = () => updateSheet(value => ({ ...value, rows: [...value.rows, Array.from({ length: value.rows[0].length }, createCell)] }));
  const resizeColumn = (column: number, width: number) => updateSheet(value => ({ ...value, columnWidths: value.columnWidths.map((current, index) => index === column ? Math.max(70, Math.min(500, width)) : current) }));
  const resizeRowHeader = (width: number) => updateSheet(value => ({ ...value, rowHeaderWidth: Math.max(28, Math.min(160, width)) }));
  const addColumn = () => updateSheet(value => ({ ...value, rows: value.rows.map(line => [...line, createCell()]), columnWidths: [...value.columnWidths, 128], columnNames: [...value.columnNames, String.fromCharCode(65 + value.columnNames.length)] }));
  const deleteRow = () => updateSheet(value => value.rows.length <= 1 ? value : ({ ...value, rows: value.rows.filter((_, index) => index !== activeCell.row) }));
  const deleteColumn = () => updateSheet(value => value.rows[0].length <= 1 ? value : ({ ...value, rows: value.rows.map(line => line.filter((_, index) => index !== activeCell.column)), columnWidths: value.columnWidths.filter((_, index) => index !== activeCell.column), columnNames: value.columnNames.filter((_, index) => index !== activeCell.column) }));
  const changeSelectedTextSize = (delta: number) => {
    const lista = selectedCells?.length > 0 ? selectedCells : [activeCell];
    lista.forEach(cell => {
      const currentSize = rows[cell.row]?.[cell.column]?.fontSize ?? 14;
      updateCell(cell.row, cell.column, { fontSize: Math.max(8, currentSize + delta) });
    });
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
      <div className="flex flex-col gap-0.5">
        <span className="text-center text-[8px] font-black uppercase text-slate-500">Cor da fonte</span>
        <div className="flex gap-1">{formatColors.map(color => <button key={`font-${color}`} type="button" aria-label={`Cor da fonte ${color}`} title={`Cor da fonte ${color}`} onClick={() => updateSelectedCells({ color })} className="h-3 w-3 rounded-full border border-slate-300" style={{ backgroundColor: color }} />)}</div>
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-center text-[8px] font-black uppercase text-slate-500">Cor de fundo</span>
        <div className="flex items-center gap-1"><button type="button" className={buttons} onClick={() => updateSelectedCells({ background: '#fff' })}>Fundo</button>{formatColors.map(color => <button key={`background-${color}`} type="button" aria-label={`Cor de fundo ${color}`} title={`Cor de fundo ${color}`} onClick={() => updateSelectedCells({ background: color })} className="h-3 w-3 rounded-full border border-slate-300" style={{ backgroundColor: color }} />)}</div>
      </div>
      <button className={buttons} onClick={() => changeSelectedTextSize(-2)}><Minus data-icon="inline-start" /> Texto -</button><button className={buttons} onClick={() => changeSelectedTextSize(2)}><Plus data-icon="inline-start" /> Texto +</button><button className={buttons} onClick={() => window.print()}><Printer data-icon="inline-start" /> PDF</button>
      <button className={buttons} onClick={() => updateSelectedCells({ textAlign: 'left' })}>Alinhar</button><button className={buttons} onClick={() => updateSelectedCells({ textAlign: 'center' })}>Centro</button>
    </div></div>
    {editingName && <input autoFocus defaultValue={sheet?.name} onBlur={e => { updateSheet(value => ({ ...value, name: e.target.value.trim() || value.name })); setEditingName(false); }} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }} className="w-52 rounded-lg border border-red-200 px-2 py-1.5 text-[10px] font-bold outline-none" aria-label="Nome da página" />}
    <div className="excel-print-area overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <div style={{ zoom: zoom / 100 }}>
        <table className="min-w-full border-collapse" style={{ fontFamily: 'Arial, sans-serif' }}>
          <thead>
            <tr className="bg-slate-100 text-slate-600">
              <th className="relative border p-2 text-[10px]" style={{ width: sheet.rowHeaderWidth, minWidth: sheet.rowHeaderWidth }}>
                #
                <span role="separator" aria-label="Redimensionar coluna numérica" onMouseDown={event => { const startX = event.clientX; const startWidth = sheet.rowHeaderWidth; const move = (moveEvent: MouseEvent) => resizeRowHeader(startWidth + moveEvent.clientX - startX); const stop = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', stop); }; window.addEventListener('mousemove', move); window.addEventListener('mouseup', stop); }} className="absolute inset-y-0 right-0 w-2 cursor-col-resize hover:bg-red-300" />
              </th>
              {labels.map((label, columnIndex) => <th key={columnIndex} className="relative border p-2 text-left text-[10px]" style={{ width: sheet.columnWidths[columnIndex], minWidth: sheet.columnWidths[columnIndex] }}>
                <input value={label} onChange={event => renameColumn(columnIndex, event.target.value)} aria-label={`Nome da coluna ${label}`} className="w-full min-w-0 bg-transparent font-bold outline-none" placeholder="Nome" />
                <span role="separator" aria-label={`Redimensionar coluna ${label}`} onMouseDown={event => { const startX = event.clientX; const startWidth = sheet.columnWidths[columnIndex]; const move = (moveEvent: MouseEvent) => resizeColumn(columnIndex, startWidth + moveEvent.clientX - startX); const stop = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', stop); }; window.addEventListener('mousemove', move); window.addEventListener('mouseup', stop); }} className="absolute inset-y-0 right-0 w-2 cursor-col-resize hover:bg-red-300" />
              </th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((line, row) => <tr key={row} onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; }} onDrop={event => { event.preventDefault(); if (draggingRow !== null) reorderRows(draggingRow, row); setDraggingRow(null); }}>
              <th className={`border bg-slate-50 p-1 text-[10px] ${draggingRow === row ? 'opacity-40' : ''}`} style={{ width: sheet.rowHeaderWidth, minWidth: sheet.rowHeaderWidth }}>
                <button type="button" draggable onDragStart={event => { setDraggingRow(row); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', String(row)); }} onDragEnd={() => setDraggingRow(null)} className="w-full cursor-grab select-none active:cursor-grabbing" aria-label={`Arrastar linha ${row + 1}`} title="Arraste para mover a linha">{row + 1}</button>
              </th>
              {line.map((cell, column) => <td key={column} className="border p-0">
                <div ref={node => { refs.current[`${row}-${column}`] = node; }} contentEditable suppressContentEditableWarning onMouseDown={event => selectCell(row, column, event.shiftKey)} onFocus={() => setActiveCell({ row, column })} onBlur={e => updateCell(row, column, { value: e.currentTarget.innerHTML })} onKeyDown={e => { const key = e.key; if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(key)) { e.preventDefault(); const offsets: Record<string, [number, number]> = { ArrowUp: [-1,0], ArrowDown: [1,0], ArrowLeft: [0,-1], ArrowRight: [0,1] }; const [dr, dc] = offsets[key]; move(row + dr, column + dc); } if (key === 'Enter') { e.preventDefault(); move(row + 1, column); } }} dangerouslySetInnerHTML={{ __html: cell.value }} className={`min-w-0 px-3 py-2 outline-none focus:bg-red-50/60 ${selectedCells.some(selected => selected.row === row && selected.column === column) ? 'ring-2 ring-inset ring-red-400' : ''}`} style={{ color: cell.color, backgroundColor: cell.background, fontSize: cell.fontSize, textAlign: cell.textAlign ?? 'left', width: sheet.columnWidths[column] }} />
              </td>)}
            </tr>)}
          </tbody>
        </table>
      </div>
    </div>
    <style>{`@media print { @page { margin: 0; } body > * { visibility: hidden !important; } .excel-print-area, .excel-print-area * { visibility: visible !important; } .excel-print-area { position: absolute !important; inset: 0 !important; border: 0 !important; box-shadow: none !important; } }`}</style>
  </section>;
}
