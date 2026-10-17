import nodemailer from 'nodemailer';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo nao permitido' });
  }
  try {
    const body = req.body || {};
    const toRaw = body.to || '';
    const pdfBase64 = body.pdfBase64 || '';

    let base64 = pdfBase64;
    if (base64.indexOf(',') > -1) {
      base64 = base64.split(',')[1];
    }

    const lista = toRaw.split(',').map(function(s){ return s.trim(); }).filter(function(s){ return s.indexOf('@') > -1; });

    if (lista.length === 0) {
      return res.status(400).json({ error: 'Nenhum email informado' });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'mppradoprodutor@gmail.com',
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: 'PRADO SYSTEM <mppradoprodutor@gmail.com>',
      to: lista,
      subject: 'Ordem de Carregamento - GERA TRANSPORTES 33.777.479/0001-26',
      html: '<p>Segue ordem de carregamento em anexo.</p><p>GERA TRANSPORTES</p>',
      attachments: [{ filename: 'ordem.pdf', content: base64, encoding: 'base64' }],
    });

    return res.status(200).json({ ok: true });
  } catch (e: any) {
    console.log(e);
    return res.status(500).json({ error: e.message });
  }
}