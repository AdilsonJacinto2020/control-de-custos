import { FileText, Shield, CheckCircle2, AlertTriangle, Scale, UserCheck, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { FinControlLogo } from '../components/FinControlLogo';
import './TermosPage.css';

export function TermosPage() {
  const dataAtualizacao = '9 de Setembro de 2026';

  return (
    <div className="termos-page-container">
      {/* ═══ HEADER / HERO ═══ */}
      <div className="termos-header-card">
        <Link to="/" className="termos-back-link">
          <ArrowLeft size={16} />
          <span>Voltar ao Painel</span>
        </Link>

        <div className="termos-badge">
          <FileText size={16} className="text-brand" />
          <span>TERMOS DE UTILIZAÇÃO E CONDIÇÕES DE SERVIÇO</span>
        </div>

        <div className="termos-brand-box">
          <FinControlLogo height={44} />
        </div>

        <h1>Termos e Condições de Utilização</h1>
        <p className="termos-lead">
          Bem-vindo ao FinControl. Ao utilizar a nossa plataforma web ou o nosso bot de WhatsApp, concorda com estes termos de utilização, concebidos de forma transparente e em conformidade com as boas práticas de engenharia e direito digital.
        </p>

        <div className="termos-meta-date">
          <span>Última atualização: {dataAtualizacao}</span>
        </div>
      </div>

      {/* ═══ CONTEÚDO PRINCIPAL ═══ */}
      <div className="termos-content-grid">
        {/* Secção 1 */}
        <div className="termos-section-card">
          <div className="termos-section-header">
            <div className="termos-icon-box">
              <CheckCircle2 size={20} />
            </div>
            <h2>1. Aceitação dos Termos</h2>
          </div>
          <div className="termos-section-body">
            <p>
              Ao aceder ao FinControl (seja através do website, aplicação web ou canal do WhatsApp), o utilizador confirma que leu, compreendeu e concorda em cumprir integralmente as condições aqui descritas. Caso não concorde com qualquer disposição, deve cessar imediatamente o uso da plataforma.
            </p>
          </div>
        </div>

        {/* Secção 2 */}
        <div className="termos-section-card">
          <div className="termos-section-header">
            <div className="termos-icon-box">
              <Shield size={20} />
            </div>
            <h2>2. Finalidade e Natureza do Serviço</h2>
          </div>
          <div className="termos-section-body">
            <p>
              O FinControl é uma ferramenta de engenharia de software desenvolvida para auxiliar na organização, cálculo, orçamentação e análise de finanças pessoais e de pequenos negócios.
            </p>
            <ul>
              <li><strong>Não é uma Instituição Bancária:</strong> O FinControl não custodia fundos, não processa liquidações financeiras nem realiza transferências de capital reais.</li>
              <li><strong>Gestão Informativa:</strong> Todos os saldos e lançamentos representam registos informativos inseridos diretamente pelo utilizador ou recebidos pelo bot autorizado.</li>
              <li><strong>Câmbio de Referência:</strong> As cotações apresentadas servem de referência de mercado e não constituem consultoria de investimento ou garantia de compra cambial.</li>
            </ul>
          </div>
        </div>

        {/* Secção 3 */}
        <div className="termos-section-card">
          <div className="termos-section-header">
            <div className="termos-icon-box">
              <UserCheck size={20} />
            </div>
            <h2>3. Contas, Acesso e Vinculação ao WhatsApp</h2>
          </div>
          <div className="termos-section-body">
            <ul>
              <li><strong>Autenticação:</strong> O acesso principal é realizado com segurança via Google OAuth 2.0. O utilizador é responsável por manter a confidencialidade da sua conta.</li>
              <li><strong>Vinculação de Mensageiro:</strong> Ao utilizar a função de vinculação de código numérico, o utilizador autoriza o bot do FinControl a associar os dados provenientes daquele número de telefone ao seu perfil.</li>
              <li><strong>Uso Responsável:</strong> É expressamente proibido utilizar a plataforma para fins ilícitos, engenharia reversa maliciosa ou envio abusivo de mensagens automatizadas (spam) ao bot.</li>
            </ul>
          </div>
        </div>

        {/* Secção 4 */}
        <div className="termos-section-card">
          <div className="termos-section-header">
            <div className="termos-icon-box">
              <AlertTriangle size={20} />
            </div>
            <h2>4. Limitação de Responsabilidade</h2>
          </div>
          <div className="termos-section-body">
            <p>
              O FinControl empenha-se em manter os cálculos e a plataforma com máxima precisão e disponibilidade contínua. No entanto:
            </p>
            <ul>
              <li>Não nos responsabilizamos por decisões financeiras, orçamentais ou comerciais tomadas com base nas projeções ou estatísticas da ferramenta.</li>
              <li>Instabilidades de rede móvel, indisponibilidade temporária de APIs de terceiros (como a Cloud API do WhatsApp ou fontes de câmbio) não configuram incumprimento do serviço.</li>
            </ul>
          </div>
        </div>

        {/* Secção 5 */}
        <div className="termos-section-card">
          <div className="termos-section-header">
            <div className="termos-icon-box">
              <Scale size={20} />
            </div>
            <h2>5. Propriedade Intelectual & Autoria</h2>
          </div>
          <div className="termos-section-body">
            <p>
              Todo o código-fonte, arquitetura, design visual, logótipos e funcionalidades do FinControl AO são propriedade intelectual desenvolvida por <strong>Adilson Jacinto</strong>. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </div>

      {/* ═══ FOOTER ═══ */}
      <div className="termos-footer-card">
        <p>© {new Date().getFullYear()} FinControl AO • Termos de Utilização em Língua Portuguesa</p>
      </div>
    </div>
  );
}
