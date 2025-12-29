'use client'

import Link from 'next/link'
import { LegalLayout } from '@/components/legal'

export default function TermsOfUsePage() {
  return (
    <LegalLayout
      title="Termos de Uso"
      lastUpdate={new Date().toLocaleDateString('pt-BR')}
    >
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-primary-700 mb-4">
          1. Aceitacao dos Termos
        </h2>
        <p className="text-gray-600 leading-relaxed mb-4">
          Bem-vindo a FlowB2B! Ao acessar ou utilizar nossa plataforma de gestao de
          compras B2B, voce concorda em cumprir e estar vinculado a estes Termos de Uso.
          Se voce nao concordar com qualquer parte destes termos, nao devera utilizar
          nossos servicos.
        </p>
        <p className="text-gray-600 leading-relaxed">
          Estes termos constituem um acordo legal entre voce (usuario ou empresa) e a
          FlowB2B. Leia-os atentamente antes de utilizar a plataforma.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-primary-700 mb-4">
          2. Descricao do Servico
        </h2>
        <p className="text-gray-600 leading-relaxed mb-4">
          A FlowB2B e uma plataforma de gestao de compras B2B que oferece:
        </p>
        <ul className="list-disc pl-6 text-gray-600 space-y-2">
          <li>
            <strong>Integracao com Bling:</strong> Sincronizacao automatica de produtos,
            fornecedores, clientes, pedidos e notas fiscais com seu ERP Bling.
          </li>
          <li>
            <strong>Gestao de Estoque:</strong> Monitoramento em tempo real de niveis
            de estoque, alertas de reposicao e classificacao ABC de produtos.
          </li>
          <li>
            <strong>Sugestao Automatica de Pedidos:</strong> Calculo inteligente de
            quantidades de compra baseado em historico de vendas, estoque atual,
            prazo de entrega e politicas comerciais.
          </li>
          <li>
            <strong>Politicas Comerciais:</strong> Configuracao de regras por fornecedor
            incluindo valor minimo, descontos, bonificacoes e prazos de pagamento.
          </li>
          <li>
            <strong>Analises e Relatorios:</strong> Dashboards e relatorios para
            tomada de decisao baseada em dados.
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-primary-700 mb-4">
          3. Cadastro e Conta
        </h2>
        <h3 className="text-lg font-medium text-gray-800 mb-2">3.1. Requisitos</h3>
        <p className="text-gray-600 leading-relaxed mb-4">
          Para utilizar a FlowB2B, voce deve:
        </p>
        <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-1">
          <li>Ser maior de 18 anos</li>
          <li>Possuir CNPJ ativo e regular</li>
          <li>Ter uma conta ativa no ERP Bling</li>
          <li>Fornecer informacoes verdadeiras e completas no cadastro</li>
        </ul>

        <h3 className="text-lg font-medium text-gray-800 mb-2">3.2. Responsabilidades</h3>
        <p className="text-gray-600 leading-relaxed mb-4">
          Voce e responsavel por:
        </p>
        <ul className="list-disc pl-6 text-gray-600 space-y-1">
          <li>Manter a confidencialidade de suas credenciais de acesso</li>
          <li>Todas as atividades realizadas em sua conta</li>
          <li>Notificar imediatamente qualquer uso nao autorizado</li>
          <li>Manter seus dados cadastrais atualizados</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-primary-700 mb-4">
          4. Integracao com Bling
        </h2>
        <p className="text-gray-600 leading-relaxed mb-4">
          Ao conectar sua conta Bling a FlowB2B:
        </p>
        <ul className="list-disc pl-6 text-gray-600 space-y-2">
          <li>
            Voce autoriza o acesso aos dados do seu ERP conforme escopo definido
            no processo de autorizacao OAuth 2.0.
          </li>
          <li>
            A FlowB2B realizara sincronizacoes periodicas para manter os dados
            atualizados, respeitando os limites de requisicoes da API Bling
            (300 req/min).
          </li>
          <li>
            Voce pode revogar a autorizacao a qualquer momento atraves das
            configuracoes da sua conta Bling.
          </li>
          <li>
            A FlowB2B nao se responsabiliza por indisponibilidades ou alteracoes
            na API do Bling que possam afetar o funcionamento da integracao.
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-primary-700 mb-4">
          5. Uso Aceitavel
        </h2>
        <p className="text-gray-600 leading-relaxed mb-4">
          Ao utilizar a FlowB2B, voce concorda em NAO:
        </p>
        <ul className="list-disc pl-6 text-gray-600 space-y-1">
          <li>Violar leis ou regulamentos aplicaveis</li>
          <li>Fornecer informacoes falsas ou enganosas</li>
          <li>Tentar acessar dados de outras empresas</li>
          <li>Realizar engenharia reversa ou tentar extrair codigo-fonte</li>
          <li>Usar bots, scrapers ou ferramentas automatizadas nao autorizadas</li>
          <li>Sobrecarregar nossos servidores com requisicoes excessivas</li>
          <li>Compartilhar suas credenciais com terceiros nao autorizados</li>
          <li>Usar a plataforma para fins ilegais ou fraudulentos</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-primary-700 mb-4">
          6. Propriedade Intelectual
        </h2>
        <p className="text-gray-600 leading-relaxed mb-4">
          A FlowB2B e seus licenciadores detem todos os direitos sobre:
        </p>
        <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-1">
          <li>Codigo-fonte, design e interface da plataforma</li>
          <li>Algoritmos de calculo de sugestao de pedidos</li>
          <li>Marca, logo e identidade visual FlowB2B</li>
          <li>Documentacao e materiais de suporte</li>
        </ul>
        <p className="text-gray-600 leading-relaxed">
          Voce mantem a propriedade de todos os seus dados comerciais inseridos
          ou sincronizados na plataforma.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-primary-700 mb-4">
          7. Sugestoes de Pedidos
        </h2>
        <p className="text-gray-600 leading-relaxed mb-4">
          O calculo automatico de sugestoes de pedidos e baseado em:
        </p>
        <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-1">
          <li>Historico de vendas dos produtos</li>
          <li>Niveis atuais de estoque</li>
          <li>Prazo de entrega do fornecedor</li>
          <li>Politicas comerciais configuradas (valor minimo, embalagens, etc.)</li>
          <li>Margem de seguranca de 25% quando estoque zerado</li>
        </ul>
        <div className="p-4 bg-warning-500/10 border border-warning-500/20 rounded-lg">
          <p className="text-gray-700">
            <strong>Importante:</strong> As sugestoes sao recomendacoes baseadas em dados
            historicos e nao garantem resultados. A decisao final de compra e de
            responsabilidade exclusiva do usuario. A FlowB2B nao se responsabiliza por
            perdas decorrentes de decisoes de compra baseadas nas sugestoes.
          </p>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-primary-700 mb-4">
          8. Disponibilidade do Servico
        </h2>
        <p className="text-gray-600 leading-relaxed mb-4">
          Nos esforcaremos para manter a plataforma disponivel 24/7, porem:
        </p>
        <ul className="list-disc pl-6 text-gray-600 space-y-1">
          <li>Podem ocorrer interrupcoes para manutencao programada</li>
          <li>Eventos fora do nosso controle podem causar indisponibilidades</li>
          <li>A disponibilidade da integracao depende do status da API Bling</li>
          <li>Reservamo-nos o direito de modificar ou descontinuar funcionalidades</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-primary-700 mb-4">
          9. Limitacao de Responsabilidade
        </h2>
        <p className="text-gray-600 leading-relaxed mb-4">
          Na extensao maxima permitida por lei:
        </p>
        <ul className="list-disc pl-6 text-gray-600 space-y-2">
          <li>
            A FlowB2B e fornecida "como esta", sem garantias de qualquer tipo,
            expressas ou implicitas.
          </li>
          <li>
            Nao garantimos que o servico sera ininterrupto, seguro ou livre de erros.
          </li>
          <li>
            Nao somos responsaveis por danos indiretos, incidentais, especiais ou
            consequenciais decorrentes do uso da plataforma.
          </li>
          <li>
            Nossa responsabilidade total esta limitada ao valor pago pelo usuario
            nos ultimos 12 meses.
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-primary-700 mb-4">
          10. Indenizacao
        </h2>
        <p className="text-gray-600 leading-relaxed">
          Voce concorda em indenizar e isentar a FlowB2B de quaisquer reclamacoes,
          danos, perdas e despesas (incluindo honorarios advocaticios) decorrentes
          de: (a) seu uso da plataforma; (b) violacao destes termos; (c) violacao
          de direitos de terceiros; ou (d) suas acoes ou omissoes.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-primary-700 mb-4">
          11. Encerramento
        </h2>
        <p className="text-gray-600 leading-relaxed mb-4">
          Voce pode encerrar sua conta a qualquer momento atraves das configuracoes
          da plataforma ou entrando em contato conosco.
        </p>
        <p className="text-gray-600 leading-relaxed mb-4">
          Reservamo-nos o direito de suspender ou encerrar sua conta se:
        </p>
        <ul className="list-disc pl-6 text-gray-600 space-y-1">
          <li>Houver violacao destes Termos de Uso</li>
          <li>Detectarmos atividades suspeitas ou fraudulentas</li>
          <li>For exigido por lei ou ordem judicial</li>
          <li>A conta permanecer inativa por periodo prolongado</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-primary-700 mb-4">
          12. Alteracoes nos Termos
        </h2>
        <p className="text-gray-600 leading-relaxed">
          Podemos modificar estes Termos de Uso a qualquer momento. Alteracoes
          significativas serao comunicadas por email ou aviso na plataforma com
          antecedencia minima de 30 dias. O uso continuado apos as alteracoes
          entrarem em vigor constitui aceitacao dos novos termos.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-primary-700 mb-4">
          13. Lei Aplicavel e Foro
        </h2>
        <p className="text-gray-600 leading-relaxed">
          Estes Termos de Uso sao regidos pelas leis da Republica Federativa do Brasil.
          Qualquer disputa sera submetida ao foro da Comarca de Sao Paulo/SP, com
          exclusao de qualquer outro, por mais privilegiado que seja.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-primary-700 mb-4">
          14. Contato
        </h2>
        <p className="text-gray-600 leading-relaxed">
          Para duvidas sobre estes Termos de Uso, entre em contato:
        </p>
        <div className="mt-4 p-4 bg-primary-50 rounded-lg border border-primary-100">
          <p className="text-primary-700 font-medium">FlowB2B</p>
          <p className="text-gray-600">Email: contato@flowb2b.com.br</p>
          <p className="text-gray-600">Suporte: suporte@flowb2b.com.br</p>
        </div>
      </section>
    </LegalLayout>
  )
}
