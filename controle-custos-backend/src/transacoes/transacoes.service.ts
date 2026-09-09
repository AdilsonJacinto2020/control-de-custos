import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrigemTransacao, StatusDuplicado, TipoTransacao, Transacao } from './transacao.entity';
import { CreateTransacaoDto } from './dto/create-transacao.dto';
import { ContasService } from '../contas/contas.service';

@Injectable()
export class TransacoesService {
  constructor(
    @InjectRepository(Transacao)
    private readonly transacoesRepository: Repository<Transacao>,
    private readonly contasService: ContasService,
  ) {}

  async create(dto: CreateTransacaoDto, usuarioId: string): Promise<Transacao> {
    const contaOrigem = await this.contasService.findOne(dto.contaId, usuarioId);

    const tipo = dto.tipo || TipoTransacao.DESPESA;

    if (tipo === TipoTransacao.TRANSFERENCIA) {
      if (!dto.contaDestinoId) {
        throw new BadRequestException('Transferência exige contaDestinoId');
      }
      if (dto.contaDestinoId === dto.contaId) {
        throw new BadRequestException('Conta destino não pode ser igual à conta de origem');
      }
      await this.contasService.findOne(dto.contaDestinoId, usuarioId);
    }

    const transacao = this.transacoesRepository.create({
      ...dto,
      usuarioId,
      tipo,
      moeda: contaOrigem.moeda,
      origem: dto.origem || OrigemTransacao.MANUAL,
      statusDuplicado: StatusDuplicado.NENHUM,
    });

    const saved = await this.transacoesRepository.save(transacao);

    // Atualiza saldo das contas
    if (tipo === TipoTransacao.DESPESA) {
      await this.contasService.recalcularSaldo(contaOrigem.id, -dto.valor);
    } else if (tipo === TipoTransacao.RECEITA) {
      await this.contasService.recalcularSaldo(contaOrigem.id, dto.valor);
    } else if (tipo === TipoTransacao.TRANSFERENCIA && dto.contaDestinoId) {
      await this.contasService.recalcularSaldo(contaOrigem.id, -dto.valor);
      const valorDestino = dto.taxaCambioUsada ? dto.valor * dto.taxaCambioUsada : dto.valor;
      await this.contasService.recalcularSaldo(dto.contaDestinoId, valorDestino);
    }

    return saved;
  }

  async findAll(usuarioId: string, mes?: string, ano?: string): Promise<Transacao[]> {
    const query = this.transacoesRepository
      .createQueryBuilder('transacao')
      .where('transacao.usuarioId = :usuarioId', { usuarioId });

    if (mes && ano) {
      const mesNum = parseInt(mes, 10);
      const anoNum = parseInt(ano, 10);
      const mesStr = String(mesNum).padStart(2, '0');
      const dataInicio = `${anoNum}-${mesStr}-01`;
      const ultimoDia = new Date(anoNum, mesNum, 0).getDate();
      const dataFim = `${anoNum}-${mesStr}-${String(ultimoDia).padStart(2, '0')}`;
      query.andWhere('transacao.data >= :dataInicio AND transacao.data <= :dataFim', {
        dataInicio,
        dataFim,
      });
    }

    return query.orderBy('transacao.data', 'DESC').addOrderBy('transacao.criadoEm', 'DESC').getMany();
  }

  /**
   * Receitas de uma fonte específica dentro de uma janela de meses —
   * usado pela projeção de rendimento variável para calcular a média
   * móvel só daquela fonte, em vez de misturar todas as receitas do
   * utilizador.
   */
  async findReceitasPorFonte(
    usuarioId: string,
    fonteRendimentoId: string,
    meses = 3,
  ): Promise<Transacao[]> {
    const dataLimite = new Date();
    dataLimite.setMonth(dataLimite.getMonth() - meses);
    const dataLimiteStr = dataLimite.toISOString().slice(0, 10);

    return this.transacoesRepository
      .createQueryBuilder('transacao')
      .where('transacao.usuarioId = :usuarioId', { usuarioId })
      .andWhere('transacao.tipo = :tipo', { tipo: TipoTransacao.RECEITA })
      .andWhere('transacao.fonteRendimentoId = :fonteRendimentoId', { fonteRendimentoId })
      .andWhere('transacao.data >= :dataLimiteStr', { dataLimiteStr })
      .getMany();
  }

  /** Despesas dos últimos N meses, usadas para calcular uma média móvel na projeção de fluxo de caixa. */
  async findDespesasUltimosMeses(usuarioId: string, meses = 3): Promise<Transacao[]> {
    const dataLimite = new Date();
    dataLimite.setMonth(dataLimite.getMonth() - meses);
    const dataLimiteStr = dataLimite.toISOString().slice(0, 10);

    return this.transacoesRepository
      .createQueryBuilder('transacao')
      .where('transacao.usuarioId = :usuarioId', { usuarioId })
      .andWhere('transacao.tipo = :tipo', { tipo: TipoTransacao.DESPESA })
      .andWhere('transacao.data >= :dataLimiteStr', { dataLimiteStr })
      .getMany();
  }

  /** Transações conjuntas de um espaço partilhado, usadas para calcular o saldo real a acertar entre membros. */
  async findConjuntasPorEspaco(espacoPartilhadoId: string): Promise<Transacao[]> {
    return this.transacoesRepository.find({
      where: { espacoPartilhadoId, divisaoConjunta: true },
    });
  }

  async findOne(id: string, usuarioId: string): Promise<Transacao> {
    const transacao = await this.transacoesRepository.findOne({
      where: { id, usuarioId },
    });
    if (!transacao) {
      throw new NotFoundException(`Transação com id "${id}" não encontrada`);
    }
    return transacao;
  }

  async remove(id: string, usuarioId: string): Promise<void> {
    const transacao = await this.findOne(id, usuarioId);

    // Reverte o saldo na conta ao remover
    if (transacao.tipo === TipoTransacao.DESPESA) {
      await this.contasService.recalcularSaldo(transacao.contaId, transacao.valor);
    } else if (transacao.tipo === TipoTransacao.RECEITA) {
      await this.contasService.recalcularSaldo(transacao.contaId, -transacao.valor);
    } else if (transacao.tipo === TipoTransacao.TRANSFERENCIA && transacao.contaDestinoId) {
      await this.contasService.recalcularSaldo(transacao.contaId, transacao.valor);
      const valorDestino = transacao.taxaCambioUsada
        ? transacao.valor * transacao.taxaCambioUsada
        : transacao.valor;
      await this.contasService.recalcularSaldo(transacao.contaDestinoId, -valorDestino);
    }

    await this.transacoesRepository.remove(transacao);
  }

  async getDashboardSummary(usuarioId: string, mes?: string, ano?: string) {
    const transacoes = await this.findAll(usuarioId, mes, ano);

    let totalReceitas = 0;
    let totalDespesas = 0;
    const porCategoria: Record<string, number> = {};

    for (const t of transacoes) {
      const valor = Number(t.valor);
      if (t.tipo === TipoTransacao.RECEITA) {
        totalReceitas += valor;
      } else if (t.tipo === TipoTransacao.DESPESA) {
        totalDespesas += valor;
        const cat = t.categoriaId || 'sem_categoria';
        porCategoria[cat] = (porCategoria[cat] || 0) + valor;
      }
    }

    return {
      totalReceitas,
      totalDespesas,
      saldoMes: totalReceitas - totalDespesas,
      totalTransacoes: transacoes.length,
      porCategoria,
      transacoes,
    };
  }
}
