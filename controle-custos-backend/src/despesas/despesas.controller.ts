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
import { DespesasService } from './despesas.service';
import { CreateDespesaDto } from './create-despesa.dto';
import { UpdateDespesaDto } from './update-despesa.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import { Usuario } from '../usuarios/usuario.entity';

@UseGuards(AuthGuard('jwt'))
@Controller('despesas')
export class DespesasController {
  constructor(private readonly despesasService: DespesasService) {}

  @Post()
  create(
    @Body() createDespesaDto: CreateDespesaDto,
    @CurrentUser() user: Usuario,
  ) {
    return this.despesasService.create(createDespesaDto, user.id);
  }

  @Get()
  findAll(@CurrentUser() user: Usuario) {
    return this.despesasService.findAll(user.id);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: Usuario,
  ) {
    return this.despesasService.findOne(id, user.id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDespesaDto: UpdateDespesaDto,
    @CurrentUser() user: Usuario,
  ) {
    return this.despesasService.update(id, updateDespesaDto, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: Usuario,
  ) {
    return this.despesasService.remove(id, user.id);
  }
}
