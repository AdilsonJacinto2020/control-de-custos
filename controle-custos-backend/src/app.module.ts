import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DespesasController } from './despesas/despesas.controller';
import { DespesasService } from './despesas/despesas.service';
import { DespesasModule } from './despesas/despesas.module';

@Module({
  imports: [DespesasModule],
  controllers: [AppController, DespesasController],
  providers: [AppService, DespesasService],
})
export class AppModule {}
