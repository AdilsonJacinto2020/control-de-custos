import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MembroEspacoPartilhado } from './membro-espaco.entity';

@Entity('espacos_partilhados')
export class EspacoPartilhado {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 150 })
  nome: string;

  @Column({ nullable: true, length: 255 })
  descricao?: string;

  @Column({ name: 'criado_por_usuario_id' })
  criadoPorUsuarioId: string;

  @OneToMany(() => MembroEspacoPartilhado, (membro) => membro.espaco, { cascade: true })
  membros: MembroEspacoPartilhado[];

  @CreateDateColumn({ name: 'criado_em' })
  criadoEm: Date;

  @UpdateDateColumn({ name: 'atualizado_em' })
  atualizadoEm: Date;
}
