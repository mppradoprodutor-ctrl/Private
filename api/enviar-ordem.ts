export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const body = req.body || {};
    let placa = (body.placa || body.placaCavalo || body.placaVeiculo || body.placa_cavalo || 'HKH0B84').toString().trim().toUpperCase();
    if (!placa) placa = 'HKH0B84';
    let pdfBase64 = body.pdfBase64 || body.pdf || '';
    if (pdfBase64 && pdfBase64.includes('base64,')) pdfBase64 = pdfBase64.split('base64,')[1];
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'RESEND_API_KEY nao configurada' });
    const { Resend } = await import('resend');
    const resend = new Resend(apiKey);
    const payload: any = {
      from: 'onboarding@resend.dev',
      to: 'mppradoprodutor@gmail.com',
      subject: `ORDEM ${placa} - GERA TRANSPORTES`,
      html: `<h3>Ordem ${placa} - GERA TRANSPORTES</h3><p>CNPJ 33.777.479/0001-26</p>`,
    };
    if (pdfBase64 && pdfBase64.length > 100) {
      payload.attachments = [{ filename: `ORDEM-${placa}.pdf`, content: pdfBase64 }];
    }
    const result = await resend.emails.send(payload);
    return res.status(200).json({ ok: true, placa, result });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}