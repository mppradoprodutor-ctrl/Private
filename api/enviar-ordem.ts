import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);
export default async function handler(req: any, res: any) {
  const body = req.body;
  const placa = body.placa;
  let pdfBase64 = body.pdfBase64 || '';
  if (pdfBase64.includes('base64,')) { pdfBase64 = pdfBase64.split('base64,')[1]; }
  const result = await resend.emails.send({
    from: 'onboarding@resend.dev',
    to: 'mppradoprodutor@gmail.com',
    subject: 'ORDEM ' + placa + ' - GERA',
    html: '<p>Ordem ' + placa + '</p>',
    attachments: [{ filename: 'ORDEM-' + placa + '.pdf', content: pdfBase64 }]
  });
  if (result.error) return res.status(400).json(result.error);
  return res.status(200).json(result.data);
}
