import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaxaCambioPersonalizada } from './entities/taxa-cambio.entity';
import { SetTaxaCambioDto } from './dto/set-taxa-cambio.dto';

// Taxas Oficiais de Referência (Fallback de emergência)
const TAXAS_FALLBACK: Record<string, number> = {
  'USD_AOA': 925.5,
  'EUR_AOA': 1005.0,
  'AOA_USD': 0.00108,
  'AOA_EUR': 0.000995,
  'USD_EUR': 0.92,
  'EUR_USD': 1.087,
};

@Injectable()
export class CambioService {
  private readonly logger = new Logger(CambioService.name);
  private taxasEmCache: Record<string, number> = { ...TAXAS_FALLBACK };
  private ultimoFetchTimestamp = 0;
  private readonly CACHE_TTL_MS = 1000 * 60 * 60 * 4; // Atualiza a cada 4 horas automaticamente

  constructor(
    @InjectRepository(TaxaCambioPersonalizada)
    private readonly taxaRepo: Repository<TaxaCambioPersonalizada>,
  ) {
    // Busca inicial em background
    this.atualizarTaxasOnline().catch(() => {});
  }

  /**
   * Busca as taxas diárias de mercado via API online em tempo real
   */
  async atualizarTaxasOnline(): Promise<void> {
    const agora = Date.now();
    if (agora - this.ultimoFetchTimestamp < this.CACHE_TTL_MS && this.ultimoFetchTimestamp > 0) {
      return;
    }

    try {
      this.logger.log('Buscando cotações oficiais e de mercado online (open.er-api.com)...');
      const res = await fetch('https://open.er-api.com/v6/latest/USD');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      if (data && data.rates) {
        const usdAoa = Number(data.rates['AOA']) || 925.5;
        const usdEur = Number(data.rates['EUR']) || 0.92;
        const eurAoa = usdEur > 0 ? usdAoa / usdEur : 1005.0;

        this.taxasEmCache['USD_AOA'] = Number(usdAoa.toFixed(2));
        this.taxasEmCache['EUR_AOA'] = Number(eurAoa.toFixed(2));
        this.taxasEmCache['USD_EUR'] = Number(usdEur.toFixed(4));
        this.taxasEmCache['EUR_USD'] = usdEur > 0 ? Number((1 / usdEur).toFixed(4)) : 1.087;
        this.taxasEmCache['AOA_USD'] = usdAoa > 0 ? Number((1 / usdAoa).toFixed(6)) : 0.00108;
        this.taxasEmCache['AOA_EUR'] = eurAoa > 0 ? Number((1 / eurAoa).toFixed(6)) : 0.000995;

        this.ultimoFetchTimestamp = agora;
        this.logger.log(
          `Cotações atualizadas online com sucesso: USD/AOA = ${this.taxasEmCache['USD_AOA']}, EUR/AOA = ${this.taxasEmCache['EUR_AOA']}, USD/EUR = ${this.taxasEmCache['USD_EUR']}`,
        );
      }
    } catch (err: any) {
      this.logger.warn(`Falha ao buscar cotações online: ${err?.message}. Usando valores em cache/fallback.`);
    }
  }

  async getTaxas(usuarioId: string) {
    // Garante que busca online se o cache expirou
    await this.atualizarTaxasOnline();

    const personalizadas = await this.taxaRepo.find({ where: { usuarioId } });

    const taxasFormatadas = [
      {
        par: 'USD / AOA',
        origem: 'USD',
        destino: 'AOA',
        taxaOficial: this.taxasEmCache['USD_AOA'] || TAXAS_FALLBACK['USD_AOA'],
        taxaPersonalizada:
          personalizadas.find((p) => p.moedaOrigem === 'USD' && p.moedaDestino === 'AOA')?.taxa || null,
        usarPersonalizada:
          personalizadas.find((p) => p.moedaOrigem === 'USD' && p.moedaDestino === 'AOA')?.usarPersonalizada ?? false,
      },
      {
        par: 'EUR / AOA',
        origem: 'EUR',
        destino: 'AOA',
        taxaOficial: this.taxasEmCache['EUR_AOA'] || TAXAS_FALLBACK['EUR_AOA'],
        taxaPersonalizada:
          personalizadas.find((p) => p.moedaOrigem === 'EUR' && p.moedaDestino === 'AOA')?.taxa || null,
        usarPersonalizada:
          personalizadas.find((p) => p.moedaOrigem === 'EUR' && p.moedaDestino === 'AOA')?.usarPersonalizada ?? false,
      },
      {
        par: 'USD / EUR',
        origem: 'USD',
        destino: 'EUR',
        taxaOficial: this.taxasEmCache['USD_EUR'] || TAXAS_FALLBACK['USD_EUR'],
        taxaPersonalizada:
          personalizadas.find((p) => p.moedaOrigem === 'USD' && p.moedaDestino === 'EUR')?.taxa || null,
        usarPersonalizada:
          personalizadas.find((p) => p.moedaOrigem === 'USD' && p.moedaDestino === 'EUR')?.usarPersonalizada ?? false,
      },
    ];

    return taxasFormatadas;
  }

  async definirTaxaPersonalizada(dto: SetTaxaCambioDto, usuarioId: string) {
    let registro = await this.taxaRepo.findOne({
      where: {
        usuarioId,
        moedaOrigem: dto.moedaOrigem.toUpperCase(),
        moedaDestino: dto.moedaDestino.toUpperCase(),
      },
    });

    if (!registro) {
      registro = this.taxaRepo.create({
        usuarioId,
        moedaOrigem: dto.moedaOrigem.toUpperCase(),
        moedaDestino: dto.moedaDestino.toUpperCase(),
      });
    }

    registro.taxa = dto.taxa;
    if (dto.usarPersonalizada !== undefined) {
      registro.usarPersonalizada = dto.usarPersonalizada;
    }

    return this.taxaRepo.save(registro);
  }

  async converter(
    valor: number,
    moedaOrigem: string,
    moedaDestino: string,
    usuarioId?: string,
  ): Promise<{ valorConvertido: number; taxaUsada: number; tipoTaxa: 'oficial' | 'personalizada' }> {
    const de = moedaOrigem.toUpperCase();
    const para = moedaDestino.toUpperCase();

    if (de === para) {
      return { valorConvertido: valor, taxaUsada: 1, tipoTaxa: 'oficial' };
    }

    // Procura taxa personalizada do usuario se logado
    if (usuarioId) {
      const custom = await this.taxaRepo.findOne({
        where: { usuarioId, moedaOrigem: de, moedaDestino: para, usarPersonalizada: true },
      });

      if (custom && Number(custom.taxa) > 0) {
        return {
          valorConvertido: valor * Number(custom.taxa),
          taxaUsada: Number(custom.taxa),
          tipoTaxa: 'personalizada',
        };
      }
    }

    // Garante cotação atualizada online
    await this.atualizarTaxasOnline();

    // Usa taxa oficial online em cache
    const chavePar = `${de}_${para}`;
    const taxaOficial = this.taxasEmCache[chavePar] || TAXAS_FALLBACK[chavePar] || 1;

    return {
      valorConvertido: valor * taxaOficial,
      taxaUsada: taxaOficial,
      tipoTaxa: 'oficial',
    };
  }
}
