import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { ContasPage } from './pages/ContasPage';
import { CategoriasPage } from './pages/CategoriasPage';
import { OrcamentosPage } from './pages/OrcamentosPage';
import { RendimentosPage } from './pages/RendimentosPage';
import { EventosPage } from './pages/EventosPage';
import { EspacosPage } from './pages/EspacosPage';
import { CambioPage } from './pages/CambioPage';
import { transacoesApi, contasApi, categoriasApi } from './api/financas';

const mesAtualStr = () => String(new Date().getMonth() + 1).padStart(2, '0');
const anoAtualStr = () => String(new Date().getFullYear());

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <DashboardPage />,
        loader: async () => {
          const mes = mesAtualStr();
          const ano = anoAtualStr();
          try {
            const [dashboard, contas, categorias] = await Promise.all([
              transacoesApi.obterDashboard(mes, ano),
              contasApi.listar().catch(() => []),
              categoriasApi.listar().catch(() => []),
            ]);
            return { dashboard, contas, categorias, mes, ano };
          } catch {
            return {
              dashboard: {
                totalReceitas: 0,
                totalDespesas: 0,
                saldoMes: 0,
                totalTransacoes: 0,
                transacoes: [],
                porCategoria: [],
              },
              contas: [],
              categorias: [],
              mes,
              ano,
            };
          }
        },
      },
      {
        path: 'contas',
        element: <ContasPage />,
      },
      {
        path: 'categorias',
        element: <CategoriasPage />,
      },
      {
        path: 'orcamentos',
        element: <OrcamentosPage />,
      },
      {
        path: 'rendimentos',
        element: <RendimentosPage />,
      },
      {
        path: 'eventos',
        element: <EventosPage />,
      },
      {
        path: 'espacos',
        element: <EspacosPage />,
      },
      {
        path: 'cambio',
        element: <CambioPage />,
      },
    ],
  },
]);
