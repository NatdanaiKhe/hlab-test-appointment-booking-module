import { AppointmentStatus } from '@prisma/client';

export class QueryBookingDto {
  patientId?: number | string;
  doctorId?: number | string;
  departmentId?: number | string;
  status?: AppointmentStatus;
  startDate?: string;
  endDate?: string;
}
