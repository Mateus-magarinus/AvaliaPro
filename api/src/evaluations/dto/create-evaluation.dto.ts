import { AdType } from '@common';
import {
  IsString,
  IsOptional,
  IsInt,
  IsNumber,
  IsEnum,
  IsNotEmpty,
  Min,
  Validate,
} from 'class-validator';
import { Type } from 'class-transformer';

class MinLteMaxConstraint {
  validate(_: any, args: any) {
    const obj = args.object as any;
    const [minKey, maxKey] = args.constraints as [string, string];
    const min = obj[minKey];
    const max = obj[maxKey];
    if (min === undefined || max === undefined) return true;
    return Number(min) <= Number(max);
  }
  defaultMessage(args: any) {
    const [minKey, maxKey] = args.constraints as [string, string];
    return `${minKey} must be less than or equal to ${maxKey}`;
  }
}

export class CreateEvaluationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  propertyType?: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  neighborhood?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  bedrooms?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  garage?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  bathrooms?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  priceMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  priceMax?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  areaMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  areaMax?: number;

  @IsOptional()
  @IsEnum(AdType)
  adType?: AdType;
}

Validate(MinLteMaxConstraint, ['priceMin', 'priceMax'])(
  CreateEvaluationDto.prototype,
  'priceMax',
);
Validate(MinLteMaxConstraint, ['areaMin', 'areaMax'])(
  CreateEvaluationDto.prototype,
  'areaMax',
);
