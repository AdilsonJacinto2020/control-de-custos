import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MetaDePoupanca } from './meta-poupanca.entity';
import { CreateMetaPoupancaDto } from './dto/create-meta-poupanca.dto';

@Injectable()
export class MetasPoupancaService {
  constructor(
    @InjectRepository(MetaDePoupanca)
    private readonly repository: Repository<MetaDePoupanca>,
  ) {}

  async create(dto: CreateMetaPoupancaDto, usuarioId: string): Promise<MetaDePoupanca> {
    const meta = this.repository.create({
      ...dto,
      usuarioId,
      valorAcumulado: 0,
      moeda: 'AOA',
    });
    return this.repository.save(meta);
  }

  async findAll(usuarioId: string): Promise<MetaDePoupanca[]> {
    return this.repository.find({ where: { usuarioId } });
  }

  async findOne(id: string, usuarioId: string): Promise<MetaDePoupanca> {
    const meta = await this.repository.findOne({ where: { id, usuarioId } });
    if (!meta) throw new NotFoundException('Pé-de-meia / meta não encontrado');
    return meta;
  }

  async remove(id: string, usuarioId: string): Promise<void> {
    const meta = await this.findOne(id, usuarioId);
    await this.repository.remove(meta);
  }

  async adicionarContribuicao(id: string, valor: number, usuarioId: string): Promise<MetaDePoupanca> {
    const meta = await this.findOne(id, usuarioId);
    meta.valorAcumulado = Number(meta.valorAcumulado || 0) + Number(valor);
    return this.repository.save(meta);
  }

  async resgatar(id: string, valor: number, usuarioId: string): Promise<MetaDePoupanca> {
    const meta = await this.findOne(id, usuarioId);
    const atual = Number(meta.valorAcumulado || 0);
    const quantia = Number(valor);
    if (atual < quantia) {
      throw new BadRequestException(`Saldo insuficiente no pé-de-meia. Saldo disponível: ${atual} Kz`);
    }
    meta.valorAcumulado = atual - quantia;
    return this.repository.save(meta);
  }
}
