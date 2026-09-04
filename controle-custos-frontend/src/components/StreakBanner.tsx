import React from 'react';
import { Flame, Zap, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './StreakBanner.css';

export const StreakBanner: React.FC = () => {
  const { gamification, checkInZeroExpense, user } = useAuth();
  const today = new Date().toISOString().slice(0, 10);
  const checkedInToday = user?.lastCheckinDate === today;

  return (
    <div className="streak-container">
      <div className="streak-main-card">
        <div className="streak-fire-badge">
          <Flame
            className={`fire-icon ${gamification.streak > 0 ? 'streak-on animate-pulse' : 'streak-off'}`}
            size={24}
          />
          <div>
            <div className="streak-number">{gamification.streak} Dias</div>
            <div className="streak-sub">Sequência</div>
          </div>
        </div>

        <div className="level-progression">
          <div className="level-header">
            <span className="level-title">
              <Zap size={14} className="level-icon" /> Nível {gamification.level}: <strong>{gamification.levelTitle}</strong>
            </span>
            <span className="xp-text">{gamification.xp} / {gamification.nextLevelXp} XP</span>
          </div>
          <div className="progress-bar-bg">
            <div
              className="progress-bar-fill"
              style={{ width: `${Math.min(100, (gamification.xp / gamification.nextLevelXp) * 100)}%` }}
            />
          </div>
        </div>

        <div className="streak-action">
          <button
            className={`btn-checkin ${checkedInToday ? 'completed' : ''}`}
            onClick={checkInZeroExpense}
            disabled={checkedInToday}
            title={checkedInToday ? 'Meta diária concluída!' : 'Registrar dia sem gastos extras para manter o Streak'}
          >
            {checkedInToday ? (
              <>
                <CheckCircle2 size={16} /> Dia Seguro Ativo
              </>
            ) : (
              <>
                <ShieldCheck size={16} /> Hoje não gastei nada
              </>
            )}
          </button>
        </div>
      </div>

      <div className="badges-row">
        {gamification.badges.map((badge) => (
          <div
            key={badge.id}
            className={`badge-card ${badge.unlocked ? 'unlocked' : 'locked'}`}
            title={`${badge.title}: ${badge.description}`}
          >
            <span className="badge-emoji">{badge.icon}</span>
            <div className="badge-info">
              <div className="badge-name">{badge.title}</div>
              <div className="badge-status">{badge.unlocked ? 'Desbloqueada' : 'Bloqueada'}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
