import { Module } from '@nestjs/common';
import { ImportExtratoService } from './import-extrato.service';
import { ImportExtratoController } from './import-extrato.controller';
import { TransacoesModule } from '../transacoes/transacoes.module';
import { CategoriasModule } from '../categorias/categorias.module';

@Module({
  imports: [TransacoesModule, CategoriasModule],
  controllers: [ImportExtratoController],
  providers: [ImportExtratoService],
  exports: [ImportExtratoService],
})
export class ImportExtratoModule {}
