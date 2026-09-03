import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('metas_poupanca')
export class MetaDePoupanca {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  usuarioId: string;

  @Column({ type: 'uuid', nullable: true })
  espacoPartilhadoId: string;

  @Column()
  nome: string; // ex: "Fundo de emergência", "Enxoval"

  @Column('decimal', { precision: 14, scale: 2 })
  valorObjetivo: number;

  @Column({ length: 3, default: 'AOA' })
  moeda: string;

  @Column('date', { nullable: true })
  dataAlvo: string;

  @Column('decimal', { precision: 14, scale: 2, default: 0 })
  valorAcumulado: number;

  @Column({ type: 'uuid', nullable: true })
  contaPoupancaId: string;

  @CreateDateColumn()
  criadoEm: Date;

  @UpdateDateColumn()
  atualizadoEm: Date;
}
