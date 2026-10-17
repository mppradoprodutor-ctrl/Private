import React, { useRef } from 'react';

interface LoadingOrderViewProps {
  cavalo?: string;
  carreta?: string;
  motorista?: string;
  orderNum?: string;
}

const LoadingOrderView: React.FC<LoadingOrderViewProps> = ({ cavalo, carreta, motorista, orderNum }) => {
  const isDownloadingRef = useRef(false);
  const lastDownloadTimeRef = useRef(0);

  const handleDownloadPdf = async (e?: React.MouseEvent) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    const now = Date.now();
    if (isDownloadingRef.current || (now - lastDownloadTimeRef.current < 1500)) return;
    isDownloadingRef.current = true;
    lastDownloadTimeRef.current = now;
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      doc.setFont('helvetica','bold');
      doc.setFontSize(14);
      doc.text('GERA TRANSPORTES',10,15);
      doc.setFontSize(10);
      doc.text('CNPJ: 33.777.479/0001-26 - (FILIAL)',10,20);
      doc.text('EST LIN ARUAN, 329 - ZONA RURAL - CASTILHO - SP',10,24);
      doc.setFillColor(20,20,20);
      doc.roundedRect(130,7,70,12,2,2,'F');
      doc.setTextColor(255);
      doc.text('ORDEM DE CARREGAMENTO',132,13);
      doc.text('No ' + (orderNum || '3167'),132,16);
      doc.setTextColor(0);
      doc.line(10,28,200,28);
      doc.setFontSize(8);
      doc.setFont('helvetica','bold');
      doc.text('DADOS DA OPERACAO',10,35);
      doc.setDrawColor(230);
      doc.roundedRect(10,40,85,50,3,3,'S');
      doc.roundedRect(105,40,85,50,3,3,'S');
      doc.setFontSize(8);
      doc.text('LOCAL DE COLETA',15,46);
      doc.setFont('helvetica','normal');
      doc.setFontSize(7);
      doc.text('SAO PAULO - SP',15,50);
      doc.setFont('helvetica','bold');
      doc.setFontSize(8);
      doc.text('PRODUTO',10,98);
      doc.setFontSize(10);
      doc.setTextColor(180,0,0);
      doc.text('BAGACO',10,103);
      doc.setFontSize(8);
      doc.setTextColor(0);
      doc.text('VEICULO E PLACAS',10,112);
      doc.setTextColor(255);
      doc.setFontSize(7);
      doc.text('Cavalo: ' + (cavalo || 'HKH0B84'),12,120);
      doc.setTextColor(0);
      doc.setDrawColor(220);
      doc.roundedRect(50,115,40,7,2,'S');
      doc.text('Carreta 1: ' + (carreta || 'RWI5E63'),52,120);
      doc.text('QUANTIDADE DE EIXO',130,115);
      doc.setFontSize(9);
      doc.text('6 Eixos',135,120);
      doc.setFontSize(8);
      doc.setTextColor(0);
      doc.text('DADOS DO MOTORISTA',10,132);
      doc.setFontSize(8);
      doc.setFont('helvetica','bold');
      doc.text((motorista || 'JEVERSON DE ARAUJO ALVES'),10,140);
      doc.save('Ordem_' + (orderNum || '3167') + '_' + (cavalo || 'HKH0B84') + '.pdf');
    } finally {
      isDownloadingRef.current = false;
    }
  };

  return (
    <div>
      <button onClick={handleDownloadPdf}>Baixar PDF</button>
    </div>
  );
};

export default LoadingOrderView;