import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum MoedaPadrao {
  AOA = 'AOA',
  USD = 'USD',
  EUR = 'EUR',
}

export enum ModeloOrcamento {
  ENVELOPE = 'envelope',
  PERCENTUAL_50_30_20 = 'percentual_50_30_20',
  BASEADO_EM_METAS = 'baseado_em_metas',
}

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  nome: string;

  @Column({ unique: true, nullable: true })
  email: string;

  @Column({ unique: true, nullable: true })
  telefoneWhatsapp: string;

  @Column({ nullable: true })
  googleId: string;

  @Column({ nullable: true })
  avatarUrl: string;

  @Column({
    type: 'enum',
    enum: MoedaPadrao,
    default: MoedaPadrao.AOA,
  })
  moedaReferencia: MoedaPadrao;

  @Column({
    type: 'enum',
    enum: ModeloOrcamento,
    default: ModeloOrcamento.PERCENTUAL_50_30_20,
  })
  modeloOrcamento: ModeloOrcamento;

  @CreateDateColumn()
  criadoEm: Date;

  @UpdateDateColumn()
  atualizadoEm: Date;
}
