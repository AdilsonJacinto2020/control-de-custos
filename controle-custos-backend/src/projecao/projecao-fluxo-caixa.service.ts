import { Injectable } from '@nestjs/common';
import { ContasService } from '../contas/contas.service';
import { FontesRendimentoService } from '../fontes-rendimento/fontes-rendimento.service';
import { TransacoesService } from '../transacoes/transacoes.service';
import { EventosFuturosService } from '../eventos-futuros/eventos-futuros.service';
import { StatusEventoFuturo, TipoItemCustoEvento } from '../eventos-futuros/evento-futuro.entity';

export interface ProjecaoMes {
  mesAno: string;
  saldoInicial: number;
  receitaMinima: number;
  receitaMaxima: number;
  despesaEstimada: number;
  custoEventosAtivos: number;
  saldoFinalMinimo: number;
  saldoFinalMaximo: number;
}

@Injectable()
export class ProjecaoFluxoCaixaService {
  constructor(
    private readonly contasService: ContasService,
    private readonly fontesService: FontesRendimentoService,
    private readonly transacoesService: TransacoesService,
    private readonly eventosService: EventosFuturosService,
  ) {}

  async calcularProjecaoFluxoCaixa(usuarioId: string, mesesAFrente: number = 6): Promise<ProjecaoMes[]> {
    const contas = await this.contasService.findAll(usuarioId);
    const saldoAtualTotal = contas.reduce((sum, c) => sum + Number(c.saldoAtual), 0);

    const projecaoFontes = await this.fontesService.calcularProjecaoRendimentos(usuarioId);

    const receitaMinTotal = projecaoFontes.reduce((sum, f) => sum + f.estimativaMin, 0);
    const receitaMaxTotal = projecaoFontes.reduce((sum, f) => sum + f.estimativaMax, 0);

    // Eventos futuros ativos
    const todosEventos = await this.eventosService.findAll(usuarioId);
    const eventosAtivos = todosEventos.filter((e) => e.status === StatusEventoFuturo.ATIVO);

    // Média de despesas dos últimos meses
    const hoje = new Date();
    const summary = await this.transacoesService.getDashboardSummary(
      usuarioId,
      (hoje.getMonth() + 1).toString(),
      hoje.getFullYear().toString(),
    );
    const despesaBase = summary.totalDespesas > 0 ? summary.totalDespesas : 40000;

    const projecoes: ProjecaoMes[] = [];
    let saldoAcumuladoMin = saldoAtualTotal;
    let saldoAcumuladoMax = saldoAtualTotal;

    for (let i = 1; i <= mesesAFrente; i++) {
      const dataMes = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
      const mesAno = `${dataMes.getFullYear()}-${(dataMes.getMonth() + 1).toString().padStart(2, '0')}`;

      // Calcular custo de eventos ativos incidentes neste mês
      let custoEventosNoMes = 0;
      for (const ev of eventosAtivos) {
        const dInicio = new Date(ev.dataInicio);
        const dFim = ev.dataFim ? new Date(ev.dataFim) : null;

        if (dataMes >= dInicio && (!dFim || dataMes <= dFim)) {
          for (const item of ev.itens || []) {
            if (item.tipo === TipoItemCustoEvento.RECORRENTE) {
              custoEventosNoMes += Number(item.valor || 0);
            } else if (item.tipo === TipoItemCustoEvento.UNICO && dataMes.getMonth() === dInicio.getMonth()) {
              custoEventosNoMes += Number(item.valor || 0);
            }
          }
        }
      }

      const saldoInicial = (saldoAcumuladoMin + saldoAcumuladoMax) / 2;
      const despesaTotalMes = despesaBase + custoEventosNoMes;

      saldoAcumuladoMin = saldoAcumuladoMin + receitaMinTotal - despesaTotalMes;
      saldoAcumuladoMax = saldoAcumuladoMax + receitaMaxTotal - despesaTotalMes;

      projecoes.push({
        mesAno,
        saldoInicial,
        receitaMinima: receitaMinTotal,
        receitaMaxima: receitaMaxTotal,
        despesaEstimada: despesaBase,
        custoEventosAtivos: custoEventosNoMes,
        saldoFinalMinimo: saldoAcumuladoMin,
        saldoFinalMaximo: saldoAcumuladoMax,
      });
    }

    return projecoes;
  }
}
