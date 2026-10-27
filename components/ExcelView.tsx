'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AlignCenter, AlignLeft, Minus, Palette, Plus, Printer, Trash2, X, Pencil } from 'lucide-react';
import {
  createEmptyRow,
  createCell,
  createSheet,
  createRows,
  escapeCellText,
  EXCEL_STORAGE_KEY,
  getColumnName,
  hasExcelWorkbookData,
  parseExcelWorkbook,
  type Cell,
  type ExcelWorkbook,
  type Sheet,
  useExcelWorkbook,
} from '../contexts/ExcelContext';

function parseTSV(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let cell = ""; let inQuotes = false;
  const t = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  for(let i=0; i<t.length; i++){
    const c=t[i]; const n=t[i+1];
    if(c === '"'){ if(inQuotes && n === '"'){ cell+='"'; i++; } else inQuotes=!inQuotes; }
    else if(c === '\t' && !inQuotes){ row.push(cell); cell=""; }
    else if(c === '\n' && !inQuotes){ row.push(cell); rows.push(row); row=[]; cell=""; }
    else cell+=c;
  }
  if(cell || row.length){ row.push(cell); rows.push(row); }
  return rows;
}
function toTSV(data: string[][]): string {
  return data.map(r => r.map(c => {
    if(c.includes('\t') || c.includes('\n') || c.includes('"')) return `"${c.replace(/"/g,'""')}"`;
    return c;
  }).join('\t')).join('\n');
}

