import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  const body = await req.json();
  const placa = body.placa;
  const pdfBase64 = body.pdfBase64;

  const result = await resend.emails.send({
    from: 'onboarding@resend.dev',
    to: 'mppradoprodutor@gmail.com',
    subject: 'ORDEM ' + placa + ' - GERA TRANSPORTES',
    html: '<p>Ordem ' + placa + ' - GERA TRANSPORTES</p>',
    attachments: [
      {
        filename: 'ORDEM-' + placa + '.pdf',
        content: pdfBase64
      }
    ]
  });

  if (result.error) {
    return NextResponse.json(result.error, { status: 400 });
  }
  
  return NextResponse.json(result.data);
}
