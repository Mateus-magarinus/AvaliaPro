import { PartialType } from '@nestjs/mapped-types';
import { CreatePropertyDto } from './create-property.dto';
import { IsOptional, IsString } from 'class-validator';

export class UpdatePropertyDto extends PartialType(CreatePropertyDto) {
  evaluationId?: never;

  @IsOptional()
  @IsString()
  address?: string;
}
