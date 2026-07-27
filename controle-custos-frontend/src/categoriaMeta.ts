import {
  UtensilsCrossed,
  Car,
  Popcorn,
  ReceiptText,
  HeartPulse,
  GraduationCap,
  MoreHorizontal,
  type LucideIcon,
} from 'lucide-react';
import type { Categoria } from './types';

interface CategoriaMeta {
  icon: LucideIcon;
  /** Nome da CSS custom property (definida em index.css, com par light/dark). */
  cor: string;
}

// Ordem fixa (nunca ciclada) — vem da paleta categórica validada para
// contraste e distinção em daltonismo. Cada categoria mantém sempre a
// mesma cor, independentemente de filtros ou ordenação da lista.
export const CATEGORIA_META: Record<Categoria, CategoriaMeta> = {
  Alimentação: { icon: UtensilsCrossed, cor: 'var(--cat-1)' },
  Transporte: { icon: Car, cor: 'var(--cat-2)' },
  Lazer: { icon: Popcorn, cor: 'var(--cat-3)' },
  'Contas Fixas': { icon: ReceiptText, cor: 'var(--cat-4)' },
  Saúde: { icon: HeartPulse, cor: 'var(--cat-5)' },
  Educação: { icon: GraduationCap, cor: 'var(--cat-6)' },
  Outros: { icon: MoreHorizontal, cor: 'var(--cat-7)' },
};
