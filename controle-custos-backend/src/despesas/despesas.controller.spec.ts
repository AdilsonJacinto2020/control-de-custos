import { Test, TestingModule } from '@nestjs/testing';
import { DespesasController } from './despesas.controller';
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

const despesasServiceMock = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('DespesasController', () => {
  let controller: DespesasController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DespesasController],
      providers: [
        { provide: DespesasService, useValue: despesasServiceMock },
      ],
    }).compile();

    controller = module.get<DespesasController>(DespesasController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates create to the service', async () => {
    despesasServiceMock.create.mockResolvedValue(despesaMock);
    const dto = {
      descricao: despesaMock.descricao,
      valor: despesaMock.valor,
      data: despesaMock.data,
      categoria: despesaMock.categoria,
    };

    const result = await controller.create(dto);

    expect(despesasServiceMock.create).toHaveBeenCalledWith(dto);
    expect(result).toEqual(despesaMock);
  });

  it('delegates findAll to the service', async () => {
    despesasServiceMock.findAll.mockResolvedValue([despesaMock]);

    const result = await controller.findAll();

    expect(result).toEqual([despesaMock]);
  });

  it('delegates findOne to the service', async () => {
    despesasServiceMock.findOne.mockResolvedValue(despesaMock);

    const result = await controller.findOne(despesaMock.id);

    expect(despesasServiceMock.findOne).toHaveBeenCalledWith(despesaMock.id);
    expect(result).toEqual(despesaMock);
  });

  it('delegates update to the service', async () => {
    despesasServiceMock.update.mockResolvedValue({
      ...despesaMock,
      valor: 50,
    });

    const result = await controller.update(despesaMock.id, { valor: 50 });

    expect(despesasServiceMock.update).toHaveBeenCalledWith(despesaMock.id, {
      valor: 50,
    });
    expect(result.valor).toBe(50);
  });

  it('delegates remove to the service', async () => {
    await controller.remove(despesaMock.id);

    expect(despesasServiceMock.remove).toHaveBeenCalledWith(despesaMock.id);
  });
});
