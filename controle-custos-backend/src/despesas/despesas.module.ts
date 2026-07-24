import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DespesasController } from './despesas.controller';
import { DespesasService } from './despesas.service';
import { Despesa } from './despesa.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Despesa])],
  controllers: [DespesasController],
  providers: [DespesasService],
})
export class DespesasModule {}
