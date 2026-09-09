import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { UsuariosService } from '../usuarios/usuarios.service';
import { Usuario } from '../usuarios/usuario.entity';

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;

  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.googleClient = new OAuth2Client(
      this.configService.get<string>('GOOGLE_CLIENT_ID'),
    );
  }

  async loginWithGoogle(credential: string) {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: credential,
        audience: this.configService.get<string>('GOOGLE_CLIENT_ID'),
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.sub) {
        throw new UnauthorizedException('Token do Google inválido');
      }

      const user = await this.usuariosService.findOrCreateFromGoogle({
        googleId: payload.sub,
        email: payload.email,
        nome: payload.name,
        avatarUrl: payload.picture,
      });

      return this.generateAuthResponse(user);
    } catch (error) {
      throw new UnauthorizedException(
        'Falha na validação do Google Token: ' + (error?.message || error),
      );
    }
  }

  async guestLogin() {
    // IMPORTANTE: cada sessão de convidado precisa da sua PRÓPRIA identidade.
    // Antes, todos os "convidados" partilhavam o mesmo googleId fixo
    // ('guest_demo_user'), o que fazia com que todos vissem e editassem
    // os mesmos dados uns dos outros. Cada chamada gera agora um utilizador
    // efémero isolado, identificável como convidado para eventual limpeza
    // periódica (ex: apagar contas "guest_*" com mais de X dias).
    const idUnico = randomUUID();
    const guestUser = await this.usuariosService.findOrCreateFromGoogle({
      googleId: `guest_${idUnico}`,
      nome: 'Convidado Demo',
    });

    return this.generateAuthResponse(guestUser);
  }

  private generateAuthResponse(user: Usuario) {
    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        avatarUrl: user.avatarUrl,
        moedaReferencia: user.moedaReferencia,
        modeloOrcamento: user.modeloOrcamento,
      },
    };
  }
}
