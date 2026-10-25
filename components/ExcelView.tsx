'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlignCenter, AlignLeft, Minus, Palette, Plus, Printer, Trash2, X, Pencil } from 'lucide-react';

type Cell = { value: string; color: string; background: string; fontSize?: number; align?: 'left' | 'center' };
type CellSelection = { startRow: number; startColumn: number; endRow: number; endColumn: number };
const createCellSelection = (start: { row: number; column: number }, end: { row: number; column: number }): CellSelection => ({ startRow: Math.min(start.row, end.row), startColumn: Math.min(start.column, end.column), endRow: Math.max(start.row, end.row), endColumn: Math.max(start.column, end.column) });
const basicColors = ['#111827', '#ffffff', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'];
type Sheet = { id: string; name: string; rows: Cell[][]; columnWidths: number[]; columnNames: string[]; rowHeaderWidth: number };
const storageKey = 'gera-excel-workbook-v1';
const createCell = (): Cell => ({ value: '', color: '#1e293b', background: '#fff', fontSize: 14, align: 'left' });
const createRows = () => Array.from({ length: 12 }, () => Array.from({ length: 8 }, createCell));
const createSheet = (name: string): Sheet => ({ id: crypto.randomUUID(), name, rows: createRows(), columnWidths: Array(8).fill(128), columnNames: Array.from({ length: 8 }, (_, index) => String.fromCharCode(65 + index)), rowHeaderWidth: 42 });

export default function ExcelView() {
  const [sheets, setSheets] = useState<Sheet[]>(() => { try { const saved = localStorage.getItem(storageKey); const parsed = saved ? JSON.parse(saved) as Partial<Sheet>[] : []; return parsed.length ? parsed.map(item => ({ ...item, columnWidths: item.columnWidths?.length ? item.columnWidths : Array(item.rows?.[0]?.length ?? 8).fill(128), columnNames: item.columnNames?.length ? item.columnNames : Array.from({ length: item.rows?.[0]?.length ?? 8 }, (_, index) => String.fromCharCode(65 + index)), rowHeaderWidth: item.rowHeaderWidth ?? 42 } as Sheet)) : [createSheet('Planilha 1')]; } catch { return [createSheet('Planilha 1')]; } });
  const [activeId, setActiveId] = useState('');
  const [zoom, setZoom] = useState(100);
  const [activeCell, setActiveCell] = useState({ row: 0, column: 0 });
  const [cellSelection, setCellSelection] = useState<CellSelection>(createCellSelection({ row: 0, column: 0 }, { row: 0, column: 0 }));
  const selectionAnchorRef = useRef({ row: 0, column: 0 });
  const selectingCellsRef = useRef(false);
  const [editingName, setEditingName] = useState(false);
  const [draggingRow, setDraggingRow] = useState<number | null>(null);
  const refs = useRef<Record<string, HTMLDivElement | null>>({});
  const htmlPropsCache = useRef<Record<string, { value: string; props: { __html: string } }>>({});
  const sheet = sheets.find(item => item.id === activeId) ?? sheets[0];
  const rows = sheet?.rows ?? createRows();
  useEffect(() => { if (!activeId && sheets[0]) setActiveId(sheets[0].id); }, [activeId, sheets]);
  useEffect(() => { localStorage.setItem(storageKey, JSON.stringify(sheets)); }, [sheets]);
  useEffect(() => {
    const stopCellSelection = () => { selectingCellsRef.current = false; };
    window.addEventListener('mouseup', stopCellSelection);
    return () => window.removeEventListener('mouseup', stopCellSelection);
  }, []);
  const labels = sheet?.columnNames ?? Array.from({ length: rows[0]?.length ?? 8 }, (_, i) => String.fromCharCode(65 + i));
  const renameColumn = (column: number, name: string) => updateSheet(value => ({ ...value, columnNames: value.columnNames.map((current, index) => index === column ? name : current) }));
  const updateSheet = (fn: (value: Sheet) => Sheet) => setSheets(current => current.map(item => item.id === sheet?.id ? fn(item) : item));
  const updateCell = (row: number, column: number, patch: Partial<Cell>) => updateSheet(value => ({ ...value, rows: value.rows.map((line, r) => r === row ? line.map((cell, c) => c === column ? { ...cell, ...patch } : cell) : line) }));
  const hasMultipleCellsSelected = cellSelection.startRow !== cellSelection.endRow || cellSelection.startColumn !== cellSelection.endColumn;
  const isCellSelected = (row: number, column: number) => row >= cellSelection.startRow && row <= cellSelection.endRow && column >= cellSelection.startColumn && column <= cellSelection.endColumn;
  const updateSelectedCells = (patch: Partial<Cell>) => updateSheet(value => ({ ...value, rows: value.rows.map((line, row) => line.map((cell, column) => isCellSelected(row, column) ? { ...cell, ...patch } : cell)) }));
  const clearSelectedCellContents = () => {
    for (let row = cellSelection.startRow; row <= cellSelection.endRow; row += 1) {
      for (let column = cellSelection.startColumn; column <= cellSelection.endColumn; column += 1) {
        refs.current[`${row}-${column}`]?.replaceChildren();
      }
    }
    updateSelectedCells({ value: '' });
  };
  const reorderRows = (from: number, to: number) => updateSheet(value => {
    const nextRows = [...value.rows];
    const [movedRow] = nextRows.splice(from, 1);
    nextRows.splice(to, 0, movedRow);
    return { ...value, rows: nextRows };
  });
  const focusCell = (row: number, column: number) => { setActiveCell({ row, column }); requestAnimationFrame(() => refs.current[`${row}-${column}`]?.focus()); };
  const move = (row: number, column: number) => { if (row >= 0 && row < rows.length && column >= 0 && column < rows[0].length) focusCell(row, column); };
  const getCellHtmlProps = (row: number, column: number, value: string) => {
    const key = `${sheet?.id}:${row}:${column}`;
    const cached = htmlPropsCache.current[key];
    if (cached?.value === value) return cached.props;
    const props = { __html: value };
    htmlPropsCache.current[key] = { value, props };
    return props;
  };
  const selectCellByMouse = (row: number, column: number) => {
    if (!selectingCellsRef.current) return;
    const anchor = selectionAnchorRef.current;
    setCellSelection(createCellSelection(anchor, { row, column }));
    if (anchor.row !== row || anchor.column !== column) window.getSelection()?.removeAllRanges();
  };
  const selectCellByKeyboard = (row: number, column: number, extend: boolean) => {
    window.getSelection()?.removeAllRanges();
    const target = { row, column };
    if (extend) {
      setCellSelection(createCellSelection(selectionAnchorRef.current, target));
    } else {
      selectionAnchorRef.current = target;
      setCellSelection(createCellSelection(target, target));
    }
    move(row, column);
  };
  const addRow = () => updateSheet(value => ({ ...value, rows: [...value.rows, Array.from({ length: value.rows[0].length }, createCell)] }));
  const resizeColumn = (column: number, width: number) => updateSheet(value => ({ ...value, columnWidths: value.columnWidths.map((current, index) => index === column ? Math.max(70, Math.min(500, width)) : current) }));
  const resizeRowHeader = (width: number) => updateSheet(value => ({ ...value, rowHeaderWidth: Math.max(28, Math.min(160, width)) }));
  const addColumn = () => updateSheet(value => ({ ...value, rows: value.rows.map(line => [...line, createCell()]), columnWidths: [...value.columnWidths, 128], columnNames: [...value.columnNames, String.fromCharCode(65 + value.columnNames.length)] }));
  const deleteRow = () => updateSheet(value => value.rows.length <= 1 ? value : ({ ...value, rows: value.rows.filter((_, index) => index !== activeCell.row) }));
  const deleteColumn = () => updateSheet(value => value.rows[0].length <= 1 ? value : ({ ...value, rows: value.rows.map(line => line.filter((_, index) => index !== activeCell.column)), columnWidths: value.columnWidths.filter((_, index) => index !== activeCell.column), columnNames: value.columnNames.filter((_, index) => index !== activeCell.column) }));
  const changeSelectedTextSize = (delta: number) => {
    const element = refs.current[`${activeCell.row}-${activeCell.column}`];
    const selection = window.getSelection();
    const hasTextSelection = Boolean(!hasMultipleCellsSelected && element && selection && selection.rangeCount > 0 && !selection.isCollapsed && element.contains(selection.anchorNode) && element.contains(selection.focusNode));
    if (hasTextSelection && selection) {
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
    updateSheet(value => ({ ...value, rows: value.rows.map((line, row) => line.map((cell, column) => isCellSelected(row, column) ? { ...cell, fontSize: Math.max(8, (cell.fontSize ?? 14) + delta) } : cell)) }));
  };
  const applyTextColor = (color: string) => {
    const element = refs.current[`${activeCell.row}-${activeCell.column}`];
    const selection = window.getSelection();
    const hasTextSelection = Boolean(!hasMultipleCellsSelected && element && selection && selection.rangeCount > 0 && !selection.isCollapsed && element.contains(selection.anchorNode) && element.contains(selection.focusNode));
    if (hasTextSelection && selection) {
      const range = selection.getRangeAt(0);
      const span = document.createElement('span');
      span.style.color = color;
      span.appendChild(range.extractContents());
      range.insertNode(span);
      updateCell(activeCell.row, activeCell.column, { value: element!.innerHTML });
      selection.removeAllRanges();
      selection.addRange(range);
      return;
    }
    updateSelectedCells({ color });
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
      <button className={buttons} onMouseDown={event => event.preventDefault()} onClick={() => changeSelectedTextSize(-2)}><Minus data-icon="inline-start" /> Texto -</button><button className={buttons} onMouseDown={event => event.preventDefault()} onClick={() => changeSelectedTextSize(2)}><Plus data-icon="inline-start" /> Texto +</button>
      <button className={buttons} onMouseDown={event => event.preventDefault()} onClick={() => updateSelectedCells({ align: 'left' })}><AlignLeft data-icon="inline-start" /> Alinhar</button><button className={buttons} onMouseDown={event => event.preventDefault()} onClick={() => updateSelectedCells({ align: 'center' })}><AlignCenter data-icon="inline-start" /> Centro</button>
      <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1" aria-label="Cores do texto"><Palette size={12} className="text-slate-500" />{basicColors.map(color => <button key={`text-${color}`} onMouseDown={event => event.preventDefault()} onClick={() => applyTextColor(color)} title={`Cor do texto ${color}`} aria-label={`Cor do texto ${color}`} className="size-3 rounded-full border border-slate-300" style={{ backgroundColor: color }} />)}</div>
      <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1" aria-label="Cores do fundo"><span className="text-[9px] font-black text-slate-500">Fundo</span>{basicColors.map(color => <button key={`fill-${color}`} onMouseDown={event => event.preventDefault()} onClick={() => updateSelectedCells({ background: color })} title={`Cor do fundo ${color}`} aria-label={`Cor do fundo ${color}`} className="size-3 rounded-full border border-slate-300" style={{ backgroundColor: color }} />)}</div>
      <button className={buttons} onClick={() => window.print()}><Printer data-icon="inline-start" /> PDF</button>
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
                <div ref={node => { refs.current[`${row}-${column}`] = node; }} contentEditable suppressContentEditableWarning onMouseDown={event => { if (event.button !== 0) return; const point = { row, column }; if (event.shiftKey) { event.preventDefault(); setCellSelection(createCellSelection(selectionAnchorRef.current, point)); setActiveCell(point); window.getSelection()?.removeAllRanges(); focusCell(row, column); return; } selectionAnchorRef.current = point; selectingCellsRef.current = true; setCellSelection(createCellSelection(point, point)); setActiveCell(point); }} onMouseEnter={() => selectCellByMouse(row, column)} onDragStart={event => event.preventDefault()} onFocus={() => setActiveCell({ row, column })} onBlur={e => updateCell(row, column, { value: e.currentTarget.innerHTML })} onKeyDown={e => { const key = e.key; if (key === 'Delete' || key === 'Backspace') { const textSelection = window.getSelection(); const hasSelectedText = Boolean(textSelection && !textSelection.isCollapsed && e.currentTarget.contains(textSelection.anchorNode) && e.currentTarget.contains(textSelection.focusNode)); if (!hasSelectedText) { e.preventDefault(); clearSelectedCellContents(); } return; } if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(key)) { e.preventDefault(); const offsets: Record<string, [number, number]> = { ArrowUp: [-1,0], ArrowDown: [1,0], ArrowLeft: [0,-1], ArrowRight: [0,1] }; const [dr, dc] = offsets[key]; const nextRow = row + dr; const nextColumn = column + dc; if (nextRow >= 0 && nextRow < rows.length && nextColumn >= 0 && nextColumn < rows[0].length) selectCellByKeyboard(nextRow, nextColumn, e.shiftKey); return; } if (key === 'Enter') { e.preventDefault(); updateCell(row, column, { value: e.currentTarget.innerHTML }); if (row + 1 < rows.length) selectCellByKeyboard(row + 1, column, false); } }} dangerouslySetInnerHTML={getCellHtmlProps(row, column, cell.value)} className={`min-w-0 px-3 py-2 outline-none focus:bg-red-50/60 ${isCellSelected(row, column) ? 'ring-1 ring-inset ring-blue-500' : ''}`} style={{ color: cell.color, backgroundColor: cell.background, fontSize: cell.fontSize, width: sheet.columnWidths[column], textAlign: cell.align ?? 'left' }} />
              </td>)}
            </tr>)}
          </tbody>
        </table>
      </div>
    </div>
    <style>{`@media print { @page { margin: 0; } body > * { visibility: hidden !important; } .excel-print-area, .excel-print-area * { visibility: visible !important; } .excel-print-area { position: absolute !important; inset: 0 !important; border: 0 !important; box-shadow: none !important; } }`}</style>
  </section>;
}
