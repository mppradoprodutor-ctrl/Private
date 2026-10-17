
import { Download, PlusCircle, Save, Plus, Building2, Loader2, FileText, Phone, Scale, MapPin, Mail } from 'lucide-react';
import { toBlob, toPng } from 'html-to-image';
import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import React, { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import { Driver, Freight, Trip, OperationalUnit } from '../types';
import LoadingOrderTemplate from './LoadingOrderTemplate';

interface LoadingOrderViewProps {
  freights: Freight[];
  drivers: Driver[];
  trips: Trip[];
  operationalUnits?: OperationalUnit[];
  activeOperationalUnitId?: string;
  onOpenManageUnits?: () => void;
  onGenerateTrip: (tripData: Omit<Trip, 'id' | 'createdAt'>) => void;
}

const LoadingOrderView: React.FC<LoadingOrderViewProps> = ({ 
  freights, 
  drivers, 
  trips, 
  operationalUnits = [], 
  activeOperationalUnitId,
  onOpenManageUnits,
  onGenerateTrip 
}) => {
  const [selectedFreight, setSelectedFreight] = useState<Freight | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<string>(() => {
    return activeOperationalUnitId || operationalUnits[0]?.id || '';
  });
  const [selectedDeliveryUnitId, setSelectedDeliveryUnitId] = useState<string>(() => {
    return activeOperationalUnitId || operationalUnits[0]?.id || '';
  });

  // Campos manuais/opcionais para permitir preenchimento flexível
  const [manualLocation, setManualLocation] = useState('');
  const [manualOrigin, setManualOrigin] = useState('');
  const [manualState, setManualState] = useState('');
  const [manualProduct, setManualProduct] = useState('');
  const [manualDriverName, setManualDriverName] = useState('');
  const [manualCpf, setManualCpf] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualTruckPlate, setManualTruckPlate] = useState('');
  const [manualTrailer1, setManualTrailer1] = useState('');
  const [manualTrailer2, setManualTrailer2] = useState('');
  const [manualDolly, setManualDolly] = useState('');
  const [manualAxles, setManualAxles] = useState('');
  const [manualNetWeight, setManualNetWeight] = useState('');

  const [isDownloading, setIsDownloading] = useState(false);
  const [hasGeneratedOrder, setHasGeneratedOrder] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const isDownloadingRef = useRef(false);
  const lastDownloadTimeRef = useRef(0);

  useEffect(() => {
    if (activeOperationalUnitId && (!selectedUnitId || !operationalUnits.some(u => u.id === selectedUnitId))) {
      setSelectedUnitId(activeOperationalUnitId);
    } else if (!selectedUnitId && operationalUnits.length > 0) {
      setSelectedUnitId(operationalUnits[0].id);
    }
    if (!selectedDeliveryUnitId && operationalUnits.length > 0) {
      setSelectedDeliveryUnitId(activeOperationalUnitId || operationalUnits[0].id);
    }
  }, [activeOperationalUnitId, operationalUnits, selectedUnitId, selectedDeliveryUnitId]);

  const selectedUnit = useMemo(() => {
    return operationalUnits.find(u => u.id === selectedUnitId) || operationalUnits[0] || {
      id: 'default',
      cnpj: '29.543.880/0001-24',
      name: 'Matriz'
    };
  }, [operationalUnits, selectedUnitId]);

  // Unidade / CNPJ selecionado especificamente para o Local de Entrega
  const selectedDeliveryUnit = useMemo(() => {
    if (selectedDeliveryUnitId === 'custom') return null;
    if (selectedDeliveryUnitId) {
      return operationalUnits.find(u => u.id === selectedDeliveryUnitId) || null;
    }
    return selectedUnit || null;
  }, [operationalUnits, selectedDeliveryUnitId, selectedUnit]);

  const deliveryAddress = useMemo(() => {
    if (!selectedDeliveryUnit) return '';
    return [
      selectedDeliveryUnit.street ? `${selectedDeliveryUnit.street}${selectedDeliveryUnit.number ? `, ${selectedDeliveryUnit.number}` : ''}` : '',
      selectedDeliveryUnit.neighborhood || ''
    ].filter(Boolean).join(' - ');
  }, [selectedDeliveryUnit]);

  const deliveryCityState = useMemo(() => {
    if (!selectedDeliveryUnit) return '';
    return selectedDeliveryUnit.city ? `${selectedDeliveryUnit.city}${selectedDeliveryUnit.state ? ` - ${selectedDeliveryUnit.state}` : ''}` : (selectedDeliveryUnit.state || '');
  }, [selectedDeliveryUnit]);

  const handleDeliveryUnitChange = (unitId: string) => {
    setSelectedDeliveryUnitId(unitId);
    if (unitId === 'custom') {
      return;
    }
    const unit = operationalUnits.find(u => u.id === unitId);
    if (unit) {
      const citySt = unit.city ? `${unit.city}${unit.state ? ` - ${unit.state}` : ''}` : (unit.state || '');
    }
  };

  const companyName = (typeof window !== 'undefined' && localStorage.getItem('tp_system_company_name')) || 'MY SYSTEM';
  const effectiveCompanyName = selectedUnit?.companyName || companyName;
  const effectiveAddress = [
    selectedUnit?.street ? `${selectedUnit.street}${selectedUnit.number ? `, ${selectedUnit.number}` : ''}` : '',
    selectedUnit?.neighborhood || ''
  ].filter(Boolean).join(' - ');
  const effectiveCityState = selectedUnit?.city ? `${selectedUnit.city}${selectedUnit.state ? ` - ${selectedUnit.state}` : ''}` : (selectedUnit?.state || '');

  const [loadingDate, setLoadingDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentType, setPaymentType] = useState('Pix');
  const [notes, setNotes] = useState('');
  const [orderNumber, setOrderNumber] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('tp_system_loading_order_seq');
      if (saved !== null) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
      // Se não houver salvo ou for 0, calcula a partir do maior número de ordem das viagens
      const maxTripOrder = trips.reduce((max, t) => {
        const num = typeof t.orderNumber === 'number' ? t.orderNumber : parseInt(String(t.orderNumber || 0), 10);
        return !isNaN(num) && num > max ? num : max;
      }, 0);
      return maxTripOrder > 0 ? maxTripOrder + 1 : 1;
    } catch (e) {
      return 1;
    }
  });

  // Garante que o número nunca fique 0 ou nulo
  useEffect(() => {
    if (!orderNumber || orderNumber <= 0) {
      const maxTripOrder = trips.reduce((max, t) => {
        const num = typeof t.orderNumber === 'number' ? t.orderNumber : parseInt(String(t.orderNumber || 0), 10);
        return !isNaN(num) && num > max ? num : max;
      }, 0);
      const initial = maxTripOrder > 0 ? maxTripOrder + 1 : 1;
      setOrderNumber(initial);
      try {
        localStorage.setItem('tp_system_loading_order_seq', initial.toString());
      } catch (e) {}
    }
  }, [trips, orderNumber]);
  
  const orderRef = useRef<HTMLDivElement>(null);

  const paymentTypes = ['Pix', 'Carta Frete', 'PagBem', 'Cheque'];

  // Função utilitária para extrair os locais cadastrados na Base de Fretes
  const getFreightLoadingLocation = useCallback((f: Freight | null | undefined): string => {
    if (!f) return '';
    // O PDF deve reproduzir exatamente o Local de Coleta da Base de Fretes.
    // collectionAddress é apenas compatibilidade para cadastros antigos sem location.
    return (f.location || f.collectionAddress || '').trim();
  }, []);

  // Pré-carrega o primeiro frete ou frete com local salvo na Base de Fretes assim que abre o menu
  useEffect(() => {
    if (!selectedFreight && freights.length > 0 && !manualLocation) {
      const defaultFreight = freights.find(f => f.location || f.collectionAddress) || freights[0];
      if (defaultFreight) {
        setSelectedFreight(defaultFreight);
        const loc = getFreightLoadingLocation(defaultFreight);
        if (loc) setManualLocation(loc);
        if (!manualOrigin) setManualOrigin(defaultFreight.origin || '');
        if (!manualState) setManualState(defaultFreight.state || '');
        if (!manualProduct) setManualProduct(defaultFreight.product || '');
      }
    }
  }, [freights, selectedFreight, manualLocation, manualOrigin, manualState, manualProduct, getFreightLoadingLocation]);

  const sortedFreights = useMemo(() => {
    return [...freights].sort((a, b) => {
      const locA = getFreightLoadingLocation(a);
      const locB = getFreightLoadingLocation(b);
      const displayA = `${locA ? `[${locA}] ` : ''}${a.origin || ''} -> ${a.destination || ''}`.toLowerCase();
      const displayB = `${locB ? `[${locB}] ` : ''}${b.origin || ''} -> ${b.destination || ''}`.toLowerCase();
      return displayA.localeCompare(displayB, 'pt-BR');
    });
  }, [freights, getFreightLoadingLocation]);

  const handleFreightChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const idSelecionado = e.target.value;
    const baseDeFretes = freights;
    const rota = baseDeFretes.find(r => r.id === idSelecionado) || null;
    const freight = rota;
    setSelectedFreight(freight);
    if (freight) {
      // Pega o Local de Carregamento cadastrado na Base de Fretes
      const registeredLoc = getFreightLoadingLocation(freight);
      setManualLocation(registeredLoc);
      setManualOrigin(freight.origin || '');
      setManualState(freight.state || '');
      setManualProduct(freight.product || '');
    } else {
      setManualLocation('');
      setManualOrigin('');
      setManualState('');
      setManualProduct('');
    }
  };

  const cleanTruckPlate = (raw: string): string => {
    if (!raw) return '';
    // Identifica placa padrão ou Mercosul caso o texto colado contenha pontuação, espaço ou prefixo (ex: "ABC-1234", "Placa: ABC 1D23")
    const plateMatch = raw.match(/([a-zA-Z]{3})\s*[-_./\s]?\s*([0-9][a-zA-Z0-9][0-9]{2})/);
    if (plateMatch) {
      return `${plateMatch[1]}${plateMatch[2]}`.toUpperCase();
    }
    // Remove todo caracter que não seja uma letra ou um número
    return raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 7);
  };

  const handleTruckPlateChange = (val: string) => {
    // Exclui todo tipo de caracter mantendo apenas letras e números ajustados
    const clean = cleanTruckPlate(val);
    setManualTruckPlate(clean);

    if (!clean) {
      setSelectedDriver(null);
      setManualDriverName('');
      setManualCpf('');
      setManualPhone('');
      setManualTrailer1('');
      setManualTrailer2('');
      setManualDolly('');
      setManualAxles('');
      setManualNetWeight('');
      return;
    }

    // Verifica se a placa digitada bate com algum motorista cadastrado (sem caracteres especiais)
    const match = drivers.find(d => (d.truckPlate || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase() === clean);
    if (match) {
      setSelectedDriver(match);
      setManualDriverName(match.name || '');
      setManualCpf(match.cpf || '');
      setManualPhone(match.phone || '');
      setManualTrailer1(match.trailer1 || '');
      setManualTrailer2(match.trailer2 || '');
      setManualDolly(match.dolly || '');
      setManualAxles(match.axisCount ? String(match.axisCount) : '');
      setManualNetWeight(match.netWeight ? String(match.netWeight) : '');

      // Se nenhum frete foi selecionado manualmente, tenta associar a última rota do motorista ou a Base de Fretes
      if (!selectedFreight) {
        const lastTrip = trips.find(t => (t.truckPlate || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase() === clean && (t.location || t.origin));
        if (lastTrip) {
          const matchingFreight = freights.find(f => 
            f.origin?.trim().toLowerCase() === lastTrip.origin?.trim().toLowerCase() &&
            (f.location || f.collectionAddress)
          ) || freights.find(f => f.origin?.trim().toLowerCase() === lastTrip.origin?.trim().toLowerCase());

          if (matchingFreight) {
            setSelectedFreight(matchingFreight);
            const loc = getFreightLoadingLocation(matchingFreight);
            if (loc) setManualLocation(loc);
            if (!manualOrigin) setManualOrigin(matchingFreight.origin || lastTrip.origin || '');
            if (!manualState) setManualState(matchingFreight.state || lastTrip.originState || '');
            if (!manualProduct) setManualProduct(matchingFreight.product || lastTrip.product || '');
          } else if (lastTrip.location) {
            setManualLocation(lastTrip.location);
            if (!manualOrigin) setManualOrigin(lastTrip.origin || '');
            if (!manualState) setManualState(lastTrip.originState || '');
            if (!manualProduct) setManualProduct(lastTrip.product || '');
          }
        }
      }
    } else {
      setSelectedDriver(null);
      setManualDriverName('');
      setManualCpf('');
      setManualPhone('');
      setManualTrailer1('');
      setManualTrailer2('');
      setManualDolly('');
      setManualAxles('');
      setManualNetWeight('');
    }
  };

  const handlePhoneInputChange = (val: string) => {
    // Permite digitar qualquer caractere, ajustando para apenas letras e números (alfanumérico)
    const cleaned = val
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');
    setManualPhone(cleaned);
  };

  // Resolução efetiva dos dados do espelho (prioriza preenchimento manual ou seleção do cadastro na Base de Fretes)
  const displayLocation = useMemo(() => {
    // O espelho deve usar somente a rota selecionada. manualLocation começa com o
    // cadastro da rota e continua editável quando o cadastro não possui o dado.
    if (manualLocation.trim()) return manualLocation.trim();
    if (selectedFreight) return getFreightLoadingLocation(selectedFreight);
    return '';
  }, [manualLocation, selectedFreight, getFreightLoadingLocation]);

  const displayOrigin = manualOrigin || selectedFreight?.origin || '';
  const displayState = manualState || selectedFreight?.state || '';
  const displayProduct = manualProduct || selectedFreight?.product || '';
  const selectedOrigin = selectedFreight?.originDetails || selectedFreight?.origem;
  // O espelho usa exclusivamente os dados da rota selecionada na Base de Fretes.
  // LOCAL é a empresa exibida no card; ORIGEM/UF formam a cidade da coleta.
  const loadingOriginCompany = selectedFreight?.location || selectedOrigin?.companyName || selectedFreight?.origin || manualOrigin;
  const loadingOriginCnpj = selectedOrigin?.cnpj || '';
  const loadingOriginAddress = selectedFreight?.collectionAddress?.trim() || selectedOrigin?.address || selectedFreight?.location || manualLocation || '';
  const loadingOriginCityState = `${selectedFreight?.origin || selectedOrigin?.city || displayOrigin}${selectedFreight?.state || selectedOrigin?.state || displayState ? ` - ${selectedFreight?.state || selectedOrigin?.state || displayState}` : ''}`;
  const loadingOriginContact = selectedOrigin?.contact || '';
  const loadingOriginPhone = selectedOrigin?.phone || '';

  // Resolução efetiva do Local de Entrega (acompanha o CNPJ de entrega selecionado)
  const displayDeliveryLocation = useMemo(() => {
    if (selectedDeliveryUnit) {
      const citySt = selectedDeliveryUnit.city ? `${selectedDeliveryUnit.city}${selectedDeliveryUnit.state ? ` - ${selectedDeliveryUnit.state}` : ''}` : (selectedDeliveryUnit.state || '');
      return `${selectedDeliveryUnit.name && selectedDeliveryUnit.name !== 'Matriz' ? `[${selectedDeliveryUnit.name}] ` : ''}${selectedDeliveryUnit.companyName || citySt || 'Matriz'}`;
    }
    if (selectedFreight) {
      if (selectedFreight.dischargeTerminal && selectedFreight.destination) {
        return `${selectedFreight.dischargeTerminal} - ${selectedFreight.destination}${selectedFreight.destinationState ? `/${selectedFreight.destinationState}` : ''}`;
      }
      if (selectedFreight.dischargeTerminal) return selectedFreight.dischargeTerminal;
      if (selectedFreight.destination) {
        return `${selectedFreight.destination}${selectedFreight.destinationState ? ` - ${selectedFreight.destinationState}` : ''}`;
      }
    }
    // Acompanha a Unidade Operacional / CNPJ do cabeçalho
    if (effectiveCityState || selectedUnit?.name) {
      return `${selectedUnit?.name && selectedUnit?.name !== 'Matriz' ? `[${selectedUnit.name}] ` : ''}${effectiveCityState || effectiveAddress || selectedUnit?.name || 'Matriz'}`;
    }
    return '---';
  }, [selectedDeliveryUnit, selectedFreight, effectiveCityState, selectedUnit, effectiveAddress]);

  const displayDriverName = manualDriverName || selectedDriver?.name || '';
  const displayCpf = manualCpf || selectedDriver?.cpf || '';
  const displayPhone = manualPhone || selectedDriver?.phone || '';
  const displayTruckPlate = manualTruckPlate || selectedDriver?.truckPlate || '';
  const displayTrailer1 = manualTrailer1 || selectedDriver?.trailer1 || '';
  const displayTrailer2 = manualTrailer2 || selectedDriver?.trailer2 || '';
  const displayDolly = manualDolly || selectedDriver?.dolly || '';
  const displayAxles = manualAxles 
    ? (manualAxles.toLowerCase().includes('eixo') ? manualAxles : `${manualAxles} Eixos`)
    : (selectedDriver?.axisCount ? `${selectedDriver.axisCount} Eixos` : '---');
  const displayNetWeight = manualNetWeight || (selectedDriver?.netWeight ? String(selectedDriver.netWeight) : '');

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

  const generateLoadingOrderPdf = async (customOrderNum?: number): Promise<boolean> => {
    if (!orderRef.current) return false;
    let imgDataUrl: string = '';
    try {
      imgDataUrl = await toPng(orderRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: '#ffffff',
        style: {
          margin: '0',
          transform: 'none'
        }
      });
    } catch (err) {
      console.warn('Tentativa com toPng falhou, usando html2canvas como contingência:', err);
      const canvas = await html2canvas(orderRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      imgDataUrl = canvas.toDataURL('image/png');
    }

    if (!imgDataUrl) return false;

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

    const plate = displayTruckPlate ? `_${displayTruckPlate.replace(/[^a-zA-Z0-9]/g, '')}` : '';
    const currentNum = customOrderNum !== undefined ? customOrderNum : (orderNumber || 1);
    const orderId = `_N${currentNum}`;
    
    // Converte em Blob e dispara o download sem alterar tela cheia
    const pdfBlob = pdf.output('blob');
    const rawDriverName = (displayDriverName || '').trim();
    const sanitizedDriverName = rawDriverName.replace(/[\/\\?%*:|"<>]/g, '').trim();
    const fileName = sanitizedDriverName ? `${sanitizedDriverName}.pdf` : `Ordem_Carregamento${orderId}${plate}.pdf`;
    downloadBlob(pdfBlob, fileName);
    return true;
  };

  const handleGenerateAndSave = () => {
    const currentOrderNum = orderNumber || 1;
    const origin = displayOrigin || 'A DEFINIR';
    const destination = selectedDeliveryUnit?.city || selectedFreight?.destination || selectedUnit?.city || 'A DEFINIR';
    const truckPlate = displayTruckPlate || 'S/ PLACA';
    const driverName = displayDriverName || 'MOTORISTA';

    const tripData: Omit<Trip, 'id' | 'createdAt'> = {
      date: loadingDate,
      location: displayLocation,
      origin: origin,
      originState: displayState,
      destination: destination,
      destinationState: selectedDeliveryUnit?.state || selectedFreight?.destinationState || selectedUnit?.state || '',
  dischargeTerminal: '',
      cteNumber: '',
      invoiceNumber: '',
      companyTariff: selectedFreight?.companyTariff || 0,
      driverTariff: selectedFreight?.driverTariff || 0,
      truckPlate: truckPlate,
      driverName: driverName,
      driverPhone: displayPhone,
      serviceTaker: selectedFreight?.serviceTaker || '',
      product: displayProduct,
      weight: parseFloat(displayNetWeight.replace(/\./g, '').replace(',', '.')) || selectedDriver?.netWeight || 0,
      paymentType: (paymentType.toUpperCase() === 'CF' || paymentType.toUpperCase() === 'CARTA FRETE') ? 'Carta Frete' : paymentType,
      notes: notes.trim(),
      status: 'Pendente',
      pendingDocument: 'Documento de Viagem',
      deductIcms: selectedFreight?.deductIcms || false,
      icmsRate: selectedFreight?.icmsRate || 0,
      orderNumber: currentOrderNum,
      operationalUnitCnpj: selectedUnit?.cnpj,
      operationalUnitName: selectedUnit?.name,
      operationalUnitCompanyName: selectedUnit?.companyName,
      operationalUnitIe: selectedUnit?.stateRegistration,
      operationalUnitStreet: selectedUnit?.street,
      operationalUnitNumber: selectedUnit?.number,
      operationalUnitNeighborhood: selectedUnit?.neighborhood,
      operationalUnitCity: selectedUnit?.city,
      operationalUnitState: selectedUnit?.state
    };

    onGenerateTrip(tripData);
    setHasGeneratedOrder(true);
    setNotes('');

    const nextNum = currentOrderNum + 1;
    setOrderNumber(nextNum);
    try {
      localStorage.setItem('tp_system_loading_order_seq', nextNum.toString());
    } catch (e) {
      console.error("Erro ao salvar sequencial de ordem:", e);
    }
  };

  const handleSendByEmail = async () => {
  const recipient = selectedFreight?.emailDestino?.trim();
  if (!recipient) {
    alert('Cadastre o e-mail da rota');
    return;
  }
  setIsSendingEmail(true);
  setEmailStatus(null);
  try {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    const orderNum = orderNumber || '3167';
    const cavalo = 'HKH0B84';
    const pdfBase64 = doc.output('datauristring');
    const resp = await fetch('/api/enviar-ordem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: recipient, subject: `Ordem ${orderNum}`, html: `<p>Ordem ${orderNum}</p>`, pdfBase64 })
    });
    if (!resp.ok) throw new Error('Falha no envio');
    setEmailStatus({ type: 'success', message: 'Enviado!' });
  } catch (e: any) {
    setEmailStatus({ type: 'error', message: e.message });
  } finally {
    setIsSendingEmail(false);
  }
};
const handleDownloadPdf = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const now = Date.now();
    // Trava estrita contra clique duplo ou download simultâneo: 1 arquivo por clique
    if (isDownloadingRef.current || (now - lastDownloadTimeRef.current < 1500)) {
      return;
    }
    const handleDownloadPdf = async (e?: React.MouseEvent) => {
  if (e) { e.preventDefault(); e.stopPropagation(); }
  const now = Date.now();
  if (isDownloadingRef.current || (now - lastDownloadTimeRef.current < 1500)) return;
  isDownloadingRef.current = true;
  lastDownloadTimeRef.current = now;
  try {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    const orderNum = orderNumber || '3167';
    const dataColeta = '17/10/2026';
    const cavalo = 'HKH0B84';
    const carreta = 'RWI5E63';
    const motorista = 'JEVERSON DE ARAUJO ALVES';
    const cpf = '08536098961';

    doc.setFont('helvetica','bold'); doc.setFontSize(14);
    doc.text('GERA TRANSPORTES',10,15);
    doc.setFont('helvetica','normal'); doc.setFontSize(8);
    doc.text('CNPJ: 33.777.479/0001-26 - (FILIAL)',10,20);
    doc.text('EST LIN ARUANA, 329 - ZONA RURAL - CASTILHO - SP',10,24);
    doc.setFillColor(20,20,20); doc.roundedRect(130,8,70,12,2,2,'F');
    doc.setTextColor(255); doc.text('ORDEM DE CARREGAMENTO',132,13); doc.text(`Nº ${orderNum}`,132,17);
    doc.setTextColor(0); doc.line(10,28,200,28);
    doc.setFontSize(8); doc.setFont('helvetica','bold'); doc.text('DADOS DA OPERAÇÃO',10,36);
    doc.setDrawColor(230); doc.roundedRect(10,40,85,50,3,3,'S'); doc.roundedRect(105,40,85,50,3,3,'S');
    doc.setFontSize(8); doc.text('LOCAL DE COLETA',15,46); doc.setFont('helvetica','normal'); doc.setFontSize(6);
    doc.text('EMPRESA',15,51); doc.setFont('helvetica','bold'); doc.text('VITERRA NU',15,54);
    doc.setFont('helvetica','normal'); doc.text('CIDADE/UF',15,65); doc.setFont('helvetica','bold'); doc.text('GUARARAPES - SP',15,68);
    doc.setFont('helvetica','bold'); doc.text('LOCAL DE ENTREGA',110,46); doc.setFont('helvetica','normal'); doc.setFontSize(6);
    doc.text('EMPRESA',110,51); doc.setFont('helvetica','bold'); doc.text('GERA TRANSPORTES',110,54);
    doc.text('CNPJ',110,57); doc.text('33.777.479/0001-26',110,60);
    doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.text('PRODUTO',10,98); doc.text('PESO LÍQUIDO',70,98);
    doc.setFontSize(10); doc.setTextColor(180,0,0); doc.text('BAGAÇO',10,103); doc.setTextColor(0); doc.text('32 TN',70,103);
    doc.setFontSize(8); doc.text('VEÍCULO E PLACAS',10,112); doc.setFillColor(0); doc.roundedRect(10,115,35,7,2,2,'F');
    doc.setTextColor(255); doc.setFontSize(7); doc.text(`Cavalo: ${cavalo}`,12,120); doc.setTextColor(0);
    doc.setDrawColor(220); doc.roundedRect(50,115,40,7,2,2,'S'); doc.text(`Carreta 1: ${carreta}`,52,120);
    doc.text('QUANTIDADE DE EIXO',130,115); doc.setFontSize(9); doc.text('6 Eixos',130,120);
    doc.setFontSize(8); doc.text('DADOS DO MOTORISTA',10,132); doc.setFontSize(6); doc.text('NOME COMPLETO',10,136); doc.text('CPF',80,136);
    doc.setFontSize(8); doc.setFont('helvetica','bold'); doc.text(motorista,10,140); doc.text(cpf,80,140);
    doc.save(`Ordem_${orderNum}_${cavalo}.pdf`);
  } finally { isDownloadingRef.current = false; }
};


