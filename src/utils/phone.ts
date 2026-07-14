// Lebanese numbers are written locally with a leading 0 ("03 123 456",
// "70 123 456") that E.164 drops: +961 3 123 456. A number sent as +96103...
// fails WhatsApp delivery silently, so the 0 must be stripped — but only from
// the national part after the country prefix is identified, so an 8-digit
// mobile like 70123456 is left intact.
//
// Non-Lebanese numbers (any other + prefix) pass through unchanged.
// Returns E.164 (+961XXXXXXX[X]) or null when the number can't be valid.
export function normalizeLebanesePhone(input: string): string | null {
  const cleaned = input.trim().replace(/[\s\-().]/g, '');
  if (!cleaned) return null;

  if (cleaned.startsWith('+') && !cleaned.startsWith('+961')) return cleaned;

  let national: string;
  if (cleaned.startsWith('+961')) national = cleaned.slice(4);
  else if (cleaned.startsWith('00961')) national = cleaned.slice(5);
  else national = cleaned;

  if (national.startsWith('0')) national = national.slice(1);

  if (!/^\d{7,8}$/.test(national)) return null;
  return `+961${national}`;
}
