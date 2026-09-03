import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MetasPoupancaService } from './metas-poupanca.service';
import { CreateMetaPoupancaDto } from './dto/create-meta-poupanca.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import { Usuario } from '../usuarios/usuario.entity';

@UseGuards(AuthGuard('jwt'))
@Controller('metas-poupanca')
export class MetasPoupancaController {
  constructor(private readonly service: MetasPoupancaService) {}

  @Post()
  create(@Body() dto: CreateMetaPoupancaDto, @CurrentUser() user: Usuario) {
    return this.service.create(dto, user.id);
  }

  @Get()
  findAll(@CurrentUser() user: Usuario) {
    return this.service.findAll(user.id);
  }

  @Post(':id/contribuir')
  contribuir(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('valor') valor: number,
    @CurrentUser() user: Usuario,
  ) {
    return this.service.adicionarContribuicao(id, valor, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: Usuario) {
    return this.service.remove(id, user.id);
  }
}
