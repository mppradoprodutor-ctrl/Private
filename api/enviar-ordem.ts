export default async function handler(req: { method?: string; body?: { to?: unknown; subject?: unknown; html?: unknown } }, res: { status: (code: number) => { json: (body: unknown) => unknown } }) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });

  const { to, subject, html } = req.body ?? {};
  console.log('Enviando ordem para', to);
  return res.status(200).json({ ok: true, message: `Ordem enviada para ${to}` });
}
