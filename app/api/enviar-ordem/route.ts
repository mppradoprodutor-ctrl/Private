export async function POST(req: Request) {
  const { to, subject, html } = await req.json()
  console.log("Enviando ordem para", to)
  // Simula envio - troque depois por serviço real
  // Por enquanto apenas retorna OK para testar o fluxo sem erro de domínio
  return Response.json({ ok: true, message: `Ordem enviada para ${to}` })
}
