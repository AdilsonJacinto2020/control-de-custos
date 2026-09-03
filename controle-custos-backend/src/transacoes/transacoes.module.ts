import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transacao } from './transacao.entity';
import { TransacoesService } from './transacoes.service';
import { TransacoesController } from './transacoes.controller';
import { ContasModule } from '../contas/contas.module';

@Module({
  imports: [TypeOrmModule.forFeature([Transacao]), ContasModule],
  controllers: [TransacoesController],
  providers: [TransacoesService],
  exports: [TransacoesService],
})
export class TransacoesModule {}
