import React from 'react';

export default function LoadingOrderView(props: any) {
  const s = props.selectedFreight || {};
  const numero = s.numero || s.id || '3169';
  const dataColeta = s.dataColeta || s.data || '17/10/2026';
  const empresaColeta = s.empresaColeta || 'TIETE AGROINDUSTRIAL';
  const cnpjColeta = s.cnpjColeta || '';
  const enderecoColeta = s.enderecoColeta || 'TIETE AGROINDUSTRIAL';
  const cidadeColeta = s.cidadeColeta || 'UBARANA - SP';
  const empresaEntrega = s.empresaEntrega || 'GERA TRANSPORTES';
  const cnpjEntrega = '33.777.479/0001-26';
  const produto = s.produto || s.carga || 'BAGAÇO';
  const peso = s.peso || s.pesoLiquido || '48 TN';
  const cavalo = s.cavalo || s.placaCavalo || s.placa || 'NJT6692';
  const carreta1 = s.carreta1 || s.placaCarreta1 || 'BwD5403';
  const carreta2 = s.carreta2 || s.placaCarreta2 || 'CPR5070';
  const eixos = s.eixos || '9 Eixos';
  const motorista = s.motorista || s.nomeMotorista || 'AILTON APARECIDO RODRIGUES DA SILVA';
  const cpf = s.cpf || s.cpfMotorista || '12625999896';
  const telefone = s.telefone || s.telefoneMotorista || '---';

  return (
    <div className="p-4 bg-gray-100 min-h-screen">
      <div id="ordem-print" className="bg-white max-w-4xl mx-auto p-8 text-sm text-gray-900" style={{fontFamily: 'Arial, sans-serif'}}>
        {/* HEADER IGUAL AO PDF ANEXO */}
        <div className="flex justify-between items-start border-b-2 border-gray-800 pb-4">
          <div className="flex gap-3">
            <div className="w-12 h-12 bg-green-700 rounded-full flex items-center justify-center text-white font-bold">G</div>
            <div>
              <div className="font-black text-lg">GERA TRANSPORTES</div>
              <div className="text-[10px]">CNPJ: 33.777.479/0001-26 (FILIAL)</div>
              <div className="text-[10px]">EST LIN ARUANA, 329 - ZONA RURAL + CASTILHO - SP</div>
            </div>
          </div>
          <div className="text-right">
            <div className="bg-gray-900 text-white px-4 py-1 rounded text-[10px] font-bold">ORDEM DE CARREGAMENTO</div>
            <div className="font-bold">Nº {numero}</div>
            <div className="text-[10px] mt-1">DATA DA COLETA<br/><span className="font-bold">{dataColeta}</span></div>
          </div>
        </div>

        <div className="mt-6 font-bold text-[11px] tracking-widest">DADOS DA OPERAÇÃO</div>
        <div className="grid grid-cols-2 gap-4 mt-2">
          <div className="border rounded-lg p-4">
            <div className="flex gap-2 font-bold text-[11px]"><span>📍</span> LOCAL DE COLETA</div>
            <div className="mt-2 text-[10px] space-y-1">
              <div><span className="text-gray-500">EMPRESA</span><br/><b>{empresaColeta}</b></div>
              <div><span className="text-gray-500">CNPJ</span><br/>{cnpjColeta}</div>
              <div><span className="text-gray-500">ENDEREÇO COMPLETO</span><br/>{enderecoColeta}</div>
              <div><span className="text-gray-500">CIDADE/UF</span><br/>{cidadeColeta}</div>
              <div className="flex gap-8"><div><span className="text-gray-500">CONTATO</span><br/>---</div><div><span className="text-gray-500">TELEFONE</span><br/>---</div></div>
              <div><span className="text-gray-500">DATA</span><br/>{dataColeta}</div>
            </div>
          </div>
          <div className="border rounded-lg p-4">
            <div className="font-bold text-[11px]">LOCAL DE ENTREGA</div>
            <div className="mt-2 text-[10px] space-y-1">
              <div><span className="text-gray-500">EMPRESA</span><br/><b>{empresaEntrega}</b></div>
              <div><span className="text-gray-500">CNPJ</span><br/>{cnpjEntrega}</div>
              <div><span className="text-gray-500">ENDEREÇO COMPLETO</span><br/>EST LIN ARUANA, 329 - ZONA RURAL</div>
              <div><span className="text-gray-500">CIDADE/UF</span><br/>CASTILHO - SP</div>
              <div className="flex gap-8"><div><span className="text-gray-500">CONTATO</span><br/>FILIAL</div><div><span className="text-gray-500">TELEFONE</span><br/>Não informado</div></div>
              <div><span className="text-gray-500">DATA</span><br/>{dataColeta}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div><div className="text-[10px] text-gray-500">PRODUTO</div><div className="font-bold text-red-600">{produto}</div></div>
          <div><div className="text-[10px] text-gray-500">PESO LÍQUIDO</div><div className="font-bold">{peso}</div></div>
        </div>

        <div className="mt-4 font-bold text-[11px]">VEÍCULO E PLACAS</div>
        <div className="border-t mt-1 pt-2 grid grid-cols-2 gap-4">
          <div className="flex flex-wrap gap-2">
            <div className="bg-gray-900 text-white px-2 py-1 rounded text-[11px]">Cavalo: {cavalo}</div>
            <div className="bg-gray-100 px-2 py-1 rounded text-[11px]">Carreta 1: {carreta1}</div>
            {carreta2 ? <div className="bg-gray-100 px-2 py-1 rounded text-[11px]">Carreta 2: {carreta2}</div> : null}
          </div>
          <div className="text-right"><div className="text-[10px] text-gray-500">QUANTIDADE DE EIXO</div><div className="font-bold">{eixos}</div></div>
        </div>

        <div className="mt-4 font-bold text-[11px]">DADOS DO MOTORISTA</div>
        <div className="border-t mt-1 pt-2 grid grid-cols-3 gap-4">
          <div><div className="text-[9px] text-gray-500">NOME COMPLETO</div><div className="font-bold text-xs">{motorista}</div></div>
          <div><div className="text-[9px] text-gray-500">CPF</div><div className="font-bold">{cpf}</div></div>
          <div><div className="text-[9px] text-gray-500">TELEFONE</div><div className="font-bold">{telefone}</div></div>
        </div>

        <div className="grid grid-cols-2 gap-16 mt-10 text-center text-[10px]">
          <div><div className="border-t border-gray-800 pt-1">ASSINATURA MOTORISTA<br/>{motorista}</div></div>
          <div><div className="border-t border-gray-800 pt-1">EMISSOR AUTORIZADO<br/>GERA TRANSPORTES - CNPJ 33.777.479/0001-26<br/>EST LIN ARUANA, 329 - ZONA RURAL, CASTILHO - SP</div></div>
        </div>

        <div className="text-center mt-8 text-[10px] text-green-800 font-bold">GERA TRANSPORTES - LOGÍSTICA E TRANSPORTE DE BIOMASSA</div>
        <div className="text-center mt-2 text-[7px] text-gray-400">DOCUMENTO GERADO ELETRONICAMENTE POR GERA TRANSPORTES - CNPJ 33.777.479/0001-26 - AUTENTICAÇÃO DIGITAL REQUERIDA</div>
      </div>
    </div>
  );
}
