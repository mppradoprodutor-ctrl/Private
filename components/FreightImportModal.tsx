
import React, { useState, useRef } from 'react';
import { X, FileSpreadsheet, AlertCircle, UploadCloud, Loader2 } from 'lucide-react';
import { Freight } from '../types';
import * as XLSX from 'xlsx';

interface FreightImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (freights: Freight[]) => void;
}

const FreightImportModal: React.FC<FreightImportModalProps> = ({ isOpen, onClose, onImport }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const parseNumber = (val: any): number => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    let cleaned = String(val).replace(/[R$\s.]/g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

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
        const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as any[][];

        // Mapeamento:
        // A (0): Origem
        // B (1): Estado
        // C (2): Destino
        // D (3): Produto
        // E (4): Terminal
        // F (5): Tarifa Empresa
        // G (6): Tarifa Motorista
        // H (7): Tomador
        // I (8): Endereço Coleta
        // J (9): Endereço Destino
        // K (10): Restrições
        // L (11): Anotações
        
        const rows = jsonData.slice(1);
        const importedFreights: Freight[] = rows
          .filter(row => row[0] && row[2]) 
          .map(row => {
            let origin = String(row[0] || '').trim();
            let state = String(row[1] || '').toUpperCase().trim();
            let destination = String(row[2] || '').trim();

            // Normalization: Santa Cruz das Palmeiras is always in SP
            if (origin.toUpperCase().includes('SANTA CRUZ DAS PALMEIRAS')) {
              state = 'SP';
            }

            return {
              id: (() => {
              try { return crypto.randomUUID(); }
              catch (e) { return Math.random().toString(36).substring(2, 11) + Date.now().toString(36); }
            })(),
              origin,
              state,
              destination,
              destinationState: '', 
              dischargeTerminal: String(row[4] || '').trim(),
              companyTariff: parseNumber(row[5]),
              driverTariff: parseNumber(row[6]),
              serviceTaker: String(row[7] || '').trim(),
              product: String(row[3] || '').trim(), 
              collectionAddress: String(row[8] || '').trim(),
              destinationAddress: String(row[9] || '').trim(),
              restrictions: String(row[10] || '').trim(),
              notes: String(row[11] || '').trim(),
              location: String(row[12] || '').trim(),
              deductIcms: false,
              icmsRate: 0,
              active: true,
              axles: [],
              createdAt: new Date().toISOString()
            };
          });

        if (importedFreights.length === 0) throw new Error("Nenhuma rota válida encontrada na planilha.");

        setTimeout(() => {
          onImport(importedFreights);
          setIsProcessing(false);
          onClose();
        }, 800);

      } catch (err: any) {
        setError(err.message || "Erro ao processar planilha de fretes.");
        setIsProcessing(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-300">
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-100 p-2.5 rounded-2xl text-emerald-600">
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 leading-none">Importar Base de Fretes</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Mapeamento Colunas A até L</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-10">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex gap-3 text-red-700 text-sm font-bold">
              <AlertCircle size={20} className="flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div 
            onClick={() => !isProcessing && fileInputRef.current?.click()}
            className={`border-4 border-dashed rounded-[2rem] p-12 text-center transition-all cursor-pointer ${isProcessing ? 'bg-slate-50 cursor-wait' : 'hover:border-emerald-400 hover:bg-emerald-50/30 border-slate-200'}`}
          >
            {isProcessing ? (
              <div className="flex flex-col items-center">
                <Loader2 className="text-emerald-500 animate-spin mb-4" size={48} />
                <p className="text-sm font-black text-slate-700 uppercase tracking-widest">Processando Planilha...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <UploadCloud size={40} className="text-emerald-500 mb-4" />
                <p className="text-sm font-black text-slate-900 mb-1 uppercase tracking-widest">Selecionar Planilha</p>
                <p className="text-xs text-slate-400 font-medium">Arquivos .xlsx ou .xls</p>
              </div>
            )}
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls" className="hidden" />
          </div>
        </div>

        <div className="px-8 py-6 bg-slate-50 flex justify-end">
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

export default FreightImportModal;
