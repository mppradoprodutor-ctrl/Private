import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo nao permitido' });
  }

  try {
    const body = req.body || {};
    const to = body.to;
    const pdfBase64 = body.pdfBase64;

    if (!to) {
      return res.status(400).json({ error: 'E-mail destino nao informado' });
    }
    if (!pdfBase64) {
      return res.status(400).json({ error: 'PDF nao recebido' });
    }

    let base64Content = pdfBase64;
    if (pdfBase64.indexOf(',') > -1) {
      base64Content = pdfBase64.split(',')[1];
    }

    const result = await resend.emails.send({
      from: 'PRADO SYSTEM <onboarding@resend.dev>',
      to: to,
      subject: 'Ordem de Carregamento - GERA TRANSPORTES',
      html: '<p>Segue em anexo a ordem de carregamento gerada no PRADO SYSTEM.</p>',
      attachments: [
        {
          filename: 'ordem-carregamento.pdf',
          content: base64Content,
        },
      ],
    });

    return res.status(200).json({ ok: true, result });
  } catch (err: any) {
    console.log('Erro envio', err);
    return res.status(500).json({ error: err.message || 'Erro ao enviar' });
  }
}