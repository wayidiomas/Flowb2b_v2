import { sendEmail } from '../email'

interface SendLojistaWelcomeParams {
  email: string
  nome: string
  fornecedorNome: string
  cnpj: string
  senhaProvisoria: string
  loginUrl: string
}

/**
 * Email enviado ao lojista quando o fornecedor cadastra ele via vinculo invertido.
 * Contem CNPJ, senha provisoria (6 primeiros digitos do CNPJ) e link de login.
 */
export async function sendLojistaWelcomeEmail({
  email,
  nome,
  fornecedorNome,
  cnpj,
  senhaProvisoria,
  loginUrl,
}: SendLojistaWelcomeParams) {
  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background-color: #FDFBF7; margin: 0; padding: 24px;">
  <div style="max-width: 560px; margin: 0 auto; background-color: #FFFFFF; border-radius: 24px; overflow: hidden; box-shadow: 0 24px 48px -24px rgba(31, 21, 12, 0.08);">

    <!-- Header -->
    <div style="background: #1F150C; padding: 32px 40px;">
      <h1 style="color: #FDFBF7; margin: 0; font-size: 22px; font-weight: 600; letter-spacing: -0.02em;">FlowB2B</h1>
    </div>

    <!-- Content -->
    <div style="padding: 40px;">
      <p style="color: #6B5C4A; font-size: 11px; font-weight: 500; letter-spacing: 0.2em; text-transform: uppercase; margin: 0 0 16px 0;">
        Convite de ${fornecedorNome}
      </p>

      <h2 style="color: #1F150C; font-size: 28px; line-height: 1.15; margin: 0 0 16px 0; font-weight: 600; letter-spacing: -0.02em;">
        Bem-vindo ao FlowB2B, ${nome || 'lojista'}.
      </h2>

      <p style="color: #6B5C4A; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
        <strong style="color: #1F150C;">${fornecedorNome}</strong> criou um acesso para você fazer pedidos diretamente do catálogo deles.
        Use os dados abaixo pra entrar pela primeira vez:
      </p>

      <!-- Credenciais -->
      <div style="background: #F5F1E8; border-radius: 16px; padding: 20px 24px; margin: 24px 0;">
        <div style="margin-bottom: 12px;">
          <p style="color: #A89B85; font-size: 11px; font-weight: 500; letter-spacing: 0.15em; text-transform: uppercase; margin: 0 0 4px 0;">CNPJ (login)</p>
          <p style="color: #1F150C; font-size: 16px; font-family: 'SF Mono', Menlo, monospace; margin: 0; font-weight: 500;">${cnpj}</p>
        </div>
        <div>
          <p style="color: #A89B85; font-size: 11px; font-weight: 500; letter-spacing: 0.15em; text-transform: uppercase; margin: 0 0 4px 0;">Senha provisoria</p>
          <p style="color: #1F150C; font-size: 16px; font-family: 'SF Mono', Menlo, monospace; margin: 0; font-weight: 500;">${senhaProvisoria}</p>
        </div>
      </div>

      <p style="color: #B6822E; font-size: 13px; line-height: 1.5; margin: 0 0 24px 0;">
        No primeiro acesso, você sera solicitado a trocar a senha por uma de sua escolha.
      </p>

      <!-- CTA -->
      <div style="margin: 32px 0;">
        <a href="${loginUrl}" style="display: inline-block; background-color: #1F150C; color: #FDFBF7; font-size: 14px; font-weight: 500; text-decoration: none; padding: 14px 28px; border-radius: 999px;">
          Acessar minha conta
        </a>
      </div>

      <hr style="border: none; border-top: 1px solid rgba(31, 21, 12, 0.06); margin: 32px 0 24px 0;">

      <p style="color: #A89B85; font-size: 12px; line-height: 1.5; margin: 0;">
        Se o botao nao funcionar, copie o link abaixo:<br>
        <a href="${loginUrl}" style="color: #6B5C4A; word-break: break-all;">${loginUrl}</a>
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #F5F1E8; padding: 20px 40px; text-align: center;">
      <p style="color: #A89B85; font-size: 11px; margin: 0;">
        © ${new Date().getFullYear()} FlowB2B. Todos os direitos reservados.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim()

  return sendEmail({
    to: email,
    subject: `${fornecedorNome} convidou voce para o FlowB2B`,
    html,
  })
}
