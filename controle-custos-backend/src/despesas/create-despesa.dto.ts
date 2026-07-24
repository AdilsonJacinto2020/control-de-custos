import { IsDateString, IsEnum, IsNotEmpty, IsPositive } from 'class-validator';
import { CategoriaDespesa } from './categoria-despesa.enum';

export class CreateDespesaDto {
  @IsNotEmpty()
  descricao: string;

  @IsPositive()
  valor: number;

  @IsDateString()
  data: string;

  @IsEnum(CategoriaDespesa)
  categoria: CategoriaDespesa;
}
