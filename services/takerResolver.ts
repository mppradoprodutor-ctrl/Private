import { Trip, Freight, Shipment } from '../types';

export const normalizeTakerText = (text: string): string => {
  return (text || '')
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
};

export const isInvalidTakerName = (name?: string): boolean => {
  if (!name) return true;
  const n = normalizeTakerText(name);
  if (!n) return true;
  const invalidList = [
    'TOMADOR',
    'CLIENTE',
    'NAO INFORMADO',
    'NAO INFORMADA',
    'NÃO INFORMADO',
    'NÃO INFORMADA',
    'SEM TOMADOR',
    'SEM INFORMACAO',
    'SEM INFORMAÇÃO',
    'N/I',
    'NI',
    'N/A',
    'NA',
    'DIVERSOS',
    'OUTROS',
    'OUTRO',
    'INDEFINIDO',
    'PENDENTE',
    '-',
    '--',
    '---'
  ];
  return invalidList.includes(n);
};

// Grandes empresas, tradings e cooperativas do agronegócio e logística brasileira
const AGRO_TRADINGS: string[] = [
  'AMAGGI', 'BUNGE', 'CARGILL', 'COFCO', 'LDC', 'LOUIS DREYFUS', 'ADM', 'VITERRA',
  'INPASA', 'FS BIOENERGIA', 'FS', 'ALGAR', 'JBS', 'BRF', 'RUMO', 'TERMAG', 'TEG',
  'TES', 'TEPAR', 'CATUPORANGA', 'COAMO', 'C.VALE', 'LAR', 'COPAGRIL', 'COPACOL',
  'BIOPAVEL', 'BIOSEV', 'AGREX', 'GAVILON', 'GLENCORE', 'MULTIGRAIN', 'TIBAGI',
  'SEARA', 'MARFRIG', 'MINERVA', 'GRANOL', 'BIOTRANS', 'CARAMURU', 'BIOCANNA',
  'USINA', 'SLC AGRICOLA', 'COFCO INTL', 'TASA', 'CARGILL AGRICOLA', 'COCAMAR',
  'INTEGRADA', 'CAPAL', 'CASTROLANDA', 'BATAVO', 'FRISIA', 'AURORA'
];

/**
 * Resolve de forma inteligente o Cliente/Tomador de uma viagem:
 * 1. Campo serviceTaker da própria viagem (se válido)
 * 2. Frete vinculado por freightId
 * 3. Frete correspondente pela Rota exata (Origem e Destino)
 * 4. Embarque correspondente por placa, data, CTE ou rota
 * 5. Nome de tomador/trading detectado no Terminal de Descarga, Notas ou Destino
 * 6. Frete correspondente pelo Destino
 * 7. Frete correspondente pela Origem
 */
