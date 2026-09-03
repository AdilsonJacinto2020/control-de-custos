import { Module } from '@nestjs/common';
import { ProjecaoFluxoCaixaService } from './projecao-fluxo-caixa.service';
import { ProjecaoController } from './projecao.controller';
import { ContasModule } from '../contas/contas.module';
import { FontesModule } from '../fontes-rendimento/fontes-rendimento.module';
import { TransacoesModule } from '../transacoes/transacoes.module';

@Module({
  imports: [ContasModule, FontesModule, TransacoesModule],
  controllers: [ProjecaoController],
  providers: [ProjecaoFluxoCaixaService],
  exports: [ProjecaoFluxoCaixaService],
})
export class ProjecaoModule {}
