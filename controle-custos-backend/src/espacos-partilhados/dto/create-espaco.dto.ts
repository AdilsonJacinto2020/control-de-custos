import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateEspacoDto {
  @IsString()
  @IsNotEmpty()
  nome: string;

  @IsString()
  @IsOptional()
  descricao?: string;
}
