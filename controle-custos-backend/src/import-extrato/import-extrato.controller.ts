import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ImportExtratoService, ExtratoItemImportado } from './import-extrato.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { Usuario } from '../usuarios/usuario.entity';

@UseGuards(AuthGuard('jwt'))
@Controller('import-extrato')
export class ImportExtratoController {
  constructor(private readonly importService: ImportExtratoService) {}

  @Post('preview')
  previewExtrato(
    @Body() body: { csv: string; contaId: string },
    @CurrentUser() user: Usuario,
  ) {
    return this.importService.parseExtratoCSV(body.csv, body.contaId, user.id);
  }

  @Post('confirmar')
  confirmarImportacao(
    @Body() body: { itens: ExtratoItemImportado[]; contaId: string },
    @CurrentUser() user: Usuario,
  ) {
    return this.importService.confirmarImportacao(body.itens, body.contaId, user.id);
  }
}
