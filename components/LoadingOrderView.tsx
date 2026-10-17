import React, { useRef } from 'react';

type Props = { cavalo?: string; orderNum?: string; motorista?: string; };

export default function LoadingOrderView({ cavalo, orderNum, motorista }: Props) {
  const isDownloadingRef = useRef(false);

  const handleDownloadPdf = async () => {
    if (isDownloadingRef.current) return;
    isDownloadingRef.current = true;
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      doc.setFont('helvetica','bold');
      doc.setFontSize(14);
      doc.text('GERA TRANSPORTES',10,15);
      doc.setFontSize(10);
      doc.text('CNPJ: 33.777.479/0001-26',10,20);
      doc.text('ORDEM DE CARREGAMENTO No ' + (orderNum || '3167'),10,30);
      doc.setFontSize(8);
      doc.text('LOCAL DE COLETA: SAO PAULO - SP',10,40);
      doc.text('PRODUTO: BAGACO',10,50);
      doc.text('VEICULO E PLACAS',10,60);
      doc.text('Cavalo: ' + (cavalo || 'HKH0B84'),10,65);
      doc.text('DADOS DO MOTORISTA: ' + (motorista || 'JEVERSON DE ARAUJO ALVES'),10,75);
      doc.save('Ordem_' + (orderNum || '3167') + '_' + (cavalo || 'HKH0B84') + '.pdf');
    } finally {
      isDownloadingRef.current = false;
    }
  };

  return (
    <div style={{padding:20, fontFamily:'sans-serif'}}>
      <h1>GERA TRANSPORTES - ORDEM {orderNum || '3167'}</h1>
      <p>Cavalo: {cavalo || 'HKH0B84'}</p>
      <p>Motorista: {motorista || 'JEVERSON'}</p>
      <button onClick={handleDownloadPdf} style={{padding:'10px 20px', background:'black', color:'white', borderRadius:8}}>
        Baixar PDF / Enviar por Email
      </button>
    </div>
  );
}