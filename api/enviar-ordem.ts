import { Resend } from 'resend';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = req.body;
    const placa = body.placa;
    let pdfBase64 = body.pdfBase64 || '';

    if (pdfBase64.includes('base64,')) {
      pdfBase64 = pdfBase64.split('base64,')[1];
    }

    if (!placa) {
  return res.status(400).json({ error: 'Placa faltando' });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'RESEND_API_KEY não configurada na Vercel' });
    }

    const resend = new Resend(apiKey);

    const result = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'mppradoprodutor@gmail.com',
      subject: 'ORDEM ' + placa + ' - GERA',
      html: '<p>Ordem ' + placa + '</p>',
      attachments: [{ filename: 'ORDEM-' + placa + '.pdf', content: pdfBase64 }],
    });

    if (result.error) {
      console.error(result.error);
      return res.status(400).json(result.error);
    }

    return res.status(200).json(result.data);
  } catch (e: any) {
    console.error('Erro:', e);
    return res.status(500).json({ error: e.message });
  }
}