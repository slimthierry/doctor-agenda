export interface ValidationError {
  field: string;
  message: string;
}

export function validatePatientName(name: string): ValidationError | null {
  const trimmed = name.trim();
  if (!trimmed) {
    return { field: 'patientName', message: 'Le nom du patient est requis.' };
  }
  if (trimmed.length < 2) {
    return { field: 'patientName', message: 'Le nom doit contenir au moins 2 caractères.' };
  }
  return null;
}

export function validatePhone(phone: string): ValidationError | null {
  const trimmed = phone.trim();
  if (!trimmed) {
    return null; // Phone is optional
  }
  const phoneRegex = /^\+?[0-9\s\-]{8,}$/;
  if (!phoneRegex.test(trimmed)) {
    return { field: 'patientPhone', message: 'Numéro de téléphone invalide.' };
  }
  return null;
}

export function validateTime(time: string | null): ValidationError | null {
  if (!time) {
    return { field: 'time', message: 'Choisissez un créneau horaire.' };
  }
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(time)) {
    return { field: 'time', message: 'Format d\'heure invalide.' };
  }
  return null;
}

export function validateEstablishmentId(establishmentId: string): ValidationError | null {
  if (!establishmentId) {
    return { field: 'establishmentId', message: 'Choisissez un établissement.' };
  }
  return null;
}

export function validateDate(date: string): ValidationError | null {
  if (!date) {
    return { field: 'date', message: 'La date est requise.' };
  }
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) {
    return { field: 'date', message: 'Date invalide.' };
  }
  return null;
}

export function validateAppointmentForm(data: {
  patientName: string;
  patientPhone: string;
  date: string;
  time: string | null;
  establishmentId: string;
}): ValidationError | null {
  const errors: ValidationError[] = [];

  const nameError = validatePatientName(data.patientName);
  if (nameError) errors.push(nameError);

  const phoneError = validatePhone(data.patientPhone);
  if (phoneError) errors.push(phoneError);

  const dateError = validateDate(data.date);
  if (dateError) errors.push(dateError);

  const timeError = validateTime(data.time);
  if (timeError) errors.push(timeError);

  const estError = validateEstablishmentId(data.establishmentId);
  if (estError) errors.push(estError);

  return errors.length > 0 ? errors[0] : null;
}
