import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('taxas_cambio_personalizadas')
export class TaxaCambioPersonalizada {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'usuario_id' })
  usuarioId: string;

  @Column({ length: 3 })
  moedaOrigem: string;

  @Column({ length: 3 })
  moedaDestino: string;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 4,
  })
  taxa: number;

  @Column({ default: true })
  usarPersonalizada: boolean;

  @CreateDateColumn({ name: 'criado_em' })
  criadoEm: Date;

  @UpdateDateColumn({ name: 'atualizado_em' })
  atualizadoEm: Date;
}
