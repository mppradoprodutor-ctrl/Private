import React from 'react';
import { Driver, Trip, OperationalUnit, Freight } from '../types';
import { GERA_LOGO_BASE64 } from '../assets/logoBase64';
import { MapPin } from 'lucide-react';

export interface LoadingOrderTemplateProps {
  trip?: Partial<Trip>;
  driver?: Partial<Driver>;
  defaultCnpj?: string;
  freights?: Freight[];
  // Propriedades opcionais para personalização direta ou manual
  orderNumber?: number;
  loadingLocation?: string;
  deliveryLocation?: string;
  deliveryUnit?: OperationalUnit | null;
  deliveryCnpj?: string;
  deliveryCompanyName?: string;
  deliveryIe?: string;
  deliveryAddress?: string;
  deliveryCityState?: string;
  deliveryUnitName?: string;
  origin?: string;
  originState?: string;
  destination?: string;
  destinationState?: string;
  product?: string;
  netWeight?: number | string;
  truckPlate?: string;
  trailer1?: string;
  trailer2?: string;
  dolly?: string;
  axles?: string;
  driverName?: string;
  cpf?: string;
  phone?: string;
  issueDate?: string;
  collectionDate?: string;
  loadingDate?: string;
  companyName?: string;
  cnpj?: string;
  ie?: string;
  address?: string;
  cityState?: string;
  unitName?: string;
}

