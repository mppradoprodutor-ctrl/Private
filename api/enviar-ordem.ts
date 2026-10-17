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

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'RESEND_API_KEY nao configurada na Vercel' });
    }

    let base64Content = pdfBase64 || '';
    if (base64Content.indexOf(',') > -1) {
      base64Content = base64Content.split(',')[1];
    }

    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'PRADO SYSTEM <onboarding@resend.dev>',
        to: to,
        subject: 'Ordem de Carregamento - GERA TRANSPORTES',
        html: '<p>Segue em anexo a ordem de carregamento.</p>',
        attachments: [{ filename: 'ordem.pdf', content: base64Content }],
      }),
    });

    const data = await resp.json();
    if (!resp.ok) {
      return res.status(500).json({ error: 'Erro Resend', details: data });
    }

    return res.status(200).json({ ok: true, data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}