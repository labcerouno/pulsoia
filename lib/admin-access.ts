const ADMIN_EMAILS = [
  'eldersoares@gmail.com',
  'ia@oxy46.com',
  'martincabrera@gmail.com',
  'martin@oxy46.ia',
  'agustina@oxy46.com',
  'sabina@oxy46.com',
] as const

export const ALLOWED_ADMIN_EMAILS: readonly string[] = ADMIN_EMAILS

const GLOBAL_COMPANY_ACCESS_EMAILS = new Set<string>(ADMIN_EMAILS)

export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim()
}

export function isAllowedAdminEmail(email: string): boolean {
  return ALLOWED_ADMIN_EMAILS.includes(normalizeEmail(email))
}

export function hasGlobalCompanyAccess(email?: string | null): boolean {
  if (!email) return false
  return GLOBAL_COMPANY_ACCESS_EMAILS.has(normalizeEmail(email))
}