import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Orcamento, PeriodoOrcamento } from './orcamento.entity';
import { CreateOrcamentoDto } from './dto/create-orcamento.dto';
import { TransacoesService } from '../transacoes/transacoes.service';

export interface StatusOrcamento {
  orcamento: Orcamento;
  gastoAtual: number;
  percentualGasto: number;
  diasRestantesNoPeriodo: number;
  ritmoDiarioAtual: number;
  projecaoGastoFinal: number;
  diasParaEstourarLimite?: number;
  atingiuAlerta: boolean;
  ultrapassouLimite: boolean;
}

@Injectable()
export class OrcamentosService {
  constructor(
    @InjectRepository(Orcamento)
    private readonly orcamentosRepository: Repository<Orcamento>,
    private readonly transacoesService: TransacoesService,
  ) {}

  async create(dto: CreateOrcamentoDto, usuarioId: string): Promise<Orcamento> {
    const orcamento = this.orcamentosRepository.create({
      ...dto,
      usuarioId,
      periodo: dto.periodo || PeriodoOrcamento.MENSAL,
      percentualAlertaPrimario: dto.percentualAlertaPrimario || 80,
    });
    return this.orcamentosRepository.save(orcamento);
  }

  async findAll(usuarioId: string): Promise<Orcamento[]> {
    return this.orcamentosRepository.find({ where: { usuarioId } });
  }

  async findOne(id: string, usuarioId: string): Promise<Orcamento> {
    const orc = await this.orcamentosRepository.findOne({ where: { id, usuarioId } });
    if (!orc) {
      throw new NotFoundException(`Orçamento ${id} não encontrado`);
    }
    return orc;
  }

  async remove(id: string, usuarioId: string): Promise<void> {
    const orc = await this.findOne(id, usuarioId);
    await this.orcamentosRepository.remove(orc);
  }

  async getStatusDetalhado(usuarioId: string): Promise<StatusOrcamento[]> {
    const orcamentos = await this.findAll(usuarioId);
    const hoje = new Date();

    // ANTES: calculava sempre "dia do mês" / "dias no mês", mesmo para
    // orçamentos com periodo = 'semanal', o que dava números sem sentido
    // para quem configurasse um limite semanal. Agora cada orçamento usa
    // a janela de período correta (mês civil ou semana corrente,
    // segunda a domingo).
    const ano = hoje.getFullYear().toString();
    const mes = (hoje.getMonth() + 1).toString();
    const summaryMensal = await this.transacoesService.getDashboardSummary(usuarioId, mes, ano);

    // Janela da semana corrente (segunda a domingo)
    const diaSemanaAtual = hoje.getDay(); // 0 = domingo
    const offsetSegunda = diaSemanaAtual === 0 ? 6 : diaSemanaAtual - 1;
    const inicioSemana = new Date(hoje);
    inicioSemana.setDate(hoje.getDate() - offsetSegunda);
    const todasTransacoesMes = summaryMensal.transacoes;
    const transacoesDaSemana = todasTransacoesMes.filter((t) => {
      const dataT = new Date(t.data);
      return dataT >= inicioSemana && dataT <= hoje;
    });
    const gastoSemanaPorCategoria: Record<string, number> = {};
    for (const t of transacoesDaSemana) {
      if (t.tipo === 'despesa') {
        const cat = t.categoriaId || 'sem_categoria';
        gastoSemanaPorCategoria[cat] = (gastoSemanaPorCategoria[cat] || 0) + Number(t.valor);
      }
    }

    const resultados: StatusOrcamento[] = [];

    for (const orc of orcamentos) {
      const ehSemanal = orc.periodo === PeriodoOrcamento.SEMANAL;

      const gastoAtual = ehSemanal
        ? gastoSemanaPorCategoria[orc.categoriaId] || 0
        : summaryMensal.porCategoria[orc.categoriaId] || 0;

      const diaAtualNoPeriodo = ehSemanal ? offsetSegunda + 1 : hoje.getDate();
      const diasTotaisNoPeriodo = ehSemanal
        ? 7
        : new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
      const diasRestantes = Math.max(0, diasTotaisNoPeriodo - diaAtualNoPeriodo);

      const percentualGasto = (gastoAtual / Number(orc.valorLimite)) * 100;
      const ritmoDiario = diaAtualNoPeriodo > 0 ? gastoAtual / diaAtualNoPeriodo : 0;
      const projecaoGastoFinal = gastoAtual + ritmoDiario * diasRestantes;

      let diasParaEstourarLimite: number | undefined;
      const saldoRestante = Number(orc.valorLimite) - gastoAtual;
      if (saldoRestante > 0 && ritmoDiario > 0) {
        diasParaEstourarLimite = Math.ceil(saldoRestante / ritmoDiario);
      }

      resultados.push({
        orcamento: orc,
        gastoAtual,
        percentualGasto,
        diasRestantesNoPeriodo: diasRestantes,
        ritmoDiarioAtual: ritmoDiario,
        projecaoGastoFinal,
        diasParaEstourarLimite,
        atingiuAlerta: percentualGasto >= orc.percentualAlertaPrimario,
        ultrapassouLimite: gastoAtual > Number(orc.valorLimite),
      });
    }

    return resultados;
  }
}
