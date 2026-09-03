import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventoFuturo } from './evento-futuro.entity';
import { EventosFuturosService } from './eventos-futuros.service';
import { EventosFuturosController } from './eventos-futuros.controller';

@Module({
  imports: [TypeOrmModule.forFeature([EventoFuturo])],
  controllers: [EventosFuturosController],
  providers: [EventosFuturosService],
  exports: [EventosFuturosService],
})
export class EventosFuturosModule {}
