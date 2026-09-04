import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaxaCambioPersonalizada } from './entities/taxa-cambio.entity';
import { CambioService } from './cambio.service';
import { CambioController } from './cambio.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TaxaCambioPersonalizada])],
  controllers: [CambioController],
  providers: [CambioService],
  exports: [CambioService],
})
export class CambioModule {}
