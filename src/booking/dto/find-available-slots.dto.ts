import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  Matches,
} from 'class-validator';

export class FindAvailableSlotsDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  doctorId: number;

  @IsNotEmpty()
  @IsDateString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'startDate must be in YYYY-MM-DD format',
  })
  date: string;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  appointmentTypeId: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  stepMin?: number;
}

export interface AvailableSlot {
  startAt: string;
  endAt: string;
  startTime: string;
  endTime: string;
}
