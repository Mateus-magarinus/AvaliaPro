import { IsEmail, IsOptional } from 'class-validator';

export class GetUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;
}
