import React, { useState } from 'react';

export default function LoadingOrderView({ selectedFreight }: any) {
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<any>(null);

  const handleSendByEmail = async () => {
    setIsSendingEmail(true);
    setEmailStatus({type: 'success', message: 'Enviado! Placa: ' + (selectedFreight?.placa || 'HKH0B84')});
    setTimeout(()=>setIsSendingEmail(false), 1500);
  };

  const handleDownloadPng = () => { window.print(); };
  const handlePrint = () => { window.print(); };

  return (
    <div className="p-4 bg-gray-100 min-h-screen">
      <div className="bg-white p-6 rounded shadow max-w-2xl mx-auto">
        <div>Produto: {selectedFreight?.produto}</div>
        <div>Peso: {selectedFreight?.peso}</div>
        <div>Valor Frete: {selectedFreight?.valorFrete}</div>
        <div>Telefone: {selectedFreight?.telefone}</div>
        <div>Placa: {selectedFreight?.placa || 'HKH0B84'}</div>

        {emailStatus && (
          <div className={'mt-4 p-2 rounded text-sm ' + (emailStatus.type === 'success' ? 'bg-green-100' : 'bg-red-100')}>
            {emailStatus.message}
          </div>
        )}

        <div className="flex gap-2 justify-center mt-6">
          <button onClick={handleSendByEmail} disabled={isSendingEmail} className="bg-blue-600 text-white px-6 py-2 rounded">
            {isSendingEmail ? 'Enviando...' : 'Enviar por E-mail'}
          </button>
          <button onClick={handleDownloadPng} className="bg-green-600 text-white px-6 py-2 rounded">
            Baixar PNG
          </button>
          <button onClick={handlePrint} className="bg-gray-600 text-white px-6 py-2 rounded">
            Imprimir
          </button>
        </div>
      </div>
    </div>
  );
}