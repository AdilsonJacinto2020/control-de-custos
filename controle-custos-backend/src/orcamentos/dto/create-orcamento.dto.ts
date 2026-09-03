import { IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsUUID, Max, Min } from 'class-validator';
import { PeriodoOrcamento } from '../orcamento.entity';

export class CreateOrcamentoDto {
  @IsUUID()
  @IsNotEmpty()
  categoriaId: string;

  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  valorLimite: number;

  @IsEnum(PeriodoOrcamento)
  @IsOptional()
  periodo?: PeriodoOrcamento;

  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  percentualAlertaPrimario?: number;
}
