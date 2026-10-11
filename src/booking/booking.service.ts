import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppointmentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { QueryBookingDto } from './dto/query-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';

@Injectable()
export class BookingService {
  constructor(private readonly prisma: PrismaService) {}

  create(_createBookingDto: CreateBookingDto) {
    return 'This action adds a new booking';
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
      include: {
        patient: true,
        doctor: {
          include: {
            department: true,
          },
        },
        department: true,
        appointmentType: true,
        createdBy: true,
      },
      orderBy: {
        startAt: 'asc',
      },
    });
  }

  async findOne(id: number) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: true,
        doctor: {
          include: {
            department: true,
          },
        },
        department: true,
        appointmentType: true,
        createdBy: true,
      },
    });

    if (!appointment) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    return appointment;
  }

  async update(id: number, updateDto: UpdateBookingDto) {
    const existing = await this.prisma.appointment.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    let status = updateDto.status;

    if (
      status === undefined &&
      existing.status === AppointmentStatus.BOOKED &&
      existing.endAt <= new Date()
    ) {
      status = AppointmentStatus.COMPLETED;
    }

    if (status !== undefined && status !== existing.status) {
      const isTerminalStatus =
        existing.status === AppointmentStatus.CANCELLED ||
        existing.status === AppointmentStatus.COMPLETED;

      if (isTerminalStatus) {
        throw new BadRequestException(
          `Cannot change status of an appointment that is already ${existing.status.toLowerCase()}`,
        );
      }
    }

    const data = {
      ...(status !== undefined && { status }),
      ...(status === AppointmentStatus.CANCELLED && {
        cancelReason: updateDto.cancelReason ?? existing.cancelReason,
        cancelledById:
          updateDto.cancelledById !== undefined
            ? updateDto.cancelledById
            : existing.cancelledById,
        cancelledAt: new Date(),
      }),
    };

    return this.prisma.appointment.update({
      where: { id },
      data,
      include: {
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
      },
    });
  }

  remove(id: number) {
    return `This action removes a #${id} booking`;
  }
}
