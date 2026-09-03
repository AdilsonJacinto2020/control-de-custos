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
    const ano = hoje.getFullYear().toString();
    const mes = (hoje.getMonth() + 1).toString();
    const diaAtual = hoje.getDate();
    const diasNoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
    const diasRestantes = Math.max(0, diasNoMes - diaAtual);

    const summary = await this.transacoesService.getDashboardSummary(usuarioId, mes, ano);

    const resultados: StatusOrcamento[] = [];

    for (const orc of orcamentos) {
      const gastoAtual = summary.porCategoria[orc.categoriaId] || 0;
      const percentualGasto = (gastoAtual / Number(orc.valorLimite)) * 100;
      const ritmoDiario = diaAtual > 0 ? gastoAtual / diaAtual : 0;
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
