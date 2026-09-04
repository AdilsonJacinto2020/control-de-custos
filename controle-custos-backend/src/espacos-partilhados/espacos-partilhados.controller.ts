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
import { EspacosPartilhadosService } from './espacos-partilhados.service';
import { CreateEspacoDto } from './dto/create-espaco.dto';
import { AddMembroDto } from './dto/add-membro.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import { Usuario } from '../usuarios/usuario.entity';

@UseGuards(AuthGuard('jwt'))
@Controller('espacos-partilhados')
export class EspacosPartilhadosController {
  constructor(private readonly service: EspacosPartilhadosService) {}

  @Post()
  create(@Body() dto: CreateEspacoDto, @CurrentUser() user: Usuario) {
    return this.service.create(dto, user.id);
  }

  @Get()
  findAll(@CurrentUser() user: Usuario) {
    return this.service.findAll(user.id);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: Usuario) {
    return this.service.findOne(id, user.id);
  }

  @Post(':id/membros')
  addMembro(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddMembroDto,
    @CurrentUser() user: Usuario,
  ) {
    return this.service.addMembro(id, dto, user.id);
  }

  @Get(':id/acertos')
  getAcertos(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: Usuario) {
    return this.service.calcularAcertos(id, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: Usuario) {
    return this.service.remove(id, user.id);
  }
}