type CellSelection = { startRow: number; startColumn: number; endRow: number; endColumn: number };
type ExcelViewProps = {
  onSaveToCloud?: (workbook: ExcelWorkbook) => Promise<void>;
  cloudWorkbook?: ExcelWorkbook | null;
  cloudReady?: boolean;
};
const createCellSelection = (start: { row: number; column: number }, end: { row: number; column: number }): CellSelection => ({ startRow: Math.min(start.row, end.row), startColumn: Math.min(start.column, end.column), endRow: Math.max(start.row, end.row), endColumn: Math.max(start.column, end.column) });
const basicColors = ['#111827', '#ffffff', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'];
export default function ExcelView({ onSaveToCloud, cloudWorkbook, cloudReady = true }: ExcelViewProps) {
  const { workbook, setWorkbook } = useExcelWorkbook();
  const sheets = workbook.sheets;
  const setSheets: React.Dispatch<React.SetStateAction<Sheet[]>> = update => {
    setWorkbook(current => ({
      ...current,
      sheets: typeof update === 'function' ? update(current.sheets) : update,
    }));
  };
  const shouldSaveWorkbookRef = useRef(hasExcelWorkbookData(workbook));
  const latestSheetsRef = useRef(sheets);
  const onSaveToCloudRef = useRef(onSaveToCloud);
  const cloudReadyRef = useRef(cloudReady);
  latestSheetsRef.current = sheets;
  onSaveToCloudRef.current = onSaveToCloud;
  cloudReadyRef.current = cloudReady;
  const [activeId, setActiveId] = useState('');
  const [zoom, setZoom] = useState(100);
  const [activeCell, setActiveCell] = useState({ row: 0, column: 0 });
  const [cellSelection, setCellSelection] = useState<CellSelection>(createCellSelection({ row: 0, column: 0 }, { row: 0, column: 0 }));
  const [selectedCells, setSelectedCells] = useState<Array<{ id: string; row: number; column: number }>>([{ id: '0-0', row: 0, column: 0 }]);
  const selectionAnchorRef = useRef({ row: 0, column: 0 });
  const selectingCellsRef = useRef(false);
  const [editingName, setEditingName] = useState(false);
  const [draggingRow, setDraggingRow] = useState<number | null>(null);
  const refs = useRef<Record<string, HTMLDivElement | null>>({});
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const htmlPropsCache = useRef<Record<string, { value: string; props: { __html: string } }>>({});
  const sheet = sheets.find(item => item.id === activeId) ?? sheets[0];
  const activeSheetIdRef = useRef(sheet?.id);
  activeSheetIdRef.current = sheet?.id;
  const rows = sheet?.rows ?? createRows();
  const persistVisibleCells = () => {
    try {
      const currentSheets = latestSheetsRef.current.map(item => item.id === activeSheetIdRef.current
        ? {
            ...item,
            rows: item.rows.map((line, row) => line.map((cell, column) => {
              const node = refs.current[`${row}-${column}`];
              return node ? { ...cell, value: node.innerHTML } : cell;
            })),
          }
        : item);
      window.localStorage.setItem(EXCEL_STORAGE_KEY, JSON.stringify({ id: 'excel-root', sheets: currentSheets }));
    } catch (error) {
      console.error('Error saving Excel workbook to localStorage:', error);
    }
  };
  useEffect(() => {
    window.addEventListener('beforeunload', persistVisibleCells);
    document.addEventListener('visibilitychange', persistVisibleCells);
    return () => {
      window.removeEventListener('beforeunload', persistVisibleCells);
      document.removeEventListener('visibilitychange', persistVisibleCells);
    };
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(EXCEL_STORAGE_KEY, JSON.stringify({ id: 'excel-root', sheets }));
      } catch (error) {
        console.error('Error saving Excel workbook to localStorage:', error);
      }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [sheets]);
  useEffect(() => { if (!activeId && sheets[0]) setActiveId(sheets[0].id); }, [activeId, sheets]);
  useEffect(() => {
    const initialCell = { row: 0, column: 0 };
    setActiveCell(initialCell);
    setCellSelection(createCellSelection(initialCell, initialCell));
    setSelectedCells([{ id: '0-0', ...initialCell }]);
    selectionAnchorRef.current = initialCell;
    selectingCellsRef.current = false;
  }, [sheet?.id]);
  useEffect(() => {
    if (!cloudWorkbook || !hasExcelWorkbookData(cloudWorkbook)) return;
    const parsed = parseExcelWorkbook(cloudWorkbook);
    if (!parsed) return;
    shouldSaveWorkbookRef.current = true;
    setSheets(current => JSON.stringify(current) === JSON.stringify(parsed.sheets) ? current : parsed.sheets);
  }, [cloudWorkbook]);
  useEffect(() => {
    if (!shouldSaveWorkbookRef.current) return;
    const timer = window.setTimeout(() => {
      if (cloudReadyRef.current && onSaveToCloudRef.current) {
        void onSaveToCloudRef.current({ id: 'workbook', sheets }).catch(error => console.error('Error saving Excel workbook:', error));
      }
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [sheets, cloudReady]);
  useEffect(() => () => {
    if (!shouldSaveWorkbookRef.current) return;
    if (cloudReadyRef.current && onSaveToCloudRef.current) {
      void onSaveToCloudRef.current({ id: 'workbook', sheets: latestSheetsRef.current })
        .catch(error => console.error('Error saving Excel workbook:', error));
    }
  }, []);
  useEffect(() => {
    const stopCellSelection = () => { selectingCellsRef.current = false; };
    window.addEventListener('mouseup', stopCellSelection);
    return () => window.removeEventListener('mouseup', stopCellSelection);
  }, []);
  const labels = sheet?.columnNames ?? Array.from({ length: rows[0]?.length ?? 8 }, (_, i) => String.fromCharCode(65 + i));
  const renameColumn = (column: number, name: string) => updateSheet(value => ({ ...value, columnNames: value.columnNames.map((current, index) => index === column ? name : current) }));
  const updateSheet = (fn: (value: Sheet) => Sheet) => {
    shouldSaveWorkbookRef.current = true;
    setSheets(current => current.map(item => item.id === sheet?.id ? fn(item) : item));
  };
  const updateCell = (row: number, column: number, patch: Partial<Cell>) => updateSheet(value => ({ ...value, rows: value.rows.map((line, r) => r === row ? line.map((cell, c) => c === column ? { ...cell, ...patch } : cell) : line) }));
  const hasMultipleCellsSelected = selectedCells.length > 1;
  const isCellSelected = (row: number, column: number) => selectedCells.some(cell => cell.row === row && cell.column === column);
  const setCellRange = (start: { row: number; column: number }, end: { row: number; column: number }) => {
    const selection = createCellSelection(start, end);
    const cells: Array<{ id: string; row: number; column: number }> = [];
    for (let row = selection.startRow; row <= selection.endRow; row += 1) {
      for (let column = selection.startColumn; column <= selection.endColumn; column += 1) {
        cells.push({ id: `${row}-${column}`, row, column });
      }
    }
    setCellSelection(selection);
    setSelectedCells(cells);
  };
  const getSelectedCellTargets = () => {
    const alvos = selectedCells && selectedCells.length > 1 ? selectedCells : [activeCell];
    return alvos;
  };
  const updateSelectedCells = (patch: Partial<Cell>) => {
    const alvos = getSelectedCellTargets();
    updateSheet(value => {
      const nextRows = value.rows.map(line => line.slice());
      alvos.forEach(({ row, column }) => {
        const cell = nextRows[row]?.[column];
        if (cell) nextRows[row][column] = { ...cell, ...patch };
      });
      return { ...value, rows: nextRows };
    });
  };
  const handleCopy = (event: ClipboardEvent) => {
    const copiedRows = Array.from(
      { length: cellSelection.endRow - cellSelection.startRow + 1 },
      (_, rowOffset) => Array.from(
        { length: cellSelection.endColumn - cellSelection.startColumn + 1 },
        (_, columnOffset) => rows[cellSelection.startRow + rowOffset]?.[cellSelection.startColumn + columnOffset]?.value ?? '',
      ),
    );
    event.preventDefault();
    event.clipboardData.setData('text/plain', toTSV(copiedRows));
  };
  const pasteText = (pastedText: string, startRow: number, startColumn: number) => {
    if (!pastedText) return;
    const pastedRows = parseTSV(pastedText);
    if (!pastedRows.length) return;
    const pastedColumnCount = Math.max(...pastedRows.map(line => line.length));

    updateSheet(value => {
      const requiredColumnCount = Math.max(value.rows[0]?.length ?? 0, startColumn + pastedColumnCount);
      const nextRows = value.rows.map(line => {
        const nextLine = line.slice();
        while (nextLine.length < requiredColumnCount) nextLine.push(createCell());
        return nextLine;
      });
      while (nextRows.length < startRow + pastedRows.length) nextRows.push(createEmptyRow(requiredColumnCount));

      pastedRows.forEach((line, rowOffset) => {
        line.forEach((cellValue, columnOffset) => {
          const targetRow = startRow + rowOffset;
          const targetColumn = startColumn + columnOffset;
          nextRows[targetRow][targetColumn] = {
            ...nextRows[targetRow][targetColumn],
            value: escapeCellText(cellValue),
          };
        });
      });

      return {
        ...value,
        rows: nextRows,
        columnWidths: Array.from({ length: requiredColumnCount }, (_, index) => value.columnWidths[index] ?? 128),
        columnNames: Array.from({ length: requiredColumnCount }, (_, index) => value.columnNames[index] ?? getColumnName(index)),
      };
    });
    const end = { row: startRow + pastedRows.length - 1, column: startColumn + pastedColumnCount - 1 };
    setActiveCell({ row: startRow, column: startColumn });
    setCellRange({ row: startRow, column: startColumn }, end);
  };
  const handlePaste = (event: ClipboardEvent) => {
    event.preventDefault();
    pasteText(event.clipboardData.getData('text/plain'), cellSelection.startRow, cellSelection.startColumn);
  };
  useEffect(() => {
    const container = tableContainerRef.current;
    if (!container) return;
    container.addEventListener('copy', handleCopy);
    container.addEventListener('paste', handlePaste);
    return () => {
      container.removeEventListener('copy', handleCopy);
      container.removeEventListener('paste', handlePaste);
    };
  }, [handleCopy, handlePaste]);
  const clearSelectedCellContents = () => {
    const alvos = getSelectedCellTargets();
    alvos.forEach(({ row, column }) => refs.current[`${row}-${column}`]?.replaceChildren());
    updateSelectedCells({ value: '' });
  };
  const reorderRows = (from: number, to: number) => updateSheet(value => {
    const nextRows = [...value.rows];
    const [movedRow] = nextRows.splice(from, 1);
    nextRows.splice(to, 0, movedRow);
    return { ...value, rows: nextRows };
  });
  const focusCell = (row: number, column: number) => { setActiveCell({ row, column }); requestAnimationFrame(() => refs.current[`${row}-${column}`]?.focus()); };
  const selectAllCells = () => {
    const firstCell = { row: 0, column: 0 };
    const lastCell = { row: Math.max(0, rows.length - 1), column: Math.max(0, (rows[0]?.length ?? 1) - 1) };
    selectionAnchorRef.current = firstCell;
    selectingCellsRef.current = false;
    window.getSelection()?.removeAllRanges();
    setCellRange(firstCell, lastCell);
    focusCell(firstCell.row, firstCell.column);
  };
  const move = (row: number, column: number) => { if (row >= 0 && row < rows.length && column >= 0 && column < rows[0].length) focusCell(row, column); };
  const getCellHtmlProps = (row: number, column: number, value: string) => {
    const key = `${sheet?.id}:${row}:${column}`;
    const cached = htmlPropsCache.current[key];
    if (cached?.value === value || document.activeElement === refs.current[`${row}-${column}`]) {
      return cached?.props ?? { __html: value };
    }
    const props = { __html: value };
    htmlPropsCache.current[key] = { value, props };
    return props;
  };
  const selectCellByMouse = (row: number, column: number) => {
    if (!selectingCellsRef.current) return;
    const anchor = selectionAnchorRef.current;
    setCellRange(anchor, { row, column });
    if (anchor.row !== row || anchor.column !== column) window.getSelection()?.removeAllRanges();
  };
  const selectCellByKeyboard = (row: number, column: number, extend: boolean) => {
    window.getSelection()?.removeAllRanges();
    const target = { row, column };
    if (extend) {
      setCellRange(selectionAnchorRef.current, target);
    } else {
      selectionAnchorRef.current = target;
      setCellRange(target, target);
    }
    move(row, column);
  };
  const addRow = () => updateSheet(value => ({ ...value, rows: [...value.rows, createEmptyRow(value.rows[0].length)] }));
  const resizeColumn = (column: number, width: number) => updateSheet(value => ({ ...value, columnWidths: value.columnWidths.map((current, index) => index === column ? Math.max(70, Math.min(500, width)) : current) }));
  const resizeRowHeader = (width: number) => updateSheet(value => ({ ...value, rowHeaderWidth: Math.max(28, Math.min(160, width)) }));
  const addColumn = () => updateSheet(value => ({ ...value, rows: value.rows.map(line => [...line, createCell()]), columnWidths: [...value.columnWidths, 128], columnNames: [...value.columnNames, getColumnName(value.columnNames.length)] }));
  const deleteRow = () => updateSheet(value => value.rows.length <= 1 ? value : ({ ...value, rows: value.rows.filter((_, index) => index !== activeCell.row) }));
  const deleteColumn = () => updateSheet(value => value.rows[0].length <= 1 ? value : ({ ...value, rows: value.rows.map(line => line.filter((_, index) => index !== activeCell.column)), columnWidths: value.columnWidths.filter((_, index) => index !== activeCell.column), columnNames: value.columnNames.filter((_, index) => index !== activeCell.column) }));
  const applySelectedFontSize = (fontSize: number) => {
    if (!selectedCells.length) return;
    updateSheet(value => {
      const nextRows = value.rows.map(line => line.slice());
      selectedCells.forEach(({ row, column }) => {
        const cell = nextRows[row]?.[column];
        if (cell) nextRows[row][column] = { ...cell, fontSize };
      });
      return { ...value, rows: nextRows };
    });
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
  const activeCellData = rows[activeCell.row]?.[activeCell.column];
  const buttons = 'rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[9px] font-black uppercase text-slate-700 hover:border-red-300';
  return <section className="animate-in fade-in duration-300 space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black uppercase text-slate-900">Excel</h2><p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Planilhas salvas automaticamente</p></div><div className="flex flex-wrap items-center gap-1.5">
      <select value={sheet?.id ?? ''} onChange={e => setActiveId(e.target.value)} className={buttons} aria-label="Selecionar planilha">{sheets.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
      <button className={buttons} onClick={() => { const next = createSheet(`Planilha ${sheets.length + 1}`); shouldSaveWorkbookRef.current = true; setSheets(value => [...value, next]); setActiveId(next.id); }}><Plus data-icon="inline-start" /> Nova página</button>
      <button className={buttons} disabled={sheets.length < 2} onClick={() => { const next = sheets.filter(item => item.id !== sheet.id); shouldSaveWorkbookRef.current = true; setSheets(next); setActiveId(next[0].id); }}><X data-icon="inline-start" /> Remover</button>
      <button className={buttons} onClick={() => setEditingName(value => !value)}><Pencil data-icon="inline-start" /> Nomear</button>
      <span className="flex flex-col gap-0.5"><button className={buttons} onClick={addRow}>Nova linha</button><button className={`${buttons} border-red-100 text-red-700`} onClick={deleteRow}>Excluir linha</button></span><span className="flex flex-col gap-0.5"><button className={buttons} onClick={addColumn}>Nova coluna</button><button className={`${buttons} border-red-100 text-red-700`} onClick={deleteColumn}>Excluir coluna</button></span>
      <button className={buttons} onClick={() => setZoom(value => Math.max(60, value - 10))}><Minus data-icon="inline-start" /> Zoom -</button><button className={buttons} onClick={() => setZoom(value => Math.min(150, value + 10))}><Plus data-icon="inline-start" /> Zoom +</button>
      <select className={buttons} value={String(activeCellData?.fontSize ?? 12)} disabled={selectedCells.length === 0} onMouseDown={event => event.stopPropagation()} onChange={event => applySelectedFontSize(Number(event.target.value))} aria-label="Tamanho do texto">
        {[9, 10, 11, 12, 13, 14].map(size => <option key={size} value={size}>{size}</option>)}
      </select>
      <button className={buttons} onMouseDown={event => event.preventDefault()} onClick={() => updateSelectedCells({ bold: !Boolean(activeCellData?.bold) })} aria-pressed={Boolean(activeCellData?.bold)} title="Alternar negrito"><strong aria-hidden="true">B</strong> Negrito</button><button className={buttons} onMouseDown={event => event.preventDefault()} onClick={() => updateSelectedCells({ italic: !Boolean(activeCellData?.italic) })} aria-pressed={Boolean(activeCellData?.italic)} title="Alternar itálico"><em aria-hidden="true">I</em> Itálico</button>
      <button className={`${buttons} btn-align`} onMouseDown={event => event.preventDefault()} onClick={() => updateSelectedCells({ align: 'left' })} aria-pressed={!activeCellData?.align || activeCellData.align === 'left'}><AlignLeft data-icon="inline-start" /> Esquerda</button><button className={`${buttons} btn-align`} onMouseDown={event => event.preventDefault()} onClick={() => updateSelectedCells({ align: 'center' })} aria-pressed={activeCellData?.align === 'center'}><AlignCenter data-icon="inline-start" /> Centro</button><button className={`${buttons} btn-align`} onMouseDown={event => event.preventDefault()} onClick={() => updateSelectedCells({ align: 'right' })} aria-pressed={activeCellData?.align === 'right'}>Direita</button>
      <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1" aria-label="Cores do texto"><Palette size={12} className="text-slate-500" />{basicColors.map(color => <button key={`text-${color}`} onMouseDown={event => event.preventDefault()} onClick={() => applyTextColor(color)} title={`Cor do texto ${color}`} aria-label={`Cor do texto ${color}`} className="size-3 rounded-full border border-slate-300" style={{ backgroundColor: color }} />)}</div>
      <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1" aria-label="Cores do fundo"><span className="text-[9px] font-black text-slate-500">Fundo</span>{basicColors.map(color => <button key={`fill-${color}`} onMouseDown={event => event.preventDefault()} onClick={() => updateSelectedCells({ background: color })} title={`Cor do fundo ${color}`} aria-label={`Cor do fundo ${color}`} className="size-3 rounded-full border border-slate-300" style={{ backgroundColor: color }} />)}</div>
      <button className={buttons} onMouseDown={event => event.preventDefault()} onClick={() => updateSelectedCells({ border: activeCellData?.border === false })} aria-pressed={activeCellData?.border !== false} title="Alternar borda nas células selecionadas">Borda</button><button className={`${buttons} border-red-100 text-red-700`} onMouseDown={event => event.preventDefault()} onClick={clearSelectedCellContents} title="Limpar conteúdo das células selecionadas"><Trash2 data-icon="inline-start" /> Limpar</button>
      <button className={buttons} onClick={() => window.print()}><Printer data-icon="inline-start" /> PDF</button>
    </div></div>
    {editingName && <input autoFocus defaultValue={sheet?.name} onBlur={e => { updateSheet(value => ({ ...value, name: e.target.value.trim() || value.name })); setEditingName(false); }} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }} className="w-52 rounded-lg border border-red-200 px-2 py-1.5 text-[10px] font-bold outline-none" aria-label="Nome da página" />}
    <div ref={tableContainerRef} className="excel-wrapper excel-print-area rounded-xl border border-slate-200 bg-white shadow-sm">
      <div style={{ zoom: zoom / 100 }}>
        <table className="min-w-full border-collapse" style={{ fontFamily: 'Arial, sans-serif' }}>
          <thead>
            <tr className="bg-slate-100 text-slate-600">
              <th className="relative border p-2 text-[10px]" style={{ width: sheet.rowHeaderWidth, minWidth: sheet.rowHeaderWidth }}>
                <button type="button" onMouseDown={event => event.preventDefault()} onClick={selectAllCells} aria-label="Selecionar todas as células da planilha" aria-pressed={cellSelection.startRow === 0 && cellSelection.startColumn === 0 && cellSelection.endRow === rows.length - 1 && cellSelection.endColumn === (rows[0]?.length ?? 1) - 1} title="Selecionar todas as células da planilha" className="w-full cursor-pointer rounded font-bold hover:bg-slate-200">#</button>
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
                <button type="button" draggable onClick={() => { const first = { row, column: 0 }; const last = { row, column: Math.max(0, line.length - 1) }; selectionAnchorRef.current = first; selectingCellsRef.current = false; setActiveCell(first); setCellRange(first, last); }} onDragStart={event => { setDraggingRow(row); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', String(row)); }} onDragEnd={() => setDraggingRow(null)} className="w-full cursor-grab select-none active:cursor-grabbing" aria-label={`Selecionar linha ${row + 1}`} title="Clique para selecionar a linha ou arraste para movê-la">{row + 1}</button>
              </th>
              {line.map((cell, column) => <td key={column} className={`${cell.border === false ? 'border-0' : 'border'} p-0 ${cell.bold ? 'font-bold' : ''} ${cell.italic ? 'italic' : ''}`}>
                <div ref={node => { refs.current[`${row}-${column}`] = node; }} contentEditable suppressContentEditableWarning onCopy={event => {
                  if (cellSelection.startRow !== cellSelection.endRow || cellSelection.startColumn !== cellSelection.endColumn) return;
                  event.preventDefault();
                  event.stopPropagation();
                  event.clipboardData.setData('text/plain', rows[cellSelection.startRow]?.[cellSelection.startColumn]?.value ?? '');
                }} onPaste={event => {
                  const text = event.clipboardData.getData('text/plain');
                  if (!/[\t\n\r]/.test(text)) {
                    event.stopPropagation();
                    return;
                  }
                  event.preventDefault();
                  event.stopPropagation();
                  pasteText(text, row, column);
                }} onMouseDown={event => { if (event.button !== 0) return; const point = { row, column }; if (event.shiftKey) { event.preventDefault(); setCellRange(selectionAnchorRef.current, point); setActiveCell(point); window.getSelection()?.removeAllRanges(); focusCell(row, column); return; } if (event.ctrlKey || event.metaKey) { event.preventDefault(); selectingCellsRef.current = false; selectionAnchorRef.current = point; setCellSelection(createCellSelection(point, point)); setSelectedCells(current => current.some(cell => cell.row === row && cell.column === column) ? current.filter(cell => cell.row !== row || cell.column !== column) : [...current, { id: `${row}-${column}`, row, column }]); setActiveCell(point); window.getSelection()?.removeAllRanges(); focusCell(row, column); return; } selectionAnchorRef.current = point; selectingCellsRef.current = true; setCellRange(point, point); setActiveCell(point); }} onMouseEnter={() => selectCellByMouse(row, column)} onDragStart={event => event.preventDefault()} onFocus={() => { setActiveCell({ row, column }); if (!selectingCellsRef.current) { selectionAnchorRef.current = { row, column }; setCellRange({ row, column }, { row, column }); } }} onBlur={e => updateCell(row, column, { value: e.currentTarget.innerHTML })} onKeyDown={e => { const key = e.key; if ((e.ctrlKey || e.metaKey) && key.toLowerCase() === 'a') { e.preventDefault(); selectAllCells(); return; } if (key === 'Delete' || key === 'Backspace') { const textSelection = window.getSelection(); const hasSelectedText = Boolean(textSelection && !textSelection.isCollapsed && e.currentTarget.contains(textSelection.anchorNode) && e.currentTarget.contains(textSelection.focusNode)); if (!hasSelectedText) { e.preventDefault(); clearSelectedCellContents(); } return; } if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(key)) { e.preventDefault(); const offsets: Record<string, [number, number]> = { ArrowUp: [-1,0], ArrowDown: [1,0], ArrowLeft: [0,-1], ArrowRight: [0,1] }; const [dr, dc] = offsets[key]; const nextRow = row + dr; const nextColumn = column + dc; if (nextRow >= 0 && nextRow < rows.length && nextColumn >= 0 && nextColumn < rows[0].length) selectCellByKeyboard(nextRow, nextColumn, e.shiftKey); return; } if (key === 'Enter') { e.preventDefault(); updateCell(row, column, { value: e.currentTarget.innerHTML }); if (row + 1 < rows.length) selectCellByKeyboard(row + 1, column, false); } }} dangerouslySetInnerHTML={getCellHtmlProps(row, column, cell.value)} className={`min-w-0 px-3 py-2 outline-none focus:bg-red-50/60 ${isCellSelected(row, column) ? 'ring-1 ring-inset ring-blue-500' : ''}`} style={{ color: cell.color, backgroundColor: isCellSelected(row, column) ? '#dbeafe' : cell.background, fontSize: cell.fontSize ?? 12, width: sheet.columnWidths[column], textAlign: cell.align ?? 'left' }} />
              </td>)}
            </tr>)}
          </tbody>
        </table>
      </div>
    </div>
    <style>{`.excel-wrapper { overflow: auto; max-height: calc(100vh - 200px); position: relative; } .excel-wrapper thead, .excel-wrapper thead th { position: sticky; top: 0; z-index: 20; background: #ffffff; } .btn-align { height: 38px; min-width: 90px; width: 90px; display: flex; align-items: center; justify-content: center; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 11px; font-weight: 700; } .excel-print-area [contenteditable="true"] * { font-size: inherit !important; } @media print { @page { margin: 0; } body > * { visibility: hidden !important; } .excel-print-area, .excel-print-area * { visibility: visible !important; } .excel-print-area { position: absolute !important; inset: 0 !important; overflow: visible !important; max-height: none !important; border: 0 !important; box-shadow: none !important; } }`}</style>
  </section>;
}
