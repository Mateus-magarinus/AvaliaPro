import { AdType } from '@common';
import {
  IsString,
  IsOptional,
  IsInt,
  IsNumber,
  IsEnum,
  IsNotEmpty,
} from 'class-validator';

export class CreateEvaluationDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  propertyType?: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsOptional()
  state?: string = 'RS';

  @IsOptional()
  @IsString()
  neighborhood?: string;

  @IsOptional()
  @IsInt()
  bedrooms?: number;

  @IsOptional()
  @IsInt()
  garage?: number;

  @IsOptional()
  @IsInt()
  bathrooms?: number;

  @IsOptional()
  @IsNumber()
  priceMin?: number;

  @IsOptional()
  @IsNumber()
  priceMax?: number;

  @IsOptional()
  @IsNumber()
  areaMin?: number;

  @IsOptional()
  @IsNumber()
  areaMax?: number;

  @IsOptional()
  @IsEnum(AdType)
  adType?: AdType;
}
