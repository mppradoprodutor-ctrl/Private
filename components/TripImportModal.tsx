
import React, { useState, useRef } from 'react';
import { X, FileSpreadsheet, AlertCircle, UploadCloud, Loader2 } from 'lucide-react';
import { Trip, Driver, Freight } from '../types';
import * as XLSX from 'xlsx';
import { parseCityState } from '../services/geocodingService';
import { resolveTripServiceTaker, isInvalidTakerName } from '../services/takerResolver';

interface TripImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (trips: Trip[]) => void;
  drivers: Driver[];
  freights: Freight[];
}

const TripImportModal: React.FC<TripImportModalProps> = ({ isOpen, onClose, onImport, drivers, freights }) => {
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
        const wb = XLSX.read(data, { type: 'array', cellDates: true });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as any[][];

        /**
         * MAPEAMENTO SOLICITADO (A-O):
         * A (0): Data Viagem
         * B (1): Origem Coleta
         * C (2): Destino Carga
         * D (3): (Ignorar)
         * E (4): Terminal Descarga
         * F (5): Número CTE
         * G (6): Número Nota Fiscal
         * H (7): Tarifa Empresa (TON)
         * I (8): Tarifa Motorista (TON)
         * J (9): Placa Caminhão
         * K (10): Peso (Opcional, mas útil para o cálculo)
         * L (11): (Ignorar)
         * M (12): Tipo Pagamento
         * N (13): Anotação
         * O (14): Cliente Tomador
         */
        
        const rows = jsonData.slice(jsonData[0].toString().includes('Data') ? 1 : 0);
        const importedTrips: Trip[] = rows
          .filter(row => row[9] || row[5] || row[0]) 
          .map(row => {
            let dateVal = row[0];
            let isoDate = "";
            
            if (dateVal instanceof Date) {
              isoDate = dateVal.toISOString().split('T')[0];
            } else if (dateVal) {
              const dateStr = String(dateVal).trim();
              if (dateStr.includes('/')) {
                const parts = dateStr.split('/');
                if (parts.length === 3) {
                  // Assume DD/MM/YYYY
                  if (parts[2].length === 4) {
                    isoDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                  } 
                  // Assume MM/DD/YYYY if the above fails or based on context, but DD/MM/YYYY is standard in Brazil
                }
              } else if (dateStr.includes('-')) {
                const parts = dateStr.split('-');
                if (parts.length === 3) {
                  if (parts[0].length === 4) isoDate = dateStr; // YYYY-MM-DD
                  else isoDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`; // DD-MM-YYYY
                }
              } else {
                isoDate = dateStr;
              }
            }
            
            // Fallback if still empty or invalid
            if (!isoDate || isoDate === "Invalid Date") {
              isoDate = new Date().toISOString().split('T')[0];
            }

            const plate = String(row[9] || '').toUpperCase().trim();
            const foundDriver = drivers.find(d => d.truckPlate.toUpperCase() === plate);
            
            const rawOrigin = String(row[1] || '').trim();
            const rawDest = String(row[2] || '').trim();
            const parsedOrigin = parseCityState(rawOrigin);
            const parsedDest = parseCityState(rawDest);

            const normalizeText = (text: string) => 
              (text || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();

            // Tentar buscar UF na base de fretes se estiver vazio
            let originState = parsedOrigin.state;
            if (!originState && parsedOrigin.city) {
              const cityNorm = normalizeText(parsedOrigin.city);
              const match = freights.find(f => normalizeText(f.origin) === cityNorm);
              if (match) originState = match.state || '';
            }

            let destState = parsedDest.state;
            if (!destState && parsedDest.city) {
              const cityNorm = normalizeText(parsedDest.city);
              const match = freights.find(f => normalizeText(f.destination) === cityNorm);
              if (match) destState = match.destinationState || '';
            }

            return {
              id: (() => {
              try { return crypto.randomUUID(); }
              catch (e) { return Math.random().toString(36).substring(2, 11) + Date.now().toString(36); }
            })(),
              date: isoDate,
              origin: parsedOrigin.city,
              originState: originState,
              destination: parsedDest.city,
              destinationState: destState,
              dischargeTerminal: String(row[4] || '').trim(),
              cteNumber: String(row[5] || '').trim(),
              invoiceNumber: String(row[6] || '').trim(),
              companyTariff: parseNumber(row[7]),
              driverTariff: parseNumber(row[8]),
              truckPlate: plate,
              driverName: foundDriver ? foundDriver.name : '',
              weight: parseNumber(row[10]) || 0,
              paymentType: String(row[12] || '').trim(),
              notes: String(row[13] || '').trim(),
              serviceTaker: (() => {
                const rawTaker = String(row[14] || '').trim();
                if (!isInvalidTakerName(rawTaker)) return rawTaker;
                const detected = resolveTripServiceTaker({
                  origin: parsedOrigin.city,
                  originState: originState,
                  destination: parsedDest.city,
                  destinationState: destState,
                  dischargeTerminal: String(row[4] || '').trim(),
                  notes: String(row[13] || '').trim(),
                  truckPlate: plate
                }, freights, []);
                return detected || rawTaker;
              })(),
              status: 'Carregado',
              createdAt: new Date().toISOString()
            };
          });

        if (importedTrips.length === 0) throw new Error("Layout incompatível ou dados ausentes na planilha.");

        setTimeout(() => {
          onImport(importedTrips);
          setIsProcessing(false);
          onClose();
        }, 800);

      } catch (err: any) {
        setError(err.message || "Erro ao processar as colunas.");
        setIsProcessing(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-300">
        <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-red-950">
          <div className="flex items-center gap-4">
            <div className="bg-red-600 p-3 rounded-2xl text-white shadow-xl shadow-red-900/40"><FileSpreadsheet size={28} /></div>
            <div>
              <h3 className="text-xl font-black text-white tracking-tight uppercase">Importar Viagens</h3>
              <p className="text-red-400 text-[10px] font-bold uppercase tracking-widest">Layout Customizado (Colunas A-O)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-red-200/50 hover:text-white transition-colors"><X size={24} /></button>
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
            className={`border-4 border-dashed rounded-[2.5rem] p-12 text-center transition-all cursor-pointer ${isProcessing ? 'bg-slate-50 cursor-wait' : 'hover:border-red-500 hover:bg-red-50/30 border-slate-200'}`}
          >
            {isProcessing ? (
              <div className="flex flex-col items-center">
                <Loader2 className="text-red-600 animate-spin mb-4" size={56} />
                <p className="text-sm font-black text-slate-700 uppercase tracking-widest">Lendo Colunas...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <UploadCloud size={60} className="text-red-600 mb-4" />
                <p className="text-sm font-black text-slate-900 mb-2 uppercase tracking-widest">Selecionar .xlsx</p>
                <div className="mt-4 p-4 bg-slate-100 rounded-xl w-full text-[9px] text-slate-500 font-bold text-left space-y-1 uppercase tracking-tight">
                  <p>A: Data | B: Origem | C: Destino</p>
                  <p>E: Terminal | F: CTE | G: Nota Fiscal</p>
                  <p>H: Tarifa Empresa | I: Tarifa Motorista</p>
                  <p>J: Placa | M: Pagamento | N: Anotação</p>
                  <p className="text-red-600 font-black">O: Cliente Tomador</p>
                </div>
              </div>
            )}
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls" className="hidden" />
          </div>
        </div>

        <div className="px-10 py-6 bg-slate-50 flex justify-end">
          <button onClick={onClose} disabled={isProcessing} className="px-8 py-3 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-900">Cancelar</button>
        </div>
      </div>
    </div>
  );
};

export default TripImportModal;
