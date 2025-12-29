import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@flowb2b.com.br'
const APP_NAME = 'FlowB2B'

interface SendEmailParams {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  try {
    const { data, error } = await resend.emails.send({
      from: `${APP_NAME} <${FROM_EMAIL}>`,
      to,
      subject,
      html,
    })

    if (error) {
      console.error('Resend error:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Send email error:', error)
    return { success: false, error: 'Erro ao enviar email' }
  }
}

// Email de reset de senha
export async function sendResetPasswordEmail(
  email: string,
  nome: string,
  resetUrl: string
) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: 'Inter', Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #0a489d 0%, #2293f9 100%); padding: 40px 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">FlowB2B</h1>
        </div>

        <!-- Content -->
        <div style="padding: 40px 30px;">
          <h2 style="color: #2660a5; font-size: 24px; margin: 0 0 20px 0;">Olá, ${nome || 'usuário'}!</h2>

          <p style="color: #475467; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
            Recebemos uma solicitação para alterar a senha da sua conta. Clique no botão abaixo para criar uma nova senha:
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="display: inline-block; background-color: #ffbe4a; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px;">
              Alterar minha senha
            </a>
          </div>

          <p style="color: #667085; font-size: 14px; line-height: 20px; margin: 0 0 10px 0;">
            Este link expira em <strong>1 hora</strong>.
          </p>

          <p style="color: #667085; font-size: 14px; line-height: 20px; margin: 0;">
            Se você não solicitou a alteração de senha, ignore este email. Sua senha permanecerá a mesma.
          </p>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

          <p style="color: #9ca3af; font-size: 12px; line-height: 18px; margin: 0;">
            Se o botão não funcionar, copie e cole o link abaixo no seu navegador:<br>
            <a href="${resetUrl}" style="color: #2660a5; word-break: break-all;">${resetUrl}</a>
          </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 20px 30px; text-align: center;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            © ${new Date().getFullYear()} FlowB2B. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </body>
    </html>
  `

  return sendEmail({
    to: email,
    subject: 'Altere sua senha - FlowB2B',
    html,
  })
}

// Email de magic link
export async function sendMagicLinkEmail(
  email: string,
  nome: string,
  magicLinkUrl: string
) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: 'Inter', Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #0a489d 0%, #2293f9 100%); padding: 40px 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">FlowB2B</h1>
        </div>

        <!-- Content -->
        <div style="padding: 40px 30px;">
          <h2 style="color: #2660a5; font-size: 24px; margin: 0 0 20px 0;">Olá, ${nome || 'usuário'}!</h2>

          <p style="color: #475467; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
            Clique no botão abaixo para acessar sua conta. Não é necessário digitar senha!
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${magicLinkUrl}" style="display: inline-block; background-color: #ffbe4a; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px;">
              Acessar minha conta
            </a>
          </div>

          <p style="color: #667085; font-size: 14px; line-height: 20px; margin: 0 0 10px 0;">
            Este link expira em <strong>15 minutos</strong> e só pode ser usado uma vez.
          </p>

          <p style="color: #667085; font-size: 14px; line-height: 20px; margin: 0;">
            Se você não solicitou este link, ignore este email.
          </p>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

          <p style="color: #9ca3af; font-size: 12px; line-height: 18px; margin: 0;">
            Se o botão não funcionar, copie e cole o link abaixo no seu navegador:<br>
            <a href="${magicLinkUrl}" style="color: #2660a5; word-break: break-all;">${magicLinkUrl}</a>
          </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 20px 30px; text-align: center;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            © ${new Date().getFullYear()} FlowB2B. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </body>
    </html>
  `

  return sendEmail({
    to: email,
    subject: 'Seu link de acesso - FlowB2B',
    html,
  })
}
