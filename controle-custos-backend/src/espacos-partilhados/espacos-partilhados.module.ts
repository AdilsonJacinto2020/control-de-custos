import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EspacoPartilhado } from './entities/espaco-partilhado.entity';
import { MembroEspacoPartilhado } from './entities/membro-espaco.entity';
import { Usuario } from '../usuarios/usuario.entity';
import { EspacosPartilhadosService } from './espacos-partilhados.service';
import { EspacosPartilhadosController } from './espacos-partilhados.controller';
import { TransacoesModule } from '../transacoes/transacoes.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EspacoPartilhado,
      MembroEspacoPartilhado,
      Usuario,
    ]),
    TransacoesModule,
  ],
  controllers: [EspacosPartilhadosController],
  providers: [EspacosPartilhadosService],
  exports: [EspacosPartilhadosService],
})
export class EspacosPartilhadosModule {}
