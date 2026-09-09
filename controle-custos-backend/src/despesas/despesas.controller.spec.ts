import { Test, TestingModule } from '@nestjs/testing';
import { DespesasController } from './despesas.controller';
import { DespesasService } from './despesas.service';
import { Despesa } from './despesa.entity';
import { CategoriaDespesa } from './categoria-despesa.enum';
import { Usuario } from '../usuarios/usuario.entity';

const mockUser: Usuario = {
  id: 'user-uuid-1234',
  nome: 'Usuário Teste',
  email: 'teste@fincontrol.app',
  telefoneWhatsapp: '+244923000000',
  googleId: 'google-sub-123',
  avatarUrl: '',
  moedaReferencia: null as any,
  modeloOrcamento: null as any,
  codigoVinculacaoWhatsapp: null as any,
  codigoVinculacaoExpiraEm: null as any,
  criadoEm: new Date(),
  atualizadoEm: new Date(),
};

const despesaMock: Despesa = {
  id: '1e7b1c1a-0000-4000-8000-000000000001',
  usuarioId: mockUser.id,
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

  it('delegates create to the service with current user id', async () => {
    despesasServiceMock.create.mockResolvedValue(despesaMock);
    const dto = {
      descricao: despesaMock.descricao,
      valor: despesaMock.valor,
      data: despesaMock.data,
      categoria: despesaMock.categoria,
    };

    const result = await controller.create(dto, mockUser);

    expect(despesasServiceMock.create).toHaveBeenCalledWith(dto, mockUser.id);
    expect(result).toEqual(despesaMock);
  });

  it('delegates findAll to the service with current user id', async () => {
    despesasServiceMock.findAll.mockResolvedValue([despesaMock]);

    const result = await controller.findAll(mockUser);

    expect(despesasServiceMock.findAll).toHaveBeenCalledWith(mockUser.id);
    expect(result).toEqual([despesaMock]);
  });

  it('delegates findOne to the service with current user id', async () => {
    despesasServiceMock.findOne.mockResolvedValue(despesaMock);

    const result = await controller.findOne(despesaMock.id, mockUser);

    expect(despesasServiceMock.findOne).toHaveBeenCalledWith(despesaMock.id, mockUser.id);
    expect(result).toEqual(despesaMock);
  });

  it('delegates update to the service with current user id', async () => {
    despesasServiceMock.update.mockResolvedValue({
      ...despesaMock,
      valor: 50,
    });

    const result = await controller.update(despesaMock.id, { valor: 50 }, mockUser);

    expect(despesasServiceMock.update).toHaveBeenCalledWith(despesaMock.id, {
      valor: 50,
    }, mockUser.id);
    expect(result.valor).toBe(50);
  });

  it('delegates remove to the service with current user id', async () => {
    await controller.remove(despesaMock.id, mockUser);

    expect(despesasServiceMock.remove).toHaveBeenCalledWith(despesaMock.id, mockUser.id);
  });
});
