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
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TransacoesService } from './transacoes.service';
import { CreateTransacaoDto } from './dto/create-transacao.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import { Usuario } from '../usuarios/usuario.entity';

@UseGuards(AuthGuard('jwt'))
@Controller('transacoes')
export class TransacoesController {
  constructor(private readonly transacoesService: TransacoesService) {}

  @Post()
  create(@Body() dto: CreateTransacaoDto, @CurrentUser() user: Usuario) {
    return this.transacoesService.create(dto, user.id);
  }

  @Get()
  findAll(
    @CurrentUser() user: Usuario,
    @Query('mes') mes?: string,
    @Query('ano') ano?: string,
  ) {
    return this.transacoesService.findAll(user.id, mes, ano);
  }

  @Get('dashboard')
  getDashboard(
    @CurrentUser() user: Usuario,
    @Query('mes') mes?: string,
    @Query('ano') ano?: string,
  ) {
    return this.transacoesService.getDashboardSummary(user.id, mes, ano);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: Usuario) {
    return this.transacoesService.findOne(id, user.id);
  }

  @Delete('reset-all')
  resetAll(@CurrentUser() user: Usuario) {
    return this.transacoesService.resetAll(user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: Usuario) {
    return this.transacoesService.remove(id, user.id);
  }
}
