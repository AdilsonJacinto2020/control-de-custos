import { IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, IsUUID, Max, Min } from 'class-validator';
import { TipoFonteRendimento } from '../fonte-rendimento.entity';

export class CreateFonteRendimentoDto {
  @IsString()
  @IsNotEmpty()
  nome: string;

  @IsEnum(TipoFonteRendimento)
  @IsOptional()
  tipo?: TipoFonteRendimento;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  valorFixo?: number;

  @IsInt()
  @Min(1)
  @Max(31)
  @IsOptional()
  diaRecebimentoEstimado?: number;

  @IsUUID()
  @IsOptional()
  contaDestinoPadraoId?: string;
}
