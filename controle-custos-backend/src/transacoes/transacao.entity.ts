import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum TipoTransacao {
  RECEITA = 'receita',
  DESPESA = 'despesa',
  TRANSFERENCIA = 'transferencia_entre_contas',
}

export enum OrigemTransacao {
  WHATSAPP = 'whatsapp',
  IMPORT_EXTRATO = 'import_extrato',
  OCR_RECIBO = 'ocr_recibo',
  MANUAL = 'manual',
  EVENTO_PROJETADO = 'evento_projetado',
}

export enum StatusDuplicado {
  NENHUM = 'nenhum',
  SUSPEITO = 'suspeito',
  CONFIRMADO_UNICO = 'confirmado_unico',
  CONFIRMADO_DUPLICADO = 'confirmado_duplicado',
}

@Entity('transacoes')
export class Transacao {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  usuarioId: string;

  @Column({ type: 'uuid' })
  contaId: string;

  @Column({
    type: 'enum',
    enum: TipoTransacao,
    default: TipoTransacao.DESPESA,
  })
  tipo: TipoTransacao;

  @Column('decimal', { precision: 14, scale: 2 })
  valor: number;

  @Column({ length: 3, default: 'AOA' })
  moeda: string;

  @Column({ type: 'uuid', nullable: true })
  categoriaId: string;

  // Liga uma receita à FonteDeRendimento que a gerou. Sem isto, a
  // projeção de rendimento variável não conseguia distinguir "salário
  // fixo" de "biscate variável" e misturava tudo na mesma média.
  @Column({ type: 'uuid', nullable: true })
  fonteRendimentoId: string;

  // Suporte real à divisão de despesas conjuntas em espaços partilhados.
  // Sem estes campos, `calcularAcertos` não tinha como saber quais
  // transações eram de facto conjuntas nem quem as pagou.
  @Column({ type: 'uuid', nullable: true })
  espacoPartilhadoId: string;

  @Column({ default: false })
  divisaoConjunta: boolean;

  @Column()
  descricao: string;

  @Column('date')
  data: string;

  @Column({
    type: 'enum',
    enum: OrigemTransacao,
    default: OrigemTransacao.MANUAL,
  })
  origem: OrigemTransacao;

  @Column({ type: 'uuid', nullable: true })
  contaDestinoId: string; // Obrigatório se transferencia_entre_contas

  @Column('decimal', { precision: 12, scale: 4, nullable: true })
  taxaCambioUsada: number;

  @Column({
    type: 'enum',
    enum: StatusDuplicado,
    default: StatusDuplicado.NENHUM,
  })
  statusDuplicado: StatusDuplicado;

  @CreateDateColumn()
  criadoEm: Date;

  @UpdateDateColumn()
  atualizadoEm: Date;
}
