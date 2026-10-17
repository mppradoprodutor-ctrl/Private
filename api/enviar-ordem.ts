export default async function handler(req: { method?: string; body?: { to?: unknown; subject?: unknown; html?: unknown } }, res: { status: (code: number) => { json: (body: unknown) => unknown } }) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  try {
    const { to, subject, html } = req.body ?? {};
    if (typeof to !== 'string' || !to.trim() || typeof subject !== 'string' || typeof html !== 'string') {
      return res.status(400).json({ error: 'Destinatário, assunto e conteúdo são obrigatórios.' });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: 'RESEND_API_KEY não configurada no servidor.' });
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
        to: [to.trim()],
        subject: subject.trim(),
        html,
      }),
    });

    const result = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: result?.message || 'Falha no Resend.' });
    return res.status(200).json({ ok: true, id: result?.id });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
}
