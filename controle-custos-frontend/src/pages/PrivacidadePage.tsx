import { ShieldCheck, Lock, Eye, Server, RefreshCw, UserCheck, Mail, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { FinControlLogo } from '../components/FinControlLogo';
import './PrivacidadePage.css';

export function PrivacidadePage() {
  const dataAtualizacao = '9 de Setembro de 2026';

  return (
    <div className="privacy-page-container">
      {/* ═══ HEADER / HERO ═══ */}
      <div className="privacy-header-card">
        <Link to="/" className="privacy-back-link">
          <ArrowLeft size={16} />
          <span>Voltar ao Painel</span>
        </Link>

        <div className="privacy-badge">
          <ShieldCheck size={16} className="text-emerald-500" />
          <span>POLÍTICA DE PRIVACIDADE E PROTEÇÃO DE DADOS</span>
        </div>

        <div className="privacy-brand-box">
          <FinControlLogo height={44} />
        </div>

        <h1>Política de Privacidade do FinControl</h1>
        <p className="privacy-lead">
          A sua privacidade e a segurança dos seus dados financeiros são a prioridade máxima do FinControl. Esta política descreve de forma clara como recolhemos, utilizamos, armazenamos e protegemos as suas informações.
        </p>

        <div className="privacy-meta-date">
          <span>Última atualização: {dataAtualizacao}</span>
        </div>
      </div>

      {/* ═══ CONTEÚDO PRINCIPAL ═══ */}
      <div className="privacy-content-grid">
        {/* Secção 1 */}
        <div className="privacy-section-card">
          <div className="privacy-section-header">
            <div className="privacy-icon-box">
              <Eye size={20} />
            </div>
            <h2>1. Informações que Recolhemos</h2>
          </div>
          <div className="privacy-section-body">
            <p>Recolhemos apenas as informações estritamente necessárias para a prestação dos serviços de gestão financeira:</p>
            <ul>
              <li>
                <strong>Dados de Identificação de Conta:</strong> Nome, endereço de email e foto de perfil fornecidos via autenticação Google OAuth 2.0.
              </li>
              <li>
                <strong>Dados Financeiros e Lançamentos:</strong> Contas bancárias/carteiras criadas, valores de transações, categorias, orçamentos, metas de poupança e taxas cambiais personalizadas inseridas voluntariamente por si.
              </li>
              <li>
                <strong>Integração com WhatsApp:</strong> Número de telefone associado e conteúdo das mensagens de texto/comandos enviadas ao bot oficial do FinControl para efeitos de processamento e registo financeiro.
              </li>
            </ul>
          </div>
        </div>

        {/* Secção 2 */}
        <div className="privacy-section-card">
          <div className="privacy-section-header">
            <div className="privacy-icon-box">
              <Server size={20} />
            </div>
            <h2>2. Finalidade do Tratamento dos Dados</h2>
          </div>
          <div className="privacy-section-body">
            <p>Os seus dados são utilizados unicamente para:</p>
            <ul>
              <li>Permitir o cálculo consolidado do seu fluxo de caixa, orçamentos e relatórios estatísticos.</li>
              <li>Processar lançamentos e consultas automáticas via bot de WhatsApp vinculado à sua conta.</li>
              <li>Realizar projeções financeiras honestas baseadas no histórico real de despesas e receitas.</li>
              <li>Garantir o isolamento e a segurança das suas informações numa arquitetura multi-tenant dedicada.</li>
            </ul>
            <p className="privacy-highlight">
              🚫 <strong>Compromisso de Não Comercialização:</strong> O FinControl <strong>NUNCA</strong> vende, aluga, cede ou partilha os seus dados pessoais ou financeiros com terceiros, agências de publicidade ou corretores de dados.
            </p>
          </div>
        </div>

        {/* Secção 3 */}
        <div className="privacy-section-card">
          <div className="privacy-section-header">
            <div className="privacy-icon-box">
              <Lock size={20} />
            </div>
            <h2>3. Segurança e Criptografia</h2>
          </div>
          <div className="privacy-section-body">
            <p>Adotamos medidas técnicas e organizativas rigorosas para proteger os seus dados:</p>
            <ul>
              <li><strong>Tráfego Criptografado:</strong> Todas as comunicações entre o seu navegador, o bot do WhatsApp e os nossos servidores utilizam TLS/HTTPS com encriptação forte.</li>
              <li><strong>Autenticação Segura:</strong> Sessões autenticadas via tokens JWT com assinatura digital criptográfica e segredo restrito.</li>
              <li><strong>Isolamento de Sessões:</strong> Sessões de convidados (guest) utilizam identificadores efémeros isolados, impedindo o cruzamento de informações entre utilizadores.</li>
            </ul>
          </div>
        </div>

        {/* Secção 4 */}
        <div className="privacy-section-card">
          <div className="privacy-section-header">
            <div className="privacy-icon-box">
              <UserCheck size={20} />
            </div>
            <h2>4. Os Seus Direitos e Controlo de Dados</h2>
          </div>
          <div className="privacy-section-body">
            <p>Enquanto titular dos dados, tem controlo total sobre a sua informação:</p>
            <ul>
              <li><strong>Acesso e Retificação:</strong> Pode consultar, editar e atualizar qualquer conta, categoria ou transação diretamente na plataforma a qualquer momento.</li>
              <li><strong>Eliminação de Dados:</strong> Pode excluir lançamentos, contas ou solicitar o cancelamento e desvinculação da sua conta e número de WhatsApp.</li>
              <li><strong>Desvinculação do WhatsApp:</strong> Pode a qualquer momento cancelar a ligação entre o seu número de telefone e a conta web através do suporte ou definições.</li>
            </ul>
          </div>
        </div>

        {/* Secção 5 */}
        <div className="privacy-section-card">
          <div className="privacy-section-header">
            <div className="privacy-icon-box">
              <RefreshCw size={20} />
            </div>
            <h2>5. Cotações e Serviços Externos</h2>
          </div>
          <div className="privacy-section-body">
            <p>
              As cotações de câmbio são consultadas publicamente via agregadores de mercado (como `open.er-api.com`). Nenhuma informação pessoal ou transacional do utilizador é partilhada com estas APIs externas durante a consulta de taxas de referência.
            </p>
          </div>
        </div>

        {/* Secção 6 */}
        <div className="privacy-section-card">
          <div className="privacy-section-header">
            <div className="privacy-icon-box">
              <Mail size={20} />
            </div>
            <h2>6. Contacto e Encarregado de Privacidade</h2>
          </div>
          <div className="privacy-section-body">
            <p>Para dúvidas, esclarecimentos ou pedidos relacionados com a privacidade dos seus dados, entre em contacto com o responsável do projeto:</p>
            <div className="privacy-contact-box">
              <strong>Adilson Jacinto</strong>
              <span>Engenheiro de Software & Criador do FinControl</span>
              <a
                href="https://profile-adijacinto.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand font-semibold hover:underline mt-1 inline-block"
              >
                profile-adijacinto.vercel.app
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ FOOTER ═══ */}
      <div className="privacy-footer-card">
        <p>© {new Date().getFullYear()} FinControl AO • Todos os direitos reservados • Política de Privacidade</p>
      </div>
    </div>
  );
}
