import { Prisma } from '@prisma/client';

export const CLINIC_TIMEZONE = 'Asia/Bangkok';

export const APPOINTMENT_RELATIONS_INCLUDE = {
  patient: true,
  doctor: {
    include: {
      department: true,
    },
  },
  department: true,
  appointmentType: true,
  createdBy: true,
  cancelledBy: true,
} as const satisfies Prisma.AppointmentInclude;
