import { Injectable } from '@nestjs/common';
import { ContasService } from '../contas/contas.service';
import { FontesRendimentoService } from '../fontes-rendimento/fontes-rendimento.service';
import { TransacoesService } from '../transacoes/transacoes.service';

export interface ProjecaoMes {
  mesAno: string;
  saldoInicial: number;
  receitaMinima: number;
  receitaMaxima: number;
  despesaEstimada: number;
  saldoFinalMinimo: number;
  saldoFinalMaximo: number;
}

@Injectable()
export class ProjecaoFluxoCaixaService {
  constructor(
    private readonly contasService: ContasService,
    private readonly fontesService: FontesRendimentoService,
    private readonly transacoesService: TransacoesService,
  ) {}

  async calcularProjecaoFluxoCaixa(usuarioId: string, mesesAFrente: number = 6): Promise<ProjecaoMes[]> {
    const contas = await this.contasService.findAll(usuarioId);
    const saldoAtualTotal = contas.reduce((sum, c) => sum + Number(c.saldoAtual), 0);

    const projecaoFontes = await this.fontesService.calcularProjecaoRendimentos(usuarioId);

    const receitaMinTotal = projecaoFontes.reduce((sum, f) => sum + f.estimativaMin, 0);
    const receitaMaxTotal = projecaoFontes.reduce((sum, f) => sum + f.estimativaMax, 0);

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

      const saldoInicial = (saldoAcumuladoMin + saldoAcumuladoMax) / 2;

      saldoAcumuladoMin = saldoAcumuladoMin + receitaMinTotal - despesaBase;
      saldoAcumuladoMax = saldoAcumuladoMax + receitaMaxTotal - despesaBase;

      projecoes.push({
        mesAno,
        saldoInicial,
        receitaMinima: receitaMinTotal,
        receitaMaxima: receitaMaxTotal,
        despesaEstimada: despesaBase,
        saldoFinalMinimo: saldoAcumuladoMin,
        saldoFinalMaximo: saldoAcumuladoMax,
      });
    }

    return projecoes;
  }
}
