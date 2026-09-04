import {
  ShieldCheck,
  Globe,
  Wallet,
  Sparkles,
  ExternalLink,
  Lock,
  Layers,
  Code2,
  Terminal,
  MessageSquare,
} from 'lucide-react';
import { FinControlLogo } from '../components/FinControlLogo';
import './AboutPage.css';

export function AboutPage() {
  const stacks = [
    { name: 'NestJS v11', desc: 'Backend Modular & Arquitetura Escalável' },
    { name: 'React 19 & Vite', desc: 'Frontend Reactivo de Alta Performance' },
    { name: 'Data Router v7', desc: 'Carregamento Paralelo & Suspense de Rotas' },
    { name: 'PostgreSQL & TypeORM', desc: 'Armazenamento Relacional Estruturado' },
    { name: 'Meta Cloud API v22', desc: 'Integração Nativa WhatsApp Business' },
    { name: 'Open Exchange Rates', desc: 'Câmbio em Tempo Real BNA / Internacional' },
  ];

  const features = [
    {
      icon: MessageSquare,
      title: 'Controlo via WhatsApp Bot',
      desc: 'Registe despesas, consulte o saldo mensal ou desfaça lançamentos com comando de texto natural ou áudio.',
    },
    {
      icon: Globe,
      title: 'Câmbio em Tempo Real & Metical/Kwanza',
      desc: 'Conversão automática de moedas (AOA, USD, EUR, BRL, ZAR) sincronizada com mercados internacionais e BNA.',
    },
    {
      icon: Layers,
      title: 'Método Orçamental 50/30/20',
      desc: 'Distribuição inteligente entre Necessidades, Desejos e Poupança com alertas preventivos de estouro.',
    },
    {
      icon: Sparkles,
      title: 'Gamificação & Sequências Diárias',
      desc: 'Progressão com XP, Níveis técnicos e dias consecutivos de gestão consciente com check-in Zero Despesa.',
    },
    {
      icon: Lock,
      title: 'Segurança & Privacidade Rigorosa',
      desc: 'Autenticação Google OAuth 2.0 criptografada com isolamento multi-tenant e proteção total de dados.',
    },
    {
      icon: Wallet,
      title: 'Espaços Partilhados & Rateio',
      desc: 'Gestão conjunta de orçamentos e eventos futuros para famílias, projetos ou equipas colaborativas.',
    },
  ];

  return (
    <div className="about-page-container">
      {/* ═══ HERO SECTION ═══ */}
      <div className="about-hero-card">
        <div className="about-hero-badge">
          <Terminal size={14} className="text-brand" />
          <span>SISTEMA DE ENGENHARIA FINANCEIRA • V2.0</span>
        </div>

        <div className="about-brand-wrap">
          <FinControlLogo height={52} />
        </div>

        <p className="about-hero-lead">
          Plataforma técnica desenvolvida para proporcionar controlo financeiro pessoal e colaborativo com máxima precisão, arquitetura reativa moderna e automação direta via WhatsApp.
        </p>

        <div className="about-author-strip">
          <div className="author-info">
            <span className="author-label">Conceção & Engenharia por</span>
            <strong className="author-name">Adilson Jacinto</strong>
            <span className="author-tag">Software Engineer • AngoData</span>
          </div>
          <div className="author-actions">
            <a
              href="https://profile-adijacinto.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="about-btn-portfolio"
            >
              <ExternalLink size={16} />
              <span>Ver Portfólio Profissional</span>
            </a>
          </div>
        </div>
      </div>

      {/* ═══ CAPACIDADES DO SISTEMA ═══ */}
      <div className="about-section">
        <div className="about-section-header">
          <Code2 size={20} className="text-brand" />
          <h2>Capacidades e Funcionalidades do FinControl</h2>
        </div>

        <div className="about-grid-features">
          {features.map((f, idx) => {
            const Icon = f.icon;
            return (
              <div key={idx} className="about-feature-box">
                <div className="feature-icon-wrapper">
                  <Icon size={22} className="text-brand" />
                </div>
                <h3 className="feature-title">{f.title}</h3>
                <p className="feature-desc">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══ ARQUITETURA & STACK TÉCNICA ═══ */}
      <div className="about-section">
        <div className="about-section-header">
          <Terminal size={20} className="text-brand" />
          <h2>Arquitetura Técnica e Infraestrutura</h2>
        </div>

        <div className="about-stack-grid">
          {stacks.map((st, i) => (
            <div key={i} className="about-stack-item">
              <div className="stack-status-dot" />
              <div className="stack-content">
                <span className="stack-name">{st.name}</span>
                <span className="stack-desc">{st.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ MANIFESTO / VISÃO ═══ */}
      <div className="about-manifesto-card">
        <div className="manifesto-badge">
          <ShieldCheck size={18} className="text-emerald-500" />
          <span>GARANTIA DE PRIVACIDADE & ZERO ANÚNCIOS</span>
        </div>
        <p className="manifesto-text">
          O FinControl foi construído sobre princípios de transparência técnica, alto desempenho e utilidade real sem atrito. Os seus dados financeiros pertencem exclusivamente a si.
        </p>
        <div className="manifesto-footer">
          <span>© {new Date().getFullYear()} FinControl AO • Desenvolvido por Adilson Jacinto</span>
        </div>
      </div>
    </div>
  );
}
