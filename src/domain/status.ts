import { colors } from '../theme';
import { AppointmentStatus } from '../types';

export interface StatusMeta {
  label: string;
  bg: string;
  fg: string;
}

const STATUS_META: Record<AppointmentStatus, StatusMeta> = {
  draft: { label: 'À confirmer', bg: colors.warningSoft, fg: colors.warning },
  confirmed: { label: 'Confirmé', bg: colors.successSoft, fg: colors.success },
  done: { label: 'Terminé', bg: colors.infoSoft, fg: colors.info },
  canceled: { label: 'Annulé', bg: colors.dangerSoft, fg: colors.danger },
};

export function statusMeta(status: AppointmentStatus): StatusMeta {
  return STATUS_META[status] ?? STATUS_META.draft;
}

const TRANSITIONS: Record<AppointmentStatus, readonly AppointmentStatus[]> = {
  draft: ['confirmed', 'done', 'canceled'],
  confirmed: ['done', 'canceled'],
  done: [],
  canceled: [],
};

export function canTransition(from: AppointmentStatus, to: AppointmentStatus): boolean {
  return from !== to && TRANSITIONS[from].includes(to);
}

export function allowedNext(from: AppointmentStatus): AppointmentStatus[] {
  return [...TRANSITIONS[from]];
}
