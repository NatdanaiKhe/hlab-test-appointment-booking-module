import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppointmentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  APPOINTMENT_RELATIONS_INCLUDE,
  CLINIC_TIMEZONE,
} from './booking.constants';
import { CreateBookingDto } from './dto/create-booking.dto';
import { QueryBookingDto } from './dto/query-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import {
  formatMinutesToTime,
  getClinicDayOfWeek,
  getClinicMinutes,
  hasTimeOverlap,
  parseTimeToMinutes,
} from '../helper/format';

@Injectable()
export class BookingService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createBookingDto: CreateBookingDto) {
    const startAt = new Date(createBookingDto.startAt);
    if (isNaN(startAt.getTime())) {
      throw new BadRequestException('Invalid startAt datetime format');
    }

    const now = new Date();
    if (startAt <= now) {
      throw new BadRequestException('Cannot book an appointment in the past');
    }

    const [patient, doctor, appointmentType, staff] = await Promise.all([
      this.prisma.patient.findUnique({
        where: { id: createBookingDto.patientId },
      }),
      this.prisma.doctor.findUnique({
        where: { id: createBookingDto.doctorId },
      }),
      this.prisma.appointmentType.findUnique({
        where: { id: createBookingDto.appointmentTypeId },
      }),
      this.prisma.staff.findUnique({
        where: { id: createBookingDto.createdById },
      }),
    ]);

    if (!patient) {
      throw new NotFoundException(
        `Patient with ID ${createBookingDto.patientId} not found`,
      );
    }
    if (!doctor) {
      throw new NotFoundException(
        `Doctor with ID ${createBookingDto.doctorId} not found`,
      );
    }
    if (!appointmentType) {
      throw new NotFoundException(
        `AppointmentType with ID ${createBookingDto.appointmentTypeId} not found`,
      );
    }
    if (!staff) {
      throw new NotFoundException(
        `Staff with ID ${createBookingDto.createdById} not found`,
      );
    }

    let endAt: Date;
    if (createBookingDto.endAt) {
      endAt = new Date(createBookingDto.endAt);
      if (isNaN(endAt.getTime())) {
        throw new BadRequestException('Invalid endAt datetime format');
      }
      if (endAt <= startAt) {
        throw new BadRequestException(
          'Appointment end time must be after start time',
        );
      }
    } else {
      endAt = new Date(
        startAt.getTime() + appointmentType.durationMin * 60_000,
      );
    }

    const dayOfWeek = getClinicDayOfWeek(startAt, CLINIC_TIMEZONE);
    const endDayOfWeek = getClinicDayOfWeek(endAt, CLINIC_TIMEZONE);

    if (dayOfWeek !== endDayOfWeek) {
      throw new BadRequestException('Appointment must be within the same day');
    }

    const schedule = await this.prisma.doctorSchedule.findUnique({
      where: {
        doctorId_dayOfWeek: {
          doctorId: createBookingDto.doctorId,
          dayOfWeek,
        },
      },
    });

    if (!schedule) {
      throw new BadRequestException('Doctor is not available on this day');
    }

    const startMinutes = getClinicMinutes(startAt, CLINIC_TIMEZONE);
    const endMinutes = getClinicMinutes(endAt, CLINIC_TIMEZONE);
    const scheduleStartMinutes = parseTimeToMinutes(schedule.startTime);
    const scheduleEndMinutes = parseTimeToMinutes(schedule.endTime);

    if (
      startMinutes < scheduleStartMinutes ||
      endMinutes > scheduleEndMinutes
    ) {
      throw new BadRequestException(
        `Appointment time (${formatMinutesToTime(startMinutes)} - ${formatMinutesToTime(endMinutes)}) is outside doctor working hours (${schedule.startTime} - ${schedule.endTime})`,
      );
    }

    if (schedule.breakStart && schedule.breakEnd) {
      const breakStartMinutes = parseTimeToMinutes(schedule.breakStart);
      const breakEndMinutes = parseTimeToMinutes(schedule.breakEnd);

      if (
        hasTimeOverlap(
          startMinutes,
          endMinutes,
          breakStartMinutes,
          breakEndMinutes,
        )
      ) {
        throw new BadRequestException(
          `Appointment overlaps with doctor break time (${schedule.breakStart} - ${schedule.breakEnd})`,
        );
      }
    }

