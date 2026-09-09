import React, { useState } from 'react';
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigation,
} from 'react-router-dom';
import {
  Layers,
  Wallet,
  FolderTree,
  Target,
  PiggyBank,
  Sparkles,
  Users,
  Globe,
  Sun,
  Moon,
  LogOut,
  MoreHorizontal,
  X,
  Zap,
  Flame,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  Info,
  MessageSquare,
  FileText,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { formatUserName } from '../utils/formatters';
import { FinControlLogo } from '../components/FinControlLogo';
import { VincularWhatsappModal } from '../components/VincularWhatsappModal';
import { BoasVindasModal } from '../components/BoasVindasModal';
import { GoogleLogin } from '@react-oauth/google';
import './AppLayout.css';

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
  categoria: 'principal' | 'planeamento' | 'colaboracao';
}

const navItems: NavItem[] = [
  {
    label: 'Painel & Despesas',
    icon: Layers,
    path: '/',
    categoria: 'principal',
  },
  {
    label: 'Contas & Carteiras',
    icon: Wallet,
    path: '/contas',
    categoria: 'principal',
  },
  {
    label: 'Categorias',
    icon: FolderTree,
    path: '/categorias',
    categoria: 'principal',
  },
  {
    label: 'Orçamentos (50/30/20)',
    icon: Target,
    path: '/orcamentos',
    categoria: 'planeamento',
  },
  {
    label: 'Rendimentos & Metas',
    icon: PiggyBank,
    path: '/rendimentos',
    categoria: 'planeamento',
  },
  {
    label: 'Eventos & Projetos',
    icon: Sparkles,
    path: '/eventos',
    categoria: 'planeamento',
  },
  {
    label: 'Espaços Partilhados',
    icon: Users,
    path: '/espacos',
    categoria: 'colaboracao',
  },
  {
    label: 'Taxas de Câmbio',
    icon: Globe,
    path: '/cambio',
    categoria: 'colaboracao',
  },
  {
    label: 'Sobre o Sistema',
    icon: Info,
    path: '/sobre',
    categoria: 'colaboracao',
  },
  {
    label: 'Privacidade de Dados',
    icon: ShieldCheck,
    path: '/privacidade',
    categoria: 'colaboracao',
  },
  {
    label: 'Termos de Serviço',
    icon: FileText,
    path: '/termos',
    categoria: 'colaboracao',
  },
];

const CATEGORIAS_TITULO = {
  principal: 'Principal',
  planeamento: 'Planeamento',
  colaboracao: 'Colaboração & Câmbio',
};

