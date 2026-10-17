import React, { useState, useRef } from 'react';

interface LoadingOrderViewProps {
  selectedFreight?: any;
  orderNumber?: number;
  onClose?: () => void;
}

const LoadingOrderView: React.FC<LoadingOrderViewProps> = ({ selectedFreight, orderNumber = 1, onClose }) => {
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const isDownloadingRef = useRef(false);
  const lastDownloadTimeRef = useRef(0);

  const handleSendByEmail = async () => {
    const recipient = selectedFreight?.emailDestino?.trim();
    if (!recipient) {
      setEmailStatus({ type: 'error', message: 'Cadastre o e-mail na rota antes de enviar' });
      return;
    }
    setIsSendingEmail(true);
    setEmailStatus(null);
    try {
      const freteId = selectedFreight?.id || orderNumber || 1;
      const placa = selectedFreight?.placa || selectedFreight?.placaCavalo || 'HKH0B84';
      const subject = `Ordem ${freteId} - Placa ${placa}`;
      
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text(`ORDEM DE CARREGAMENTO - ${freteId}`, 15, 20);
      doc.setFontSize(11);
      doc.text(`Placa: ${placa}`, 15, 35);
      doc.text(`Motorista: ${selectedFreight?.motorista || ''}`, 15, 45);
      doc.text(`Origem: ${selectedFreight?.origem || ''}`, 15, 55);
      doc.text(`Destino: ${selectedFreight?.destino || ''}`, 15, 65);
      doc.text(`Produto: ${selectedFreight?.produto || ''}`, 15, 75);
      doc.text(`Peso: ${selectedFreight?.peso || ''}`, 15, 85);
      doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 15, 95);

      const element = document.getElementById('ordem-print');
      const html = element ? element.innerHTML : `Ordem ${freteId}`;
      const pdfBase64 = doc.output('datauristring');

      const response = await fetch('/api/enviar-ordem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: recipient, subject, html, placa, pdfBase64 }),
      });
      const data = await response.json();
      if (data.ok) setEmailStatus({ type: 'success', message: 'PDF com dados enviado!' });
      else setEmailStatus({ type: 'error', message: data.error || 'Erro ao enviar' });
    } catch (error: any) {
      setEmailStatus({ type: 'error', message: error.message });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleDownloadPng = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const now = Date.now();
    if (isDownloadingRef.current || (now - lastDownloadTimeRef.current < 2000)) return;
    isDownloadingRef.current = true;
    lastDownloadTimeRef.current = now;
    try {
      const element = document.getElementById('ordem-print');
      if (!element) return;
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(element, { scale: 2 });
      const link = document.createElement('a');
      link.download = `ordem-${selectedFreight?.id || orderNumber}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error("Erro ao exportar PNG:", error);
    } finally {
      setTimeout(() => { isDownloadingRef.current = false; }, 1000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6 bg-white">
      <div id="ordem-print" className="border p-6">
        <h1 className="text-xl font-bold">ORDEM DE CARREGAMENTO - {selectedFreight?.id || orderNumber}</h1>
        <p>Placa: {selectedFreight?.placa || selectedFreight?.placaCavalo}</p>
        <p>Motorista: {selectedFreight?.motorista}</p>
        <p>Origem: {selectedFreight?.origem}</p>
        <p>Destino: {selectedFreight?.destino}</p>
        <p>Produto: {selectedFreight?.produto}</p>
        <p>Peso: {selectedFreight?.peso}</p>
        {emailStatus && <p className={emailStatus.type === 'success' ? 'text-green-600' : 'text-red-600'}>{emailStatus.message}</p>}
      </div>
      <div className="flex gap-2 mt-4">
        <button onClick={handleSendByEmail} disabled={isSendingEmail} className="bg-blue-600 text-white px-4 py-2 rounded">
          {isSendingEmail ? 'Enviando...' : 'Enviar por E-mail'}
        </button>
        <button onClick={handleDownloadPng} className="bg-green-600 text-white px-4 py-2 rounded">Baixar PNG</button>
        <button onClick={handlePrint} className="bg-gray-600 text-white px-4 py-2 rounded">Imprimir</button>
        {onClose && <button onClick={onClose} className="bg-red-600 text-white px-4 py-2 rounded">Fechar</button>}
      </div>
    </div>
  );
};

export default LoadingOrderView;