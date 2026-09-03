import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('categorias')
export class Categoria {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  usuarioId: string; // nulo para categorias padrão do sistema

  @Column()
  nome: string;

  @Column({ type: 'uuid', nullable: true })
  categoriaPaiId: string;

  @Column({ nullable: true })
  icone: string;

  @Column({ nullable: true })
  cor: string;

  @Column('simple-array', { nullable: true })
  regrasDeCategorizacao: string[];

  @Column({ default: true })
  ativa: boolean;

  @CreateDateColumn()
  criadoEm: Date;

  @UpdateDateColumn()
  atualizadoEm: Date;
}
