import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum TipoFonteRendimento {
  FIXO = 'fixo',
  VARIAVEL = 'variavel',
}

@Entity('fontes_rendimento')
export class FonteDeRendimento {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  usuarioId: string;

  @Column()
  nome: string; // ex: "Salário", "Biscate de fim de semana"

  @Column({
    type: 'enum',
    enum: TipoFonteRendimento,
    default: TipoFonteRendimento.FIXO,
  })
  tipo: TipoFonteRendimento;

  @Column('decimal', { precision: 14, scale: 2, nullable: true })
  valorFixo: number; // obrigatório se fixo

  @Column({ type: 'int', nullable: true })
  diaRecebimentoEstimado: number;

  @Column({ type: 'uuid', nullable: true })
  contaDestinoPadraoId: string;

  @Column({ length: 3, default: 'AOA' })
  moeda: string;

  @CreateDateColumn()
  criadoEm: Date;

  @UpdateDateColumn()
  atualizadoEm: Date;
}
