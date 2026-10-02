
import React, { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import { Trash2, Edit2, ArrowRight, Scale, TrendingUp, Download, ClipboardCheck, ClipboardList, X, Save, FileText, CheckSquare, Square, CheckCheck, Printer, Loader2 } from 'lucide-react';
import { toBlob, toPng } from 'html-to-image';
import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Trip, Driver, Freight } from '../types';
import LoadingOrderTemplate from './LoadingOrderTemplate';
import TripListPdfTemplate from './TripListPdfTemplate';

interface TripListProps {
  trips: Trip[];
  drivers: Driver[];
  freights?: Freight[];
  filterSummary?: string;
  tripStats?: {
    count: number;
    totalProfit: number;
    avgMargin: number;
  };
  systemCompanyName?: string;
  systemCnpj?: string;
  onRegisterPrintPdf?: (triggerFn: () => Promise<void>) => void;
  onRemove: (id: string) => void;
  onEdit: (trip: Trip) => void;
  onToggleDocStatus?: (id: string) => void;
  onToggleMdfeStatus: (id: string) => void;
  onToggleSdFlag?: (id: string) => void;
  onUpdateNote?: (tripId: string, field: 'adNote' | 'sdNote', value: string, sdFlag?: boolean) => void;
  onBatchLiquidateSd?: (tripIds: string[], note?: string) => void;
  onBatchRevertSd?: (tripIds: string[]) => void;
  isLoading?: boolean;
}

