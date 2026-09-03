import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from './usuario.entity';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
  ) {}

  async findById(id: string): Promise<Usuario | null> {
    return this.usuarioRepository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<Usuario | null> {
    return this.usuarioRepository.findOne({ where: { email } });
  }

  async findByWhatsapp(telefoneWhatsapp: string): Promise<Usuario | null> {
    return this.usuarioRepository.findOne({ where: { telefoneWhatsapp } });
  }

  async findByGoogleId(googleId: string): Promise<Usuario | null> {
    return this.usuarioRepository.findOne({ where: { googleId } });
  }

  async findOrCreateFromGoogle(profile: {
    googleId: string;
    email?: string;
    nome?: string;
    avatarUrl?: string;
  }): Promise<Usuario> {
    let user = await this.findByGoogleId(profile.googleId);

    if (!user && profile.email) {
      user = await this.findByEmail(profile.email);
      if (user) {
        user.googleId = profile.googleId;
        if (profile.avatarUrl && !user.avatarUrl) {
          user.avatarUrl = profile.avatarUrl;
        }
        return this.usuarioRepository.save(user);
      }
    }

    if (!user) {
      user = this.usuarioRepository.create({
        googleId: profile.googleId,
        email: profile.email,
        nome: profile.nome,
        avatarUrl: profile.avatarUrl,
      });
      return this.usuarioRepository.save(user);
    }

    return user;
  }
}
