import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EspacoPartilhado } from './entities/espaco-partilhado.entity';
import { MembroEspacoPartilhado, PapelEspaco } from './entities/membro-espaco.entity';
import { CreateEspacoDto } from './dto/create-espaco.dto';
import { AddMembroDto } from './dto/add-membro.dto';
import { Usuario } from '../usuarios/usuario.entity';

@Injectable()
export class EspacosPartilhadosService {
  constructor(
    @InjectRepository(EspacoPartilhado)
    private readonly espacoRepo: Repository<EspacoPartilhado>,
    @InjectRepository(MembroEspacoPartilhado)
    private readonly membroRepo: Repository<MembroEspacoPartilhado>,
    @InjectRepository(Usuario)
    private readonly usuarioRepo: Repository<Usuario>,
  ) {}

  async create(dto: CreateEspacoDto, usuarioId: string): Promise<EspacoPartilhado> {
    const espaco = this.espacoRepo.create({
      nome: dto.nome,
      descricao: dto.descricao,
      criadoPorUsuarioId: usuarioId,
    });

    const salvo = await this.espacoRepo.save(espaco);

    // Adiciona o criador como PROPRIETARIO
    const membro = this.membroRepo.create({
      espacoPartilhadoId: salvo.id,
      usuarioId,
      papel: PapelEspaco.PROPRIETARIO,
      percentualDivisaoPadrao: 50.0,
    });
    await this.membroRepo.save(membro);

    return this.findOne(salvo.id, usuarioId);
  }

  async findAll(usuarioId: string): Promise<EspacoPartilhado[]> {
    const membros = await this.membroRepo.find({
      where: { usuarioId },
      relations: {
        espaco: {
          membros: {
            usuario: true,
          },
        },
      },
    });

    return membros.map((m) => m.espaco);
  }

  async findOne(id: string, usuarioId: string): Promise<EspacoPartilhado> {
    const espaco = await this.espacoRepo.findOne({
      where: { id },
      relations: {
        membros: {
          usuario: true,
        },
      },
    });

    if (!espaco) {
      throw new NotFoundException('Espaço partilhado não encontrado');
    }

    const isMembro = espaco.membros.some((m) => m.usuarioId === usuarioId);
    if (!isMembro) {
      throw new ForbiddenException('Acesso negado a este espaço partilhado');
    }

    return espaco;
  }

  async addMembro(
    espacoId: string,
    dto: AddMembroDto,
    usuarioSolicitanteId: string,
  ): Promise<MembroEspacoPartilhado> {
    const espaco = await this.findOne(espacoId, usuarioSolicitanteId);

    // Encontra usuario por email ou id
    let usuarioAlvo = await this.usuarioRepo.findOne({
      where: [{ email: dto.emailOuId }, { id: dto.emailOuId }],
    });

    if (!usuarioAlvo) {
      throw new NotFoundException('Utilizador não encontrado');
    }

    const jaExiste = espaco.membros.some((m) => m.usuarioId === usuarioAlvo!.id);
    if (jaExiste) {
      throw new ForbiddenException('Utilizador já é membro deste espaço');
    }

    const novoMembro = this.membroRepo.create({
      espacoPartilhadoId: espacoId,
      usuarioId: usuarioAlvo.id,
      papel: dto.papel || PapelEspaco.MEMBRO,
      percentualDivisaoPadrao: dto.percentualDivisaoPadrao || 50.0,
    });

    return this.membroRepo.save(novoMembro);
  }

  async calcularAcertos(espacoId: string, usuarioId: string) {
    const espaco = await this.findOne(espacoId, usuarioId);

    // Estrutura determinística para divisão de custos
    const totalMembros = espaco.membros.length;
    const divisaoIgualitaria = totalMembros > 0 ? (100 / totalMembros).toFixed(2) : '0';

    return {
      espacoId: espaco.id,
      espacoNome: espaco.nome,
      totalMembros,
      divisaoSugeridaPercentual: `${divisaoIgualitaria}%`,
      membros: espaco.membros.map((m) => ({
        id: m.id,
        nome: m.usuario?.nome || 'Membro',
        email: m.usuario?.email || '',
        papel: m.papel,
        percentual: m.percentualDivisaoPadrao,
      })),
    };
  }

  async remove(id: string, usuarioId: string): Promise<void> {
    const espaco = await this.findOne(id, usuarioId);

    if (espaco.criadoPorUsuarioId !== usuarioId) {
      throw new ForbiddenException('Apenas o proprietário pode excluir o espaço');
    }

    await this.espacoRepo.remove(espaco);
  }
}
