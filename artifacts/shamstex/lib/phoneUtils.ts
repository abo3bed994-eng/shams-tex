import { COUNTRIES, Country, DEFAULT_COUNTRY, findCountryByDial } from "./countries";

// Strip every non-digit character.
export function digitsOnly(s: string): string {
  return (s || "").replace(/\D/g, "");
}

// Remove a leading zero from local number portion.
export function stripLeadingZero(local: string): string {
  return local.replace(/^0+/, "");
}

// Convert (country, localNumber) → E.164 like "+20102...".
export function toE164(country: Country, localInput: string): string {
  const local = stripLeadingZero(digitsOnly(localInput));
  return `${country.dial}${local}`;
}

// Validate local number against the country rules.
export function isValidLocal(country: Country, localInput: string): boolean {
  const local = stripLeadingZero(digitsOnly(localInput));
  if (local.length < country.minLen || local.length > country.maxLen) return false;
  if (country.localPrefix && !country.localPrefix.test(local)) return false;
  return true;
}

// Try to parse an E.164 string back into (country, local). Returns null if unknown.
export function parseE164(e164: string): { country: Country; local: string } | null {
  if (!e164 || !e164.startsWith("+")) return null;
  // Try longest dial first
  const sorted = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);
  for (const c of sorted) {
    if (e164.startsWith(c.dial)) {
      return { country: c, local: e164.slice(c.dial.length) };
    }
  }
  return null;
}

// Best-effort: detect if a stored phone is in old local Egyptian format
// (e.g. "01221131138" or "0000000001") and convert to E.164 (+20...).
// Returns the original if it already looks E.164 or cannot be confidently mapped.
export function migrateLocalToE164(stored: string, defaultCountry: Country = DEFAULT_COUNTRY): string {
  if (!stored) return stored;
  const trimmed = stored.trim();
  if (trimmed.startsWith("+")) return trimmed; // already E.164
  const digits = digitsOnly(trimmed);
  if (!digits) return trimmed;
  // Demo/protected zero-prefixed accounts (e.g. 0000000001) are kept as-is — they
  // become admin bypass identifiers, not real phones.
  if (/^0{8,}\d{1,2}$/.test(digits)) return digits;
  // Egyptian mobile typically 11 digits starting "01"
  return toE164(defaultCountry, digits);
}

export { COUNTRIES, DEFAULT_COUNTRY, findCountryByDial };
