export const maskAccountNumber = (v: string): string =>
  v.length > 4 ? '*'.repeat(v.length - 4) + v.slice(-4) : '****';

export const maskPan = (v: string): string =>
  v.length >= 4 ? v.slice(0, 2) + '*'.repeat(v.length - 4) + v.slice(-2) : '****';

export const maskAadhaar = (v: string): string => {
  const digits = v.replace(/\D/g, '');
  return digits.length >= 4 ? 'XXXX-XXXX-' + digits.slice(-4) : 'XXXX-XXXX-XXXX';
};

export const maskEmail = (v: string): string => {
  const [local, domain] = v.split('@');
  if (!local || !domain) return '***@***';
  const masked = local.length > 1 ? local[0] + '*'.repeat(local.length - 1) : '*';
  return `${masked}@${domain}`;
};

export const maskPhone = (v: string): string => {
  const digits = v.replace(/\D/g, '');
  return digits.length >= 4 ? digits.slice(0, 2) + '*'.repeat(digits.length - 4) + digits.slice(-2) : '****';
};

export const maskIfSensitive = (value: string, isSensitive: boolean): string =>
  isSensitive ? maskAccountNumber(value) : value;
