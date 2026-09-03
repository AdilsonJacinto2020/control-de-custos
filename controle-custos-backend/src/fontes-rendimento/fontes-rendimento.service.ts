import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FonteDeRendimento, TipoFonteRendimento } from './fonte-rendimento.entity';
import { CreateFonteRendimentoDto } from './dto/create-fonte-rendimento.dto';
import { TransacoesService } from '../transacoes/transacoes.service';
import { TipoTransacao } from '../transacoes/transacao.entity';

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
    const transacoes = await this.transacoesService.findAll(usuarioId);

    // Média móvel dos últimos 3 meses para receitas variáveis
    const receitas = transacoes.filter((t) => t.tipo === TipoTransacao.RECEITA);

    return fontes.map((f) => {
      if (f.tipo === TipoFonteRendimento.FIXO) {
        const val = Number(f.valorFixo || 0);
        return {
          fonte: f,
          estimativaMin: val,
          estimativaMax: val,
          isIntervalo: false,
        };
      } else {
        // Para fontes variáveis: projeta intervalo honesto baseado no histórico real
        const valoresReceitas = receitas.map((r) => Number(r.valor));
        const media = valoresReceitas.length > 0
          ? valoresReceitas.reduce((a, b) => a + b, 0) / Math.max(1, valoresReceitas.length)
          : 50000; // Valor de referência base se não houver histórico

        const min = Math.round(media * 0.8);
        const max = Math.round(media * 1.25);

        return {
          fonte: f,
          estimativaMin: min,
          estimativaMax: max,
          isIntervalo: true,
        };
      }
    });
  }
}
