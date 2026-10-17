import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Pega os dados que seu front novo manda
    let to = body.to || 'mppradoprodutor@gmail.com';
    let subject = body.subject || `ORDEM ${body.placa || 'HKH0B84'} - GERA TRANSPORTES`;
    let placa = (body.placa || body.placaCavalo || 'HKH0B84').toString().trim().toUpperCase();
    if (!placa) placa = 'HKH0B84';

    let pdfBase64 = body.pdfBase64 || body.pdf || '';
    if (pdfBase64 && pdfBase64.includes('base64,')) {
      pdfBase64 = pdfBase64.split('base64,')[1];
    }

    let html = body.html || `<h3>Ordem ${placa} - GERA TRANSPORTES</h3><p>CNPJ 33.777.479/0001-26</p>`;

    const result = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: to,
      subject: subject,
      html: html,
      attachments: pdfBase64 && pdfBase64.length > 100 ? [
        {
          filename: `ORDEM-${placa}.pdf`,
          content: pdfBase64,
        }
      ] : [],
    });

    return NextResponse.json({ ok: true, message: 'E-mail enviado com PDF!', result });

  } catch (e: any) {
    console.error('Erro enviar-ordem:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}