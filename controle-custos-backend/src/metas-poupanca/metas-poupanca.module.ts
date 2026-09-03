import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MetaDePoupanca } from './meta-poupanca.entity';
import { MetasPoupancaService } from './metas-poupanca.service';
import { MetasPoupancaController } from './metas-poupanca.controller';

@Module({
  imports: [TypeOrmModule.forFeature([MetaDePoupanca])],
  controllers: [MetasPoupancaController],
  providers: [MetasPoupancaService],
  exports: [MetasPoupancaService],
})
export class MetasPoupancaModule {}
