import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum TipoConteudoMensagem {
  TEXTO = 'texto',
  IMAGEM = 'imagem',
  AUDIO = 'audio',
}

@Entity('mensagens_processadas')
export class MensagemProcessada {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  conversaId: string;

  @Column({
    type: 'enum',
    enum: TipoConteudoMensagem,
    default: TipoConteudoMensagem.TEXTO,
  })
  tipoConteudo: TipoConteudoMensagem;

  @Column('text')
  conteudoBruto: string;

  @Column({ type: 'jsonb', nullable: true })
  resultadoParsing: Record<string, any>;

  @Column({ type: 'uuid', nullable: true })
  transacaoGeradaId: string;

  @CreateDateColumn()
  criadoEm: Date;
}
