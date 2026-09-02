import React, { createContext, useContext, useEffect, useState } from 'react';
import type { UserProfile, GamificationStats } from '../types/gamification';
import confetti from 'canvas-confetti';

interface AuthContextType {
  user: UserProfile | null;
  gamification: GamificationStats;
  loginGoogle: (credential: string) => Promise<void>;
  logout: () => void;
  checkInZeroExpense: () => Promise<void>;
  recordActivity: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const DEFAULT_USER: UserProfile = {
  id: 'guest_user',
  name: 'Usuário Convidado',
  email: 'usuario@fincontrol.app',
  streak: 3,
  bestStreak: 7,
  lastCheckinDate: new Date().toISOString().slice(0, 10),
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('fincontrol_user');
    return saved ? JSON.parse(saved) : DEFAULT_USER;
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('fincontrol_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('fincontrol_user');
    }
  }, [user]);

  const recordActivity = () => {
    if (!user) return;
    const today = new Date().toISOString().slice(0, 10);
    if (user.lastCheckinDate === today) return;

    const newStreak = user.streak + 1;
    const bestStreak = Math.max(newStreak, user.bestStreak);

    setUser({
      ...user,
      streak: newStreak,
      bestStreak,
      lastCheckinDate: today,
    });

    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.8 },
    });
  };

  const checkInZeroExpense = async () => {
    if (!user) return;
    recordActivity();
  };

  const loginGoogle = async (credential: string) => {
    try {
      // Decodificar JWT Google básico client-side
      const base64Url = credential.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const data = JSON.parse(jsonPayload);

      const loggedUser: UserProfile = {
        id: data.sub || 'google_user',
        name: data.name || 'Usuário Google',
        email: data.email,
        picture: data.picture,
        streak: (user?.streak || 0) + 1,
        bestStreak: Math.max((user?.bestStreak || 0), (user?.streak || 0) + 1),
        lastCheckinDate: new Date().toISOString().slice(0, 10),
      };

      setUser(loggedUser);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch (e) {
      console.error('Erro ao processar Google Login:', e);
    }
  };

  const logout = () => {
    setUser(null);
  };

  // Cálculo de Gamificação
  const streak = user?.streak || 0;
  const bestStreak = user?.bestStreak || 0;
  const xp = streak * 120 + 50;
  const level = Math.floor(xp / 300) + 1;
  const nextLevelXp = level * 300;

  const levelTitle =
    level >= 4
      ? 'Mestre Financeiro 👑'
      : level >= 3
      ? 'Sentinela do Orçamento 🛡️'
      : level >= 2
      ? 'Economizador Ativo ⚡'
      : 'Iniciante Consciente 🌱';

  const gamification: GamificationStats = {
    streak,
    bestStreak,
    level,
    levelTitle,
    xp,
    nextLevelXp,
    badges: [
      {
        id: 'first_log',
        title: 'Primeiro Passo',
        description: 'Primeira despesa adicionada',
        icon: '🌱',
        unlocked: true,
      },
      {
        id: 'streak_3',
        title: 'Chama Acesa',
        description: '3 dias consecutivos de controle',
        icon: '🔥',
        unlocked: streak >= 3,
      },
      {
        id: 'streak_7',
        title: 'Hábito de Ferro',
        description: '7 dias mantendo o streak',
        icon: '⚡',
        unlocked: streak >= 7,
      },
      {
        id: 'master',
        title: 'Guardião do Dinheiro',
        description: 'Mais de 15 dias de consistência',
        icon: '🏆',
        unlocked: streak >= 15,
      },
    ],
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        gamification,
        loginGoogle,
        logout,
        checkInZeroExpense,
        recordActivity,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};
