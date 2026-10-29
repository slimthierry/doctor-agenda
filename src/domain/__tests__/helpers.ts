import { Appointment } from '../../types';

export function makeAppointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: 'appt-1',
    patientName: 'Patient Test',
    patientPhone: '+22890000099',
    establishmentId: 'est-1',
    date: '2026-11-02',
    time: '09:00',
    durationMin: 30,
    reason: undefined,
    status: 'confirmed',
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-01T08:00:00.000Z',
    ...overrides,
  };
}
