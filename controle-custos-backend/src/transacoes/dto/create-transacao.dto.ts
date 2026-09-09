import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';
import { OrigemTransacao, TipoTransacao } from '../transacao.entity';

export class CreateTransacaoDto {
  @IsUUID()
  @IsNotEmpty()
  contaId: string;

  @IsEnum(TipoTransacao)
  @IsOptional()
  tipo?: TipoTransacao;

  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  valor: number;

  @IsString()
  @IsNotEmpty()
  descricao: string;

  @IsDateString()
  @IsNotEmpty()
  data: string;

  @IsUUID()
  @IsOptional()
  categoriaId?: string;

  @IsEnum(OrigemTransacao)
  @IsOptional()
  origem?: OrigemTransacao;

  @IsUUID()
  @IsOptional()
  contaDestinoId?: string;

  @IsNumber()
  @IsOptional()
  taxaCambioUsada?: number;

  @IsUUID()
  @IsOptional()
  fonteRendimentoId?: string;

  @IsUUID()
  @IsOptional()
  espacoPartilhadoId?: string;

  @IsBoolean()
  @IsOptional()
  divisaoConjunta?: boolean;
}
