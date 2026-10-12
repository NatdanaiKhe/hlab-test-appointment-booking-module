import { DayOfWeek } from '@prisma/client';
import {
  createClinicDateTime,
  formatMinutesToTime,
  getClinicDateString,
  getClinicDayOfWeek,
  getClinicMinutes,
  hasTimeOverlap,
  parseTimeToMinutes,
} from './format';

describe('format helpers', () => {
  describe('parseTimeToMinutes', () => {
    it('should correctly parse HH:mm strings to minutes', () => {
      expect(parseTimeToMinutes('00:00')).toBe(0);
      expect(parseTimeToMinutes('09:00')).toBe(540);
      expect(parseTimeToMinutes('09:30')).toBe(570);
      expect(parseTimeToMinutes('17:45')).toBe(1065);
      expect(parseTimeToMinutes('23:59')).toBe(1439);
    });
  });

  describe('formatMinutesToTime', () => {
    it('should correctly format minutes to HH:mm string', () => {
      expect(formatMinutesToTime(0)).toBe('00:00');
      expect(formatMinutesToTime(540)).toBe('09:00');
      expect(formatMinutesToTime(570)).toBe('09:30');
      expect(formatMinutesToTime(1065)).toBe('17:45');
      expect(formatMinutesToTime(1439)).toBe('23:59');
    });
  });

  describe('getClinicDayOfWeek', () => {
    it('should return correct DayOfWeek enum in clinic timezone (Asia/Bangkok)', () => {
      // 2026-10-15T02:00:00Z is 09:00 in Asia/Bangkok (+07:00), which is Thursday
      const dateThu = new Date('2026-10-15T02:00:00Z');
      expect(getClinicDayOfWeek(dateThu)).toBe(DayOfWeek.THURSDAY);

      // 2026-10-11T17:00:00Z is 00:00 on Monday Oct 12 in Asia/Bangkok
      const dateMon = new Date('2026-10-11T17:00:00Z');
      expect(getClinicDayOfWeek(dateMon)).toBe(DayOfWeek.MONDAY);

      // 2026-10-11T16:59:59Z is 23:59:59 on Sunday Oct 11 in Asia/Bangkok
      const dateSun = new Date('2026-10-11T16:59:59Z');
      expect(getClinicDayOfWeek(dateSun)).toBe(DayOfWeek.SUNDAY);
    });
  });

  describe('getClinicMinutes', () => {
    it('should return minute of day in Asia/Bangkok timezone', () => {
      // 2026-10-15T02:30:00Z is 09:30 in Asia/Bangkok -> 9 * 60 + 30 = 570
      const date = new Date('2026-10-15T02:30:00Z');
      expect(getClinicMinutes(date)).toBe(570);
    });
  });

  describe('hasTimeOverlap', () => {
    it('should detect overlaps', () => {
      expect(hasTimeOverlap(540, 600, 570, 630)).toBe(true); // partial overlap
      expect(hasTimeOverlap(540, 660, 570, 600)).toBe(true); // inner overlap
      expect(hasTimeOverlap(570, 600, 540, 660)).toBe(true); // outer overlap
    });

    it('should return false for adjacent or separated ranges', () => {
      expect(hasTimeOverlap(540, 600, 600, 660)).toBe(false); // touching boundaries
      expect(hasTimeOverlap(600, 660, 540, 600)).toBe(false); // touching boundaries
      expect(hasTimeOverlap(540, 570, 600, 630)).toBe(false); // separated
    });
  });

  describe('getClinicDateString', () => {
    it('should format date to YYYY-MM-DD in clinic timezone', () => {
      // 2026-10-18T18:00:00Z is 01:00 on 2026-10-19 in Asia/Bangkok
      const date = new Date('2026-10-18T18:00:00Z');
      expect(getClinicDateString(date)).toBe('2026-10-19');
    });
  });

  describe('createClinicDateTime', () => {
    it('should create Date object matching clinic wall-clock time', () => {
      const dt1 = createClinicDateTime('2026-10-19', '09:00');
      expect(dt1.toISOString()).toBe('2026-10-19T02:00:00.000Z');

      const dt2 = createClinicDateTime('2026-10-19', '16:30');
      expect(dt2.toISOString()).toBe('2026-10-19T09:30:00.000Z');

      const dt3 = createClinicDateTime('2026-10-19T00:00:00Z', '09:00');
      expect(dt3.toISOString()).toBe('2026-10-19T02:00:00.000Z');
    });
  });
});
