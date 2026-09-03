import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { EventosFuturosService } from './eventos-futuros.service';
import { CreateEventoFuturoDto } from './dto/create-evento-futuro.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import { Usuario } from '../usuarios/usuario.entity';
import { StatusEventoFuturo } from './evento-futuro.entity';

@UseGuards(AuthGuard('jwt'))
@Controller('eventos-futuros')
export class EventosFuturosController {
  constructor(private readonly service: EventosFuturosService) {}

  @Post()
  create(@Body() dto: CreateEventoFuturoDto, @CurrentUser() user: Usuario) {
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

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateEventoFuturoDto>,
    @CurrentUser() user: Usuario,
  ) {
    return this.service.update(id, dto, user.id);
  }

  @Patch(':id/status')
  setStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: StatusEventoFuturo,
    @CurrentUser() user: Usuario,
  ) {
    return this.service.setStatus(id, status, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: Usuario) {
    return this.service.remove(id, user.id);
  }
}