const LoadingOrderTemplate = React.forwardRef<HTMLDivElement, LoadingOrderTemplateProps>((props, ref) => {
  const { trip, driver, defaultCnpj } = props;
  const text = (value: unknown) => value == null ? '' : String(value);
  const readStorage = (key: string) => {
    try {
      return typeof window !== 'undefined' ? window.localStorage.getItem(key) || '' : '';
    } catch {
      return '';
    }
  };

  // Resolução da empresa emissora
  const rawCompanyName = readStorage('tp_system_company_name');
  const systemCompanyName = rawCompanyName && rawCompanyName !== 'MY SYSTEM' ? rawCompanyName : 'GERA - COMÉRCIO E TRANSPORTE DE BIOMASSAS';
  const effectiveCompanyName = props.companyName && props.companyName !== 'MY SYSTEM' ? props.companyName : (trip?.operationalUnitCompanyName || systemCompanyName);
  const effectiveCnpj = props.cnpj || trip?.operationalUnitCnpj || defaultCnpj || readStorage('tp_system_company_cnpj') || '29.543.880/0001-24';
  const effectiveIe = props.ie || trip?.operationalUnitIe;
  const effectiveUnitName = props.unitName || trip?.operationalUnitName;

  const effectiveAddress = props.address || [
    trip?.operationalUnitStreet ? `${trip.operationalUnitStreet}${trip.operationalUnitNumber ? `, ${trip.operationalUnitNumber}` : ''}` : '',
    trip?.operationalUnitNeighborhood || ''
  ].filter(Boolean).join(' - ');

  const effectiveCityState = props.cityState || (trip?.operationalUnitCity 
    ? `${trip.operationalUnitCity}${trip.operationalUnitState ? ` - ${trip.operationalUnitState}` : ''}` 
    : (trip?.operationalUnitState || ''));

  // Resolução dos dados da carga / operação
  // Prioriza: prop explícita > trip.location > Base de Fretes cadastrada > extração de trip.notes ("Local: ...")
  let extractedLocation = text(props.loadingLocation || trip?.location).trim();

  if (!extractedLocation) {
    const originCandidate = text(props.origin || trip?.origin).trim().toLowerCase();
    const destCandidate = text(trip?.destination).trim().toLowerCase();

    // Carrega fretes da prop ou diretamente do armazenamento local
    const freightsList: Freight[] = Array.isArray(props.freights) ? props.freights : (() => {
      try {
        const raw = readStorage('tp_system_freights');
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    })();

    if (freightsList.length > 0) {
      const match = freightsList.find(f => 
        originCandidate && f.origin && f.origin.trim().toLowerCase() === originCandidate &&
        (!destCandidate || !f.destination || f.destination.trim().toLowerCase() === destCandidate) &&
        (f.location || f.collectionAddress)
      ) || freightsList.find(f => 
        originCandidate && f.origin && f.origin.trim().toLowerCase() === originCandidate &&
        (f.location || f.collectionAddress)
      ) || freightsList.find(f => f.location || f.collectionAddress);

      if (match) {
        if (match.location && match.collectionAddress && match.location.trim() !== match.collectionAddress.trim()) {
          extractedLocation = `${match.location.trim()} - ${match.collectionAddress.trim()}`;
        } else {
          extractedLocation = (match.location || match.collectionAddress || '').trim();
        }
      }
    }
  }

  if (!extractedLocation && trip?.notes) {
    const match = text(trip.notes).match(/Local:\s*([^.]+)/i);
    if (match) {
      extractedLocation = match[1].trim();
    }
  }

  if (!extractedLocation && (props.origin || trip?.origin)) {
    const orig = text(props.origin || trip?.origin).trim();
    const st = text(props.originState || trip?.originState).trim();
    extractedLocation = `${orig}${st ? ` - ${st}` : ''}`.trim();
  }
  const displayLocation = extractedLocation;

  // Resolução do CNPJ e Dados da Unidade de Entrega
  const deliveryUnit = props.deliveryUnit;
  const effectiveDeliveryCnpj = props.deliveryCnpj || deliveryUnit?.cnpj || effectiveCnpj;
  const effectiveDeliveryCompanyName = props.deliveryCompanyName || deliveryUnit?.companyName || '';
  const effectiveDeliveryUnitName = props.deliveryUnitName || deliveryUnit?.name || '';
  const effectiveDeliveryIe = props.deliveryIe !== undefined ? props.deliveryIe : deliveryUnit?.stateRegistration;
  
  const effectiveDeliveryAddress = props.deliveryAddress || (deliveryUnit ? [
    deliveryUnit.street ? `${deliveryUnit.street}${deliveryUnit.number ? `, ${deliveryUnit.number}` : ''}` : '',
    deliveryUnit.neighborhood || ''
  ].filter(Boolean).join(' - ') : '');

  const effectiveDeliveryCityState = props.deliveryCityState || (deliveryUnit 
    ? (deliveryUnit.city ? `${deliveryUnit.city}${deliveryUnit.state ? ` - ${deliveryUnit.state}` : ''}` : (deliveryUnit.state || ''))
    : '');

  // Resolução do Local de Entrega (acompanha sempre os dados do CNPJ de entrega ou cabeçalho)
  let extractedDeliveryLocation = text(props.deliveryLocation).trim();

  if (!extractedDeliveryLocation && trip?.dischargeTerminal) {
    extractedDeliveryLocation = `${trip.dischargeTerminal}${trip.destination ? ` - ${trip.destination}` : ''}${trip.destinationState ? `/${trip.destinationState}` : ''}`;
  }

  if (!extractedDeliveryLocation && (props.destination || trip?.destination)) {
    const dest = text(props.destination || trip?.destination).trim();
    const destSt = text(props.destinationState || trip?.destinationState).trim();
    extractedDeliveryLocation = `${dest}${destSt ? ` - ${destSt}` : ''}`;
  }

  if (!extractedDeliveryLocation && (effectiveDeliveryCityState || effectiveDeliveryUnitName || effectiveCityState || effectiveUnitName)) {
    const unitName = effectiveDeliveryUnitName || effectiveUnitName;
    const citySt = effectiveDeliveryCityState || effectiveCityState;
    const addr = effectiveDeliveryAddress || effectiveAddress;
    extractedDeliveryLocation = `${unitName && unitName !== 'Matriz' ? `[${unitName}] ` : ''}${citySt || addr || 'Matriz'}`;
  }

  const displayDeliveryLocation = extractedDeliveryLocation || '---';

  const displayOrigin = props.origin || trip?.origin || '';
  const displayState = props.originState || trip?.originState || '';
  const displayProduct = props.product || trip?.product || '';

  // Resolução do peso líquido
  const rawNetWeight = props.netWeight !== undefined && props.netWeight !== ''
    ? props.netWeight
    : (driver?.netWeight !== undefined && driver?.netWeight !== 0 
        ? driver.netWeight 
        : (trip?.weight !== undefined && trip?.weight !== 0 ? trip.weight : ''));

  const formatNetWeight = (val?: number | string) => {
    if (val === undefined || val === null || val === '') return '---';
    if (typeof val === 'number') {
      if (val === 0) return '---';
      return `${new Intl.NumberFormat('pt-BR').format(val)} TN`;
    }
    const cleanStr = String(val).trim();
    if (!cleanStr || cleanStr === '0') return '---';
    const withoutKg = cleanStr.replace(/\s*kg\b/gi, '').trim();
    const parsedNum = parseFloat(withoutKg.replace(/\./g, '').replace(',', '.'));
    if (!isNaN(parsedNum) && parsedNum > 0 && /^\d+([.,]\d+)?$/.test(withoutKg)) {
      return `${new Intl.NumberFormat('pt-BR').format(parsedNum)} TN`;
    }
    return withoutKg.toUpperCase().includes('TN') ? withoutKg : `${withoutKg} TN`;
  };

  const displayNetWeightFormatted = formatNetWeight(rawNetWeight);

  // Resolução do veículo e placas
  const displayTruckPlate = props.truckPlate || driver?.truckPlate || trip?.truckPlate || '';
  const displayTrailer1 = props.trailer1 || driver?.trailer1 || '';
  const displayTrailer2 = props.trailer2 || driver?.trailer2 || '';
  const displayDolly = props.dolly || driver?.dolly || '';
  
  const rawAxles = props.axles || (driver?.axisCount ? `${driver.axisCount} Eixos` : '');
  const displayAxles = rawAxles 
    ? (text(rawAxles).toLowerCase().includes('eixo') ? text(rawAxles) : `${rawAxles} Eixos`)
    : (driver?.axisCount ? `${driver.axisCount} Eixos` : '---');

  // Resolução do motorista
  const displayDriverName = props.driverName || driver?.name || trip?.driverName || '';
  const displayCpf = props.cpf || driver?.cpf || '';
  const displayPhone = props.phone || driver?.phone || trip?.driverPhone || '';

  const formatPhone = (val?: string) => {
    const trimmed = text(val).trim();
    if (!trimmed) return '---';
    const digitsOnly = trimmed.replace(/\D/g, '');
    if (digitsOnly.length === 11 && /^\d+$/.test(trimmed.replace(/[\s()-]/g, ''))) {
      return `(${digitsOnly.slice(0, 2)}) ${digitsOnly.slice(2, 7)}-${digitsOnly.slice(7)}`;
    }
    if (digitsOnly.length === 10 && /^\d+$/.test(trimmed.replace(/[\s()-]/g, ''))) {
      return `(${digitsOnly.slice(0, 2)}) ${digitsOnly.slice(2, 6)}-${digitsOnly.slice(6)}`;
    }
    return trimmed;
  };

  // Número da ordem e data da coleta
  const orderNum = props.orderNumber !== undefined ? props.orderNumber : (trip?.orderNumber !== undefined ? trip.orderNumber : 1);
  const rawDate = text(props.collectionDate || props.loadingDate || props.issueDate || trip?.date);
  const displayDate = rawDate
    ? (rawDate.includes('-') ? rawDate.split('T')[0].split('-').reverse().join('/') : rawDate)
    : new Date().toLocaleDateString('pt-BR');

  return (
    <div 
      ref={ref} 
      className="w-[595px] min-h-[842px] bg-white p-12 shadow-2xl rounded-sm border border-slate-300 relative text-left"
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
      {/* Cabeçalho da Empresa Emissora */}
      <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-8">
        <div className="flex items-start gap-4">
          <div className="w-[76px] h-[76px] rounded-xl bg-white border border-slate-200/90 p-1 shrink-0 flex items-center justify-center shadow-xs overflow-hidden">
            <img 
              src={GERA_LOGO_BASE64} 
              alt="Logo GERA" 
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">
              {effectiveCompanyName}
            </h1>
            <div className="mt-1 space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap font-mono text-[10px]">
                <span className="font-black text-slate-800 uppercase tracking-wider bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                  CNPJ: {effectiveCnpj}
                </span>
                {effectiveIe && (
                  <span className="font-bold text-slate-800 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                    IE: {effectiveIe}
                  </span>
                )}
                {effectiveUnitName && (
                  <span className="text-slate-500 font-sans font-semibold">
                    ({effectiveUnitName})
                  </span>
                )}
              </div>
              {(effectiveAddress || effectiveCityState) && (
                <p className="text-[10px] text-slate-600 font-medium">
                  {effectiveAddress ? `${effectiveAddress} • ` : ''}{effectiveCityState}
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="inline-block bg-slate-900 text-white px-3 py-1 rounded-lg text-center mb-1.5 shadow-sm">
            <p className="text-[8px] font-black uppercase tracking-widest text-slate-300">Ordem de Carregamento</p>
            <p className="text-sm font-black tracking-tight font-mono">Nº {orderNum || 1}</p>
          </div>
          <div>
            <p className="text-[9px] font-black uppercase text-slate-500">Data da Coleta</p>
            <p className="text-xs font-black text-black">{displayDate}</p>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {/* 1. DADOS DA CARGA / OPERAÇÃO (Local de Carregamento, Origem e sua UF, Local de Entrega com CNPJ do Cabeçalho, Produto, Peso Líquido) */}
        <div className="space-y-4">
          <h5 className="border-b border-slate-200 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-900">
            Dados da Operação
          </h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 px-4">
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <MapPin className="text-red-600" aria-hidden="true" />
                <h6 className="text-[10px] font-black uppercase tracking-widest text-slate-900">Local de Coleta</h6>
              </div>
              <dl className="mt-2 grid gap-1.5 text-[9px] leading-tight">
                <div><dt className="font-bold uppercase text-slate-500">Empresa</dt><dd className="font-black text-slate-900">{effectiveCompanyName || '---'}</dd></div>
                <div><dt className="font-bold uppercase text-slate-500">CNPJ</dt><dd className="font-mono font-black text-slate-900">{effectiveCnpj || '---'}</dd></div>
                <div><dt className="font-bold uppercase text-slate-500">Endereço completo</dt><dd className="font-medium text-slate-700">{effectiveAddress || displayLocation || '---'}</dd></div>
                <div><dt className="font-bold uppercase text-slate-500">Cidade/UF</dt><dd className="font-medium text-slate-700">{effectiveCityState || `${displayOrigin}${displayState ? ` - ${displayState}` : ''}` || '---'}</dd></div>
<div className="grid grid-cols-2 gap-2"><div><dt className="font-bold uppercase text-slate-500">Contato</dt><dd className="font-medium text-slate-700">{displayDriverName || '---'}</dd></div><div><dt className="font-bold uppercase text-slate-500">Telefone</dt><dd className="font-medium text-slate-700">{formatPhone(displayPhone)}</dd></div></div>
  <div><dt className="flex items-center gap-1 font-bold uppercase text-slate-500">Data</dt><dd className="font-medium text-slate-700">{displayDate}</dd></div>
              </dl>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                                <h6 className="text-[10px] font-black uppercase tracking-widest text-slate-900">Local de Entrega</h6>
              </div>
              <dl className="mt-2 grid gap-1.5 text-[9px] leading-tight">
                <div><dt className="font-bold uppercase text-slate-500">Empresa</dt><dd className="font-black text-slate-900">{effectiveDeliveryCompanyName || displayDeliveryLocation || '---'}</dd></div>
                <div><dt className="font-bold uppercase text-slate-500">CNPJ</dt><dd className="font-mono font-black text-slate-900">{effectiveDeliveryCnpj || '---'}</dd></div>
                <div><dt className="font-bold uppercase text-slate-500">Endereço completo</dt><dd className="font-medium text-slate-700">{effectiveDeliveryAddress || displayDeliveryLocation || '---'}</dd></div>
                <div><dt className="font-bold uppercase text-slate-500">Cidade/UF</dt><dd className="font-medium text-slate-700">{effectiveDeliveryCityState || '---'}</dd></div>
<div className="grid grid-cols-2 gap-2"><div><dt className="font-bold uppercase text-slate-500">Contato</dt><dd className="font-medium text-slate-700">{effectiveDeliveryUnitName || '---'}</dd></div><div><dt className="font-bold uppercase text-slate-500">Telefone</dt><dd className="font-medium text-slate-700">Não informado</dd></div></div>
  <div><dt className="flex items-center gap-1 font-bold uppercase text-slate-500">Data</dt><dd className="font-medium text-slate-700">{displayDate}</dd></div>
              </dl>
            </div>

            <div className="md:col-span-2 grid grid-cols-2 gap-3">
              <div><p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Produto</p><p className="text-sm font-black text-red-600">{displayProduct || '---'}</p></div>
              <div><p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Peso Líquido</p><p className="text-sm font-black font-mono text-black">{displayNetWeightFormatted}</p></div>
            </div>
          </div>
        </div>

        {/* 2. DADOS DO VEÍCULO (Placas, Quantidade de Eixo) */}
        <div className="space-y-4">
          <h5 className="border-b border-slate-200 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-900">
            Veículo e Placas
          </h5>
          <div className="grid grid-cols-3 gap-6 px-4">
            <div className="col-span-2">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Placas</p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-1 rounded bg-slate-900 text-white font-mono font-black text-xs">
                  Cavalo: {displayTruckPlate || '---'}
                </span>
                {(displayTrailer1 || displayTrailer2) ? (
                  <>
                    {displayTrailer1 && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded bg-slate-100 border border-slate-300 text-slate-800 font-mono font-bold text-xs">
                        Carreta 1: {displayTrailer1}
                      </span>
                    )}
                    {displayTrailer2 && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded bg-slate-100 border border-slate-300 text-slate-800 font-mono font-bold text-xs">
                        Carreta 2: {displayTrailer2}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-1 rounded bg-slate-100 border border-slate-200 text-slate-600 font-mono text-xs">
                    Carretas: ---
                  </span>
                )}
                {displayDolly && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded bg-slate-100 border border-slate-300 text-slate-800 font-mono font-bold text-xs">
                    Dolly: {displayDolly}
                  </span>
                )}
              </div>
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Quantidade de Eixo</p>
              <p className="text-sm font-black text-black">{displayAxles}</p>
            </div>
          </div>
        </div>

        {/* 3. DADOS DO MOTORISTA (Nome Completo, CPF, Telefone) */}
        <div className="space-y-4">
          <h5 className="border-b border-slate-200 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-900">
            Dados do Motorista
          </h5>
          <div className="grid grid-cols-4 gap-4 px-4">
            <div className="col-span-2">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Nome Completo</p>
              <p className="text-sm font-black text-black">{displayDriverName || '---'}</p>
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">CPF</p>
              <p className="text-sm font-bold text-black font-mono">{displayCpf || '---'}</p>
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Telefone</p>
              <p className="text-sm font-bold text-black font-mono">{formatPhone(displayPhone)}</p>
            </div>
          </div>
        </div>

        {/* Bloco de Assinaturas */}
        <div className="pt-16 grid grid-cols-2 gap-20 px-10">
          <div className="border-t-2 border-slate-800 pt-2 text-center">
            <p className="text-[10px] font-black uppercase text-slate-500">Assinatura Motorista</p>
            <p className="text-[9px] font-bold text-slate-700 mt-1">{displayDriverName || 'Motorista'}</p>
          </div>
          <div className="border-t-2 border-slate-800 pt-2 text-center">
            <p className="text-[10px] font-black uppercase text-slate-500">Emissor Autorizado</p>
            <p className="text-[9px] font-bold text-slate-800 mt-0.5">
              {effectiveCompanyName} • CNPJ {effectiveCnpj}
            </p>
            {effectiveCityState && (
              <p className="text-[8px] text-slate-500 font-medium">
                {effectiveAddress ? `${effectiveAddress}, ` : ''}{effectiveCityState}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-10 flex items-center justify-center gap-2 text-slate-400">
        <img 
          src={GERA_LOGO_BASE64} 
          alt="Logo GERA" 
          className="w-5 h-5 object-contain opacity-80"
        />
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
          {effectiveCompanyName} • Logística e Transporte de Biomassas
        </span>
      </div>

      <div className="mt-8 text-center border-t border-slate-100 pt-4">
        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.25em]">
          Documento gerado eletronicamente por {effectiveCompanyName} • CNPJ {effectiveCnpj} {effectiveIe ? `• IE ${effectiveIe}` : ''} - Autenticação Digital Requerida
        </p>
      </div>
    </div>
  );
});

LoadingOrderTemplate.displayName = 'LoadingOrderTemplate';

export default LoadingOrderTemplate;
