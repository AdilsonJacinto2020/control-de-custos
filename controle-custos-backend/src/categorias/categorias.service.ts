import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Categoria } from './categoria.entity';
import { CreateCategoriaDto } from './dto/create-categoria.dto';

const CATEGORIAS_PADRAO = [
  { nome: 'Alimentação', icone: 'utensils', cor: '#F59E0B', regrasDeCategorizacao: ['restaurante', 'almoço', 'jantar', 'supermercado', 'kero', 'candando', 'padaria'] },
  { nome: 'Transporte', icone: 'car', cor: '#3B82F6', regrasDeCategorizacao: ['táxi', 'gasolina', 'combustível', 'candongueiro', 'uber', 'heetch', 'lavagem'] },
  { nome: 'Habitação', icone: 'home', cor: '#10B981', regrasDeCategorizacao: ['renda', 'aluguel', 'edeal', 'luz', 'água', 'condomínio', 'gás'] },
  { nome: 'Saúde', icone: 'heart-pulse', cor: '#EF4444', regrasDeCategorizacao: ['farmácia', 'consulta', 'remédio', 'hospital', 'clínica', 'exame'] },
  { nome: 'Educação', icone: 'graduation-cap', cor: '#8B5CF6', regrasDeCategorizacao: ['escola', 'faculdade', 'curso', 'livro', 'mensalidade', 'propina'] },
  { nome: 'Lazer', icone: 'gamepad-2', cor: '#EC4899', regrasDeCategorizacao: ['cinema', 'praia', 'festa', 'passeio', 'bar', 'cerveja', 'show'] },
  { nome: 'Outros', icone: 'help-circle', cor: '#6B7280', regrasDeCategorizacao: [] },
];

@Injectable()
export class CategoriasService {
  constructor(
    @InjectRepository(Categoria)
    private readonly categoriasRepository: Repository<Categoria>,
  ) {}

  async onModuleInit() {
    // Inicializa categorias padrão do sistema se não existirem
    const count = await this.categoriasRepository.count({
      where: { usuarioId: IsNull() },
    });
    if (count === 0) {
      for (const cat of CATEGORIAS_PADRAO) {
        await this.categoriasRepository.save(
          this.categoriasRepository.create({
            nome: cat.nome,
            icone: cat.icone,
            cor: cat.cor,
            regrasDeCategorizacao: cat.regrasDeCategorizacao,
            usuarioId: null,
            ativa: true,
          }),
        );
      }
    }
  }

  async create(dto: CreateCategoriaDto, usuarioId: string): Promise<Categoria> {
    const categoria = this.categoriasRepository.create({
      ...dto,
      usuarioId,
      ativa: true,
    });
    return this.categoriasRepository.save(categoria);
  }

  async findAll(usuarioId: string): Promise<Categoria[]> {
    // Retorna categorias do sistema (usuarioId = null) + categorias criadas pelo utilizador
    return this.categoriasRepository
      .createQueryBuilder('categoria')
      .where('categoria.ativa = :ativa', { ativa: true })
      .andWhere('(categoria.usuarioId = :usuarioId OR categoria.usuarioId IS NULL)', { usuarioId })
      .orderBy('categoria.nome', 'ASC')
      .getMany();
  }

  async findOne(id: string, usuarioId: string): Promise<Categoria> {
    const categoria = await this.categoriasRepository
      .createQueryBuilder('categoria')
      .where('categoria.id = :id AND categoria.ativa = :ativa', { id, ativa: true })
      .andWhere('(categoria.usuarioId = :usuarioId OR categoria.usuarioId IS NULL)', { usuarioId })
      .getOne();

    if (!categoria) {
      throw new NotFoundException(`Categoria com id "${id}" não encontrada`);
    }
    return categoria;
  }

  async update(id: string, dto: Partial<CreateCategoriaDto>, usuarioId: string): Promise<Categoria> {
    const categoria = await this.categoriasRepository.findOne({
      where: { id, usuarioId, ativa: true },
    });
    if (!categoria) {
      throw new NotFoundException(`Categoria personalizada com id "${id}" não encontrada ou é padrão do sistema`);
    }
    Object.assign(categoria, dto);
    return this.categoriasRepository.save(categoria);
  }

  async remove(id: string, usuarioId: string): Promise<void> {
    const categoria = await this.categoriasRepository.findOne({
      where: { id, usuarioId, ativa: true },
    });
    if (!categoria) {
      throw new NotFoundException(`Não é possível excluir categoria padrão do sistema ou inexistente`);
    }
    categoria.ativa = false;
    await this.categoriasRepository.save(categoria);
  }
}
