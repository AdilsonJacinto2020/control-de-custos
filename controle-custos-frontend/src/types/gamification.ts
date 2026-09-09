export interface UserProfile {
  id: string;
  name: string;
  email: string;
  picture?: string;
  isGuest?: boolean;
  streak: number;
  lastCheckinDate?: string;
  bestStreak: number;
}

export interface GamificationStats {
  streak: number;
  bestStreak: number;
  level: number;
  levelTitle: string;
  xp: number;
  nextLevelXp: number;
  badges: Array<{
    id: string;
    title: string;
    description: string;
    icon: string;
    unlocked: boolean;
  }>;
}
