import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FonteDeRendimento } from './fonte-rendimento.entity';
import { FontesRendimentoService } from './fontes-rendimento.service';
import { FontesRendimentoController } from './fontes-rendimento.controller';
import { TransacoesModule } from '../transacoes/transacoes.module';

@Module({
  imports: [TypeOrmModule.forFeature([FonteDeRendimento]), TransacoesModule],
  controllers: [FontesRendimentoController],
  providers: [FontesRendimentoService],
  exports: [FontesRendimentoService],
})
export class FontesModule {}
