import { Injectable } from '@nestjs/common';
import { ContasService } from '../contas/contas.service';
import { FontesRendimentoService } from '../fontes-rendimento/fontes-rendimento.service';
import { TransacoesService } from '../transacoes/transacoes.service';
import { EventosFuturosService } from '../eventos-futuros/eventos-futuros.service';
import { StatusEventoFuturo, TipoItemCustoEvento } from '../eventos-futuros/evento-futuro.entity';
import { CambioService } from '../cambio/cambio.service';
import { UsuariosService } from '../usuarios/usuarios.service';

export interface ProjecaoMes {
  mesAno: string;
  saldoInicial: number;
  receitaMinima: number;
  receitaMaxima: number;
  despesaEstimada: number;
  custoEventosAtivos: number;
  saldoFinalMinimo: number;
  saldoFinalMaximo: number;
}

@Injectable()
export class ProjecaoFluxoCaixaService {
  constructor(
    private readonly contasService: ContasService,
    private readonly fontesService: FontesRendimentoService,
    private readonly transacoesService: TransacoesService,
    private readonly eventosService: EventosFuturosService,
    private readonly cambioService: CambioService,
    private readonly usuariosService: UsuariosService,
  ) {}

  async calcularProjecaoFluxoCaixa(usuarioId: string, mesesAFrente: number = 6): Promise<ProjecaoMes[]> {
    const hoje = new Date();
    const usuario = await this.usuariosService.findById(usuarioId);
    const moedaReferencia = usuario?.moedaReferencia || 'AOA';

    const contas = await this.contasService.findAll(usuarioId);

    // ANTES: somava o saldoAtual de todas as contas diretamente, mesmo
    // quando estavam em moedas diferentes (ex: uma conta em USD e outra
    // em AOA eram somadas como se fossem a mesma unidade). Agora cada
    // saldo é convertido para a moeda de referência do utilizador antes
    // de somar.
    let saldoAtualTotal = 0;
    for (const conta of contas) {
      if (conta.moeda === moedaReferencia) {
        saldoAtualTotal += Number(conta.saldoAtual);
      } else {
        const { valorConvertido } = await this.cambioService.converter(
          Number(conta.saldoAtual),
          conta.moeda,
          moedaReferencia,
          usuarioId,
        );
        saldoAtualTotal += valorConvertido;
      }
    }

    const projecaoFontes = await this.fontesService.calcularProjecaoRendimentos(usuarioId);

    const receitaMinTotal = projecaoFontes.reduce((sum, f) => sum + f.estimativaMin, 0);
    const receitaMaxTotal = projecaoFontes.reduce((sum, f) => sum + f.estimativaMax, 0);

    // Eventos futuros ativos
    const todosEventos = await this.eventosService.findAll(usuarioId);
    const eventosAtivos = todosEventos.filter((e) => e.status === StatusEventoFuturo.ATIVO);

    // ANTES: usava só o total de despesas do MÊS ATUAL como base fixa
    // para todos os meses futuros — se o mês estivesse a começar (ex:
    // dia 2), a base ficava artificialmente baixa e a projeção parecia
    // otimista demais. Agora usa a média móvel real dos últimos 3 meses
    // de despesas, e não inventa um valor arbitrário quando não há
    // histórico — nesse caso a base fica 0 e o dado deve ser lido com essa
    // ressalva (o frontend deve indicar "histórico insuficiente").
    const despesasRecentes = await this.transacoesService.findDespesasUltimosMeses(usuarioId, 3);
    const totalDespesasRecentes = despesasRecentes.reduce((sum, t) => sum + Number(t.valor), 0);
    const despesaBase = totalDespesasRecentes / 3;

    const projecoes: ProjecaoMes[] = [];
    let saldoAcumuladoMin = saldoAtualTotal;
    let saldoAcumuladoMax = saldoAtualTotal;

    for (let i = 1; i <= mesesAFrente; i++) {
      const dataMes = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
      const mesAno = `${dataMes.getFullYear()}-${(dataMes.getMonth() + 1).toString().padStart(2, '0')}`;

      // Calcular custo de eventos ativos incidentes neste mês
      let custoEventosNoMes = 0;
      for (const ev of eventosAtivos) {
        const dInicio = new Date(ev.dataInicio);
        const dFim = ev.dataFim ? new Date(ev.dataFim) : null;

        if (dataMes >= dInicio && (!dFim || dataMes <= dFim)) {
          for (const item of ev.itens || []) {
            if (item.tipo === TipoItemCustoEvento.RECORRENTE) {
              custoEventosNoMes += Number(item.valor || 0);
            } else if (item.tipo === TipoItemCustoEvento.UNICO && dataMes.getMonth() === dInicio.getMonth()) {
              custoEventosNoMes += Number(item.valor || 0);
            }
          }
        }
      }

      const saldoInicial = (saldoAcumuladoMin + saldoAcumuladoMax) / 2;
      const despesaTotalMes = despesaBase + custoEventosNoMes;

      saldoAcumuladoMin = saldoAcumuladoMin + receitaMinTotal - despesaTotalMes;
      saldoAcumuladoMax = saldoAcumuladoMax + receitaMaxTotal - despesaTotalMes;

      projecoes.push({
        mesAno,
        saldoInicial,
        receitaMinima: receitaMinTotal,
        receitaMaxima: receitaMaxTotal,
        despesaEstimada: despesaBase,
        custoEventosAtivos: custoEventosNoMes,
        saldoFinalMinimo: saldoAcumuladoMin,
        saldoFinalMaximo: saldoAcumuladoMax,
      });
    }

    return projecoes;
  }
}
