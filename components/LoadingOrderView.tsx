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
  const freteId = selectedFreight?.id || orderNumber || 1;

  const handleSendByEmail = async () => {
    const recipient = selectedFreight?.emailDestino?.trim();
    if (!recipient) {
      setEmailStatus({ type: 'error', message: 'Cadastre o e-mail na rota antes de enviar' });
      return;
    }
    setIsSendingEmail(true);
    setEmailStatus(null);
    try {
      const placa = selectedFreight?.placa || selectedFreight?.placaCavalo || 'HKH0B84';
      const subject = `Ordem ${freteId} - Placa ${placa}`;
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      doc.setFontSize(14);
      doc.text(`ORDEM DE CARREGAMENTO - ${freteId}`, 15, 20);
      doc.setFontSize(10);
      doc.text(`Placa: ${placa} | Motorista: ${selectedFreight?.motorista || ''}`, 15, 30);
      doc.text(`Origem: ${selectedFreight?.origem || ''} -> Destino: ${selectedFreight?.destino || ''}`, 15, 38);
      doc.text(`Produto: ${selectedFreight?.produto || ''} | Peso: ${selectedFreight?.peso || ''}`, 15, 46);
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
      else setEmailStatus({ type: 'error', message: data.error || 'Erro' });
    } catch (error: any) {
      setEmailStatus({ type: 'error', message: error.message });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleDownloadPng = async (e?: React.MouseEvent) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    const now = Date.now();
    if (isDownloadingRef.current || (now - lastDownloadTimeRef.current < 2000)) return;
    isDownloadingRef.current = true;
    lastDownloadTimeRef.current = now;
    try {
      const element = document.getElementById('ordem-print');
      if (!element) return;
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `ordem-${freteId}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) { console.error(error); }
    finally { setTimeout(() => { isDownloadingRef.current = false; }, 1000); }
  };

  const handlePrint = () => window.print();

  return (
    <div className="p-4 bg-gray-100 min-h-screen">
      <div id="ordem-print" className="bg-white max-w-4xl mx-auto shadow-lg rounded-lg overflow-hidden">
        {/* HEADER ANTIGO */}
        <div className="bg-[#4a0f0f] text-white p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-red-600 p-2 rounded">🚛</div>
            <span className="font-bold">MY SYSTEM</span>
          </div>
          <div className="text-xs">33.777.479/0001-26 - GERA TRANSPORTES (CASTILHO/SP)</div>
        </div>
        
        <div className="p-8">
          <div className="text-center border-b-2 border-red-800 pb-4 mb-6">
            <h1 className="text-2xl font-black">ORDEM DE CARREGAMENTO - {freteId}</h1>
            <p className="text-sm text-gray-500">Data: {new Date().toLocaleDateString('pt-BR')} | Placa: {selectedFreight?.placa || selectedFreight?.placaCavalo || 'HKH0B84'}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-3">
              <div><span className="font-bold">Placa:</span> {selectedFreight?.placa || selectedFreight?.placaCavalo}</div>
              <div><span className="font-bold">Motorista:</span> {selectedFreight?.motorista}</div>
              <div><span className="font-bold">CPF Motorista:</span> {selectedFreight?.cpfMotorista || '-'}</div>
              <div><span className="font-bold">Origem:</span> {selectedFreight?.origem}</div>
              <div><span className="font-bold">Destino:</span> {selectedFreight?.destino}</div>
            </div>
            <div className="space-y-3">
              <div><span className="font-bold">Produto:</span> {selectedFreight?.produto}</div>
              <div><span className="font-bold">Peso:</span> {selectedFreight?.peso}</div>
              <div><span className="font-bold">Valor Frete:</span> R$ {selectedFreight?.valorFrete || '-'}</div>
              <div><span className="font-bold">Telefone:</span> {selectedFreight?.telefoneMotorista || '-'}</div>
            </div>
      </div>
      <div className={'mt-4 p-2 rounded text-sm ' + (emailStatus.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
        {emailStatus.message}
      </div>        </div>
      </div>

      <div className="flex gap-2 justify-center mt-6">
        <button onClick={handleSendByEmail} disabled={isSendingEmail} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-bold">
          {isSendingEmail ? 'Enviando...' : 'Enviar por E-mail'}
        </button>
        <button onClick={handleDownloadPng} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded font-bold">Baixar PNG</button>
        <button onClick={handlePrint} className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded font-bold">Imprimir</button>
      </div>
    </div>
  );
};

export default LoadingOrderView;