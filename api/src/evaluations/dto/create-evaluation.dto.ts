import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RealEstateFiltersDto {
  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  neighborhood?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  neighborhoods?: string[];

  @IsOptional()
  @IsString()
  propertyType?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  types?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  garage?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minArea?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxArea?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  bedrooms?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  bathrooms?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  suites?: number;

  @IsOptional()
  @IsString()
  q?: string;

  // características (booleanas)
  @IsOptional()
  @IsBoolean()
  highStandard?: boolean;

  @IsOptional()
  @IsBoolean()
  furnished?: boolean;

  @IsOptional()
  @IsBoolean()
  pool?: boolean;

  @IsOptional()
  @IsBoolean()
  balcony?: boolean;

  @IsOptional()
  @IsBoolean()
  elevator?: boolean;

  @IsOptional()
  @IsBoolean()
  leisureArea?: boolean;

  @IsOptional()
  @IsBoolean()
  barbecue?: boolean;

  @IsOptional()
  @IsBoolean()
  petFriendly?: boolean;
}

export class CreateEvaluationOptionsDto {
  @IsOptional()
  @IsBoolean()
  previewOnly?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  previewSampleLimit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  attachTopN?: number;
}

export class CreateEvaluationDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @ValidateNested()
  @Type(() => RealEstateFiltersDto)
  filters: RealEstateFiltersDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateEvaluationOptionsDto)
  options?: CreateEvaluationOptionsDto;
}
