import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DespesasService } from './despesas.service';
import { Despesa } from './despesa.entity';
import { CategoriaDespesa } from './categoria-despesa.enum';

const despesaMock: Despesa = {
  id: '1e7b1c1a-0000-4000-8000-000000000001',
  descricao: 'Almoço',
  valor: 35.5,
  data: '2026-07-24',
  categoria: CategoriaDespesa.ALIMENTACAO,
  criadoEm: new Date(),
  atualizadoEm: new Date(),
};

type MockRepository = Partial<Record<keyof Repository<Despesa>, jest.Mock>>;

const createMockRepository = (): MockRepository => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  remove: jest.fn(),
});

describe('DespesasService', () => {
  let service: DespesasService;
  let repository: MockRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DespesasService,
        {
          provide: getRepositoryToken(Despesa),
          useValue: createMockRepository(),
        },
      ],
    }).compile();

    service = module.get<DespesasService>(DespesasService);
    repository = module.get(getRepositoryToken(Despesa));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates a despesa', async () => {
    const dto = {
      descricao: despesaMock.descricao,
      valor: despesaMock.valor,
      data: despesaMock.data,
      categoria: despesaMock.categoria,
    };
    repository.create!.mockReturnValue(despesaMock);
    repository.save!.mockResolvedValue(despesaMock);

    const result = await service.create(dto);

    expect(repository.create).toHaveBeenCalledWith(dto);
    expect(repository.save).toHaveBeenCalledWith(despesaMock);
    expect(result).toEqual(despesaMock);
  });

  it('returns all despesas', async () => {
    repository.find!.mockResolvedValue([despesaMock]);

    const result = await service.findAll();

    expect(result).toEqual([despesaMock]);
  });

  it('returns one despesa by id', async () => {
    repository.findOne!.mockResolvedValue(despesaMock);

    const result = await service.findOne(despesaMock.id);

    expect(repository.findOne).toHaveBeenCalledWith({
      where: { id: despesaMock.id },
    });
    expect(result).toEqual(despesaMock);
  });

  it('throws NotFoundException when despesa does not exist', async () => {
    repository.findOne!.mockResolvedValue(null);

    await expect(service.findOne('inexistente')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('updates a despesa', async () => {
    repository.findOne!.mockResolvedValue(despesaMock);
    repository.save!.mockResolvedValue({ ...despesaMock, valor: 50 });

    const result = await service.update(despesaMock.id, { valor: 50 });

    expect(result.valor).toBe(50);
  });

  it('removes a despesa', async () => {
    repository.findOne!.mockResolvedValue(despesaMock);
    repository.remove!.mockResolvedValue(despesaMock);

    await service.remove(despesaMock.id);

    expect(repository.remove).toHaveBeenCalledWith(despesaMock);
  });
});
