import React, { useState } from 'react';
import { X, Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Shipment } from '../types';

interface ShipmentImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: Shipment[]) => void;
}

const ShipmentImportModal: React.FC<ShipmentImportModalProps> = ({ isOpen, onClose, onImport }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const processFile = async (file: File) => {
    setIsLoading(true);
    setError(null);

    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array', cellDates: true });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          // Convert to JSON with raw values
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 'A' }) as any[];
          
          // Helper to format dates to YYYY-MM-DD
          const formatDate = (val: any) => {
            if (!val) return '';
            
            // If it's a Date object (from cellDates: true)
            if (val instanceof Date) {
              // Adjust for timezone if necessary, but usually split('T')[0] is fine for dates
              return val.toISOString().split('T')[0];
            }

            // If it's a number (Excel serial date) - fallback if cellDates failed
            if (typeof val === 'number') {
              // Excel dates are days since 1899-12-30
              const date = new Date(Math.round((val - 25569) * 86400 * 1000));
              return date.toISOString().split('T')[0];
            }

            // If it's a string, try to parse common formats
            const str = String(val).trim();
            
            // Handle DD/MM/YYYY
            const dmy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
            if (dmy) {
              return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
            }

            // Handle YYYY-MM-DD
            const ymd = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
            if (ymd) {
              return `${ymd[1]}-${ymd[2].padStart(2, '0')}-${ymd[3].padStart(2, '0')}`;
            }

            return str;
          };

          // Skip header row (assuming row 1 is header)
          const rows = jsonData.slice(1);
          
          const mappedShipments: Shipment[] = rows.map((row: any, index: number) => {
            let origin = String(row.H || '').trim();
            let destination = String(row.I || '').trim();

            // Normalization: Santa Cruz das Palmeiras is always in SP
            if (origin.toUpperCase().includes('SANTA CRUZ DAS PALMEIRAS') && !origin.toUpperCase().includes('SP')) {
              origin = `${origin.replace(/,\s*[A-Z]{2}$/i, '').trim()}, SP`;
            }
            if (destination.toUpperCase().includes('SANTA CRUZ DAS PALMEIRAS') && !destination.toUpperCase().includes('SP')) {
              destination = `${destination.replace(/,\s*[A-Z]{2}$/i, '').trim()}, SP`;
            }

            return {
              id: (() => {
              try { return crypto.randomUUID(); }
              catch (e) { return Math.random().toString(36).substring(2, 11) + Date.now().toString(36); }
            })(),
              shipmentDate: formatDate(row.A),
              branch: String(row.B || ''),
              driver: String(row.C || ''),
              phone: String(row.D || ''),
              plate: String(row.E || ''),
              weight: Number(row.F) || 0,
              dispatch: String(row.G || ''),
              origin,
              destination,
              status: String(row.J || ''),
              forecast: String(row.K || ''),
              operation: String(row.L || ''),
              product: String(row.M || ''),
              type: String(row.N || ''),
              client: String(row.O || ''),
              ppte: String(row.P || ''),
              pptm: String(row.Q || ''),
              obs: String(row.R || ''),
              originalStatus: String(row.J || ''),
              createdAt: new Date(Date.now() - index).toISOString()
            };
          }).filter(s => s.plate || s.driver || s.shipmentDate || s.origin || s.destination || s.client);

          if (mappedShipments.length === 0) {
            throw new Error("Nenhum dado válido encontrado na planilha.");
          }

          onImport(mappedShipments);
          onClose();
        } catch (err: any) {
          setError(err.message || "Erro ao processar o arquivo. Verifique o formato.");
        } finally {
          setIsLoading(false);
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      setError("Erro ao ler o arquivo.");
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv'))) {
      processFile(file);
    } else {
      setError("Por favor, selecione um arquivo Excel (.xlsx, .xls) ou CSV.");
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="bg-red-600 p-3 rounded-2xl text-white shadow-lg shadow-red-600/20">
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">Importar Embarques</h2>
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Excel / CSV (Colunas A até R)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-8">
          <div 
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`
              relative border-4 border-dashed rounded-[2rem] p-12 text-center transition-all
              ${isDragging ? 'border-red-500 bg-red-50' : 'border-slate-100 bg-slate-50/50 hover:border-slate-200'}
              ${isLoading ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
            `}
          >
            <input 
              type="file" 
              accept=".xlsx,.xls,.csv"
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
            />
            
            {isLoading ? (
              <div className="flex flex-col items-center gap-4">
                <Loader2 size={48} className="text-red-600 animate-spin" />
                <p className="text-sm font-black text-slate-600 uppercase tracking-widest">Processando dados...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 text-slate-600">
                  <Upload size={48} />
                </div>
                <div>
                  <p className="text-lg font-black text-slate-900 tracking-tight">Arraste sua planilha aqui</p>
                  <p className="text-sm text-slate-600 font-black">ou clique para selecionar o arquivo</p>
                </div>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <span className="px-3 py-1 bg-white border border-slate-200 rounded-full text-[9px] font-black text-slate-500 uppercase">.XLSX</span>
                  <span className="px-3 py-1 bg-white border border-slate-200 rounded-full text-[9px] font-black text-slate-500 uppercase">.XLS</span>
                  <span className="px-3 py-1 bg-white border border-slate-200 rounded-full text-[9px] font-black text-slate-500 uppercase">.CSV</span>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-700 animate-in fade-in slide-in-from-top-2">
              <AlertCircle size={20} />
              <p className="text-xs font-bold">{error}</p>
            </div>
          )}

          <div className="mt-8 grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">Estrutura Esperada</h4>
              <ul className="text-[10px] font-bold text-slate-600 space-y-1">
                <li>A: Data | B: Filial | C: Motorista</li>
                <li>D: Telefone | E: Placa | F: Peso</li>
                <li>G: Envio | H: Origem | I: Destino</li>
                <li>J: Status | K: Previsão | L: Operação</li>
                <li>M: Produto | N: Tipo | O: Cliente</li>
                <li>P: PPTE | Q: PPTM | R: Obs</li>
              </ul>
            </div>
            <div className="flex flex-col justify-center">
              <p className="text-[10px] text-slate-600 font-black leading-relaxed">
                Certifique-se de que a planilha segue a ordem das colunas mencionada. O sistema ignora a primeira linha (cabeçalho).
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShipmentImportModal;
