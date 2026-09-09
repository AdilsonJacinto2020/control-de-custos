import { Module } from '@nestjs/common';
import { ProjecaoFluxoCaixaService } from './projecao-fluxo-caixa.service';
import { ProjecaoController } from './projecao.controller';
import { ContasModule } from '../contas/contas.module';
import { FontesModule } from '../fontes-rendimento/fontes-rendimento.module';
import { TransacoesModule } from '../transacoes/transacoes.module';
import { EventosFuturosModule } from '../eventos-futuros/eventos-futuros.module';
import { CambioModule } from '../cambio/cambio.module';
import { UsuariosModule } from '../usuarios/usuarios.module';

@Module({
  imports: [ContasModule, FontesModule, TransacoesModule, EventosFuturosModule, CambioModule, UsuariosModule],
  controllers: [ProjecaoController],
  providers: [ProjecaoFluxoCaixaService],
  exports: [ProjecaoFluxoCaixaService],
})
export class ProjecaoModule {}
