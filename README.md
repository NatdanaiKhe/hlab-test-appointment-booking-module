# Appointment Booking Module

**Name:** Natdanai Khemt  
**Email:** natdanai.khemt@gmail.com  
**Stack:** NestJS, TypeScript, PostgreSQL, Prisma ORM

---

## 1. Project Overview

The module manages patient appointments, doctor working schedules, and availability calculation:

- Preventing bookings outside doctor working hours
- Preventing bookings during doctor break times
- Preventing overlapping appointments
- Preventing bookings in the past
- Status transitions for appointments (`BOOKED`, `COMPLETED`, `CANCELLED`)

---

## 2. Setup Instructions

### Prerequisites

- **Node.js**
- **PostgreSQL**
- **Package Manager**: `npm`

### Step 1: Clone and Install Dependencies

```bash
git clone https://github.com/NatdanaiKhe/hlab-test-appointment-booking-module
cd hlab-test-appointment-booking-module
npm install
```

### Step 2: Configure Environment Variables

Copy `.env.example` to `.env` and configure your database connection string

```bash
cp .env.example .env
```

Default `.env` configuration

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/booking"
```

### Step 3: Run Database Migrations & Seed

Apply Prisma migrations to initialize the PostgreSQL schema and initial seed data

```bash
npm run prisma:migrate

npm run prisma:seed
```

### Step 4: Run the Application

```bash
npm run start:dev
```

The server will start at `http://localhost:3000`.

---

### API Testing with Bruno

A preconfigured Bruno API collection is located in the `bruno/Booking` folder:

- `Create Booking.yml`: Create an appointment with full schedule validation.
- `Find Available Slots.yml`: Discover free slots by doctor, date, and appointment type.
- `Get All Bookings.yml`: Fetch all appointments.
- `Get Bookings With Filters.yml`: Filter by doctor, status, patient, department, or date range.
- `Get Booking By ID.yml`: Fetch a specific appointment by ID.
- `Update Booking.yml`: Update appointment status (complete, cancel with reason and staff ID).

---

## 3. Assumptions

1. **Schedule and Break**:
   - Doctor schedules are defined weekly using enum (`MONDAY` through `SUNDAY`).
   - Work and break hours are stored in `"HH:mm"` string format (e.g. `"09:00"`, `"17:00"`).
   - If a doctor has no break on a specific day, `breakStart` and `breakEnd` are `null`.

2. **Interval Collision**:
   - Two appointments touch at boundary points (e.g., Appointment A ends at 09:30 and Appointment B starts at 09:30) without conflicting.
   - Appointments cannot be booked for another day it must be within the same day

3. **Duration Calculation**:
   - If `endAt` is not provide in `POST /booking`, it is calculate automatically from appointment type default duration
   - If `endAt` is provide, `endAt > startAt` is validated.

4. **Conflict Scope**:
   - Double-booking prevention applies to both the doctor and the patient.
   - Appointments with `status = CANCELLED` are treated as available slots and ignored during overlap checks

5. **Status Lifecycle**:
   - An appointment starts in `BOOKED` status.
   - When `endAt <= now()`, it can be change to `COMPLETED`.
   - When `CANCELLED`, an appointment cannot be changed.
   - Whem `COMPLETED`, an appointment cannot be reverted or cancelled.
   - Cancellations record `cancelledById`, `cancelReason`, and `cancelledAt`.

---

## 4. Known Limitations

1. **Stop Double Bookings (Race Conditions)**
   - If two staff hit "Book" at the exact same millisecond, both requests check the database, both see the slot is empty, and both create a booking. Now the doctor is double-booked.
2. **Doctor Time Off / Vacation**:
   - The system assumes a doctor is available every single week based on their recurring weekly schedule. If a doctor gets sick or goes on vacation, the system still shows them as available to book.

3. **Automatically Mark The Appointment as "Completed"**:
   - An appointment only turns to COMPLETED if someone manually edits it or sends a request after the appointment has ended.

4. **Same Doctor Follow up**:
   - When a patient books a follow-up, the system lets them pick any doctor in that department. The doctor who knows the patient's case history might not be the one seeing them next time.
