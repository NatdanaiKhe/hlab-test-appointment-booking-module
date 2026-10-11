import { Injectable, NotFoundException } from '@nestjs/common';
import { AppointmentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { QueryBookingDto } from './dto/query-booking.dto';

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

  async update(id: number) {
    return `This action updates a #${id} booking`;
  }

  remove(id: number) {
    return `This action removes a #${id} booking`;
  }
}
