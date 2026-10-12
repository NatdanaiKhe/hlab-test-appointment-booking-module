import { DayOfWeek } from '@prisma/client';
import { CLINIC_TIMEZONE } from '../booking/booking.constants';

const DAY_MAP: Record<string, DayOfWeek> = {
  Sun: DayOfWeek.SUNDAY,
  Mon: DayOfWeek.MONDAY,
  Tue: DayOfWeek.TUESDAY,
  Wed: DayOfWeek.WEDNESDAY,
  Thu: DayOfWeek.THURSDAY,
  Fri: DayOfWeek.FRIDAY,
  Sat: DayOfWeek.SATURDAY,
};

export function parseTimeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

export function formatMinutesToTime(minutes: number): string {
  const h = String(Math.floor(minutes / 60)).padStart(2, '0');
  const m = String(minutes % 60).padStart(2, '0');
  return `${h}:${m}`;
}

export function getClinicDayOfWeek(
  date: Date,
  timezone: string = CLINIC_TIMEZONE,
): DayOfWeek {
  const weekdayStr = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
  }).format(date);

  return DAY_MAP[weekdayStr];
}

export function getClinicMinutes(
  date: Date,
  timezone: string = CLINIC_TIMEZONE,
): number {
  const timeStr = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);

  return parseTimeToMinutes(timeStr);
}

export function hasTimeOverlap(
  startA: number,
  endA: number,
  startB: number,
  endB: number,
): boolean {
  return startA < endB && endA > startB;
}

export function getClinicDateString(
  date: Date,
  timezone: string = CLINIC_TIMEZONE,
): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function createClinicDateTime(
  dateStr: string,
  timeStr: string,
  timezone: string = CLINIC_TIMEZONE,
): Date {
  let ymd = dateStr;
  if (dateStr.includes('T')) {
    ymd = getClinicDateString(new Date(dateStr), timezone);
  }

  const tentative = new Date(`${ymd}T${timeStr}:00Z`);
  const offsetPart = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'longOffset',
  })
    .formatToParts(tentative)
    .find((p) => p.type === 'timeZoneName')?.value;

  const offset = offsetPart ? offsetPart.replace('GMT', '') : '+07:00';
  return new Date(`${ymd}T${timeStr}:00${offset}`);
}
