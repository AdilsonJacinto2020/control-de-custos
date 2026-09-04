import React from 'react';
import {
  Utensils,
  Car,
  Home,
  HeartPulse,
  GraduationCap,
  Gamepad2,
  HelpCircle,
  Folder,
  Tag,
  ShoppingBag,
  Briefcase,
  Plane,
  Zap,
  Smartphone,
  Dumbbell,
  Gift,
  Film,
  Coffee,
  type LucideIcon,
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  utensils: Utensils,
  car: Car,
  home: Home,
  'heart-pulse': HeartPulse,
  'graduation-cap': GraduationCap,
  'gamepad-2': Gamepad2,
  'help-circle': HelpCircle,
  tag: Tag,
  folder: Folder,
  'shopping-bag': ShoppingBag,
  briefcase: Briefcase,
  plane: Plane,
  zap: Zap,
  smartphone: Smartphone,
  dumbbell: Dumbbell,
  gift: Gift,
  film: Film,
  coffee: Coffee,
};

interface RenderCategoryIconProps {
  icone?: string | null;
  size?: number;
  className?: string;
}

export const RenderCategoryIcon: React.FC<RenderCategoryIconProps> = ({
  icone,
  size = 18,
  className = '',
}) => {
  if (!icone) return <Tag size={size} className={className} />;

  // Se for uma chave de ícone Lucide
  const LucideComp = ICON_MAP[icone.toLowerCase()];
  if (LucideComp) {
    return <LucideComp size={size} className={className} />;
  }

  // Se for emoji
  if (icone.length <= 4) {
    return <span style={{ fontSize: size }}>{icone}</span>;
  }

  return <Tag size={size} className={className} />;
};

export const AVAILABLE_CATEGORY_ICONS = [
  { key: 'utensils', label: 'Alimentação', icon: Utensils },
  { key: 'car', label: 'Transporte', icon: Car },
  { key: 'home', label: 'Habitação', icon: Home },
  { key: 'heart-pulse', label: 'Saúde', icon: HeartPulse },
  { key: 'graduation-cap', label: 'Educação', icon: GraduationCap },
  { key: 'gamepad-2', label: 'Lazer', icon: Gamepad2 },
  { key: 'shopping-bag', label: 'Compras', icon: ShoppingBag },
  { key: 'coffee', label: 'Café / Restaurante', icon: Coffee },
  { key: 'briefcase', label: 'Trabalho', icon: Briefcase },
  { key: 'plane', label: 'Viagem', icon: Plane },
  { key: 'zap', label: 'Energia / Contas', icon: Zap },
  { key: 'smartphone', label: 'Comunicação', icon: Smartphone },
  { key: 'dumbbell', label: 'Fitness', icon: Dumbbell },
  { key: 'gift', label: 'Presentes', icon: Gift },
  { key: 'help-circle', label: 'Outros', icon: HelpCircle },
];
