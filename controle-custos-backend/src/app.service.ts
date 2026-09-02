import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello() {
    return {
      status: 'online',
      message: '🚀 API de Controle de Custos está em execução com sucesso!',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      endpoints: {
        despesas: '/despesas',
        health: '/',
      },
    };
  }
}
