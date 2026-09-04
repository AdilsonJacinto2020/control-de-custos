import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EspacoPartilhado } from './espaco-partilhado.entity';
import { Usuario } from '../../usuarios/usuario.entity';

export enum PapelEspaco {
  PROPRIETARIO = 'proprietario',
  ADMINISTRADOR = 'administrador',
  MEMBRO = 'membro',
}

@Entity('membros_espacos_partilhados')
export class MembroEspacoPartilhado {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'espaco_partilhado_id' })
  espacoPartilhadoId: string;

  @ManyToOne(() => EspacoPartilhado, (espaco) => espaco.membros, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'espaco_partilhado_id' })
  espaco: EspacoPartilhado;

  @Column({ name: 'usuario_id' })
  usuarioId: string;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @Column({
    type: 'enum',
    enum: PapelEspaco,
    default: PapelEspaco.MEMBRO,
  })
  papel: PapelEspaco;

  @Column({
    name: 'percentual_divisao_padrao',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 50.0,
  })
  percentualDivisaoPadrao: number;

  @CreateDateColumn({ name: 'adicionado_em' })
  adicionadoEm: Date;
}
