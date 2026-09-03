import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, IsUUID } from 'class-validator';

export class CreateMetaPoupancaDto {
  @IsString()
  @IsNotEmpty()
  nome: string;

  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  valorObjetivo: number;

  @IsDateString()
  @IsOptional()
  dataAlvo?: string;

  @IsUUID()
  @IsOptional()
  contaPoupancaId?: string;
}
