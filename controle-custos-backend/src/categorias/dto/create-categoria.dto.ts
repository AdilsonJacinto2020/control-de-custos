import { IsArray, IsHexColor, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateCategoriaDto {
  @IsString()
  @IsNotEmpty()
  nome: string;

  @IsUUID()
  @IsOptional()
  categoriaPaiId?: string;

  @IsString()
  @IsOptional()
  icone?: string;

  @IsString()
  @IsOptional()
  cor?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  regrasDeCategorizacao?: string[];
}
