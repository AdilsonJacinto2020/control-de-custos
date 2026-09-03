import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conta, MoedaConta, TipoConta } from './conta.entity';
import { CreateContaDto } from './dto/create-conta.dto';

@Injectable()
export class ContasService {
  constructor(
    @InjectRepository(Conta)
    private readonly contasRepository: Repository<Conta>,
  ) {}

  async create(createContaDto: CreateContaDto, usuarioId: string): Promise<Conta> {
    const conta = this.contasRepository.create({
      ...createContaDto,
      usuarioId,
      saldoAtual: 0,
      tipo: createContaDto.tipo || TipoConta.BANCO,
      moeda: createContaDto.moeda || MoedaConta.AOA,
      ativa: true,
    });
    return this.contasRepository.save(conta);
  }

  async findAll(usuarioId: string): Promise<Conta[]> {
    let contas = await this.contasRepository.find({
      where: { usuarioId, ativa: true },
      order: { criadoEm: 'ASC' },
    });

    // Se o usuário ainda não tiver nenhuma conta criada, inicializa a conta padrão (Carteira Principal)
    if (contas.length === 0) {
      const defaultConta = await this.create(
        { nome: 'Carteira Principal', tipo: TipoConta.CARTEIRA_MOVEL, moeda: MoedaConta.AOA },
        usuarioId,
      );
      contas = [defaultConta];
    }

    return contas;
  }

  async findOne(id: string, usuarioId: string): Promise<Conta> {
    const conta = await this.contasRepository.findOne({
      where: { id, usuarioId, ativa: true },
    });
    if (!conta) {
      throw new NotFoundException(`Conta com id "${id}" não encontrada`);
    }
    return conta;
  }

  async update(id: string, updateDto: Partial<CreateContaDto>, usuarioId: string): Promise<Conta> {
    const conta = await this.findOne(id, usuarioId);
    if (updateDto.nome) conta.nome = updateDto.nome;
    if (updateDto.tipo) conta.tipo = updateDto.tipo;
    return this.contasRepository.save(conta);
  }

  async remove(id: string, usuarioId: string): Promise<void> {
    const conta = await this.findOne(id, usuarioId);
    conta.ativa = false;
    await this.contasRepository.save(conta);
  }

  async recalcularSaldo(contaId: string, delta: number): Promise<void> {
    const conta = await this.contasRepository.findOne({ where: { id: contaId } });
    if (conta) {
      conta.saldoAtual = Number(conta.saldoAtual) + Number(delta);
      await this.contasRepository.save(conta);
    }
  }
}
