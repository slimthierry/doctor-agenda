export const colors = {
  primary: '#179F4E',
  primaryDark: '#0F7A3A',
  primarySoft: '#E6F5EC',
  accent: '#0E7490',
  accentSoft: '#E0F2F7',
  bg: '#F5F6F8',
  card: '#FFFFFF',
  text: '#111827',
  textMuted: '#6B7280',
  textFaint: '#9CA3AF',
  border: '#E5E7EB',
  danger: '#DC2626',
  dangerSoft: '#FEE2E2',
  warning: '#D97706',
  warningSoft: '#FEF3C7',
  success: '#179F4E',
  successSoft: '#E6F5EC',
  info: '#2563EB',
  infoSoft: '#DBEAFE',
  gray: '#9CA3AF',
  graySoft: '#F3F4F6',
  white: '#FFFFFF',
  black: '#000000',
} as const;

export const palette = [
  '#179F4E',
  '#2563EB',
  '#D97706',
  '#DC2626',
  '#7C3AED',
  '#0E7490',
  '#DB2777',
  '#4B5563',
] as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  fab: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 5,
  },
} as const;
