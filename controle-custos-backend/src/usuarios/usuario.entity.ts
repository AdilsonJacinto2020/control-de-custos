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

  // Suporte à vinculação segura de um número de WhatsApp a uma conta já
  // existente (criada via Google no site). Sem isto, uma mensagem de
  // WhatsApp criava sempre uma conta nova e desconectada da conta real.
  @Column({ nullable: true })
  codigoVinculacaoWhatsapp: string;

  @Column({ type: 'timestamp', nullable: true })
  codigoVinculacaoExpiraEm: Date;

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
