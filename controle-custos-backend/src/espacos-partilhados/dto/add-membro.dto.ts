import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { PapelEspaco } from '../entities/membro-espaco.entity';

export class AddMembroDto {
  @IsString()
  emailOuId: string;

  @IsEnum(PapelEspaco)
  @IsOptional()
  papel?: PapelEspaco;

  @IsNumber()
  @IsOptional()
  percentualDivisaoPadrao?: number;
}
