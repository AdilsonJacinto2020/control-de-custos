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
} from '@nestjs/common';
import { DespesasService } from './despesas.service';
import { CreateDespesaDto } from './create-despesa.dto';
import { UpdateDespesaDto } from './update-despesa.dto';

@Controller('despesas')
export class DespesasController {
  constructor(private readonly despesasService: DespesasService) {}

  @Post()
  create(@Body() createDespesaDto: CreateDespesaDto) {
    return this.despesasService.create(createDespesaDto);
  }

  @Get()
  findAll() {
    return this.despesasService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.despesasService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDespesaDto: UpdateDespesaDto,
  ) {
    return this.despesasService.update(id, updateDespesaDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.despesasService.remove(id);
  }
}
