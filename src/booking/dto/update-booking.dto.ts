import { AppointmentStatus } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsPositive,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateBookingDto {
  @IsOptional()
  @IsEnum(AppointmentStatus, {
    message: `Status must be ${Object.values(AppointmentStatus).join(', ')}`,
  })
  status?: AppointmentStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  cancelledById?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  cancelReason?: string;
}
