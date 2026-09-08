/**
 * المدققات والمنظفات
 * Input validators and sanitizers
 */

import { logger } from './logger';

export function isValidEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function sanitizeText(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function isValidFileSize(sizeInBytes: number, maxSizeMB: number = 50): boolean {
  const maxSizeInBytes = maxSizeMB * 1024 * 1024;
  return sizeInBytes <= maxSizeInBytes;
}

export function isAllowedFileType(
  filename: string,
  allowedExtensions: string[] = [
    'jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx', 'txt', 'csv', 'json', 'mp4', 'mp3',
  ]
): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return allowedExtensions.includes(ext);
}

export function isValidJSON(text: string): boolean {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}

export function truncateText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

export function hasArabicText(text: string): boolean {
  const arabicRegex = /[\u0600-\u06FF]/;
  return arabicRegex.test(text);
}

export function hasEnglishText(text: string): boolean {
  const englishRegex = /[a-zA-Z]/;
  return englishRegex.test(text);
}

export function isValidDate(dateStr: string): boolean {
  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date.getTime());
}

export function isValidNumber(value: any): boolean {
  return !isNaN(value) && value !== null && value !== '';
}

export function validateRequired(fields: Record<string, any>): string[] {
  const errors: string[] = [];

  for (const [key, value] of Object.entries(fields)) {
    if (value === null || value === undefined || value === '') {
      errors.push(`${key} is required`);
    }
  }

  return errors;
}

export function logSecurityThreat(type: string, details: Record<string, any>): void {
  logger.warn('Security threat detected', {
    type,
    ...details,
    timestamp: new Date().toISOString(),
  });
}
