import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CambioService } from './cambio.service';
import { SetTaxaCambioDto } from './dto/set-taxa-cambio.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import { Usuario } from '../usuarios/usuario.entity';

@UseGuards(AuthGuard('jwt'))
@Controller('cambio')
export class CambioController {
  constructor(private readonly service: CambioService) {}

  @Get('taxas')
  getTaxas(@CurrentUser() user: Usuario) {
    return this.service.getTaxas(user.id);
  }

  @Post('taxas-personalizadas')
  setTaxaPersonalizada(@Body() dto: SetTaxaCambioDto, @CurrentUser() user: Usuario) {
    return this.service.definirTaxaPersonalizada(dto, user.id);
  }

  @Get('converter')
  converter(
    @Query('valor') valor: string,
    @Query('de') de: string,
    @Query('para') para: string,
    @CurrentUser() user: Usuario,
  ) {
    const v = parseFloat(valor) || 0;
    return this.service.converter(v, de, para, user.id);
  }
}
