import React from 'react';
import { Trip, Driver, Freight } from '../types';
import { GERA_LOGO_BASE64 } from '../assets/logoBase64';

export interface TripListPdfTemplateProps {
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
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

const calculateFinancials = (t: Trip) => {
  const effectiveWeight = t.weight > 0 ? t.weight : 1000;
  const totalCompanyRevenue = t.companyTariff * (effectiveWeight / 1000);
  const icmsDeduction = t.deductIcms ? (totalCompanyRevenue * ((t.icmsRate || 0) / 100)) : 0;
  const netRevenue = totalCompanyRevenue - icmsDeduction;
  const totalDriverCost = t.driverTariff * (effectiveWeight / 1000);
  const profit = netRevenue - totalDriverCost;
  const margin = totalCompanyRevenue > 0 ? (profit / totalCompanyRevenue) * 100 : 0;
  return { profit, margin, icmsDeduction };
};

const isTripSdLiquidated = (t: Trip) => {
  return !!t.sdFlag || t.status === 'Finalizado' || (!!t.sdNote && t.sdNote.trim() !== '');
};

const paginateTrips = (trips: Trip[], firstPageLimit = 10, otherPagesLimit = 14): Trip[][] => {
  if (trips.length === 0) return [[]];
  if (trips.length <= firstPageLimit) return [trips];

  const pages: Trip[][] = [];
  pages.push(trips.slice(0, firstPageLimit));
  let start = firstPageLimit;
  while (start < trips.length) {
    pages.push(trips.slice(start, start + otherPagesLimit));
    start += otherPagesLimit;
  }
  return pages;
};

const TripListPdfTemplate = React.forwardRef<HTMLDivElement, TripListPdfTemplateProps>((props, ref) => {
  const {
    trips,
    drivers,
    filterSummary,
    tripStats,
    systemCompanyName,
    systemCnpj
  } = props;

  const rawCompanyName = typeof window !== 'undefined' ? localStorage.getItem('tp_system_company_name') : null;
  const effectiveCompanyName = systemCompanyName || rawCompanyName || 'GERA - COMÉRCIO E TRANSPORTE DE BIOMASSAS';
  const effectiveCnpj = systemCnpj || (typeof window !== 'undefined' ? localStorage.getItem('tp_system_company_cnpj') : null) || '29.543.880/0001-24';

  const issueDateFormatted = new Date().toLocaleDateString('pt-BR');
  const issueTimeFormatted = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  // Estatísticas calculadas
  const stats = tripStats || (() => {
    let totalProfit = 0;
    let totalRevenue = 0;
    trips.forEach(t => {
      const { profit } = calculateFinancials(t);
      const effectiveWeight = t.weight > 0 ? t.weight : 1000;
      const rev = t.companyTariff * (effectiveWeight / 1000);
      totalProfit += profit;
      totalRevenue += rev;
    });
    const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    return { count: trips.length, totalProfit, avgMargin };
  })();

  const paginatedTrips = paginateTrips(trips, 10, 14);
  const totalPages = paginatedTrips.length;

  return (
    <div ref={ref} className="bg-slate-100 flex flex-col items-center">
      {paginatedTrips.map((pageTrips, pageIndex) => {
        const isFirstPage = pageIndex === 0;

        return (
          <div
            key={pageIndex}
            className="pdf-page bg-white text-slate-900 shadow-md relative flex flex-col justify-between"
            style={{
              width: '1120px',
              height: '792px',
              maxHeight: '792px',
              padding: '24px 28px',
              boxSizing: 'border-box',
              fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
              marginBottom: pageIndex < totalPages - 1 ? '20px' : '0px'
            }}
          >
            {/* TOPO DA PÁGINA */}
            <div>
              {/* CABEÇALHO */}
              {isFirstPage ? (
                <div>
                  <div className="flex justify-between items-center border-b-2 border-slate-900 pb-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-[60px] h-[60px] rounded-lg bg-white border border-slate-200 p-1 shrink-0 flex items-center justify-center overflow-hidden">
                        <img
                          src={GERA_LOGO_BASE64}
                          alt="Logo"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div>
                        <h1 className="text-base font-black tracking-tight text-slate-900 uppercase">
                          {effectiveCompanyName}
                        </h1>
                        <div className="flex items-center gap-2 mt-0.5 text-[9px] font-mono text-slate-600">
                          <span className="font-bold bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            CNPJ: {effectiveCnpj}
                          </span>
                          <span className="text-slate-400">•</span>
                          <span className="font-sans font-bold text-slate-700 uppercase">
                            Sistema de Fretes & Transporte Rodoviário
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="inline-block bg-slate-900 text-white px-3 py-1 rounded-md text-center mb-1">
                        <p className="text-[7.5px] font-black uppercase tracking-widest text-slate-300">
                          Relatório Operacional
                        </p>
                        <p className="text-xs font-black tracking-tight uppercase">
                          Viagens Lançadas
                        </p>
                      </div>
                      <p className="text-[8.5px] font-bold text-slate-500">
                        Emissão: {issueDateFormatted} às {issueTimeFormatted}
                      </p>
                    </div>
                  </div>

                  {/* CARDS DE RESUMO (IGUAIS AOS CARDS DA TELA) */}
                  <div className="grid grid-cols-3 gap-2.5 mb-2.5">
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 flex items-center gap-2.5 text-left">
                      <div className="w-6 h-6 bg-blue-100 rounded-md flex items-center justify-center text-blue-700 font-black text-xs shrink-0">
                        #
                      </div>
                      <div className="min-w-0">
                        <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">
                          Viagens Filtradas
                        </p>
                        <h3 className="text-xs font-black text-slate-900 truncate">
                          {stats.count} {stats.count === 1 ? 'viagem' : 'viagens'}
                        </h3>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 flex items-center gap-2.5 text-left">
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center font-black text-xs shrink-0 ${stats.totalProfit < 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        $
                      </div>
                      <div className="min-w-0">
                        <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">
                          Lucro Estimado
                        </p>
                        <h3 className={`text-xs font-black truncate ${stats.totalProfit < 0 ? 'text-red-600' : 'text-slate-900'}`}>
                          {formatCurrency(stats.totalProfit)}
                        </h3>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 flex items-center gap-2.5 text-left">
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center font-black text-xs shrink-0 ${stats.avgMargin < -1 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                        %
                      </div>
                      <div className="min-w-0">
                        <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">
                          Margem Média
                        </p>
                        <h3 className={`text-xs font-black truncate ${stats.avgMargin < -1 ? 'text-red-600' : 'text-slate-900'}`}>
                          {stats.avgMargin.toFixed(1)}%
                        </h3>
                      </div>
                    </div>
                  </div>

                  {/* BARRA DE FILTROS APLICADOS */}
                  <div className="bg-slate-100 border border-slate-200 rounded px-2.5 py-1 mb-2.5 flex items-center justify-between text-[8px]">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="font-black text-slate-700 uppercase tracking-wider shrink-0">
                        Filtros Ativos:
                      </span>
                      <span className="font-semibold text-slate-600 truncate">
                        {filterSummary || 'Todos os registros (Sem filtros adicionais)'}
                      </span>
                    </div>
                    <span className="font-bold text-slate-500 shrink-0 ml-2">
                      Página {pageIndex + 1} de {totalPages}
                    </span>
                  </div>
                </div>
              ) : (
                /* CABEÇALHO COMPACTO PARA PÁGINAS SEGUINTES */
                <div className="flex justify-between items-center border-b border-slate-200 pb-2 mb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-[30px] h-[30px] rounded bg-white border border-slate-200 p-0.5 shrink-0 flex items-center justify-center overflow-hidden">
                      <img
                        src={GERA_LOGO_BASE64}
                        alt="Logo"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div>
                      <h2 className="text-xs font-black tracking-tight text-slate-900 uppercase leading-none">
                        {effectiveCompanyName}
                      </h2>
                      <p className="text-[7.5px] font-bold text-slate-500 uppercase mt-0.5">
                        Relatório de Viagens Lançadas • Continuação
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[8px] font-black bg-slate-900 text-white px-2 py-0.5 rounded">
                      Página {pageIndex + 1} de {totalPages}
                    </span>
                  </div>
                </div>
              )}

              {/* TABELA DE VIAGENS (EXATAMENTE COMO NA LISTA) */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse" style={{ tableLayout: 'fixed' }}>
                  <thead>
                    <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-500">
                      <th className="px-2.5 py-1.5 text-[7.5px] font-black uppercase tracking-widest" style={{ width: '26%' }}>
                        Data / Rota
                      </th>
                      <th className="px-2 py-1.5 text-[7.5px] font-black uppercase tracking-widest text-center" style={{ width: '18%' }}>
                        Peso / Veículo
                      </th>
                      <th className="px-2 py-1.5 text-[7.5px] font-black uppercase tracking-widest" style={{ width: '13%' }}>
                        Doc (CTE/NF)
                      </th>
                      <th className="px-2 py-1.5 text-[7.5px] font-black uppercase tracking-widest" style={{ width: '14%' }}>
                        Tarifas (TON)
                      </th>
                      <th className="px-2 py-1.5 text-[7.5px] font-black uppercase tracking-widest" style={{ width: '13%' }}>
                        Margem
                      </th>
                      <th className="px-2.5 py-1.5 text-[7.5px] font-black uppercase tracking-widest text-right" style={{ width: '16%' }}>
                        Status / Saldo
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {pageTrips.map((trip) => {
                      const { profit, margin } = calculateFinancials(trip);
                      const driver = drivers.find(
                        d => d.truckPlate?.toUpperCase().trim() === trip.truckPlate?.toUpperCase().trim()
                      );
                      const isSdLiquidated = isTripSdLiquidated(trip);

                      return (
                        <tr key={trip.id} className="hover:bg-slate-50/60 transition-colors">
                          {/* COLUNA 1: DATA / ROTA */}
                          <td className="px-2.5 py-1.5 align-middle">
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-1 flex-wrap">
                                <span className="text-[7.5px] font-black text-red-600 bg-red-50 px-1.5 py-0.2 rounded border border-red-100 uppercase tracking-wider">
                                  {trip.date ? trip.date.split('-').reverse().join('/') : 'S/ DATA'}
                                </span>
                                <span className={`text-[7px] font-black px-1.5 py-0.2 rounded border uppercase ${
                                  trip.mdfeStatus === 'Baixado'
                                    ? 'text-blue-700 bg-blue-50 border-blue-200'
                                    : 'text-slate-500 bg-slate-100 border-slate-200'
                                }`}>
                                  {trip.mdfeStatus === 'Baixado' ? 'MDFE Baixado' : 'MDFE Pendente'}
                                </span>
                              </div>
                              <div className="text-[9.5px] font-black text-slate-900 flex items-center gap-1 min-w-0 mt-0.5">
                                <span className="truncate">{trip.origin || '---'}</span>
                                <span className="text-red-600 font-black shrink-0">➔</span>
                                <span className="truncate">{trip.destination || '---'}</span>
                              </div>
                              {trip.notes && (
                                <p className="text-[7.5px] font-bold italic text-red-700 bg-red-50/80 px-1 py-0.2 rounded border border-red-100/70 truncate max-w-[240px]">
                                  {trip.notes}
                                </p>
                              )}
                            </div>
                          </td>

                          {/* COLUNA 2: PESO / VEÍCULO */}
                          <td className="px-2 py-1.5 text-center align-middle">
                            <div className="flex flex-col items-center gap-0.5">
                              {trip.driverName && (
                                <span className="text-[6.5px] font-black text-slate-400 uppercase tracking-wider leading-none">
                                  {trip.driverName.split(' ')[0]}
                                </span>
                              )}
                              <span className="text-[8.5px] font-black text-red-700 bg-white border border-red-600 px-1.5 py-0.2 rounded font-mono tracking-wider uppercase shadow-2xs">
                                {trip.truckPlate || 'S/ PLACA'}
                              </span>
                              <span className="text-[7.5px] font-black text-slate-500 uppercase tracking-wider">
                                ⚖️ {new Intl.NumberFormat('pt-BR').format(trip.weight || 0)} KG
                              </span>
                              {driver && (
                                <span className="text-[6.5px] font-bold text-slate-400 uppercase leading-none">
                                  Eixos: {driver.axisCount || 0}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* COLUNA 3: DOC (CTE / NF) */}
                          <td className="px-2 py-1.5 align-middle">
                            <div className="space-y-0.5">
                              <p className="text-[7.5px] font-black text-slate-900 uppercase">
                                CTE: {trip.cteNumber || '---'}
                              </p>
                              <p className="text-[7.5px] font-bold text-slate-400 uppercase">
                                NF: {trip.invoiceNumber || '---'}
                              </p>
                              {trip.paymentType && (
                                <span className="inline-block text-[6.5px] font-black uppercase text-emerald-800 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-100">
                                  {trip.paymentType}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* COLUNA 4: TARIFAS (TON) */}
                          <td className="px-2 py-1.5 align-middle">
                            <div className="space-y-0.5">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[7px] font-black text-slate-400 uppercase tracking-wider">Empr:</span>
                                <p className="text-[8px] font-black text-slate-900 leading-none">
                                  {formatCurrency(trip.companyTariff)}
                                </p>
                              </div>
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[7px] font-black text-slate-400 uppercase tracking-wider">Mot:</span>
                                <p className="text-[8px] font-bold text-slate-500 leading-none">
                                  {formatCurrency(trip.driverTariff)}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* COLUNA 5: MARGEM */}
                          <td className="px-2 py-1.5 align-middle">
                            <div className="space-y-0.5">
                              <div className={`text-[8.5px] font-black ${margin < -1 ? 'text-red-600' : 'text-slate-900'}`}>
                                {formatCurrency(profit)}
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

                          {/* COLUNA 6: STATUS / SALDO */}
                          <td className="px-2.5 py-1.5 text-right align-middle">
                            <div className="flex flex-col items-end gap-0.5">
                              <span className={`px-1.5 py-0.2 rounded text-[7.5px] font-black uppercase tracking-wider border ${
                                isSdLiquidated
                                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                                  : 'bg-slate-100 text-slate-500 border-slate-200'
                              }`}>
                                {isSdLiquidated ? 'SD Liquidado ✓' : 'SD Pendente'}
                              </span>

                              {trip.adNote && trip.adNote.trim() !== '' && (
                                <span className="text-[6.5px] font-bold text-amber-900 bg-amber-50 px-1 py-0.2 rounded border border-amber-200 truncate max-w-[120px]">
                                  AD: {trip.adNote}
                                </span>
                              )}

                              {trip.sdNote && trip.sdNote.trim() !== '' && (
                                <span className="text-[6.5px] font-bold text-emerald-900 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200 truncate max-w-[120px]">
                                  SD: {trip.sdNote}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* RODAPÉ DA PÁGINA */}
            <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-[7.5px] text-slate-400 font-bold uppercase tracking-wider">
              <span>{effectiveCompanyName} • Sistema de Gestão de Fretes e Transportes</span>
              <span>Página {pageIndex + 1} de {totalPages}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
});

TripListPdfTemplate.displayName = 'TripListPdfTemplate';

export default TripListPdfTemplate;
