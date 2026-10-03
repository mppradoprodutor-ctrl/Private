
import { Download, PlusCircle, Save, Plus, Building2, Loader2, FileText, Phone, Scale, MapPin } from 'lucide-react';
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
      cnpj: '33.777.479/0001-26',
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

  const companyName = (typeof window !== 'undefined' && localStorage.getItem('tp_system_company_name')) || 'GERA TRANSPORTES (CASTILHO/SP)';
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
    setNotes('');

    const nextNum = currentOrderNum + 1;
    setOrderNumber(nextNum);
    try {
      localStorage.setItem('tp_system_loading_order_seq', nextNum.toString());
    } catch (e) {
      console.error("Erro ao salvar sequencial de ordem:", e);
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
    if (!orderRef.current) return;

    isDownloadingRef.current = true;
    lastDownloadTimeRef.current = now;
    setIsDownloading(true);

    try {
      const currentNum = orderNumber || 1;
      const success = await generateLoadingOrderPdf(currentNum);
      if (success) {
        // Segue a sequência automaticamente após o download do PDF
        const nextNum = currentNum + 1;
        setOrderNumber(nextNum);
        try {
          localStorage.setItem('tp_system_loading_order_seq', nextNum.toString());
        } catch (e) {
          console.error("Erro ao salvar sequencial de ordem:", e);
        }
      } else {
        throw new Error("Não foi possível renderizar o arquivo PDF.");
      }
    } catch (error) {
      console.error("Erro ao exportar Ordem em PDF:", error);
      alert("Houve uma instabilidade ao gerar o arquivo PDF. Por favor, tente novamente.");
    } finally {
      setTimeout(() => {
        isDownloadingRef.current = false;
        setIsDownloading(false);
      }, 800);
    }
  };

  const handleDownloadPng = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const now = Date.now();
    if (isDownloadingRef.current || (now - lastDownloadTimeRef.current < 1500)) {
      return;
    }
    if (!orderRef.current) return;

    isDownloadingRef.current = true;
    lastDownloadTimeRef.current = now;
    setIsDownloading(true);

    try {
      let blob: Blob | null = null;
      try {
        blob = await toBlob(orderRef.current, {
          pixelRatio: 2,
          cacheBust: true,
          backgroundColor: '#ffffff',
          style: {
            margin: '0',
            transform: 'none'
          }
        });
      } catch (err) {
        console.warn('Tentativa com toBlob falhou, usando html2canvas como contingência:', err);
        const canvas = await html2canvas(orderRef.current, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff'
        });
        blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      }

      if (blob) {
        const plate = displayTruckPlate ? `_${displayTruckPlate.replace(/[^a-zA-Z0-9]/g, '')}` : '';
        const currentNum = orderNumber || 1;
        const orderId = `_N${currentNum}`;
        const rawDriverName = (displayDriverName || '').trim();
        const sanitizedDriverName = rawDriverName.replace(/[\/\\?%*:|"<>]/g, '').trim();
        const fileName = sanitizedDriverName ? `${sanitizedDriverName}.png` : `Ordem_Carregamento${orderId}${plate}.png`;
        downloadBlob(blob, fileName);

        const nextNum = currentNum + 1;
        setOrderNumber(nextNum);
        try {
          localStorage.setItem('tp_system_loading_order_seq', nextNum.toString());
        } catch (e) {
          console.error("Erro ao salvar sequencial de ordem:", e);
        }
      } else {
        throw new Error("Não foi possível renderizar a imagem.");
      }
    } catch (error) {
      console.error("Erro ao exportar Ordem em PNG:", error);
      alert("Houve uma instabilidade ao gerar o arquivo PNG. Por favor, tente novamente.");
    } finally {
      setTimeout(() => {
        isDownloadingRef.current = false;
        setIsDownloading(false);
      }, 800);
    }
  };

  return (
    <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-3 pb-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black text-slate-900 uppercase leading-none">Gerador de Ordem</h2>
          <p className="text-slate-500 text-[8px] font-black uppercase tracking-wider mt-0.5">Geração de documentos de carga e integração automática.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="space-y-2.5">
            <h4 className="text-[10px] font-black uppercase tracking-[0.1em] text-red-600 flex items-center gap-1.5">
              <PlusCircle size={12} /> Configuração da Ordem
            </h4>
            
            <div className="space-y-2">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <Building2 size={10} className="text-red-600" /> Unidade Operacional (CNPJ Emissor)
                  </label>
                  {onOpenManageUnits && (
                    <button
                      type="button"
                      onClick={onOpenManageUnits}
                      className="text-[8.5px] font-bold text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer hover:underline"
                      title="Adicionar ou gerenciar CNPJs da Unidade Operacional"
                    >
                      <Plus size={10} /> Adicionar CNPJ
                    </button>
                  )}
                </div>
                <select 
                  value={selectedUnitId} 
                  onChange={e => setSelectedUnitId(e.target.value)} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none focus:ring-1 focus:ring-red-200 cursor-pointer transition-all"
                >
                  {operationalUnits.map(unit => (
                    <option key={unit.id} value={unit.id}>
                      {unit.cnpj} — {unit.companyName || unit.name || 'Unidade'}{unit.city ? ` (${unit.city}/${unit.state || ''})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Selecione a Rota (Base de Fretes)</label>
                <select 
                  value={selectedFreight?.id || ''} 
                  onChange={handleFreightChange} 
                  className="w-full bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-semibold outline-none focus:ring-1 focus:ring-blue-100 transition-all cursor-pointer"
                >
                  <option value="">-- Selecione uma Rota (Opcional) --</option>
                  {sortedFreights.map(f => {
                    const loc = getFreightLoadingLocation(f);
                    return (
                      <option key={f.id} value={f.id}>
                        {loc ? `[${loc}] ` : ''}{f.origin || 'S/ Origem'}{f.state ? `-${f.state}` : ''} {'➔'} {f.destination || 'S/ Destino'} {f.product ? `(${f.product})` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Local de Entrega com Lista Suspensa de todos os CNPJs do Sistema */}
              <div className="space-y-2 bg-slate-50/80 p-2.5 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="block text-[8px] font-black text-slate-700 uppercase tracking-widest flex items-center gap-1">
                    <MapPin size={11} className="text-red-600" /> Local de Entrega (CNPJ Destinatário)
                  </label>
                  {selectedDeliveryUnit && (
                    <span className="text-[7.5px] font-mono font-black text-slate-800 bg-white border border-slate-200 px-1.5 py-0.5 rounded shadow-2xs">
                      CNPJ: {selectedDeliveryUnit.cnpj}
                    </span>
                  )}
                </div>

                {/* Lista Suspensa com todos os CNPJs salvos no sistema */}
                <div>
                  <select
                    value={selectedDeliveryUnitId}
                    onChange={e => handleDeliveryUnitChange(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-red-200 cursor-pointer shadow-2xs transition-all"
                  >
                    <option value="">
                      -- Selecione o CNPJ de Entrega ({operationalUnits.length} cadastrados) --
                    </option>
                    {operationalUnits.map(unit => {
                      const addr = [
                        unit.street ? `${unit.street}${unit.number ? `, ${unit.number}` : ''}` : '',
                        unit.neighborhood || ''
                      ].filter(Boolean).join(' - ');
                      const citySt = unit.city ? `${unit.city}/${unit.state || ''}` : (unit.state || '');
                      return (
                        <option key={unit.id} value={unit.id}>
                          {unit.cnpj} — {unit.companyName || unit.name || 'Unidade'}{citySt ? ` • ${citySt}` : ''}{addr ? ` • ${addr}` : ''}{unit.stateRegistration ? ` • IE: ${unit.stateRegistration}` : ''}
                        </option>
                      );
                    })}
                    <option value="custom">✏️ Digitação Manual / Destino da Rota</option>
                  </select>
                </div>

                {/* Exibição detalhada dos dados do CNPJ selecionado */}
                {selectedDeliveryUnit && (
                  <div className="bg-white border border-slate-200 rounded-lg p-2 text-[10px] space-y-1 shadow-2xs">
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-slate-900 uppercase font-black">
                        {selectedDeliveryUnit.companyName || selectedDeliveryUnit.name}
                        {selectedDeliveryUnit.name && selectedDeliveryUnit.companyName && selectedDeliveryUnit.name !== selectedDeliveryUnit.companyName ? ` (${selectedDeliveryUnit.name})` : ''}
                      </span>
                      {selectedDeliveryUnit.stateRegistration && (
                        <span className="text-slate-500 font-mono text-[9px] bg-slate-100 border border-slate-200 px-1 py-0.2 rounded">
                          IE: {selectedDeliveryUnit.stateRegistration}
                        </span>
                      )}
                    </div>
                    {(deliveryAddress || deliveryCityState) && (
                      <p className="text-slate-600 font-medium">
                        {deliveryAddress ? `${deliveryAddress}` : ''}
                        {deliveryAddress && deliveryCityState ? ' • ' : ''}
                        <strong className="text-slate-800">{deliveryCityState}</strong>
                      </p>
                    )}
                  </div>
                )}

              </div>

              {/* Dados do Veículo e Telefone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    Placa do Veículo (Cavalo)
                  </label>
                  <input 
                    type="text"
                    placeholder="Ex: ABC1D23"
                    value={manualTruckPlate}
                    onChange={e => handleTruckPlateChange(e.target.value)}
                    onPaste={e => {
                      const text = e.clipboardData.getData('text');
                      if (text) {
                        e.preventDefault();
                        handleTruckPlateChange(text);
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 placeholder:text-slate-400 uppercase outline-none focus:ring-1 focus:ring-red-200 focus:bg-white transition-all font-mono"
                  />
                </div>

                <div className="hidden">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      <Phone size={10} className="text-red-600" /> Telefone do Motorista
                    </label>
                    <span className="text-[7px] font-bold text-slate-400">Letras e números</span>
                  </div>
                  <input 
                    type="text"
                    placeholder="Ex: 44999998888"
                    value={manualPhone}
                    onChange={e => handlePhoneInputChange(e.target.value)}
                    onPaste={e => {
                      const text = e.clipboardData.getData('text');
                      if (text) {
                        e.preventDefault();
                        handlePhoneInputChange(text);
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 placeholder:text-slate-400 uppercase outline-none focus:ring-1 focus:ring-red-200 focus:bg-white transition-all font-mono"
                    title="Digite qualquer caractere: o sistema ajusta mantendo apenas letras e números"
                  />
                </div>
              </div>

              {/* Nome do Motorista e CPF — preenchidos automaticamente e exibidos no espelho */}
              <div className="hidden grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    Nome do Motorista
                  </label>
                  <input 
                    type="text"
                    placeholder="Ex: JOAO SILVA"
                    value={manualDriverName}
                    onChange={e => setManualDriverName(e.target.value.toUpperCase())}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 uppercase outline-none focus:ring-1 focus:ring-red-200 focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    CPF do Motorista
                  </label>
                  <input 
                    type="text"
                    placeholder="Ex: 12345678900"
                    value={manualCpf}
                    onChange={e => setManualCpf(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 font-mono outline-none focus:ring-1 focus:ring-red-200 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="hidden">
                  <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                    <Scale size={10} className="text-red-600" /> Peso Líquido (TN)
                  </label>
                  <input 
                    type="text" 
                    placeholder="Ex: 37.500 ou 37,5" 
                    value={manualNetWeight} 
                    onChange={e => setManualNetWeight(e.target.value)} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 font-mono outline-none focus:ring-1 focus:ring-red-200 focus:bg-white transition-all" 
                    title="Peso líquido da carga ou capacidade líquida do veículo em TN"
                  />
                </div>
                <div>
                  <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Data da Coleta</label>
                  <input type="date" value={loadingDate} onChange={e => setLoadingDate(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-semibold outline-none focus:ring-1 focus:ring-blue-100" />
                </div>
                <div className="hidden">
                  <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Tipo de Pagamento</label>
                  <select 
                    value={paymentType} 
                    onChange={e => setPaymentType(e.target.value)} 
                    className="w-full bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-semibold outline-none focus:ring-1 focus:ring-blue-100 transition-all cursor-pointer"
                  >
                    {paymentTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="hidden">
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">
                    Nº Ordem de Carregamento (Sequência Automática)
                  </label>
                  <span className="text-[7.5px] font-bold text-slate-400">
                    Avança +1 ao baixar PDF ou lançar
                  </span>
                </div>
                <div className="flex gap-2">
                  <input 
                    type="number" 
                    min="1"
                    value={orderNumber} 
                    onChange={e => {
                      const val = parseInt(e.target.value, 10);
                      const num = isNaN(val) || val < 1 ? 1 : val;
                      setOrderNumber(num);
                      try {
                        localStorage.setItem('tp_system_loading_order_seq', num.toString());
                      } catch (err) {}
                    }} 
                    className="w-full bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-black text-red-700 outline-none focus:ring-1 focus:ring-red-100" 
                  />
                  <button 
                    type="button"
                    onClick={() => {
                      const next = (orderNumber || 1) + 1;
                      setOrderNumber(next);
                      try {
                        localStorage.setItem('tp_system_loading_order_seq', next.toString());
                      } catch (err) {}
                    }} 
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[9px] font-black uppercase transition-all shrink-0 cursor-pointer"
                    title="Avançar para o próximo número da sequência"
                  >
                    +1 Próximo
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      const maxTripOrder = trips.reduce((max, t) => {
                        const num = typeof t.orderNumber === 'number' ? t.orderNumber : parseInt(String(t.orderNumber || 0), 10);
                        return !isNaN(num) && num > max ? num : max;
                      }, 0);
                      const resetSeq = maxTripOrder > 0 ? maxTripOrder + 1 : 1;
                      setOrderNumber(resetSeq);
                      try {
                        localStorage.setItem('tp_system_loading_order_seq', resetSeq.toString());
                      } catch (err) {}
                    }} 
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg text-[8.5px] font-bold uppercase transition-all shrink-0 cursor-pointer"
                    title="Sincronizar sequência com as viagens existentes"
                  >
                    Sincronizar
                  </button>
                </div>
              </div>

              <div className="hidden">
                <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Anotações Internas / Observações</label>
                <input placeholder="" value={notes} onChange={e => setNotes(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-semibold outline-none focus:ring-1 focus:ring-blue-100" />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
            <button 
              type="button"
              onClick={handleGenerateAndSave} 
              disabled={isDownloading}
              className="w-full bg-red-600 text-white font-black text-[9px] uppercase tracking-wider py-2.5 rounded-lg shadow hover:bg-red-700 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              <Save size={13} /> Gerar Ordem e Lançar Viagem
            </button>
            <button 
              type="button"
              onClick={handleDownloadPdf} 
              disabled={isDownloading}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black text-[9px] uppercase tracking-wider py-2.5 rounded-lg shadow flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
            >
              {isDownloading ? (
                <>
                  <Loader2 size={13} className="animate-spin text-red-500" />
                  Baixando 1 Arquivo PDF...
                </>
              ) : (
                <>
                  <FileText size={13} className="text-red-500" />
                  Baixar Documento em PDF
                </>
              )}
            </button>
            <div className="flex items-center justify-between px-1">
              <p className="text-[7.5px] font-bold text-slate-400 uppercase tracking-widest">
                1 clique = 1 arquivo PDF baixado (A4 oficial)
              </p>
              <button
                type="button"
                onClick={handleDownloadPng}
                disabled={isDownloading}
                className="text-[8px] font-bold text-slate-500 hover:text-slate-800 underline uppercase cursor-pointer disabled:pointer-events-none"
                title="Baixar também cópia em formato de imagem PNG"
              >
                Opção PNG
              </button>
            </div>
          </div>
        </div>

        {/* Container exclusivo para download em alta definição, completamente sem scale para fidelidade 100% */}
        <div style={{ position: 'fixed', left: '-9999px', top: 0, zIndex: -1000, pointerEvents: 'none' }}>
          <LoadingOrderTemplate
            ref={orderRef}
            orderNumber={orderNumber || 1}
            collectionDate={loadingDate}
            loadingDate={loadingDate}
  loadingLocation={displayLocation}
  loadingOriginCompany={loadingOriginCompany}
  loadingOriginCnpj={loadingOriginCnpj}
  loadingOriginAddress={loadingOriginAddress}
  loadingOriginCityState={loadingOriginCityState}
  loadingOriginContact={loadingOriginContact}
  loadingOriginPhone={loadingOriginPhone}
  deliveryLocation={displayDeliveryLocation}
            deliveryUnit={selectedDeliveryUnit}
            deliveryCnpj={selectedDeliveryUnit ? selectedDeliveryUnit.cnpj : selectedUnit?.cnpj}
            deliveryCompanyName={selectedDeliveryUnit?.companyName}
            deliveryUnitName={selectedDeliveryUnit?.name}
            deliveryIe={selectedDeliveryUnit?.stateRegistration}
            deliveryAddress={deliveryAddress}
            deliveryCityState={deliveryCityState}
            origin={displayOrigin}
            originState={displayState}
            destination={selectedDeliveryUnit?.city || selectedFreight?.destination || selectedUnit?.city || ''}
            destinationState={selectedDeliveryUnit?.state || selectedFreight?.destinationState || selectedUnit?.state || ''}
            product={displayProduct}
            netWeight={displayNetWeight}
            truckPlate={displayTruckPlate}
            trailer1={displayTrailer1}
            trailer2={displayTrailer2}
            dolly={displayDolly}
            axles={displayAxles}
            driverName={displayDriverName}
            cpf={displayCpf}
            phone={displayPhone}
            companyName={effectiveCompanyName}
            cnpj={selectedUnit?.cnpj}
            ie={selectedUnit?.stateRegistration}
            address={effectiveAddress}
            cityState={effectiveCityState}
            unitName={selectedUnit?.name}
            freights={freights}
          />
        </div>

        {/* Pré-visualização na tela (espelho fiel) */}
        <div className="bg-slate-100 p-4 rounded-xl shadow-inner flex justify-center overflow-x-auto">
          <div className="origin-top scale-[0.8] sm:scale-[0.9] md:scale-[1.0]">
            <LoadingOrderTemplate
              orderNumber={orderNumber || 1}
              collectionDate={loadingDate}
              loadingDate={loadingDate}
              loadingLocation={displayLocation}
              loadingOriginCompany={loadingOriginCompany}
              loadingOriginCnpj={loadingOriginCnpj}
              loadingOriginAddress={loadingOriginAddress}
              loadingOriginCityState={loadingOriginCityState}
              loadingOriginContact={loadingOriginContact}
              loadingOriginPhone={loadingOriginPhone}
              deliveryLocation={displayDeliveryLocation}
              deliveryUnit={selectedDeliveryUnit}
              deliveryCnpj={selectedDeliveryUnit ? selectedDeliveryUnit.cnpj : selectedUnit?.cnpj}
              deliveryCompanyName={selectedDeliveryUnit?.companyName}
              deliveryUnitName={selectedDeliveryUnit?.name}
              deliveryIe={selectedDeliveryUnit?.stateRegistration}
              deliveryAddress={deliveryAddress}
              deliveryCityState={deliveryCityState}
              origin={displayOrigin}
              originState={displayState}
              destination={selectedDeliveryUnit?.city || selectedFreight?.destination || selectedUnit?.city || ''}
              destinationState={selectedDeliveryUnit?.state || selectedFreight?.destinationState || selectedUnit?.state || ''}
              product={displayProduct}
              netWeight={displayNetWeight}
              truckPlate={displayTruckPlate}
              trailer1={displayTrailer1}
              trailer2={displayTrailer2}
              dolly={displayDolly}
              axles={displayAxles}
              driverName={displayDriverName}
              cpf={displayCpf}
              phone={displayPhone}
              companyName={effectiveCompanyName}
              cnpj={selectedUnit?.cnpj}
              ie={selectedUnit?.stateRegistration}
              address={effectiveAddress}
              cityState={effectiveCityState}
              unitName={selectedUnit?.name}
              freights={freights}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingOrderView;
