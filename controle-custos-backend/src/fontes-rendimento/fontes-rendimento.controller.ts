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
import { FontesRendimentoService } from './fontes-rendimento.service';
import { CreateFonteRendimentoDto } from './dto/create-fonte-rendimento.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import { Usuario } from '../usuarios/usuario.entity';

@UseGuards(AuthGuard('jwt'))
@Controller('fontes-rendimento')
export class FontesRendimentoController {
  constructor(private readonly service: FontesRendimentoService) {}

  @Post()
  create(@Body() dto: CreateFonteRendimentoDto, @CurrentUser() user: Usuario) {
    return this.service.create(dto, user.id);
  }

  @Get()
  findAll(@CurrentUser() user: Usuario) {
    return this.service.findAll(user.id);
  }

  @Get('projecao')
  getProjecao(@CurrentUser() user: Usuario) {
    return this.service.calcularProjecaoRendimentos(user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: Usuario) {
    return this.service.remove(id, user.id);
  }
}
