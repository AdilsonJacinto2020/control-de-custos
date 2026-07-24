import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateDespesaDto } from './create-despesa.dto';
import { UpdateDespesaDto } from './update-despesa.dto';
import { Despesa } from './despesa.entity';

@Injectable()
export class DespesasService {
  constructor(
    @InjectRepository(Despesa)
    private readonly despesasRepository: Repository<Despesa>,
  ) {}

  create(createDespesaDto: CreateDespesaDto): Promise<Despesa> {
    const despesa = this.despesasRepository.create(createDespesaDto);
    return this.despesasRepository.save(despesa);
  }

  findAll(): Promise<Despesa[]> {
    return this.despesasRepository.find({ order: { data: 'DESC' } });
  }

  async findOne(id: string): Promise<Despesa> {
    const despesa = await this.despesasRepository.findOne({ where: { id } });
    if (!despesa) {
      throw new NotFoundException(`Despesa com id "${id}" não encontrada`);
    }
    return despesa;
  }

  async update(
    id: string,
    updateDespesaDto: UpdateDespesaDto,
  ): Promise<Despesa> {
    const despesa = await this.findOne(id);
    Object.assign(despesa, updateDespesaDto);
    return this.despesasRepository.save(despesa);
  }

  async remove(id: string): Promise<void> {
    const despesa = await this.findOne(id);
    await this.despesasRepository.remove(despesa);
  }
}
