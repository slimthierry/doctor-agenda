const MS_PER_DAY = 86_400_000;

export function todayISO(): string {
  return toISO(new Date());
}

export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: string, days: number): string {
  return toISO(new Date(fromISO(iso).getTime() + days * MS_PER_DAY));
}

/** Lundi → dimanche de la semaine contenant `iso` */
export function weekDays(iso: string): string[] {
  const d = fromISO(iso);
  const dow = (d.getDay() + 6) % 7; // lundi = 0
  const monday = new Date(d.getTime() - dow * MS_PER_DAY);
  return Array.from({ length: 7 }, (_, i) => toISO(new Date(monday.getTime() + i * MS_PER_DAY)));
}

const WD_SHORT = ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.'];
const WD_LONG = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const MONTHS = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];

export function weekdayShort(iso: string): string {
  return WD_SHORT[(fromISO(iso).getDay() + 6) % 7];
}

export function dayNumber(iso: string): string {
  return String(fromISO(iso).getDate());
}

export function formatLongDate(iso: string): string {
  const d = fromISO(iso);
  const wd = WD_LONG[(d.getDay() + 6) % 7];
  return `${wd} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatShortDate(iso: string): string {
  const d = fromISO(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function isToday(iso: string): boolean {
  return iso === todayISO();
}

export function minutesOf(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function timeSlots(startHour = 7, endHour = 18, stepMin = 30): string[] {
  const slots: string[] = [];
  for (let h = startHour; h <= endHour; h++) {
    for (let m = 0; m < 60; m += stepMin) {
      if (h === endHour && m > 0) break;
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return slots;
}

export function formatDuration(min: number): string {
  return `${min} min`;
}

/** Ajoute N mois à une date ISO avec clamp au dernier jour du mois cible. */
export function addMonths(iso: string, months: number): string {
  const d = fromISO(iso);
  const day = d.getDate();
  const target = new Date(d.getFullYear(), d.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, lastDay));
  return toISO(target);
}
