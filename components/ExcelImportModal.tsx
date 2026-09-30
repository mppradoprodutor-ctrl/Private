
import React, { useState, useRef } from 'react';
import { X, FileSpreadsheet, AlertCircle, UploadCloud, CheckCircle2, Loader2, Download } from 'lucide-react';
import { Driver } from '../types';
import * as XLSX from 'xlsx';
import { sanitizeDriverText } from './DriverFormModal';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (drivers: Driver[]) => void;
}

const parseNumber = (val: any): number => {
  if (typeof val === 'number') return val;
  if (val === undefined || val === null || val === '') return 0;
  
  let cleaned = String(val).trim();
  if (cleaned.includes(',') && cleaned.includes('.')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.includes(',')) {
    cleaned = cleaned.replace(',', '.');
  }
  
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

const getFieldValue = (row: any, keys: string[], colIndex: number): string => {
  if (typeof row === 'object' && row !== null && !Array.isArray(row)) {
    for (const k of keys) {
      for (const rowKey of Object.keys(row)) {
        if (rowKey.toLowerCase().trim() === k.toLowerCase().trim()) {
          const val = row[rowKey];
          return val !== undefined && val !== null ? String(val).trim() : '';
        }
      }
    }
  }
  if (Array.isArray(row) && colIndex >= 0 && row[colIndex] !== undefined && row[colIndex] !== null) {
    return String(row[colIndex]).trim();
  }
  return '';
};

const ExcelImportModal: React.FC<ExcelImportModalProps> = ({ isOpen, onClose, onImport }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const wb = XLSX.read(data, { type: 'array' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        
        // Parse as json objects first to leverage header names if present
        let rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
        
        // If sheet_to_json returns array of arrays or empty headers, fallback to raw 2D array
        if (rows.length === 0 || Array.isArray(rows[0])) {
          const rawData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as any[][];
          rows = rawData.slice(1); // skip header row
        }

        const importedDrivers: Driver[] = rows
          .map(row => {
            const name = getFieldValue(row, ['nome completo', 'nome', 'drivername', 'motorista'], 4);
            const truckPlate = getFieldValue(row, ['placa cavalo', 'placa', 'cavalo', 'truckplate'], 0).toUpperCase();
            
            // Basic validation: must have at least name or truck plate
            if (!name && !truckPlate) return null;

            const trailer1 = getFieldValue(row, ['carreta 1', 'carreta1', 'trailer1'], 1).toUpperCase();
            const trailer2 = getFieldValue(row, ['carreta 2', 'carreta2', 'trailer2'], 2).toUpperCase();
            const dolly = getFieldValue(row, ['dolly'], 3).toUpperCase();
            const phone = getFieldValue(row, ['telefone', 'phone', 'tel', 'celular'], 5);
            const cnh = getFieldValue(row, ['cnh'], 6);
            const rg = getFieldValue(row, ['rg'], 7);
            const cpf = getFieldValue(row, ['cpf'], 8);
            const trailerType = getFieldValue(row, ['tipo reboque', 'tipo carreta', 'tipo', 'trailertype'], 9);
            const netWeightStr = getFieldValue(row, ['peso líquido', 'peso liquido', 'peso liq', 'netweight'], 10);
            const grossWeightStr = getFieldValue(row, ['peso bruto', 'pbt', 'grossweight'], 11);
            const axisCountStr = getFieldValue(row, ['qtd eixos', 'eixos', 'nº eixos', 'eixo', 'axiscount'], 12);
            const trailerModel = getFieldValue(row, ['modelo reboque', 'modelo implemento', 'modelo', 'trailermodel'], 13);
            const antt = getFieldValue(row, ['antt'], 14);
            const renavam = getFieldValue(row, ['renavam'], 15);
            const notes = getFieldValue(row, ['observações', 'observacoes', 'anotacao', 'anotações', 'notes'], 16);
            const state = getFieldValue(row, ['uf', 'estado', 'state'], 17).toUpperCase();

            const newId = (() => {
              try { return crypto.randomUUID(); }
              catch (e) { return Math.random().toString(36).substring(2, 11) + Date.now().toString(36); }
            })();

            return {
              id: newId,
              truckPlate: sanitizeDriverText(truckPlate, false),
              trailer1: sanitizeDriverText(trailer1, false),
              trailer2: sanitizeDriverText(trailer2, false),
              dolly: sanitizeDriverText(dolly, false),
              name: sanitizeDriverText(name, true).replace(/\s+/g, ' ').trim(),
              phone: sanitizeDriverText(phone, false),
              cnh: sanitizeDriverText(cnh, false),
              rg: sanitizeDriverText(rg, false),
              cpf: sanitizeDriverText(cpf, false),
              trailerType: sanitizeDriverText(trailerType, true).trim(),
              netWeight: parseNumber(netWeightStr),
              grossWeight: parseNumber(grossWeightStr),
              axisCount: parseNumber(axisCountStr),
              trailerModel: sanitizeDriverText(trailerModel, true).replace(/\s+/g, ' ').trim(),
              antt: sanitizeDriverText(antt, true).trim(),
              renavam: sanitizeDriverText(renavam, false),
              notes: sanitizeDriverText(notes, true).replace(/\s+/g, ' ').trim(),
              state: sanitizeDriverText(state, false).slice(0, 2),
              createdAt: new Date().toISOString()
            } as Driver;
          })
          .filter((d): d is Driver => d !== null);

        if (importedDrivers.length === 0) {
          throw new Error("Nenhum motorista válido encontrado na planilha. Verifique se há nomes ou placas preenchidos.");
        }

        setTimeout(() => {
          onImport(importedDrivers);
          setIsProcessing(false);
          onClose();
        }, 500);

      } catch (err: any) {
        setError(err.message || "Erro ao processar arquivo Excel.");
        setIsProcessing(false);
      }
    };

    reader.onerror = () => {
      setError("Erro na leitura do arquivo.");
      setIsProcessing(false);
    };

    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-100 p-2.5 rounded-2xl text-emerald-600">
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 leading-none">Importar Motoristas (Excel)</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Carregar arquivo .xlsx ou .xls</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex gap-3 text-red-700 text-sm font-semibold animate-in slide-in-from-top-2">
              <AlertCircle size={20} className="flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div 
            onClick={() => !isProcessing && fileInputRef.current?.click()}
            className={`
              border-4 border-dashed rounded-[2rem] p-10 text-center transition-all cursor-pointer group
              ${isProcessing ? 'bg-slate-50 border-slate-200 cursor-wait' : 'bg-slate-50 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/30'}
            `}
          >
            {isProcessing ? (
              <div className="flex flex-col items-center">
                <Loader2 className="text-emerald-500 animate-spin mb-4" size={44} />
                <p className="text-sm font-black text-slate-700 uppercase tracking-widest">Processando Planilha...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-[1.5rem] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg shadow-emerald-500/10">
                  <UploadCloud size={32} />
                </div>
                <p className="text-sm font-black text-slate-900 mb-1 uppercase tracking-widest text-center">Selecionar arquivo (.xlsx)</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Todos os campos de motoristas suportados</p>
              </div>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept=".xlsx, .xls, .csv" 
              className="hidden" 
            />
          </div>
        </div>

        <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button 
            onClick={onClose} 
            disabled={isProcessing}
            className="px-6 py-2.5 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExcelImportModal;

