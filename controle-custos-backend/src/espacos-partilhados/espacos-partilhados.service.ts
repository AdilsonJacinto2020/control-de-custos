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
import { TransacoesService } from '../transacoes/transacoes.service';

@Injectable()
export class EspacosPartilhadosService {
  constructor(
    @InjectRepository(EspacoPartilhado)
    private readonly espacoRepo: Repository<EspacoPartilhado>,
    @InjectRepository(MembroEspacoPartilhado)
    private readonly membroRepo: Repository<MembroEspacoPartilhado>,
    @InjectRepository(Usuario)
    private readonly usuarioRepo: Repository<Usuario>,
    private readonly transacoesService: TransacoesService,
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

    // ANTES: qualquer membro do espaço, independentemente do papel,
    // conseguia adicionar novos membros. Agora só proprietário/admin podem.
    const solicitante = espaco.membros.find((m) => m.usuarioId === usuarioSolicitanteId);
    const podeGerirMembros =
      solicitante &&
      (solicitante.papel === PapelEspaco.PROPRIETARIO || solicitante.papel === PapelEspaco.ADMINISTRADOR);
    if (!podeGerirMembros) {
      throw new ForbiddenException('Apenas o proprietário ou administradores podem adicionar membros');
    }

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

    // ANTES: devolvia só uma divisão igualitária genérica (100% / nº de
    // membros), sem olhar para nenhuma transação real — não existia
    // ligação entre `Transacao` e o espaço partilhado, por isso não havia
    // como saber quem pagou o quê. Agora usa as transações marcadas como
    // `divisaoConjunta = true` (ver Transacao.espacoPartilhadoId) para
    // calcular, por membro: quanto pagou de facto vs. quanto lhe cabia
    // pagar segundo o seu `percentualDivisaoPadrao`, e o saldo resultante
    // (positivo = é credor / os outros lhe devem; negativo = deve aos outros).
    const totalMembros = espaco.membros.length;
    const somaPercentuais = espaco.membros.reduce((s, m) => s + Number(m.percentualDivisaoPadrao || 0), 0);

    const transacoesConjuntas = await this.transacoesService.findConjuntasPorEspaco(espacoId);
    const totalGasto = transacoesConjuntas.reduce((s, t) => s + Number(t.valor), 0);

    const pagoPorMembro: Record<string, number> = {};
    for (const t of transacoesConjuntas) {
      pagoPorMembro[t.usuarioId] = (pagoPorMembro[t.usuarioId] || 0) + Number(t.valor);
    }

    const membrosComSaldo = espaco.membros.map((m) => {
      // Se as percentagens configuradas não somarem 100%, cai para
      // divisão igualitária em vez de produzir um resultado inconsistente.
      const percentual =
        somaPercentuais > 0 && Math.abs(somaPercentuais - 100) < 0.01
          ? Number(m.percentualDivisaoPadrao || 0)
          : totalMembros > 0
            ? 100 / totalMembros
            : 0;

      const deveriaPagar = (totalGasto * percentual) / 100;
      const pagou = pagoPorMembro[m.usuarioId] || 0;
      const saldo = pagou - deveriaPagar; // positivo = credor, negativo = devedor

      return {
        id: m.id,
        usuarioId: m.usuarioId,
        nome: m.usuario?.nome || 'Membro',
        email: m.usuario?.email || '',
        papel: m.papel,
        percentual,
        pagou,
        deveriaPagar,
        saldo,
      };
    });

    return {
      espacoId: espaco.id,
      espacoNome: espaco.nome,
      totalMembros,
      totalGastoConjunto: totalGasto,
      numeroTransacoesConjuntas: transacoesConjuntas.length,
      membros: membrosComSaldo,
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
