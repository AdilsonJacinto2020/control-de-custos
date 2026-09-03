import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum StatusEventoFuturo {
  PLANEADO = 'planeado',
  ATIVO = 'ativo',
  CONCLUIDO = 'concluido',
  DESCARTADO = 'descartado',
}

export enum TipoItemCustoEvento {
  UNICO = 'unico',
  RECORRENTE = 'recorrente',
}

export interface ItemDeCustoEvento {
  id?: string;
  descricao: string;
  tipo: TipoItemCustoEvento;
  valor: number;
  categoriaId?: string;
}

@Entity('eventos_futuros')
export class EventoFuturo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  usuarioId: string;

  @Column({ type: 'uuid', nullable: true })
  espacoPartilhadoId: string;

  @Column()
  nome: string; // ex: "Nascimento do bebé", "Mudança de casa"

  @Column({
    type: 'enum',
    enum: StatusEventoFuturo,
    default: StatusEventoFuturo.PLANEADO,
  })
  status: StatusEventoFuturo;

  @Column('date')
  dataInicio: string;

  @Column('date', { nullable: true })
  dataFim: string; // nulo = permanente

  @Column({ type: 'jsonb', default: [] })
  itens: ItemDeCustoEvento[];

  @CreateDateColumn()
  criadoEm: Date;

  @UpdateDateColumn()
  atualizadoEm: Date;
}