export function AppLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);
  const [boasVindasOpen, setBoasVindasOpen] = useState(false);
  const location = useLocation();
  const navigation = useNavigation();
  const { theme, toggleTheme } = useTheme();
  const { user, gamification, checkInZeroExpense, loginGoogle, logout } = useAuth();

  const handleGoogleSuccess = async (credential: string) => {
    try {
      await loginGoogle(credential);
      setBoasVindasOpen(true);
    } catch (err) {
      console.error('Falha no login:', err);
    }
  };

  const isRouteLoading = navigation.state === 'loading';

  // Itens em destaque na barra inferior mobile (Estilo Gestão-SIS com Bottom Sheet)
  const bottomNavItems = [
    { label: 'Painel', icon: Layers, path: '/' },
    { label: 'Contas', icon: Wallet, path: '/contas' },
    { label: 'Categorias', icon: FolderTree, path: '/categorias' },
    { label: 'Orçamentos', icon: Target, path: '/orcamentos' },
  ];

  const bottomPaths = bottomNavItems.map((b) => b.path);
  const isMaisActive =
    mobileMenuOpen ||
    (!bottomPaths.some((p) => (p === '/' ? location.pathname === '/' : location.pathname.startsWith(p))) &&
      location.pathname !== '/perfil');

  const categoriasUnicas: Array<'principal' | 'planeamento' | 'colaboracao'> = [
    'principal',
    'planeamento',
    'colaboracao',
  ];

  const today = new Date().toISOString().slice(0, 10);
  const checkedInToday = user?.lastCheckinDate === today;

  return (
    <div className="layout-root">
      {/* Barra de Carregamento de Rota (Data Router Loader Indicator) */}
      {isRouteLoading && <div className="route-loading-bar" />}

      {/* ═══════════ DESKTOP SIDEBAR ═══════════ */}
      <aside className="layout-sidebar">
        <div className="sidebar-top">
          <div className="sidebar-brand-box">
            <Link to="/" className="!no-underline transition-opacity hover:opacity-85 flex items-center" title="FinControl Home">
              <FinControlLogo height={38} />
            </Link>
          </div>

          <nav className="sidebar-nav-container">
            {categoriasUnicas.map((cat) => {
              const items = navItems.filter((i) => i.categoria === cat);
              return (
                <div key={cat} className="nav-group">
                  <div className="nav-group-title">{CATEGORIAS_TITULO[cat]}</div>
                  {items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.path === '/'}
                        className={({ isActive }) =>
                          `sidebar-nav-link ${isActive ? 'active' : ''}`
                        }
                      >
                        <div className="nav-link-left">
                          <Icon size={17} />
                          <span>{item.label}</span>
                        </div>
                        <ChevronRight size={14} className="nav-link-arrow" />
                      </NavLink>
                    );
                  })}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Footer do Utilizador na Sidebar */}
        <div className="sidebar-bottom">
          {user && !user.isGuest ? (
            <div className="user-sidebar-card">
              {user.picture ? (
                <img src={user.picture} alt={user.name} className="user-avatar-img" />
              ) : (
                <div className="user-avatar-initials">{user.name.charAt(0)}</div>
              )}
              <div className="user-sidebar-info">
                <span className="user-sidebar-name">{formatUserName(user.name)}</span>
                <span className="user-sidebar-email">{user.email}</span>
              </div>
              <button
                className="btn-sidebar-logout"
                onClick={logout}
                title="Terminar sessão"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2 w-full">
              <div className="sidebar-google-login">
                <GoogleLogin
                  onSuccess={(res) => {
                    if (res.credential) handleGoogleSuccess(res.credential);
                  }}
                  shape="pill"
                  size="medium"
                />
              </div>
              {user?.isGuest && (
                <div className="text-[10px] text-center text-muted">
                  Modo Convidado • Faça login para salvar
                </div>
              )}
            </div>
          )}

          <div className="sidebar-credits">
            <div className="flex items-center gap-1.5 justify-center flex-wrap">
              <Link to="/sobre" className="!no-underline hover:text-brand transition-colors text-muted text-[11px]">
                Sobre
              </Link>
              <span className="text-muted text-[10px]">•</span>
              <Link to="/privacidade" className="!no-underline hover:text-brand transition-colors text-muted text-[11px]">
                Privacidade
              </Link>
              <span className="text-muted text-[10px]">•</span>
              <Link to="/termos" className="!no-underline hover:text-brand transition-colors text-muted text-[11px]">
                Termos
              </Link>
            </div>
            <a
              href="https://profile-adijacinto.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="!no-underline text-brand font-semibold hover:brightness-110 text-[11px]"
            >
              Adilson Jacinto
            </a>
          </div>
        </div>
      </aside>

      {/* ═══════════ ÁREA PRINCIPAL ═══════════ */}
      <div className="layout-main-viewport">
        {/* TOPBAR COMPACTA & ELEGANTE */}
        <header className="layout-topbar">
          {/* Lado Esquerdo: Widget de Gamificação / XP Compacto e Elegante */}
          <div className="topbar-gamification">
            <div className="topbar-streak-chip">
              <Flame
                size={16}
                className={`topbar-flame ${gamification.streak > 0 ? 'active' : 'inactive'}`}
              />
              <span className="topbar-streak-num">{gamification.streak} Dias</span>
            </div>

            <div className="topbar-xp-chip">
              <div className="xp-info-row">
                <span className="xp-level-title">
                  <Zap size={13} className="text-amber-500" /> Nível {gamification.level}:{' '}
                  <strong>{gamification.levelTitle}</strong>
                </span>
                <span className="xp-fraction">
                  {gamification.xp} / {gamification.nextLevelXp} XP
                </span>
              </div>
              <div className="topbar-xp-progress-bg">
                <div
                  className="topbar-xp-progress-bar"
                  style={{
                    width: `${Math.min(
                      100,
                      (gamification.xp / gamification.nextLevelXp) * 100,
                    )}%`,
                  }}
                />
              </div>
            </div>

            <button
              className={`topbar-btn-checkin ${checkedInToday ? 'done' : ''}`}
              onClick={checkInZeroExpense}
              disabled={checkedInToday}
              title={
                checkedInToday
                  ? 'Dia seguro contabilizado!'
                  : 'Registrar dia sem gastos extras'
              }
            >
              {checkedInToday ? (
                <>
                  <CheckCircle2 size={14} /> <span>Dia Seguro</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={14} /> <span>Zero Gastos</span>
                </>
              )}
            </button>
          </div>

          {/* Lado Direito: Alternador de Tema & Perfil */}
          <div className="topbar-right-actions">
            <button
              className="btn-secondary !py-1 !px-2.5 !text-xs flex items-center gap-1.5 text-emerald-600 hover:text-emerald-500 font-medium"
              onClick={() => setWhatsappModalOpen(true)}
              title="Vincular ao WhatsApp Bot"
            >
              <MessageSquare size={14} className="text-emerald-500" />
              <span className="hidden sm:inline">Vincular WhatsApp</span>
            </button>

            <button
              className="btn-theme-round"
              onClick={toggleTheme}
              title={`Mudar para modo ${theme === 'dark' ? 'claro' : 'escuro'}`}
              aria-label="Alternar tema"
            >
              {theme === 'dark' ? (
                <Sun size={17} className="text-amber-400" />
              ) : (
                <Moon size={17} className="text-blue-600" />
              )}
            </button>

            {user && (
              <div className="topbar-user-pill">
                {user.picture ? (
                  <img src={user.picture} alt={user.name} className="topbar-user-avatar" />
                ) : (
                  <div className="topbar-user-avatar-letter">{user.name.charAt(0)}</div>
                )}
                <span className="topbar-user-name">{formatUserName(user.name).split(' ')[0]}</span>
              </div>
            )}
          </div>
        </header>

        {/* CONTEÚDO DINÂMICO (OUTLET DO DATA ROUTER) */}
        <main className="layout-page-content">
          <Outlet />
        </main>

        {/* ═══════════ MOBILE BOTTOM NAVIGATION BAR (ESTILO GESTÃO-SIS) ═══════════ */}
        <nav className="mobile-bottom-nav" aria-label="Navegação mobile">
          {bottomNavItems.map((item) => {
            const active =
              item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path);
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`mobile-nav-link ${active ? 'active' : ''}`}
              >
                <div className="mobile-icon-box">
                  <Icon size={19} />
                </div>
                <span className="mobile-link-text">{item.label}</span>
              </Link>
            );
          })}

          {/* Botão "Mais / Menu Completo" */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`mobile-nav-link ${isMaisActive ? 'active' : ''}`}
          >
            <div className="mobile-icon-box">
              {mobileMenuOpen ? <X size={19} /> : <MoreHorizontal size={19} />}
            </div>
            <span className="mobile-link-text">Mais</span>
          </button>
        </nav>

        {/* ═══════════ MOBILE DRAWER / BOTTOM SHEET (ESTILO GESTÃO-SIS) ═══════════ */}
        {mobileMenuOpen && (
          <div className="mobile-drawer-overlay">
            {/* Backdrop com blur */}
            <div
              className="mobile-drawer-backdrop"
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden="true"
            />

            {/* Gaveta Deslizante */}
            <div className="mobile-drawer-sheet">
              {/* Puxador táctil */}
              <div className="mobile-drawer-handle" />

              {/* Cabeçalho da Gaveta */}
              <div className="mobile-drawer-header">
                <Link
                  to="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="!no-underline transition-opacity hover:opacity-85 flex items-center"
                  title="FinControl Home"
                >
                  <FinControlLogo height={28} />
                </Link>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="drawer-close-btn"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Conteúdo agrupado em Grid */}
              <div className="mobile-drawer-body">
                {categoriasUnicas.map((cat) => {
                  const items = navItems.filter((i) => i.categoria === cat);
                  return (
                    <div key={cat} className="drawer-category-group">
                      <div className="drawer-category-title">
                        {CATEGORIAS_TITULO[cat]}
                      </div>
                      <div className="drawer-grid">
                        {items.map((item) => {
                          const active =
                            item.path === '/'
                              ? location.pathname === '/'
                              : location.pathname.startsWith(item.path);
                          const Icon = item.icon;

                          return (
                            <Link
                              key={item.path}
                              to={item.path}
                              onClick={() => setMobileMenuOpen(false)}
                              className={`drawer-grid-item ${active ? 'active' : ''}`}
                            >
                              <div className="drawer-item-icon">
                                <Icon size={16} />
                              </div>
                              <span className="drawer-item-label">{item.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Utilizador & Logout no Drawer */}
                <div className="drawer-footer-user">
                  {user && !user.isGuest ? (
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-3">
                        {user.picture ? (
                          <img
                            src={user.picture}
                            alt={user.name}
                            className="w-10 h-10 rounded-full"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-brand text-white flex items-center justify-center font-bold">
                            {user.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <p className="text-xs font-bold text-primary truncate max-w-[140px]">
                            {formatUserName(user.name)}
                          </p>
                          <p className="text-[10px] text-muted">{user.email}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setMobileMenuOpen(false);
                          setWhatsappModalOpen(true);
                        }}
                        className="btn-secondary !text-xs !py-1.5 flex items-center gap-1.5 text-emerald-600"
                      >
                        <MessageSquare size={13} className="text-emerald-500" />
                        Vincular WhatsApp
                      </button>

                      <button
                        onClick={() => {
                          setMobileMenuOpen(false);
                          logout();
                        }}
                        className="btn-drawer-logout"
                      >
                        <LogOut size={14} />
                        Sair
                      </button>
                    </div>
                  ) : (
                    <div className="w-full flex flex-col items-center gap-2">
                      <GoogleLogin
                        onSuccess={(res) => {
                          if (res.credential) handleGoogleSuccess(res.credential);
                          setMobileMenuOpen(false);
                        }}
                        shape="pill"
                        size="medium"
                      />
                      <span className="text-[10px] text-muted">Sessão de Convidado</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Vinculação com WhatsApp */}
        <VincularWhatsappModal
          isOpen={whatsappModalOpen}
          onClose={() => setWhatsappModalOpen(false)}
        />

        {/* Modal Profissional de Boas-Vindas */}
        {user && (
          <BoasVindasModal
            isOpen={boasVindasOpen}
            userName={user.name}
            userEmail={user.email}
            userPicture={user.picture}
            onClose={() => setBoasVindasOpen(false)}
          />
        )}
      </div>
    </div>
  );
}
