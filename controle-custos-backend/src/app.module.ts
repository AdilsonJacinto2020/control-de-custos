import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DespesasModule } from './despesas/despesas.module';
import { Despesa } from './despesas/despesa.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get<string>('DB_USERNAME', 'fincontrol'),
        password: configService.get<string>('DB_PASSWORD', 'fincontrol'),
        database: configService.get<string>('DB_DATABASE', 'fincontrol'),
        entities: [Despesa],
        synchronize: true,
      }),
    }),
    DespesasModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
