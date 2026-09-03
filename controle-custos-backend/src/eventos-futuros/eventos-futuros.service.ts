import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventoFuturo, StatusEventoFuturo } from './evento-futuro.entity';
import { CreateEventoFuturoDto } from './dto/create-evento-futuro.dto';

@Injectable()
export class EventosFuturosService {
  constructor(
    @InjectRepository(EventoFuturo)
    private readonly repository: Repository<EventoFuturo>,
  ) {}

  async create(dto: CreateEventoFuturoDto, usuarioId: string): Promise<EventoFuturo> {
    const evento = this.repository.create({
      ...dto,
      usuarioId,
      status: dto.status || StatusEventoFuturo.PLANEADO,
      itens: dto.itens || [],
    });
    return this.repository.save(evento);
  }

  async findAll(usuarioId: string): Promise<EventoFuturo[]> {
    return this.repository.find({
      where: { usuarioId },
      order: { dataInicio: 'ASC' },
    });
  }

  async findOne(id: string, usuarioId: string): Promise<EventoFuturo> {
    const evento = await this.repository.findOne({ where: { id, usuarioId } });
    if (!evento) throw new NotFoundException('Evento futuro não encontrado');
    return evento;
  }

  async update(
    id: string,
    dto: Partial<CreateEventoFuturoDto>,
    usuarioId: string,
  ): Promise<EventoFuturo> {
    const evento = await this.findOne(id, usuarioId);
    Object.assign(evento, dto);
    return this.repository.save(evento);
  }

  async setStatus(
    id: string,
    status: StatusEventoFuturo,
    usuarioId: string,
  ): Promise<EventoFuturo> {
    const evento = await this.findOne(id, usuarioId);
    evento.status = status;
    return this.repository.save(evento);
  }

  async remove(id: string, usuarioId: string): Promise<void> {
    const evento = await this.findOne(id, usuarioId);
    await this.repository.remove(evento);
  }
}