export function resolveTripServiceTaker(
  trip: Partial<Trip>,
  freightsList: Freight[] = [],
  shipmentsList: Shipment[] = []
): string {
  // 1. serviceTaker da viagem se já for válido
  const current = (trip.serviceTaker || '').trim();
  if (!isInvalidTakerName(current)) {
    return current.toUpperCase();
  }

  // 2. Busca por freightId
  if (trip.freightId) {
    const matchedFreight = freightsList.find(f => f.id === trip.freightId);
    if (matchedFreight && !isInvalidTakerName(matchedFreight.serviceTaker)) {
      return matchedFreight.serviceTaker.toUpperCase().trim();
    }
  }

  const tripOrigNorm = normalizeTakerText(trip.origin || '');
  const tripDestNorm = normalizeTakerText(trip.destination || '');
  const tripTermNorm = normalizeTakerText(trip.dischargeTerminal || '');
  const tripProdNorm = normalizeTakerText(trip.product || '');

  // 3. Busca por Rota exata (Origem e Destino) na base de fretes
  if (tripOrigNorm && tripDestNorm) {
    // 3a. Mesma rota E mesmo terminal ou produto
    const specificFreight = freightsList.find(f => {
      if (isInvalidTakerName(f.serviceTaker)) return false;
      const fOrig = normalizeTakerText(f.origin);
      const fDest = normalizeTakerText(f.destination);
      const sameRoute = fOrig === tripOrigNorm && fDest === tripDestNorm;
      if (!sameRoute) return false;
      const sameTerm = tripTermNorm && normalizeTakerText(f.dischargeTerminal || '') === tripTermNorm;
      const sameProd = tripProdNorm && normalizeTakerText(f.product || '') === tripProdNorm;
      return sameTerm || sameProd;
    });

    if (specificFreight && !isInvalidTakerName(specificFreight.serviceTaker)) {
      return specificFreight.serviceTaker.toUpperCase().trim();
    }

    // 3b. Mesma rota (Origem e Destino)
    const routeFreight = freightsList.find(f => {
      if (isInvalidTakerName(f.serviceTaker)) return false;
      return normalizeTakerText(f.origin) === tripOrigNorm && normalizeTakerText(f.destination) === tripDestNorm;
    });

    if (routeFreight && !isInvalidTakerName(routeFreight.serviceTaker)) {
      return routeFreight.serviceTaker.toUpperCase().trim();
    }
  }

  // 4. Busca nos Embarques (Shipments)
  if (shipmentsList && shipmentsList.length > 0) {
    const matchedShipment = shipmentsList.find(s => {
      const client = (s.client || s.branch || '').trim();
      if (isInvalidTakerName(client)) return false;

      if (trip.cteNumber && s.dispatch && s.dispatch.trim() === trip.cteNumber.trim()) return true;
      if (trip.invoiceNumber && s.ppte && s.ppte.trim() === trip.invoiceNumber.trim()) return true;

      // Mesma placa e mesma data
      if (trip.truckPlate && s.plate && normalizeTakerText(s.plate) === normalizeTakerText(trip.truckPlate)) {
        if (trip.date && s.shipmentDate && trip.date === s.shipmentDate) return true;
        // Mesma placa e mesma rota
        if (tripOrigNorm && tripDestNorm && normalizeTakerText(s.origin) === tripOrigNorm && normalizeTakerText(s.destination) === tripDestNorm) return true;
      }

      // Mesma rota e data
      if (tripOrigNorm && tripDestNorm && normalizeTakerText(s.origin) === tripOrigNorm && normalizeTakerText(s.destination) === tripDestNorm) {
        if (trip.date && s.shipmentDate && trip.date === s.shipmentDate) return true;
      }

      return false;
    });

    if (matchedShipment) {
      const client = (matchedShipment.client || matchedShipment.branch || '').trim();
      if (!isInvalidTakerName(client)) {
        return client.toUpperCase();
      }
    }
  }

  // 5. Escanear texto do Terminal de Descarga, Notas ou Destino por tradings conhecidas
  const knownTakers = [...AGRO_TRADINGS];
  freightsList.forEach(f => {
    const t = (f.serviceTaker || '').trim().toUpperCase();
    if (!isInvalidTakerName(t) && !knownTakers.includes(t)) {
      knownTakers.push(t);
    }
  });

  const fullTripText = normalizeTakerText(`${trip.dischargeTerminal || ''} ${trip.notes || ''} ${trip.destination || ''} ${trip.location || ''}`);
  const sortedTakers = [...knownTakers].sort((a, b) => b.length - a.length);
  for (const kt of sortedTakers) {
    const ktNorm = normalizeTakerText(kt);
    if (ktNorm.length >= 3) {
      const regex = new RegExp(`(^|[^A-Z0-9])${ktNorm}([^A-Z0-9]|$)`, 'i');
      if (regex.test(fullTripText)) {
        return kt;
      }
    }
  }

  // 6. Correspondência pelo Destino na base de fretes
  if (tripDestNorm) {
    const destFreights = freightsList.filter(f => !isInvalidTakerName(f.serviceTaker) && normalizeTakerText(f.destination) === tripDestNorm);
    if (destFreights.length > 0) {
      return destFreights[0].serviceTaker.toUpperCase().trim();
    }
  }

  // 7. Correspondência pela Origem na base de fretes
  if (tripOrigNorm) {
    const origFreights = freightsList.filter(f => !isInvalidTakerName(f.serviceTaker) && normalizeTakerText(f.origin) === tripOrigNorm);
    if (origFreights.length > 0) {
      const firstTaker = origFreights[0].serviceTaker.toUpperCase().trim();
      const allSame = origFreights.every(f => f.serviceTaker.toUpperCase().trim() === firstTaker);
      if (allSame) return firstTaker;
    }
  }

  return '';
}
