'use client'

import Link from 'next/link'
import { LegalLayout } from '@/components/legal'

export default function PrivacyPolicyPage() {
  return (
    <LegalLayout
      title="Politica de Privacidade"
      lastUpdate={new Date().toLocaleDateString('pt-BR')}
    >
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-primary-700 mb-4">
          1. Introducao
        </h2>
        <p className="text-gray-600 leading-relaxed mb-4">
          A FlowB2B ("nos", "nosso" ou "Plataforma") esta comprometida em proteger a
          privacidade dos dados de nossos usuarios. Esta Politica de Privacidade descreve
          como coletamos, usamos, armazenamos e protegemos suas informacoes pessoais e
          empresariais quando voce utiliza nossa plataforma de gestao de compras B2B.
        </p>
        <p className="text-gray-600 leading-relaxed">
          Ao utilizar a FlowB2B, voce concorda com as praticas descritas nesta politica.
          Recomendamos a leitura atenta deste documento.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-primary-700 mb-4">
          2. Dados que Coletamos
        </h2>
        <p className="text-gray-600 leading-relaxed mb-4">
          Coletamos os seguintes tipos de informacoes:
        </p>
        <h3 className="text-lg font-medium text-gray-800 mb-2">2.1. Dados de Cadastro</h3>
        <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-1">
          <li>Nome completo e email do usuario</li>
          <li>Razao social e nome fantasia da empresa</li>
          <li>CNPJ e inscricoes estadual/municipal</li>
          <li>Endereco comercial</li>
          <li>Telefone de contato</li>
        </ul>

        <h3 className="text-lg font-medium text-gray-800 mb-2">2.2. Dados do ERP Bling</h3>
        <p className="text-gray-600 leading-relaxed mb-4">
          Mediante sua autorizacao via OAuth 2.0, acessamos e sincronizamos:
        </p>
        <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-1">
          <li>Catalogo de produtos e informacoes de estoque</li>
          <li>Cadastro de fornecedores e clientes</li>
          <li>Pedidos de compra e venda</li>
          <li>Notas fiscais e movimentacoes de estoque</li>
          <li>Formas de pagamento configuradas</li>
        </ul>

        <h3 className="text-lg font-medium text-gray-800 mb-2">2.3. Dados de Uso</h3>
        <ul className="list-disc pl-6 text-gray-600 space-y-1">
          <li>Logs de acesso e navegacao na plataforma</li>
          <li>Preferencias e configuracoes do usuario</li>
          <li>Interacoes com funcionalidades do sistema</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-primary-700 mb-4">
          3. Como Utilizamos seus Dados
        </h2>
        <p className="text-gray-600 leading-relaxed mb-4">
          Utilizamos suas informacoes para:
        </p>
        <ul className="list-disc pl-6 text-gray-600 space-y-2">
          <li>
            <strong>Gestao de Compras:</strong> Calcular sugestoes automaticas de pedidos
            com base no historico de vendas, estoque atual e politicas comerciais definidas.
          </li>
          <li>
            <strong>Sincronizacao:</strong> Manter seus dados atualizados entre a FlowB2B
            e o ERP Bling em tempo real.
          </li>
          <li>
            <strong>Analises e Relatorios:</strong> Gerar insights sobre curva ABC de produtos,
            desempenho de fornecedores e previsoes de demanda.
          </li>
          <li>
            <strong>Comunicacao:</strong> Enviar notificacoes importantes sobre sua conta,
            atualizacoes do sistema e alertas de estoque.
          </li>
          <li>
            <strong>Melhorias:</strong> Aprimorar nossa plataforma com base em padroes
            de uso agregados e anonimizados.
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-primary-700 mb-4">
          4. Compartilhamento de Dados
        </h2>
        <p className="text-gray-600 leading-relaxed mb-4">
          Seus dados podem ser compartilhados com:
        </p>
        <ul className="list-disc pl-6 text-gray-600 space-y-2">
          <li>
            <strong>Bling:</strong> Para sincronizacao bidirecional de dados do seu ERP,
            conforme autorizado por voce via OAuth.
          </li>
          <li>
            <strong>Provedores de Infraestrutura:</strong> Utilizamos Supabase para
            armazenamento seguro de dados e Render para hospedagem de APIs.
          </li>
          <li>
            <strong>Autoridades:</strong> Quando exigido por lei ou ordem judicial.
          </li>
        </ul>
        <p className="text-gray-600 leading-relaxed mt-4">
          <strong>Importante:</strong> Nunca vendemos, alugamos ou comercializamos seus
          dados pessoais ou empresariais para terceiros.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-primary-700 mb-4">
          5. Isolamento de Dados (Multi-tenant)
        </h2>
        <p className="text-gray-600 leading-relaxed">
          A FlowB2B opera em arquitetura multi-tenant, onde cada empresa possui um
          identificador unico (empresa_id). Todos os dados sao rigorosamente isolados,
          garantindo que nenhuma empresa tenha acesso aos dados de outra. Implementamos
          controles de seguranca em nivel de banco de dados (Row Level Security) para
          assegurar esse isolamento.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-primary-700 mb-4">
          6. Seguranca dos Dados
        </h2>
        <p className="text-gray-600 leading-relaxed mb-4">
          Adotamos medidas tecnicas e organizacionais para proteger seus dados:
        </p>
        <ul className="list-disc pl-6 text-gray-600 space-y-1">
          <li>Criptografia em transito (HTTPS/TLS) e em repouso</li>
          <li>Autenticacao via tokens JWT com expiracao</li>
          <li>Tokens OAuth do Bling armazenados de forma segura com renovacao automatica</li>
          <li>Backups automaticos e redundancia de dados</li>
          <li>Monitoramento continuo de acessos e anomalias</li>
          <li>Senhas armazenadas com hash bcrypt</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-primary-700 mb-4">
          7. Retencao de Dados
        </h2>
        <p className="text-gray-600 leading-relaxed">
          Mantemos seus dados enquanto sua conta estiver ativa ou conforme necessario
          para cumprir obrigacoes legais, resolver disputas e fazer cumprir nossos acordos.
          Dados de transacoes comerciais (pedidos, notas fiscais) sao mantidos pelo periodo
          exigido pela legislacao fiscal brasileira (minimo 5 anos).
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-primary-700 mb-4">
          8. Seus Direitos (LGPD)
        </h2>
        <p className="text-gray-600 leading-relaxed mb-4">
          Conforme a Lei Geral de Protecao de Dados (LGPD), voce tem direito a:
        </p>
        <ul className="list-disc pl-6 text-gray-600 space-y-1">
          <li>Confirmar a existencia de tratamento de seus dados</li>
          <li>Acessar seus dados pessoais</li>
          <li>Corrigir dados incompletos, inexatos ou desatualizados</li>
          <li>Solicitar anonimizacao, bloqueio ou eliminacao de dados desnecessarios</li>
          <li>Solicitar portabilidade dos dados</li>
          <li>Revogar consentimento a qualquer momento</li>
          <li>Obter informacoes sobre compartilhamento de dados</li>
        </ul>
        <p className="text-gray-600 leading-relaxed mt-4">
          Para exercer seus direitos, entre em contato atraves do email:
          <a href="mailto:privacidade@flowb2b.com.br" className="text-primary-600 hover:underline ml-1">
            privacidade@flowb2b.com.br
          </a>
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-primary-700 mb-4">
          9. Cookies e Tecnologias Similares
        </h2>
        <p className="text-gray-600 leading-relaxed">
          Utilizamos cookies essenciais para manter sua sessao autenticada e garantir
          o funcionamento da plataforma. Nao utilizamos cookies de rastreamento para
          publicidade. Os cookies de sessao sao armazenados de forma segura (httpOnly)
          e expiram apos o periodo de inatividade definido.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-primary-700 mb-4">
          10. Alteracoes nesta Politica
        </h2>
        <p className="text-gray-600 leading-relaxed">
          Podemos atualizar esta Politica de Privacidade periodicamente. Notificaremos
          sobre mudancas significativas atraves de email ou aviso na plataforma.
          Recomendamos revisar esta pagina regularmente. O uso continuado da plataforma
          apos alteracoes constitui aceitacao da politica atualizada.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-primary-700 mb-4">
          11. Contato
        </h2>
        <p className="text-gray-600 leading-relaxed">
          Para duvidas sobre esta Politica de Privacidade ou sobre o tratamento de
          seus dados, entre em contato:
        </p>
        <div className="mt-4 p-4 bg-primary-50 rounded-lg border border-primary-100">
          <p className="text-primary-700 font-medium">FlowB2B</p>
          <p className="text-gray-600">Email: privacidade@flowb2b.com.br</p>
          <p className="text-gray-600">Encarregado de Dados (DPO): dpo@flowb2b.com.br</p>
        </div>
      </section>
    </LegalLayout>
  )
}
