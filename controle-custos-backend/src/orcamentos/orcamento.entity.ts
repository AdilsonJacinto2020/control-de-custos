import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum PeriodoOrcamento {
  MENSAL = 'mensal',
  SEMANAL = 'semanal',
}

@Entity('orcamentos')
export class Orcamento {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  usuarioId: string;

  @Column({ type: 'uuid', nullable: true })
  espacoPartilhadoId: string;

  @Column({ type: 'uuid' })
  categoriaId: string;

  @Column('decimal', { precision: 14, scale: 2 })
  valorLimite: number;

  @Column({ length: 3, default: 'AOA' })
  moeda: string;

  @Column({
    type: 'enum',
    enum: PeriodoOrcamento,
    default: PeriodoOrcamento.MENSAL,
  })
  periodo: PeriodoOrcamento;

  @Column({ type: 'int', default: 80 })
  percentualAlertaPrimario: number; // Dispara alerta quando atinge esta %

  @CreateDateColumn()
  criadoEm: Date;

  @UpdateDateColumn()
  atualizadoEm: Date;
}
