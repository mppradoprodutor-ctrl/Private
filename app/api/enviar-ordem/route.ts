import nodemailer from 'nodemailer'

export async function POST(req: Request) {
  try {
    const { to, nomeMotorista, placa, html } = await req.json()

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'mppradoprodutor@gmail.com',
        pass: process.env.GMAIL_APP_PASSWORD
      }
    })

    await transporter.sendMail({
      from: 'GERA TRANSPORTES <mppradoprodutor@gmail.com>',
      to: to,
      subject: nomeMotorista + ' - PLACA ' + placa,
      html: html
    })

    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch (error: any) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500 })
  }
}
