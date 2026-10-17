export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  try {
    const body = req.body || {};
    // Aceita todas as variações que seu sistema já manda
    let placa = (body.placa || body.placaCavalo || body.placaVeiculo || body.placa_cavalo || 'HKH0B84').toString().trim().toUpperCase();
    if (!placa) placa = 'HKH0B84';

    // ACEITA: pdfBase64, pdf, arquivo, base64 (seu frontend antigo manda "arquivo")
    let pdfBase64 = body.pdfBase64 || body.pdf || body.arquivo || body.base64 || '';
    if (pdfBase64 && pdfBase64.includes('base64,')) {
      pdfBase64 = pdfBase64.split('base64,')[1];
    }
    // Limpa espaços e quebras que quebram o anexo
    pdfBase64 = pdfBase64.replace(/\s/g, '');

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'RESEND_API_KEY nao configurada no Vercel' });

    const { Resend } = await import('resend');
    const resend = new Resend(apiKey);

    // Dados extras para o HTML do e-mail (se o PDF falhar, o e-mail ainda mostra tudo)
    const motorista = body.motorista || body.nomeMotorista || '-';
    const produto = body.produto || 'BAGAÇO';
    const origem = body.origem || body.cidadeOrigem || '';
    const destino = body.destino || body.cidadeDestino || '';

    const payload: any = {
      from: 'onboarding@resend.dev',
      to: 'mppradoprodutor@gmail.com',
      subject: `ORDEM ${placa} - GERA TRANSPORTES - Nº ${body.numero || ''}`,
      html: `
        <div style="font-family: Arial; max-width: 600px;">
          <h2 style="background: #7a1f1f; color: white; padding: 12px;">GERA TRANSPORTES - ORDEM ${placa}</h2>
          <p><b>CNPJ:</b> 33.777.479/0001-26</p>
          <p><b>Produto:</b> ${produto}</p>
          <p><b>Origem:</b> ${origem}</p>
          <p><b>Destino:</b> ${destino}</p>
          <p><b>Motorista:</b> ${motorista}</p>
          <p><b>Placa:</b> ${placa}</p>
          <p style="font-size: 11px; color: gray;">Este e-mail contém em anexo o PDF com layout oficial igual ao modelo Nº 3169 do anexo AILTON_APARECIDO_RODRIGUES_DA_SILVA.pdf</p>
        </div>
      `,
    };

    // ANEXA O MESMO PDF QUE FOI BAIXADO (layout completo)
    if (pdfBase64 && pdfBase64.length > 500) {
      payload.attachments = [
        { 
          filename: `ORDEM-${placa}.pdf`, 
          content: pdfBase64
        }
      ];
    } else {
      console.log('PDF não recebido ou muito pequeno:', pdfBase64?.length);
    }

    const result = await resend.emails.send(payload);
    return res.status(200).json({ ok: true, placa, hasPdf: !!payload.attachments, result });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
}
