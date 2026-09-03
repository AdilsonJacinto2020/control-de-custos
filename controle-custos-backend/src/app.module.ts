import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DespesasModule } from './despesas/despesas.module';
import { Despesa } from './despesas/despesa.entity';
import { UsuariosModule } from './usuarios/usuarios.module';
import { Usuario } from './usuarios/usuario.entity';
import { AuthModule } from './auth/auth.module';
import { Conta } from './contas/conta.entity';
import { ContasModule } from './contas/contas.module';
import { Categoria } from './categorias/categoria.entity';
import { CategoriasModule } from './categorias/categorias.module';
import { Transacao } from './transacoes/transacao.entity';
import { TransacoesModule } from './transacoes/transacoes.module';
import { Orcamento } from './orcamentos/orcamento.entity';
import { OrcamentosModule } from './orcamentos/orcamentos.module';
import { ImportExtratoModule } from './import-extrato/import-extrato.module';
import { FonteDeRendimento } from './fontes-rendimento/fonte-rendimento.entity';
import { FontesModule } from './fontes-rendimento/fontes-rendimento.module';
import { MetaDePoupanca } from './metas-poupanca/meta-poupanca.entity';
import { MetasPoupancaModule } from './metas-poupanca/metas-poupanca.module';
import { ProjecaoModule } from './projecao/projecao.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>('DATABASE_URL');
        const isSslRequired =
          configService.get<string>('DB_SSL', 'false') === 'true' ||
          Boolean(databaseUrl);

        const entities = [
          Despesa,
          Usuario,
          Conta,
          Categoria,
          Transacao,
          ConversaWhatsapp,
          MensagemProcessada,
          Orcamento,
          FonteDeRendimento,
          MetaDePoupanca,
        ];

        if (databaseUrl) {
          return {
            type: 'postgres',
            url: databaseUrl,
            entities,
            synchronize: configService.get<string>('NODE_ENV') !== 'production',
            ssl: isSslRequired ? { rejectUnauthorized: false } : false,
          };
        }

        return {
          type: 'postgres',
          host: configService.get<string>('DB_HOST', 'localhost'),
          port: configService.get<number>('DB_PORT', 5432),
          username: configService.get<string>('DB_USERNAME', 'fincontrol'),
          password: configService.get<string>('DB_PASSWORD', 'fincontrol'),
          database: configService.get<string>('DB_DATABASE', 'fincontrol'),
          entities,
          synchronize: configService.get<string>('NODE_ENV') !== 'production',
          ssl: isSslRequired ? { rejectUnauthorized: false } : false,
        };
      },
    }),
    UsuariosModule,
    AuthModule,
    ContasModule,
    CategoriasModule,
    TransacoesModule,
    WhatsappModule,
    OrcamentosModule,
    ImportExtratoModule,
    FontesModule,
    MetasPoupancaModule,
    ProjecaoModule,
    DespesasModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
