/**
 * Strips all undefined properties recursively from objects and arrays
 * to prevent Firestore runtime write exceptions.
 */
export function stripUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return null as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => stripUndefined(item)) as unknown as T;
  }

  if (typeof obj === 'object') {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = stripUndefined(value);
      }
    }
    return cleaned as T;
  }

  return obj;
}

/**
 * Validates and trims raw text inputs to prevent memory abuse.
 */
export function sanitizeInputText(text: string, maxLength = 10000): string {
  if (!text || typeof text !== 'string') return '';
  return text.trim().slice(0, maxLength);
}
