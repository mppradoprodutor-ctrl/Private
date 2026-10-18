export async function POST(req: Request) {
  const { to, subject, html } = await req.json()
  const recipients = (Array.isArray(to) ? to : String(to || '').split(/[;,\s]+/))
    .map((email: string) => email.trim())
    .filter(Boolean)
  console.log("Enviando ordem para", recipients)
  if (!recipients.length) return Response.json({ ok: false, error: 'Informe ao menos um e-mail.' }, { status: 400 })
  return Response.json({ ok: true, message: `Ordem enviada para ${recipients.join(', ')}`, recipients })
}
