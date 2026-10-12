import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBookingDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  patientId: number;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  doctorId: number;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  appointmentTypeId: number;

  @IsNotEmpty()
  @IsDateString()
  startAt: string;

  @IsOptional()
  @IsDateString()
  endAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  createdById: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  departmentId?: number;
}
