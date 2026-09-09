import { Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsuariosService } from './usuarios.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { Usuario } from './usuario.entity';

@UseGuards(AuthGuard('jwt'))
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  /**
   * Gera um código de vinculação para o utilizador autenticado enviar ao
   * bot do WhatsApp (ex: "vincular 123456"), ligando o número à conta que
   * já usa no site — em vez de o bot criar uma conta nova e desconectada.
   */
  @Post('whatsapp/gerar-codigo')
  gerarCodigoVinculacao(@CurrentUser() user: Usuario) {
    return this.usuariosService.gerarCodigoVinculacaoWhatsapp(user.id);
  }
}