    const doctorConflict = await this.prisma.appointment.findFirst({
      where: {
        doctorId: createBookingDto.doctorId,
        status: { not: AppointmentStatus.CANCELLED },
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
    });

    if (doctorConflict) {
      throw new ConflictException(
        'Doctor already has an overlapping appointment at this time',
      );
    }

    const patientConflict = await this.prisma.appointment.findFirst({
      where: {
        patientId: createBookingDto.patientId,
        status: { not: AppointmentStatus.CANCELLED },
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
    });

    if (patientConflict) {
      throw new ConflictException(
        'Patient already has an overlapping appointment at this time',
      );
    }

    return this.prisma.appointment.create({
      data: {
        patientId: createBookingDto.patientId,
        doctorId: createBookingDto.doctorId,
        departmentId: createBookingDto.departmentId ?? doctor.departmentId,
        appointmentTypeId: createBookingDto.appointmentTypeId,
        status: AppointmentStatus.BOOKED,
        startAt,
        endAt,
        reason: createBookingDto.reason ?? null,
        createdById: createBookingDto.createdById,
      },
      include: APPOINTMENT_RELATIONS_INCLUDE,
    });
  }

  async findAll(query?: QueryBookingDto) {
    const where: Prisma.AppointmentWhereInput = {};

    if (query?.patientId !== undefined) {
      where.patientId = Number(query.patientId);
    }
    if (query?.doctorId !== undefined) {
      where.doctorId = Number(query.doctorId);
    }
    if (query?.departmentId !== undefined) {
      where.departmentId = Number(query.departmentId);
    }
    if (query?.status !== undefined) {
      where.status = query.status;
    }
    if (query?.startDate || query?.endDate) {
      where.startAt = {
        ...(query.startDate ? { gte: new Date(query.startDate) } : {}),
        ...(query.endDate ? { lte: new Date(query.endDate) } : {}),
      };
    }

    return this.prisma.appointment.findMany({
      where,
      include: APPOINTMENT_RELATIONS_INCLUDE,
      orderBy: {
        startAt: 'asc',
      },
    });
  }

  async findOne(id: number) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: APPOINTMENT_RELATIONS_INCLUDE,
    });

    if (!appointment) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    return appointment;
  }

  async update(id: number, updateBookingDto: UpdateBookingDto) {
    const existing = await this.prisma.appointment.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    let status = updateBookingDto?.status;

    if (
      !status &&
      existing.status === AppointmentStatus.BOOKED &&
      existing.endAt <= new Date()
    ) {
      status = AppointmentStatus.COMPLETED;
    }

    if (status) {
      if (
        existing.status === AppointmentStatus.CANCELLED &&
        status !== AppointmentStatus.CANCELLED
      ) {
        throw new BadRequestException(
          'Cannot change status of an already cancelled appointment',
        );
      }
      if (
        existing.status === AppointmentStatus.COMPLETED &&
        status !== AppointmentStatus.COMPLETED
      ) {
        throw new BadRequestException(
          'Cannot change status of an already completed appointment',
        );
      }
    }

    if (
      status === AppointmentStatus.CANCELLED &&
      updateBookingDto?.cancelledById
    ) {
      const staff = await this.prisma.staff.findUnique({
        where: { id: Number(updateBookingDto.cancelledById) },
      });
      if (!staff) {
        throw new BadRequestException(
          `Staff with ID ${updateBookingDto.cancelledById} not found`,
        );
      }
    }

    return this.prisma.appointment.update({
      where: { id },
      data: {
        ...(status !== undefined && { status }),
        ...(status === AppointmentStatus.CANCELLED && {
          cancelReason: updateBookingDto?.cancelReason ?? existing.cancelReason,
          cancelledById: updateBookingDto?.cancelledById
            ? Number(updateBookingDto.cancelledById)
            : existing.cancelledById,
          cancelledAt: new Date(),
        }),
      },
      include: APPOINTMENT_RELATIONS_INCLUDE,
    });
  }

  remove(id: number) {
    return `This action removes a #${id} booking`;
  }
}
