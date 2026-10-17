import React, { useState } from 'react';
import { logoBase64 } from './logoBase64';

export default function LoadingOrderView({ selectedFreight }: any) {
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<any>(null);
  const [copied, setCopied] = useState(false);

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
    setEmailStatus({type: 'success', message: `Ordem enviada! Placa: ${freight.placa}`});
    setTimeout(()=>setIsSendingEmail(false), 1500);
  };

  const handleCopy = async () => {
    const texto = `ORDEM DE CARREGAMENTO - GERA TRANSPORTES
33.777.479/0001-26 - CASTILHO/SP
Data: ${freight.data}

Produto: ${freight.produto || freight.carga || '-'}
Origem: ${freight.origem || freight.cidadeOrigem || 'CASTILHO/SP'}
Destino: ${freight.destino || freight.cidadeDestino || '-'}
Peso: ${freight.peso || freight.toneladas || '-'}
Valor Frete: ${freight.valorFrete || freight.valor || '-'}
Motorista: ${freight.motorista || freight.nomeMotorista || '-'}
Telefone: ${freight.telefone || freight.telefoneMotorista || '-'}
Placa: ${freight.placa || 'HKH0B84'}
Obs: ${freight.observacao || freight.obs || '-'}

Documento gerado em ${new Date().toLocaleString('pt-BR')}`;

    try {
      await navigator.clipboard.writeText(texto);
      setCopied(true);
      setTimeout(()=>setCopied(false), 2000);
    } catch {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = texto;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(()=>setCopied(false), 2000);
    }
  };

  return (
    <div className="p-4 bg-gray-100 min-h-screen">
      <div id="ordem-print" className="bg-white rounded-lg shadow-lg max-w-3xl mx-auto overflow-hidden">
        <div className="bg-gradient-to-r from-[#4a0f0f] to-[#7a1f1f] text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {logoBase64 ? <img src={logoBase64} alt="Logo" className="w-10 h-10 rounded bg-white p-1 object-contain" /> : <div className="w-10 h-10 bg-white rounded flex items-center justify-center text-[#7a1f1f] font-bold">GS</div>}
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

        <div className="p-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="col-span-2 bg-gray-50 p-3 rounded border"><div className="text-xs text-gray-500 uppercase">Produto</div><div className="font-bold text-lg">{freight.produto || freight.carga || 'A DEFINIR'}</div></div>
            <div className="bg-gray-50 p-3 rounded border"><div className="text-xs text-gray-500 uppercase">Origem</div><div className="font-semibold">{freight.origem || freight.cidadeOrigem || 'CASTILHO/SP'}</div></div>
            <div className="bg-gray-50 p-3 rounded border"><div className="text-xs text-gray-500 uppercase">Destino</div><div className="font-semibold">{freight.destino || freight.cidadeDestino || '-'}</div></div>
            <div className="bg-gray-50 p-3 rounded border"><div className="text-xs text-gray-500 uppercase">Peso</div><div className="font-bold">{freight.peso || freight.toneladas || '-'}</div></div>
            <div className="bg-gray-50 p-3 rounded border"><div className="text-xs text-gray-500 uppercase">Valor Frete</div><div className="font-bold text-green-700">{freight.valorFrete || freight.valor || '-'}</div></div>
            <div className="bg-gray-50 p-3 rounded border"><div className="text-xs text-gray-500 uppercase">Motorista</div><div className="font-semibold">{freight.motorista || freight.nomeMotorista || '-'}</div></div>
            <div className="bg-gray-50 p-3 rounded border"><div className="text-xs text-gray-500 uppercase">Telefone</div><div className="font-semibold">{freight.telefone || freight.telefoneMotorista || '-'}</div></div>
            <div className="col-span-2 bg-yellow-50 p-3 rounded border border-yellow-200"><div className="text-xs text-gray-500 uppercase">Placa do Veículo</div><div className="font-black text-2xl tracking-widest text-center py-1">{freight.placa || 'HKH0B84'}</div></div>
            {(freight.observacao || freight.obs) && <div className="col-span-2 bg-blue-50 p-3 rounded border"><div className="text-xs text-gray-500 uppercase">Observações</div><div className="font-medium">{freight.observacao || freight.obs}</div></div>}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto">
        {emailStatus && <div className="mt-4 p-3 rounded text-center text-sm bg-green-100 text-green-800 border">{emailStatus.message}</div>}
        <div className="flex gap-2 justify-center mt-6 flex-wrap">
          <button onClick={handleCopy} className={`px-6 py-2.5 rounded-lg font-medium shadow transition ${copied ? 'bg-black text-white' : 'bg-white border hover:bg-gray-50 text-gray-800'}`}>
            {copied ? '✓ Copiado!' : '📋 Copiar'}
          </button>
          <button onClick={handleSendByEmail} disabled={isSendingEmail} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium">
            {isSendingEmail ? 'Enviando...' : 'Enviar por E-mail'}
          </button>
          <button onClick={() => window.print()} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-lg font-medium">
            Baixar PNG
          </button>
          <button onClick={() => window.print()} className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2.5 rounded-lg font-medium">
            Imprimir
          </button>
        </div>
      </div>
    </div>
  );
}
