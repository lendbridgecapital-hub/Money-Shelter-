import crypto from 'crypto';

/**
 * Generates a secure, URL-safe random token for loan applications.
 * Example: 'app_7f3b89a12c8e4d29'
 */
export function generateApplicationToken(): string {
  const bytes = crypto.randomBytes(12).toString('hex');
  return `app_${bytes}`;
}
