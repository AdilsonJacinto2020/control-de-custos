import React from 'react';
import { Sun, Moon, LogOut, Sparkles } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

export const Navbar: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, loginGoogle, logout } = useAuth();

  return (
    <header className="navbar-container">
      <div className="navbar-brand">
        <div className="brand-icon-wrapper">
          <Sparkles size={20} className="brand-icon" />
        </div>
        <div>
          <h1 className="brand-title">FinControl Engine</h1>
          <p className="brand-tagline">Controle financeiro com gamificação</p>
        </div>
      </div>

      <div className="navbar-actions">
        <button
          className="theme-toggle-btn"
          onClick={toggleTheme}
          aria-label="Alternar tema claro/escuro"
          title={`Mudar para modo ${theme === 'dark' ? 'claro' : 'escuro'}`}
        >
          {theme === 'dark' ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-blue-600" />}
        </button>

        {user ? (
          <div className="user-profile-badge">
            {user.picture ? (
              <img src={user.picture} alt={user.name} className="user-avatar" />
            ) : (
              <div className="user-avatar-placeholder">{user.name.charAt(0)}</div>
            )}
            <div className="user-text-info">
              <span className="user-name">{user.name}</span>
              <span className="user-email">{user.email}</span>
            </div>
            <button className="btn-logout" onClick={logout} title="Terminar sessão">
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <div className="google-login-wrapper">
            <GoogleLogin
              onSuccess={(credentialResponse) => {
                if (credentialResponse.credential) {
                  loginGoogle(credentialResponse.credential);
                }
              }}
              onError={() => console.log('Erro de Login Google')}
              shape="pill"
              size="medium"
              text="signin_with"
            />
          </div>
        )}
      </div>
    </header>
  );
};
