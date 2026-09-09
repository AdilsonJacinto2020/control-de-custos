import { Injectable, NotFoundException } from '@nestjs/common';
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

  async updateTelefone(id: string, telefoneWhatsapp: string): Promise<Usuario> {
    const user = await this.usuarioRepository.findOne({ where: { id } });
    if (user) {
      user.telefoneWhatsapp = telefoneWhatsapp;
      return this.usuarioRepository.save(user);
    }
    return user as any;
  }

  /**
   * Gera um código de 6 dígitos, válido por 10 minutos, que o utilizador
   * autenticado no site envia ao bot do WhatsApp (ex: "vincular 123456")
   * para ligar o seu número à conta já existente — em vez de o bot criar
   * uma conta nova e desconectada, como acontecia antes.
   */
  async gerarCodigoVinculacaoWhatsapp(usuarioId: string): Promise<{ codigo: string; expiraEm: Date }> {
    const user = await this.usuarioRepository.findOne({ where: { id: usuarioId } });
    if (!user) {
      throw new NotFoundException('Utilizador não encontrado');
    }

    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    const expiraEm = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

    user.codigoVinculacaoWhatsapp = codigo;
    user.codigoVinculacaoExpiraEm = expiraEm;
    await this.usuarioRepository.save(user);

    return { codigo, expiraEm };
  }

  /**
   * Consumida pelo bot do WhatsApp ao receber "vincular <código>".
   * Localiza o utilizador dono do código (ainda válido) e associa o
   * número de telefone que enviou a mensagem à conta correta.
   * Retorna null se o código for inválido/expirado.
   */
  async vincularWhatsappPorCodigo(codigo: string, telefoneWhatsapp: string): Promise<Usuario | null> {
    const user = await this.usuarioRepository.findOne({
      where: { codigoVinculacaoWhatsapp: codigo },
    });

    if (!user || !user.codigoVinculacaoExpiraEm || user.codigoVinculacaoExpiraEm.getTime() < Date.now()) {
      return null;
    }

    // Se o número já pertencia a outra conta (ex: conta "só WhatsApp"
    // criada antes de existir vinculação), liberta-o primeiro para evitar
    // violar a restrição de unicidade de telefoneWhatsapp.
    const donoAnterior = await this.usuarioRepository.findOne({ where: { telefoneWhatsapp } });
    if (donoAnterior && donoAnterior.id !== user.id) {
      donoAnterior.telefoneWhatsapp = null as any;
      await this.usuarioRepository.save(donoAnterior);
    }

    user.telefoneWhatsapp = telefoneWhatsapp;
    user.codigoVinculacaoWhatsapp = null as any;
    user.codigoVinculacaoExpiraEm = null as any;
    return this.usuarioRepository.save(user);
  }
}
