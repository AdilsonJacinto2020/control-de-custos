import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FonteDeRendimento, TipoFonteRendimento } from './fonte-rendimento.entity';
import { CreateFonteRendimentoDto } from './dto/create-fonte-rendimento.dto';
import { TransacoesService } from '../transacoes/transacoes.service';

export interface ProjecaoRendimento {
  fonte: FonteDeRendimento;
  estimativaMin: number;
  estimativaMax: number;
  isIntervalo: boolean;
}

@Injectable()
export class FontesRendimentoService {
  constructor(
    @InjectRepository(FonteDeRendimento)
    private readonly repository: Repository<FonteDeRendimento>,
    private readonly transacoesService: TransacoesService,
  ) {}

  async create(dto: CreateFonteRendimentoDto, usuarioId: string): Promise<FonteDeRendimento> {
    const fonte = this.repository.create({
      ...dto,
      usuarioId,
      tipo: dto.tipo || TipoFonteRendimento.FIXO,
    });
    return this.repository.save(fonte);
  }

  async findAll(usuarioId: string): Promise<FonteDeRendimento[]> {
    return this.repository.find({ where: { usuarioId } });
  }

  async findOne(id: string, usuarioId: string): Promise<FonteDeRendimento> {
    const fonte = await this.repository.findOne({ where: { id, usuarioId } });
    if (!fonte) throw new NotFoundException('Fonte de rendimento não encontrada');
    return fonte;
  }

  async remove(id: string, usuarioId: string): Promise<void> {
    const fonte = await this.findOne(id, usuarioId);
    await this.repository.remove(fonte);
  }

  async calcularProjecaoRendimentos(usuarioId: string): Promise<ProjecaoRendimento[]> {
    const fontes = await this.findAll(usuarioId);

    // ANTES: esta função somava TODAS as receitas do utilizador, de
    // qualquer fonte, sem limite de tempo — se houvesse salário fixo e
    // biscate variável, a "média do biscate" incluía o salário, e o
    // intervalo nunca refletia especificamente aquela fonte. Agora cada
    // fonte variável usa só as suas próprias receitas (via
    // `fonteRendimentoId`), dentro de uma janela móvel de 3 meses.
    const resultados: ProjecaoRendimento[] = [];

    for (const f of fontes) {
      if (f.tipo === TipoFonteRendimento.FIXO) {
        const val = Number(f.valorFixo || 0);
        resultados.push({
          fonte: f,
          estimativaMin: val,
          estimativaMax: val,
          isIntervalo: false,
        });
        continue;
      }

      const receitasDaFonte = await this.transacoesService.findReceitasPorFonte(usuarioId, f.id, 3);

      if (receitasDaFonte.length === 0) {
        // Sem histórico ainda: não inventamos um número — devolvemos zero
        // e sinalizamos explicitamente que não há dados suficientes, em
        // vez de um valor de referência arbitrário (ex: 50.000) que dava
        // uma falsa sensação de precisão.
        resultados.push({
          fonte: f,
          estimativaMin: 0,
          estimativaMax: 0,
          isIntervalo: true,
        });
        continue;
      }

      const valores = receitasDaFonte.map((r) => Number(r.valor));
      const media = valores.reduce((a, b) => a + b, 0) / valores.length;

      resultados.push({
        fonte: f,
        estimativaMin: Math.round(media * 0.8),
        estimativaMax: Math.round(media * 1.25),
        isIntervalo: true,
      });
    }

    return resultados;
  }
}
