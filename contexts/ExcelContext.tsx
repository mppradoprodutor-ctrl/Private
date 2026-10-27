import React, { createContext, useContext, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';

export type Cell = {
  value: string;
  color: string;
  background: string;
  fontSize?: number;
  align?: 'left' | 'center' | 'right';
  bold?: boolean;
  italic?: boolean;
  border?: boolean;
};

export type Sheet = {
  id: string;
  name: string;
  rows: Cell[][];
  columnWidths: number[];
  columnNames: string[];
  rowHeaderWidth: number;
};

export type ExcelWorkbook = {
  id: string;
  sheets: Sheet[];
  companyCnpj?: string;
};

export const EXCEL_STORAGE_KEY = 'my_system_excel_planilha1_v2';
export const LEGACY_EXCEL_STORAGE_KEY = 'gera-excel-workbook-v1';
export const EXCEL_COMPANY_CNPJ = '33.777.479/0001-26';
export const EXCEL_WORKBOOK_DOCUMENT_ID = 'workbook_33777479000126';

export const createCell = (): Cell => ({
  value: '',
  color: '#1e293b',
  background: '#fff',
  fontSize: 12,
  align: 'left',
  bold: false,
  italic: false,
  border: true,
});

export const getColumnName = (column: number) => {
  let number = column + 1;
  let name = '';
  while (number > 0) {
    const remainder = (number - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    number = Math.floor((number - 1) / 26);
  }
  return name;
};

export const createRows = () => Array.from({ length: 12 }, () => Array.from({ length: 8 }, createCell));
export const createSheet = (name: string): Sheet => ({
  id: crypto.randomUUID(),
  name,
  rows: createRows(),
  columnWidths: Array(8).fill(128),
  columnNames: Array.from({ length: 8 }, (_, index) => getColumnName(index)),
  rowHeaderWidth: 42,
});

export const createEmptyRow = (columnCount: number) => Array.from({ length: columnCount }, createCell);
export const escapeCellText = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function parseExcelWorkbook(value: unknown): ExcelWorkbook | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as { id?: unknown; sheets?: unknown; companyCnpj?: unknown };
  const rawSheets = Array.isArray(value) ? value : record.sheets;
  if (!Array.isArray(rawSheets) || rawSheets.length === 0) return null;
  const sheets = rawSheets
    .filter((item): item is Partial<Sheet> => Boolean(
      item && typeof item === 'object' &&
      typeof (item as Partial<Sheet>).id === 'string' &&
      typeof (item as Partial<Sheet>).name === 'string' &&
      Array.isArray((item as Partial<Sheet>).rows) &&
      (item as Partial<Sheet>).rows!.every(Array.isArray)
    ))
    .map(item => {
      const columnCount = item.rows?.[0]?.length ?? 8;
      return {
        ...item,
        columnWidths: item.columnWidths?.length ? item.columnWidths : Array(columnCount).fill(128),
        columnNames: item.columnNames?.length ? item.columnNames : Array.from({ length: columnCount }, (_, index) => getColumnName(index)),
        rowHeaderWidth: item.rowHeaderWidth ?? 42,
      } as Sheet;
    });
  return sheets.length
    ? {
        id: typeof record.id === 'string' ? record.id : 'workbook',
        sheets,
        ...(typeof record.companyCnpj === 'string' ? { companyCnpj: record.companyCnpj } : {}),
      }
    : null;
}

export function hasExcelWorkbookData(workbook: ExcelWorkbook | null): workbook is ExcelWorkbook {
  if (!workbook?.sheets.length) return false;
  if (workbook.sheets.length !== 1) return true;
  const sheet = workbook.sheets[0];
  if (sheet.name !== 'Planilha 1' || sheet.rows.length !== 12 || sheet.rows.some(row => row.length !== 8)) return true;
  if (sheet.rowHeaderWidth !== 42 ||
      sheet.columnWidths.some(width => width !== 128) ||
      sheet.columnWidths.length !== 8 ||
      sheet.columnNames.some((name, index) => name !== String.fromCharCode(65 + index)) ||
      sheet.columnNames.length !== 8) return true;
  return sheet.rows.some(row => row.some(cell =>
    !cell ||
    cell.value !== '' ||
    cell.color !== '#1e293b' ||
    cell.background !== '#fff' ||
    (cell.fontSize !== undefined && cell.fontSize !== 12) ||
    (cell.align !== undefined && cell.align !== 'left') ||
    (cell.bold !== undefined && cell.bold) ||
    (cell.italic !== undefined && cell.italic) ||
    (cell.border !== undefined && !cell.border)
  ));
}

export function readStoredExcelWorkbook(): ExcelWorkbook | null {
  try {
    const saved = window.localStorage.getItem(EXCEL_STORAGE_KEY)
      ?? window.localStorage.getItem(LEGACY_EXCEL_STORAGE_KEY);
    return saved ? parseExcelWorkbook(JSON.parse(saved)) : null;
  } catch (error) {
    console.error('Error loading Excel workbook from localStorage:', error);
    return null;
  }
}

type ExcelContextValue = {
  workbook: ExcelWorkbook;
  setWorkbook: Dispatch<SetStateAction<ExcelWorkbook>>;
};

const ExcelContext = createContext<ExcelContextValue | null>(null);

export function ExcelProvider({ children }: { children: React.ReactNode }) {
  const [workbook, setWorkbook] = useState<ExcelWorkbook>(
    () => readStoredExcelWorkbook() ?? { id: 'workbook', sheets: [createSheet('Planilha 1')] },
  );
  const latestWorkbookRef = useRef(workbook);
  latestWorkbookRef.current = workbook;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(EXCEL_STORAGE_KEY, JSON.stringify(workbook.sheets));
      } catch (error) {
        console.error('Error saving Excel workbook to localStorage:', error);
      }
    }, 800);
    return () => window.clearTimeout(timer);
  }, [workbook]);

  useEffect(() => {
    const persistLatestWorkbook = () => {
      try {
        window.localStorage.setItem(EXCEL_STORAGE_KEY, JSON.stringify(latestWorkbookRef.current.sheets));
      } catch (error) {
        console.error('Error saving Excel workbook to localStorage:', error);
      }
    };
    window.addEventListener('pagehide', persistLatestWorkbook);
    return () => window.removeEventListener('pagehide', persistLatestWorkbook);
  }, []);

  return <ExcelContext.Provider value={{ workbook, setWorkbook }}>{children}</ExcelContext.Provider>;
}

export function useExcelWorkbook() {
  const context = useContext(ExcelContext);
  if (!context) throw new Error('useExcelWorkbook must be used within an ExcelProvider');
  return context;
}
