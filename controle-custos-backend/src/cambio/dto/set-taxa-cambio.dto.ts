import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, Length } from 'class-validator';

export class SetTaxaCambioDto {
  @IsString()
  @Length(3, 3)
  @IsNotEmpty()
  moedaOrigem: string;

  @IsString()
  @Length(3, 3)
  @IsNotEmpty()
  moedaDestino: string;

  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  taxa: number;

  @IsBoolean()
  @IsOptional()
  usarPersonalizada?: boolean;
}
