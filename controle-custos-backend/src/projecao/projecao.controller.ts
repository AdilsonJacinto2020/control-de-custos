import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProjecaoFluxoCaixaService } from './projecao-fluxo-caixa.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { Usuario } from '../usuarios/usuario.entity';

@UseGuards(AuthGuard('jwt'))
@Controller('projecao')
export class ProjecaoController {
  constructor(private readonly projecaoService: ProjecaoFluxoCaixaService) {}

  @Get('fluxo-caixa')
  getFluxoCaixa(
    @CurrentUser() user: Usuario,
    @Query('meses') meses?: string,
  ) {
    const numMeses = meses ? parseInt(meses, 10) : 6;
    return this.projecaoService.calcularProjecaoFluxoCaixa(user.id, numMeses);
  }
}
