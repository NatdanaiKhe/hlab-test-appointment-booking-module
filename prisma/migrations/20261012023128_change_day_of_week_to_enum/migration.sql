-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- AlterTable
ALTER TABLE "DoctorSchedule" ALTER COLUMN "dayOfWeek" TYPE "DayOfWeek" USING (
  CASE "dayOfWeek"
    WHEN 0 THEN 'SUNDAY'::"DayOfWeek"
    WHEN 1 THEN 'MONDAY'::"DayOfWeek"
    WHEN 2 THEN 'TUESDAY'::"DayOfWeek"
    WHEN 3 THEN 'WEDNESDAY'::"DayOfWeek"
    WHEN 4 THEN 'THURSDAY'::"DayOfWeek"
    WHEN 5 THEN 'FRIDAY'::"DayOfWeek"
    WHEN 6 THEN 'SATURDAY'::"DayOfWeek"
  END
);
