import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum TipoConta {
  BANCO = 'banco',
  CARTEIRA_MOVEL = 'carteira_movel',
  DINHEIRO_FISICO = 'dinheiro_fisico',
  POUPANCA = 'poupanca',
}

export enum MoedaConta {
  AOA = 'AOA',
  USD = 'USD',
  EUR = 'EUR',
}

@Entity('contas')
export class Conta {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  usuarioId: string;

  @Column({ type: 'uuid', nullable: true })
  espacoPartilhadoId: string;

  @Column()
  nome: string;

  @Column({
    type: 'enum',
    enum: TipoConta,
    default: TipoConta.BANCO,
  })
  tipo: TipoConta;

  @Column({
    type: 'enum',
    enum: MoedaConta,
    default: MoedaConta.AOA,
  })
  moeda: MoedaConta;

  @Column('decimal', { precision: 14, scale: 2, default: 0 })
  saldoAtual: number;

  @Column({ default: true })
  ativa: boolean;

  @CreateDateColumn()
  criadoEm: Date;

  @UpdateDateColumn()
  atualizadoEm: Date;
}
