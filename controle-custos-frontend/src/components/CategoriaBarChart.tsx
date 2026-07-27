import { CATEGORIA_META } from '../categoriaMeta';
import type { Categoria } from '../types';

interface Props {
  dados: Array<[Categoria, number]>;
  total: number;
  formatoMoeda: Intl.NumberFormat;
}

export function CategoriaBarChart({ dados, total, formatoMoeda }: Props) {
  if (dados.length === 0) {
    return <p className="vazio">Sem despesas registadas ainda.</p>;
  }

  const maior = Math.max(...dados.map(([, valor]) => valor));

  return (
    <ul className="cat-chart" role="list">
      {dados.map(([categoria, valor]) => {
        const meta = CATEGORIA_META[categoria];
        const Icon = meta.icon;
        const largura = maior > 0 ? (valor / maior) * 100 : 0;
        const percentagem = total > 0 ? (valor / total) * 100 : 0;

        return (
          <li key={categoria} className="cat-chart-row">
            <span className="cat-chart-label">
              <Icon size={16} color={meta.cor} strokeWidth={2.25} aria-hidden />
              {categoria}
            </span>
            <span
              className="cat-chart-track"
              title={`${categoria}: ${formatoMoeda.format(valor)} (${percentagem.toFixed(1)}% do total)`}
            >
              <span
                className="cat-chart-fill"
                style={{ width: `${largura}%`, background: meta.cor }}
              />
            </span>
            <span className="cat-chart-valor">{formatoMoeda.format(valor)}</span>
          </li>
        );
      })}
    </ul>
  );
}
