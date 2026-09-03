import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CategoriaDespesa } from './categoria-despesa.enum';

@Entity('despesas')
export class Despesa {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  descricao: string;

  @Column('decimal', { precision: 10, scale: 2 })
  valor: number;

  @Column('date')
  data: string;

  @Column({ type: 'enum', enum: CategoriaDespesa })
  categoria: CategoriaDespesa;

  @Column({ type: 'uuid', nullable: true })
  usuarioId: string;

  @CreateDateColumn()
  criadoEm: Date;

  @UpdateDateColumn()
  atualizadoEm: Date;
}
