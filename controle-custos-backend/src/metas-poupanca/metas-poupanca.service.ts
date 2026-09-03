import { Injectable, NotFoundException } from '@nestjs/common';
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
    if (!meta) throw new NotFoundException('Meta de poupança não encontrada');
    return meta;
  }

  async remove(id: string, usuarioId: string): Promise<void> {
    const meta = await this.findOne(id, usuarioId);
    await this.repository.remove(meta);
  }

  async adicionarContribuicao(id: string, valor: number, usuarioId: string): Promise<MetaDePoupanca> {
    const meta = await this.findOne(id, usuarioId);
    meta.valorAcumulado = Number(meta.valorAcumulado) + Number(valor);
    return this.repository.save(meta);
  }
}
