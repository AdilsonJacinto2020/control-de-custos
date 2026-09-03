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
import { OrcamentosService } from './orcamentos.service';
import { CreateOrcamentoDto } from './dto/create-orcamento.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import { Usuario } from '../usuarios/usuario.entity';

@UseGuards(AuthGuard('jwt'))
@Controller('orcamentos')
export class OrcamentosController {
  constructor(private readonly orcamentosService: OrcamentosService) {}

  @Post()
  create(@Body() dto: CreateOrcamentoDto, @CurrentUser() user: Usuario) {
    return this.orcamentosService.create(dto, user.id);
  }

  @Get()
  findAll(@CurrentUser() user: Usuario) {
    return this.orcamentosService.findAll(user.id);
  }

  @Get('status')
  getStatus(@CurrentUser() user: Usuario) {
    return this.orcamentosService.getStatusDetalhado(user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: Usuario) {
    return this.orcamentosService.remove(id, user.id);
  }
}
