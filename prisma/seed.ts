import 'dotenv/config';
import { PrismaClient, AppointmentStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });


// ---------- helpers ----------

/** Nth working day (Mon-Fri) from today; negative = in the past. Time is "HH:mm" local. */
function workday(n: number, time: string): Date {
  const d = new Date();
  const step = n < 0 ? -1 : 1;
  let left = Math.abs(n);
  while (left > 0) {
    d.setDate(d.getDate() + step);
    if (d.getDay() !== 0 && d.getDay() !== 6) left--;
  }
  const [h, m] = time.split(':').map(Number);
  d.setHours(h, m, 0, 0);
  return d;
}

function addMinutes(date: Date, min: number): Date {
  return new Date(date.getTime() + min * 60_000);
}

// ---------- seed ----------

async function main() {
  // Dev-only: wipe everything and reset ids so the seed is re-runnable.
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE "Appointment", "DoctorSchedule", "Doctor", "AppointmentType", "Patient", "Staff", "Department" RESTART IDENTITY CASCADE`,
  );

  // Departments
  const deptNames = [
    'General Medicine',
    'Pediatrics',
    'Cardiology',
    'Dermatology',
    'Orthopedics',
  ];
  const dept: Record<string, number> = {};
  for (const name of deptNames) {
    const d = await prisma.department.create({ data: { name } });
    dept[name] = d.id;
  }

  // Doctors
  const doctorSeed = [
    { name: 'Dr. Somchai Prasert', department: 'General Medicine' },
    { name: 'Dr. Naree Wongsakul', department: 'General Medicine' },
    { name: 'Dr. Pimchanok Rattana', department: 'Pediatrics' },
    { name: 'Dr. Anan Suwannarat', department: 'Pediatrics' },
    { name: 'Dr. Kittisak Boonmee', department: 'Cardiology' },
    { name: 'Dr. Supaporn Chaiyasit', department: 'Cardiology' },
    { name: 'Dr. Waraporn Limthong', department: 'Dermatology' },
    { name: 'Dr. Thanakorn Srisuk', department: 'Orthopedics' },
  ];
  const doctors: { id: number; name: string; departmentId: number }[] = [];
  for (const d of doctorSeed) {
    doctors.push(
      await prisma.doctor.create({
        data: { name: d.name, departmentId: dept[d.department] },
      }),
    );
  }

  // Doctor schedules (dayOfWeek: 0 = Sunday ... 6 = Saturday)
  const mondayToFriday = [1, 2, 3, 4, 5];
  const scheduleDays: number[][] = [
    mondayToFriday, // Somchai
    [1, 3, 5], // Naree
    mondayToFriday, // Pimchanok
    [2, 4, 6], // Anan (includes Saturday)
    [1, 2, 3, 4], // Kittisak
    [2, 4, 5], // Supaporn
    mondayToFriday, // Waraporn
    [1, 3, 4, 5], // Thanakorn
  ];
  for (let i = 0; i < doctors.length; i++) {
    for (const day of scheduleDays[i]) {
      const halfDay = day === 6; // Saturday: morning only, no break
      await prisma.doctorSchedule.create({
        data: {
          doctorId: doctors[i].id,
          dayOfWeek: day,
          startTime: '09:00',
          endTime: halfDay ? '12:00' : '17:00',
          breakStart: halfDay ? null : '12:00',
          breakEnd: halfDay ? null : '13:00',
        },
      });
    }
  }

  // Appointment types
  const typeSeed = [
    { code: 'CONSULT', name: 'General Consultation', durationMin: 30 },
    { code: 'FOLLOWUP', name: 'Follow-up Visit', durationMin: 15 },
    { code: 'CHECKUP', name: 'Health Check-up', durationMin: 45 },
    { code: 'PROCEDURE', name: 'Minor Procedure', durationMin: 60 },
  ];
  const types: Record<string, { id: number; durationMin: number }> = {};
  for (const t of typeSeed) {
    const created = await prisma.appointmentType.create({ data: t });
    types[t.code] = { id: created.id, durationMin: created.durationMin };
  }

  // Patients
  const patientNames = [
    'Araya Chantarasri',
    'Boonrat Kaewmanee',
    'Chatchai Phromsuwan',
    'Duangporn Intarasut',
    'Ekkachai Thongdee',
    'Fah Sangthong',
    'Gamon Vichai',
    'Hathai Pornpisut',
  ];
  const patients = [];
  for (const name of patientNames) {
    patients.push(await prisma.patient.create({ data: { name } }));
  }

  // Staff
  const staffNames = ['Front Desk - Mali', 'Front Desk - Nit', 'Admin - Pong'];
  const staff = [];
  for (const name of staffNames) {
    staff.push(await prisma.staff.create({ data: { name } }));
  }

  // Appointments
  type ApptInput = {
    patient: number; // index into patients
    doctor: number; // index into doctors
    type: keyof typeof types;
    dayOffset: number; // working days from today
    time: string;
    status: AppointmentStatus;
    reason?: string;
    createdBy: number; // index into staff
    cancelReason?: string;
    cancelledBy?: number;
  };

  const apptSeed: ApptInput[] = [
    // Upcoming (BOOKED)
    {
      patient: 0,
      doctor: 0,
      type: 'CONSULT',
      dayOffset: 1,
      time: '09:30',
      status: 'BOOKED',
      reason: 'Persistent cough for 2 weeks',
      createdBy: 0,
    },
    {
      patient: 1,
      doctor: 2,
      type: 'CHECKUP',
      dayOffset: 1,
      time: '10:00',
      status: 'BOOKED',
      reason: 'Annual child check-up',
      createdBy: 1,
    },
    {
      patient: 2,
      doctor: 4,
      type: 'CONSULT',
      dayOffset: 2,
      time: '14:00',
      status: 'BOOKED',
      reason: 'Chest tightness during exercise',
      createdBy: 0,
    },
    {
      patient: 3,
      doctor: 6,
      type: 'FOLLOWUP',
      dayOffset: 3,
      time: '11:15',
      status: 'BOOKED',
      reason: 'Rash follow-up',
      createdBy: 1,
    },
    {
      patient: 4,
      doctor: 7,
      type: 'PROCEDURE',
      dayOffset: 4,
      time: '13:30',
      status: 'BOOKED',
      reason: 'Knee injection',
      createdBy: 2,
    },
    {
      patient: 5,
      doctor: 0,
      type: 'FOLLOWUP',
      dayOffset: 5,
      time: '15:00',
      status: 'BOOKED',
      createdBy: 0,
    },

    // Past (COMPLETED)
    {
      patient: 0,
      doctor: 1,
      type: 'CONSULT',
      dayOffset: -3,
      time: '09:00',
      status: 'COMPLETED',
      reason: 'Fever and sore throat',
      createdBy: 0,
    },
    {
      patient: 6,
      doctor: 4,
      type: 'CHECKUP',
      dayOffset: -5,
      time: '10:00',
      status: 'COMPLETED',
      reason: 'Cardiac screening',
      createdBy: 1,
    },
    {
      patient: 7,
      doctor: 2,
      type: 'FOLLOWUP',
      dayOffset: -2,
      time: '14:30',
      status: 'COMPLETED',
      createdBy: 2,
    },

    // CANCELLED
    {
      patient: 3,
      doctor: 0,
      type: 'CONSULT',
      dayOffset: 2,
      time: '16:00',
      status: 'CANCELLED',
      reason: 'Back pain',
      createdBy: 0,
      cancelReason: 'Patient requested reschedule',
      cancelledBy: 1,
    },
    {
      patient: 5,
      doctor: 7,
      type: 'CONSULT',
      dayOffset: -1,
      time: '10:30',
      status: 'CANCELLED',
      reason: 'Shoulder pain',
      createdBy: 1,
      cancelReason: 'Doctor unavailable',
      cancelledBy: 2,
    },
  ];

  for (const a of apptSeed) {
    const doctor = doctors[a.doctor];
    const type = types[a.type];
    const startAt = workday(a.dayOffset, a.time);
    const cancelled = a.status === 'CANCELLED';

    await prisma.appointment.create({
      data: {
        patientId: patients[a.patient].id,
        doctorId: doctor.id,
        departmentId: doctor.departmentId,
        appointmentTypeId: type.id,
        status: a.status,
        startAt,
        endAt: addMinutes(startAt, type.durationMin),
        reason: a.reason ?? null,
        createdById: staff[a.createdBy].id,
        cancelReason: cancelled ? (a.cancelReason ?? null) : null,
        cancelledById:
          cancelled && a.cancelledBy !== undefined
            ? staff[a.cancelledBy].id
            : null,
        cancelledAt: cancelled ? new Date() : null,
      },
    });
  }

  console.log('Seed complete');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
