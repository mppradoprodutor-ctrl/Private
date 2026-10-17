import React, { useState } from 'react';
import { logoBase64 } from '../logoBase64';

interface LoadingOrderViewProps {
  selectedFreight?: any;
}

export default function LoadingOrderView({ selectedFreight }: LoadingOrderViewProps) {
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{ type: string; message: string } | null>(null);

  const freight = selectedFreight || {
    produto: 'SOJA',
    peso: '30 TON',
    valorFrete: 'R$ 3.500,00',
    telefone: '(18) 99700-0000',
    placa: 'HKH0B84',
    motorista: 'JOSE SILVA',
    origem: 'CASTILHO/SP',
    destino: 'SANTOS/SP',
    data: new Date().toLocaleDateString('pt-BR'),
    observacao: 'CARREGAMENTO 08:00H'
  };

  const handleSendByEmail = async () => {
    setIsSendingEmail(true);
    try {
      // Simula envio
      await new Promise(r => setTimeout(r, 1200));
      setEmailStatus({ type: 'success', message: `Ordem enviada! Placa: ${freight.placa}` });
    } finally {
      setTimeout(() => setIsSendingEmail(false), 1000);
    }
  };

  const handleDownloadPng = async () => {
    const html2canvas = (await import('html2canvas')).default;
    const element = document.getElementById('ordem-print');
    if (!element) return;
    const canvas = await html2canvas(element, { scale: 2 });
    const link = document.createElement('a');
    link.download = `Ordem_${freight.placa}_${freight.data}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  const handlePrint = () => window.print();

  return (
    <div className="p-4 bg-gray-100 min-h-screen">
      {/* ÁREA QUE VAI PARA PNG / PRINT */}
      <div id="ordem-print" className="bg-white rounded-lg shadow-lg max-w-3xl mx-auto overflow-hidden print:shadow-none">
        {/* Cabeçalho com logo */}
        <div className="bg-gradient-to-r from-[#4a0f0f] to-[#7a1f1f] text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {logoBase64 ? <img src={logoBase64} alt="Logo" className="w-10 h-10 rounded object-contain bg-white p-1" /> : <div className="w-10 h-10 bg-white rounded flex items-center justify-center text-[#7a1f1f] font-bold">GS</div>}
            <div>
              <h1 className="font-bold text-lg leading-none">GERA TRANSPORTES</h1>
              <p className="text-xs opacity-80">33.777.479/0001-26 - CASTILHO/SP</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs opacity-70">ORDEM DE CARREGAMENTO</div>
            <div className="font-mono font-bold">{freight.data}</div>
          </div>
        </div>

        {/* Corpo */}
        <div className="p-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="col-span-2 bg-gray-50 p-3 rounded border">
              <div className="text-xs text-gray-500 uppercase">Produto</div>
              <div className="font-bold text-lg">{freight.produto || freight.carga || 'A DEFINIR'}</div>
            </div>

            <div className="bg-gray-50 p-3 rounded border">
              <div className="text-xs text-gray-500 uppercase">Origem</div>
              <div className="font-semibold">{freight.origem || freight.cidadeOrigem || 'CASTILHO/SP'}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded border">
              <div className="text-xs text-gray-500 uppercase">Destino</div>
              <div className="font-semibold">{freight.destino || freight.cidadeDestino || '-'}</div>
            </div>

            <div className="bg-gray-50 p-3 rounded border">
              <div className="text-xs text-gray-500 uppercase">Peso</div>
              <div className="font-bold">{freight.peso || freight.toneladas || '-'}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded border">
              <div className="text-xs text-gray-500 uppercase">Valor Frete</div>
              <div className="font-bold text-green-700">{freight.valorFrete || freight.valor || '-'}</div>
            </div>

            <div className="bg-gray-50 p-3 rounded border">
              <div className="text-xs text-gray-500 uppercase">Motorista</div>
              <div className="font-semibold">{freight.motorista || freight.nomeMotorista || '-'}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded border">
              <div className="text-xs text-gray-500 uppercase">Telefone</div>
              <div className="font-semibold">{freight.telefone || freight.telefoneMotorista || '-'}</div>
            </div>

            <div className="col-span-2 bg-yellow-50 p-3 rounded border border-yellow-200">
              <div className="text-xs text-gray-500 uppercase">Placa do Veículo</div>
              <div className="font-black text-2xl tracking-widest text-center py-1">{freight.placa || 'HKH0B84'}</div>
            </div>

            {(freight.observacao || freight.obs) && (
              <div className="col-span-2 bg-blue-50 p-3 rounded border border-blue-200">
                <div className="text-xs text-gray-500 uppercase">Observações</div>
                <div className="font-medium">{freight.observacao || freight.obs}</div>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t text-[10px] text-gray-400 text-center">
            GERA TRANSPORTES - 33.777.479/0001-26 - Documento gerado automaticamente pelo sistema em {new Date().toLocaleString('pt-BR')}
          </div>
        </div>
      </div>

      {/* Botões - fora do print */}
      <div className="max-w-3xl mx-auto">
        {emailStatus && (
          <div className={`mt-4 p-3 rounded text-center text-sm ${emailStatus.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800'}`}>
            {emailStatus.message}
          </div>
        )}
        <div className="flex gap-3 justify-center mt-6 print:hidden">
          <button
            onClick={handleSendByEmail}
            disabled={isSendingEmail}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-medium shadow transition"
          >
            {isSendingEmail ? 'Enviando...' : 'Enviar por E-mail'}
          </button>
          <button
            onClick={handleDownloadPng}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-lg font-medium shadow transition"
          >
            Baixar PNG
          </button>
          <button
            onClick={handlePrint}
            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2.5 rounded-lg font-medium shadow transition"
          >
            Imprimir
          </button>
        </div>
      </div>

      <style>{`@media print { body * { visibility: hidden; } #ordem-print, #ordem-print * { visibility: visible; } #ordem-print { position: absolute; left: 0; top: 0; width: 100%; } }`}</style>
    </div>
  );
}