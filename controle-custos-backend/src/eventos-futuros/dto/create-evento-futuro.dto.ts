import { IsArray, IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ItemDeCustoEvento, StatusEventoFuturo } from '../evento-futuro.entity';

export class CreateEventoFuturoDto {
  @IsString()
  @IsNotEmpty()
  nome: string;

  @IsEnum(StatusEventoFuturo)
  @IsOptional()
  status?: StatusEventoFuturo;

  @IsDateString()
  @IsNotEmpty()
  dataInicio: string;

  @IsDateString()
  @IsOptional()
  dataFim?: string;

  @IsArray()
  @IsOptional()
  itens?: ItemDeCustoEvento[];
}
