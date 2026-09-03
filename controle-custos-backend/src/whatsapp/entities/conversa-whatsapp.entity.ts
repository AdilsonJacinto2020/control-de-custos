import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum EstadoConversa {
  IDLE = 'idle',
  AGUARDANDO_LANCAMENTO = 'aguardando_lancamento',
  AGUARDANDO_CONFIRMACAO = 'aguardando_confirmacao',
  AGUARDANDO_CORRECAO_CATEGORIA = 'aguardando_correcao_categoria',
  AGUARDANDO_VALOR_AMBIGUO = 'aguardando_valor_ambiguo',
}

@Entity('conversas_whatsapp')
export class ConversaWhatsapp {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  usuarioId: string;

  @Column({ unique: true })
  telefoneWhatsapp: string;

  @Column({
    type: 'enum',
    enum: EstadoConversa,
    default: EstadoConversa.IDLE,
  })
  estado: EstadoConversa;

  @Column({ type: 'jsonb', nullable: true })
  dadosRascunho: {
    valor?: number;
    moeda?: string;
    tipo?: string;
    categoriaId?: string;
    descricao?: string;
    data?: string;
    confianca?: number;
    opcoesCategoria?: { id: string; nome: string }[];
  };

  @Column({ type: 'uuid', nullable: true })
  ultimaTransacaoId: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  ultimaInteracaoEm: Date;

  @CreateDateColumn()
  criadoEm: Date;

  @UpdateDateColumn()
  atualizadoEm: Date;
}
