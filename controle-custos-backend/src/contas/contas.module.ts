import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conta } from './conta.entity';
import { ContasService } from './contas.service';
import { ContasController } from './contas.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Conta])],
  controllers: [ContasController],
  providers: [ContasService],
  exports: [ContasService],
})
export class ContasModule {}