const TripList: React.FC<TripListProps> = ({ 
  trips, 
  drivers, 
  freights = [], 
  filterSummary,
  tripStats,
  systemCompanyName,
  systemCnpj,
  onRegisterPrintPdf,
  onRemove, 
  onEdit, 
  onToggleMdfeStatus, 
  onToggleSdFlag, 
  onUpdateNote,
  onBatchLiquidateSd,
  onBatchRevertSd,
  isLoading = false
}) => {
  const [downloadingTripId, setDownloadingTripId] = useState<string | null>(null);
  const templateRef = useRef<HTMLDivElement>(null);
  const listPdfTemplateRef = useRef<HTMLDivElement>(null);
  const [isPrintingListPdf, setIsPrintingListPdf] = useState(false);

  const [selectedSdIds, setSelectedSdIds] = useState<string[]>([]);
  const [batchNote, setBatchNote] = useState<string>('');

  const [activeNoteModal, setActiveNoteModal] = useState<{
    trip: Trip;
    field: 'adNote' | 'sdNote';
    label: string;
  } | null>(null);
  const [noteText, setNoteText] = useState<string>('');
  const [modalSdFlag, setModalSdFlag] = useState<boolean>(false);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const isTripSdLiquidated = (t: Trip) => {
    return !!t.sdFlag || t.status === 'Finalizado' || (!!t.sdNote && t.sdNote.trim() !== '');
  };

  const pendingSdTrips = useMemo(() => {
    return trips.filter(t => !isTripSdLiquidated(t));
  }, [trips]);

  const isAllPendingSelected = pendingSdTrips.length > 0 && pendingSdTrips.every(t => selectedSdIds.includes(t.id));

  const handleToggleSelectAllPending = () => {
    if (isAllPendingSelected) {
      setSelectedSdIds([]);
    } else {
      const targetIds = pendingSdTrips.length > 0 ? pendingSdTrips.map(t => t.id) : trips.map(t => t.id);
      setSelectedSdIds(targetIds);
    }
  };

  const toggleSelectSd = (tripId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setSelectedSdIds(prev => 
      prev.includes(tripId) ? prev.filter(id => id !== tripId) : [...prev, tripId]
    );
  };

  const handleBatchLiquidate = () => {
    if (selectedSdIds.length === 0) return;
    if (onBatchLiquidateSd) {
      onBatchLiquidateSd(selectedSdIds, batchNote);
    } else if (onUpdateNote) {
      selectedSdIds.forEach(id => {
        onUpdateNote(id, 'sdNote', batchNote.trim() || 'Saldo Liquidado', true);
      });
    }
    setSelectedSdIds([]);
    setBatchNote('');
  };

  const handleBatchRevert = () => {
    if (selectedSdIds.length === 0) return;
    if (onBatchRevertSd) {
      onBatchRevertSd(selectedSdIds);
    }
    setSelectedSdIds([]);
    setBatchNote('');
  };

  const hasAnyLiquidatedSelected = useMemo(() => {
    return selectedSdIds.some(id => {
      const t = trips.find(tr => tr.id === id);
      return t && isTripSdLiquidated(t);
    });
  }, [selectedSdIds, trips]);

  const handleOpenNoteModal = (trip: Trip, field: 'adNote' | 'sdNote') => {
    setActiveNoteModal({
      trip,
      field,
      label: field === 'adNote' ? 'AD' : 'SD'
    });
    const currentVal = field === 'adNote' ? trip.adNote : trip.sdNote;
    setNoteText(currentVal || '');
    setModalSdFlag(!!trip.sdFlag || trip.status === 'Finalizado' || (!!trip.sdNote && trip.sdNote.trim() !== ''));
  };

  const handleSaveNote = () => {
    if (activeNoteModal && onUpdateNote) {
      const isSdFilled = (noteText && noteText.trim() !== '') || modalSdFlag;
      onUpdateNote(
        activeNoteModal.trip.id, 
        activeNoteModal.field, 
        noteText, 
        activeNoteModal.field === 'sdNote' ? isSdFilled : undefined
      );
    }
    setActiveNoteModal(null);
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    try {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.target = '_self';
      link.rel = 'noopener';
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        try {
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        } catch (e) {}
      }, 1000);
    } catch (err) {
      console.warn('Fallback para saveAs:', err);
      saveAs(blob, filename);
    }
  };

  const handleDownloadPdf = async (trip: Trip) => {
    setDownloadingTripId(trip.id);
    
    // Wait for the template to render
    setTimeout(async () => {
      if (templateRef.current) {
        try {
          let imgDataUrl: string = '';
          try {
            imgDataUrl = await toPng(templateRef.current, {
              pixelRatio: 2,
              cacheBust: true,
              backgroundColor: '#ffffff'
            });
          } catch (err) {
            console.warn('Tentativa com toPng falhou no TripList, usando html2canvas:', err);
            const canvas = await html2canvas(templateRef.current, {
              scale: 2,
              useCORS: true,
              backgroundColor: '#ffffff'
            });
            imgDataUrl = canvas.toDataURL('image/png');
          }

          if (imgDataUrl) {
            const pdf = new jsPDF({
              orientation: 'portrait',
              unit: 'mm',
              format: 'a4',
              compress: true
            });

            const pageWidth = 210;
            const pageHeight = 297;
            const imgProps = pdf.getImageProperties(imgDataUrl);
            const imgRatio = imgProps.width / imgProps.height;

            let renderWidth = pageWidth;
            let renderHeight = pageWidth / imgRatio;

            if (renderHeight > pageHeight) {
              renderHeight = pageHeight;
              renderWidth = pageHeight * imgRatio;
            }

            const posX = (pageWidth - renderWidth) / 2;
            const posY = (pageHeight - renderHeight) / 2;

            pdf.addImage(imgDataUrl, 'PNG', posX, posY, renderWidth, renderHeight, undefined, 'FAST');

            const plate = trip.truckPlate ? `_${trip.truckPlate.replace(/[^a-zA-Z0-9]/g, '')}` : '';
            const orderNum = trip.orderNumber ? `_N${trip.orderNumber}` : '';
            const rawDriverName = (trip.driverName || '').trim();
            const sanitizedDriverName = rawDriverName.replace(/[\/\\?%*:|"<>]/g, '').trim();
            const fileName = sanitizedDriverName ? `${sanitizedDriverName}.pdf` : `Ordem_Carregamento${orderNum}${plate}.pdf`;
            const pdfBlob = pdf.output('blob');
            downloadBlob(pdfBlob, fileName);
          }
        } catch (error) {
          console.error("Erro ao gerar PDF:", error);
        } finally {
          setDownloadingTripId(null);
        }
      }
    }, 150);
  };

  const handlePrintListPdf = useCallback(async () => {
    if (trips.length === 0) return;
    setIsPrintingListPdf(true);

    try {
      // Aguarda 150ms para garantir que o DOM do template esteja completamente montado
      await new Promise(resolve => setTimeout(resolve, 150));

      if (!listPdfTemplateRef.current) {
        throw new Error('Elemento de template para PDF não encontrado');
      }

      const pageNodes = listPdfTemplateRef.current.querySelectorAll<HTMLElement>('.pdf-page');
      if (pageNodes.length === 0) {
        throw new Error('Nenhuma página de PDF encontrada no template');
      }

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const pageWidth = 297;
      const pageHeight = 210;

      for (let i = 0; i < pageNodes.length; i++) {
        const pageEl = pageNodes[i];
        let imgDataUrl = '';

        try {
          imgDataUrl = await toPng(pageEl, {
            pixelRatio: 2,
            cacheBust: true,
            backgroundColor: '#ffffff'
          });
        } catch (pngErr) {
          console.warn('Tentativa com toPng falhou para página da lista, usando html2canvas:', pngErr);
          const canvas = await html2canvas(pageEl, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false
          });
          imgDataUrl = canvas.toDataURL('image/png');
        }

        if (imgDataUrl) {
          if (i > 0) {
            pdf.addPage('a4', 'landscape');
          }
          pdf.addImage(imgDataUrl, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
        }
      }

      const dateStr = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
      const fileName = `Relatorio_Viagens_${dateStr}.pdf`;
      const pdfBlob = pdf.output('blob');
      downloadBlob(pdfBlob, fileName);
    } catch (err) {
      console.error('Erro ao gerar PDF da lista de viagens:', err);
    } finally {
      setIsPrintingListPdf(false);
    }
  }, [trips, drivers, freights, filterSummary, tripStats, systemCompanyName, systemCnpj]);

  useEffect(() => {
    if (onRegisterPrintPdf) {
      onRegisterPrintPdf(handlePrintListPdf);
    }
  }, [onRegisterPrintPdf, handlePrintListPdf]);

  const calculateFinancials = (t: Trip) => {
    // Se o peso for 0, usamos 1 tonelada (1000kg) como base para mostrar a rentabilidade da tarifa
    const effectiveWeight = t.weight > 0 ? t.weight : 1000;
    
    const totalCompanyRevenue = t.companyTariff * (effectiveWeight / 1000);
    const icmsDeduction = t.deductIcms ? (totalCompanyRevenue * ((t.icmsRate || 0) / 100)) : 0;
    const netRevenue = totalCompanyRevenue - icmsDeduction;
    const totalDriverCost = t.driverTariff * (effectiveWeight / 1000);
    const profit = netRevenue - totalDriverCost;
    const margin = totalCompanyRevenue > 0 ? (profit / totalCompanyRevenue) * 100 : 0;
    
    return { profit, margin, icmsDeduction };
  };

  if (isLoading && trips.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/40 overflow-hidden animate-in fade-in duration-300" aria-label="Carregando viagens">
        <div className="divide-y divide-slate-100">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="grid grid-cols-6 gap-4 px-3 py-4 animate-pulse">
              {Array.from({ length: 6 }).map((__, cell) => (
                <div key={cell} className="h-3 rounded bg-slate-100" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (trips.length === 0) {
    return (
      <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-16 text-center animate-in fade-in duration-500">
        <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">Nenhum Registro</h3>
        <p className="text-slate-400 mt-2 text-xs font-medium">Aguardando novos lançamentos operacionais.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/40 overflow-hidden animate-in fade-in duration-500">
      {/* Hidden template for PNG generation */}
      <div style={{ position: 'fixed', left: '-9999px', top: 0, zIndex: -1000, pointerEvents: 'none' }}>
        {downloadingTripId && (
          <LoadingOrderTemplate 
            ref={templateRef}
            trip={trips.find(t => t.id === downloadingTripId)!}
            driver={(() => {
              const currentTrip = trips.find(t => t.id === downloadingTripId);
              if (!currentTrip) return undefined;
              const cleanTripPlate = (currentTrip.truckPlate || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
              return drivers.find(d => {
                const cleanDriverPlate = (d.truckPlate || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
                if (cleanTripPlate && cleanDriverPlate && cleanTripPlate === cleanDriverPlate) return true;
                return !!(d.name && currentTrip.driverName && d.name.trim().toUpperCase() === currentTrip.driverName.trim().toUpperCase());
              });
            })()}
            freights={freights}
          />
        )}
        <TripListPdfTemplate
          ref={listPdfTemplateRef}
          trips={trips}
          drivers={drivers}
          freights={freights}
          filterSummary={filterSummary}
          tripStats={tripStats}
          systemCompanyName={systemCompanyName}
          systemCnpj={systemCnpj}
        />
      </div>

      {/* Barra de Ações em Lote para SD Selecionados */}
      {selectedSdIds.length > 0 && (
        <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-600 text-white font-black text-xs shadow-xs">
              {selectedSdIds.length}
            </span>
            <div>
              <p className="text-xs font-black text-emerald-950 uppercase tracking-tight">
                {selectedSdIds.length} {selectedSdIds.length === 1 ? 'viagem selecionada' : 'viagens selecionadas'} para Liquidação de Saldo (SD)
              </p>
              <p className="text-[9.5px] font-bold text-emerald-700">
                Selecione mais botões SD se desejar ou clique no botão para liquidar tudo de uma só vez
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <input 
              type="text"
              placeholder="Anotação SD em lote (opcional)..."
              value={batchNote}
              onChange={(e) => setBatchNote(e.target.value)}
              className="bg-white border border-emerald-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 placeholder:text-slate-400 outline-none focus:ring-1 focus:ring-emerald-400 w-52"
            />
            <button
              type="button"
              onClick={() => {
                setSelectedSdIds([]);
                setBatchNote('');
              }}
              className="px-3 py-1.5 text-[9px] font-bold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
            >
              Cancelar
            </button>
            {hasAnyLiquidatedSelected && onBatchRevertSd && (
              <button
                type="button"
                onClick={handleBatchRevert}
                className="px-3 py-1.5 text-[9px] font-bold text-amber-700 hover:text-amber-800 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-all cursor-pointer"
                title="Reverter viagens selecionadas para saldo pendente"
              >
                Reverter p/ Pendente
              </button>
            )}
            <button
              type="button"
              onClick={handleBatchLiquidate}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[9.5px] uppercase tracking-wider rounded-lg shadow-sm hover:shadow flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
              title="Marcar todas as viagens selecionadas como Saldo Liquidado (SD Pago)"
            >
              <CheckCheck size={14} />
              Liquidar Saldo ({selectedSdIds.length})
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-100">
              <th className="px-3 py-2 text-[7.5px] font-black text-slate-400 uppercase tracking-widest">Data / Rota</th>
              <th className="px-3 py-2 text-[7.5px] font-black text-slate-400 uppercase tracking-widest text-center">Peso / Veículo</th>
              <th className="px-3 py-2 text-[7.5px] font-black text-slate-400 uppercase tracking-widest">Doc (CTE/NF)</th>
              <th className="px-3 py-2 text-[7.5px] font-black text-slate-400 uppercase tracking-widest">Tarifas (TON)</th>
              <th className="px-3 py-2 text-[7.5px] font-black text-slate-400 uppercase tracking-widest">Margem</th>
              <th className="px-3 py-2 text-[7.5px] font-black text-slate-400 uppercase tracking-widest text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={handlePrintListPdf}
                    disabled={isPrintingListPdf || trips.length === 0}
                    className="px-2 py-0.5 rounded text-[7px] font-black uppercase transition-all border flex items-center gap-1 cursor-pointer bg-white text-slate-600 hover:text-red-700 hover:border-red-300 shadow-2xs disabled:opacity-40"
                    title="Imprimir / Exportar lista de viagens em PDF (respeitando os filtros ativos)"
                  >
                    {isPrintingListPdf ? (
                      <Loader2 size={9} className="animate-spin text-red-600" />
                    ) : (
                      <Printer size={9} className="text-slate-500" />
                    )}
                    <span>{isPrintingListPdf ? 'Gerando...' : 'Imprimir PDF'}</span>
                  </button>
                  <span>Ações</span>
                  <button
                    type="button"
                    onClick={handleToggleSelectAllPending}
                    className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase transition-all border flex items-center gap-0.5 cursor-pointer ${
                      isAllPendingSelected 
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs' 
                        : 'bg-white text-slate-500 border-slate-200 hover:border-emerald-400 hover:text-emerald-700'
                    }`}
                    title={isAllPendingSelected ? "Desmarcar todas as seleções de SD" : "Selecionar todas as viagens com SD pendente"}
                  >
                    {isAllPendingSelected ? <CheckSquare size={9} /> : <Square size={9} />}
                    <span>Todos SD</span>
                  </button>
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {trips.map((trip) => {
              const { profit, margin } = calculateFinancials(trip);
              const driver = drivers.find(d => d.truckPlate?.toUpperCase().trim() === trip.truckPlate?.toUpperCase().trim());
              
              return (
                <tr key={trip.id} className="hover:bg-slate-50/50 transition-all group duration-200">
                  <td className="px-3 py-2">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1">
                        <div className="text-[7.5px] font-black text-red-600 bg-red-50 px-1.5 py-0.2 rounded-md w-fit border border-red-100 uppercase tracking-wider">
                          {trip.date ? trip.date.split('-').reverse().join('/') : 'S/ DATA'}
                        </div>
                        <button 
                          onClick={() => handleDownloadPdf(trip)}
                          disabled={downloadingTripId === trip.id}
                          className="p-0.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-all border border-transparent hover:border-red-100"
                          title="Baixar Ordem de Carregamento (PDF Automático)"
                        >
                          <FileText size={9} className={downloadingTripId === trip.id ? 'animate-bounce text-red-600' : ''} />
                        </button>
                        <button 
                          onClick={() => onToggleMdfeStatus(trip.id)}
                          className={`p-0.5 rounded transition-all border ${
                            trip.mdfeStatus === 'Baixado' 
                              ? 'text-blue-600 bg-blue-50 border-blue-100' 
                              : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50 border-transparent hover:border-blue-100'
                          }`}
                          title={trip.mdfeStatus === 'Baixado' ? "MDFE Baixado" : "MDFE Pendente"}
                        >
                          {trip.mdfeStatus === 'Baixado' ? <ClipboardCheck size={9} /> : <ClipboardList size={9} />}
                        </button>
                      </div>
                      <div className="text-[10px] font-black text-slate-900 flex items-center gap-1 min-w-0">
                        <span className="truncate">{trip.origin}</span>
                        <ArrowRight size={9} className="text-slate-300 shrink-0" />
                        <span className="truncate">{trip.destination}</span>
                      </div>
                      <p className={`text-[8.5px] font-black italic whitespace-normal max-w-[180px] px-1 py-0.2 rounded border truncate ${trip.notes ? 'bg-red-50 text-red-700 border-red-100' : 'text-slate-400 border-transparent'}`} title={trip.notes || 'Sem anotações'}>
                        {trip.notes || 'Sem anotações'}
                      </p>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div className="flex flex-col items-center gap-0.5">
                       {trip.driverName && (
                         <span className="text-[6.5px] font-black text-slate-400 uppercase tracking-wider leading-none">
                           {trip.driverName.split(' ')[0]}
                         </span>
                       )}
                       <span className="text-[8.5px] font-black text-red-700 bg-white border border-red-600 px-1.5 py-0.2 rounded-md font-mono tracking-wider uppercase shadow-2xs">
                         {trip.truckPlate || 'S/ PLACA'}
                       </span>
                       <span className="flex items-center gap-0.5 text-[7.5px] font-black text-slate-400 uppercase tracking-wider">
                          <Scale size={9} /> {new Intl.NumberFormat('pt-BR').format(trip.weight)} KG
                       </span>
                       {(() => {
                         const matchingDriver = drivers.find(d => d.truckPlate?.toUpperCase().trim() === trip.truckPlate?.toUpperCase().trim());
                         if (matchingDriver) {
                           return (
                             <div className="flex flex-col items-center text-[6.5px] font-bold text-slate-400 uppercase leading-tight tracking-normal whitespace-nowrap">
                               <span>Eixos: {matchingDriver.axisCount || 0}</span>
                             </div>
                           );
                         }
                         return null;
                       })()}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="space-y-0.5">
                      <p className="text-[7.5px] font-black text-slate-900 uppercase">CTE: {trip.cteNumber || '---'}</p>
                      <p className="text-[7.5px] font-bold text-slate-400 uppercase">NF: {trip.invoiceNumber || '---'}</p>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-wider leading-none">Empr:</span>
                        <p className="text-[8.5px] font-black text-slate-900 leading-none">{formatCurrency(trip.companyTariff)}</p>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-wider leading-none">Mot:</span>
                        <p className="text-[8.5px] font-bold text-slate-500 leading-none">{formatCurrency(trip.driverTariff)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1">
                        <div className={`text-[9px] font-black ${margin < -1 ? 'text-red-600' : 'text-slate-900'}`}>
                          {formatCurrency(profit)}
                        </div>
                        <TrendingUp size={9} className={margin < -1 ? 'text-red-500 rotate-180' : margin > 12 ? 'text-blue-500' : 'text-amber-500'} />
                      </div>
                      <div className={`px-1 py-0.2 rounded text-[6.5px] font-black uppercase tracking-wider w-fit border ${
                        margin < -1 
                          ? 'bg-red-50 border-red-200 text-red-600' 
                          : margin > 12 
                            ? 'bg-blue-50 border-blue-100 text-blue-700' 
                            : 'bg-amber-50 border-amber-100 text-amber-700'
                      }`}>
                        {margin.toFixed(1)}% Margem
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-all duration-300">
                      <button 
                        onClick={() => handleOpenNoteModal(trip, 'adNote')} 
                        className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase transition-all border ${
                          trip.adNote && trip.adNote.trim() !== '' 
                            ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-2xs' 
                            : 'bg-slate-50 text-slate-400 border-slate-200 hover:text-slate-700 hover:bg-slate-100'
                        }`}
                        title={trip.adNote && trip.adNote.trim() !== '' ? `Anotação AD: ${trip.adNote}` : "Anotação AD"}
                      >
                        AD
                      </button>
                      {/* Botão SD com suporte a seleção múltipla e liquidação em lote */}
                      <div className="inline-flex items-center rounded overflow-hidden shadow-2xs">
                        <button 
                          type="button"
                          onClick={(e) => toggleSelectSd(trip.id, e)}
                          className={`px-1 py-0.5 border border-r-0 transition-all cursor-pointer flex items-center justify-center ${
                            selectedSdIds.includes(trip.id)
                              ? 'bg-emerald-600 text-white border-emerald-700'
                              : 'bg-slate-50 text-slate-400 border-slate-200 hover:text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50/50'
                          }`}
                          title={selectedSdIds.includes(trip.id) ? "Desmarcar da seleção de SD em lote" : "Selecionar para liquidar saldo em lote"}
                        >
                          {selectedSdIds.includes(trip.id) ? <CheckSquare size={11} className="text-white" /> : <Square size={11} />}
                        </button>
                        <button 
                          type="button"
                          onClick={(e) => {
                            if (selectedSdIds.length > 0 || e.shiftKey || e.ctrlKey || e.metaKey) {
                              toggleSelectSd(trip.id, e);
                            } else {
                              handleOpenNoteModal(trip, 'sdNote');
                            }
                          }} 
                          className={`px-1.5 py-0.5 text-[8px] font-black uppercase transition-all border flex items-center gap-0.5 cursor-pointer ${
                            selectedSdIds.includes(trip.id)
                              ? 'bg-emerald-600 text-white border-emerald-700 ring-1 ring-emerald-300'
                              : isTripSdLiquidated(trip)
                                ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs' 
                                : 'bg-slate-50 text-slate-400 border-slate-200 hover:text-slate-700 hover:bg-slate-100'
                          }`}
                          title={
                            selectedSdIds.includes(trip.id) 
                              ? "Selecionado para liquidar saldo em lote (clique para desmarcar)" 
                              : isTripSdLiquidated(trip)
                                ? (trip.sdNote && trip.sdNote.trim() !== '' ? `Saldo / SD: ${trip.sdNote}` : "Saldo Finalizado (Não Pendente)")
                                : "Preencher Saldo (SD) ou selecione para liquidar em lote"
                          }
                        >
                          {isTripSdLiquidated(trip) ? 'SD ✓' : 'SD'}
                        </button>
                      </div>
                      <button onClick={() => onEdit(trip)} className="p-1 text-slate-400 hover:text-red-700 rounded transition-all" title="Editar Viagem"><Edit2 size={13} /></button>
                      <button onClick={() => onRemove(trip.id)} className="p-1 text-slate-400 hover:text-red-900 rounded transition-all" title="Excluir Viagem"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {activeNoteModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded text-white shadow-xs ${
                  activeNoteModal.field === 'sdNote' && modalSdFlag ? 'bg-emerald-600' : 'bg-red-700'
                }`}>
                  {activeNoteModal.label}
                </span>
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight">
                    {activeNoteModal.label === 'SD' ? 'Status & Anotação SD' : `Anotação ${activeNoteModal.label}`}
                  </h4>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">
                    Placa: {activeNoteModal.trip.truckPlate || 'S/ PLACA'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setActiveNoteModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {activeNoteModal.field === 'sdNote' && (
                <label className="flex items-center gap-2.5 p-2.5 bg-emerald-50/80 border border-emerald-200 rounded-xl cursor-pointer hover:bg-emerald-100/60 transition-all select-none">
                  <input 
                    type="checkbox"
                    checked={modalSdFlag}
                    onChange={(e) => setModalSdFlag(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-emerald-300 accent-emerald-600 cursor-pointer"
                  />
                  <div>
                    <span className="text-[9.5px] font-black uppercase text-emerald-900 block leading-tight">
                      Saldo Liquidado / Não Pendente
                    </span>
                    <span className="text-[8px] text-emerald-700 font-bold block leading-tight mt-0.5">
                      Ao preencher o saldo, a viagem é marcada como concluída e deixa de constar como pendente no Dashboard.
                    </span>
                  </div>
                </label>
              )}

              <div>
                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">
                  Anotação / Detalhes ({activeNoteModal.label})
                </label>
                <textarea 
                  value={noteText}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNoteText(val);
                    if (activeNoteModal.field === 'sdNote' && val.trim() !== '') {
                      setModalSdFlag(true);
                    }
                  }}
                  placeholder={activeNoteModal.field === 'sdNote' ? "Digite a anotação/valor do saldo (SD)..." : `Digite a anotação para ${activeNoteModal.label}...`}
                  rows={3}
                  autoFocus
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-none uppercase"
                />
              </div>
            </div>

            <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-100 flex items-center justify-end gap-2">
              <button 
                onClick={() => setActiveNoteModal(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-200/50 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveNote}
                className="px-4 py-1.5 rounded-lg text-xs font-black text-white bg-red-700 hover:bg-red-800 transition-all shadow-sm flex items-center gap-1.5"
              >
                <Save size={12} /> Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TripList;
