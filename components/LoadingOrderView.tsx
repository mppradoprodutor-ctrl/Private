import React, { useState } from 'react';

export default function LoadingOrderView(props: any) {
  const selectedFreight = props.selectedFreight || {};
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [copied, setCopied] = useState(false);

  const produto = selectedFreight.produto || selectedFreight.carga || 'A DEFINIR';
  const origem = selectedFreight.origem || selectedFreight.cidadeOrigem || 'CASTILHO/SP';
  const destino = selectedFreight.destino || selectedFreight.cidadeDestino || '-';
  const peso = selectedFreight.peso || selectedFreight.toneladas || '-';
  const valor = selectedFreight.valorFrete || selectedFreight.valor || '-';
  const motorista = selectedFreight.motorista || selectedFreight.nomeMotorista || '-';
  const telefone = selectedFreight.telefone || selectedFreight.telefoneMotorista || '-';
  const placa = selectedFreight.placa || 'HKH0B84';
  const obs = selectedFreight.observacao || selectedFreight.obs || '';
  const dataHoje = new Date().toLocaleDateString('pt-BR');

  const handleCopy = async () => {
    const texto = 'ORDEM DE CARREGAMENTO - GERA TRANSPORTES\n33.777.479/0001-26 - CASTILHO/SP\nData: ' + dataHoje + '\n\nProduto: ' + produto + '\nOrigem: ' + origem + '\nDestino: ' + destino + '\nPeso: ' + peso + '\nValor Frete: ' + valor + '\nMotorista: ' + motorista + '\nTelefone: ' + telefone + '\nPlaca: ' + placa + '\nObs: ' + obs;
    try {
      await navigator.clipboard.writeText(texto);
      setCopied(true);
      setTimeout(function(){ setCopied(false); }, 2000);
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = texto;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(function(){ setCopied(false); }, 2000);
    }
  };

  const handleSendByEmail = () => {
    setIsSendingEmail(true);
    setTimeout(function(){ setIsSendingEmail(false); }, 1500);
  };

  return (
    <div className="p-4 bg-gray-100 min-h-screen">
      <div className="bg-white rounded-lg shadow-lg max-w-3xl mx-auto overflow-hidden">
        <div className="bg-gradient-to-r from-[#4a0f0f] to-[#7a1f1f] text-white p-4">
          <h1 className="font-bold text-lg">GERA TRANSPORTES</h1>
          <p className="text-xs opacity-80">33.777.479/0001-26 - CASTILHO/SP - ORDEM DE CARREGAMENTO - {dataHoje}</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="col-span-2 bg-gray-50 p-3 rounded border">
              <div className="text-xs text-gray-500">Produto</div>
              <div className="font-bold text-lg">{produto}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded border">
              <div className="text-xs text-gray-500">Origem</div>
              <div className="font-semibold">{origem}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded border">
              <div className="text-xs text-gray-500">Destino</div>
              <div className="font-semibold">{destino}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded border">
              <div className="text-xs text-gray-500">Peso</div>
              <div className="font-bold">{peso}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded border">
              <div className="text-xs text-gray-500">Valor Frete</div>
              <div className="font-bold text-green-700">{valor}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded border">
              <div className="text-xs text-gray-500">Motorista</div>
              <div className="font-semibold">{motorista}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded border">
              <div className="text-xs text-gray-500">Telefone</div>
              <div className="font-semibold">{telefone}</div>
            </div>
            <div className="col-span-2 bg-yellow-50 p-3 rounded border border-yellow-200">
              <div className="text-xs text-gray-500">Placa</div>
              <div className="font-black text-2xl tracking-widest text-center py-1">{placa}</div>
            </div>
            {obs ? (
              <div className="col-span-2 bg-blue-50 p-3 rounded border">
                <div className="text-xs text-gray-500">Observacoes</div>
                <div className="font-medium">{obs}</div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <div className="flex gap-2 justify-center mt-6 flex-wrap">
        <button onClick={handleCopy} className="bg-white border border-gray-300 text-gray-800 px-6 py-2.5 rounded-lg font-medium shadow">
          {copied ? 'Copiado!' : 'Copiar'}
        </button>
        <button onClick={handleSendByEmail} className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium">
          {isSendingEmail ? 'Enviando...' : 'Enviar por E-mail'}
        </button>
        <button onClick={function(){ window.print(); }} className="bg-green-600 text-white px-6 py-2.5 rounded-lg font-medium">
          Baixar PNG
        </button>
        <button onClick={function(){ window.print(); }} className="bg-gray-600 text-white px-6 py-2.5 rounded-lg font-medium">
          Imprimir
        </button>
      </div>
    </div>
  );
}
