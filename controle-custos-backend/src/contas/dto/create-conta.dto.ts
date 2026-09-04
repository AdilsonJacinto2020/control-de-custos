import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { MoedaConta, TipoConta } from '../conta.entity';

export class CreateContaDto {
  @IsString()
  @IsNotEmpty()
  nome: string;

  @IsEnum(TipoConta)
  @IsOptional()
  tipo?: TipoConta;

  @IsEnum(MoedaConta)
  @IsOptional()
  moeda?: MoedaConta;
}
