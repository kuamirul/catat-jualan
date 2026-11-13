// Money is stored as integer sen. These helpers convert to and from what the user types/sees.

/** 550 -> "RM 5.50" ; -550 -> "-RM 5.50" */
export function rm(sen) {
  const n = Math.round(sen || 0);
  const neg = n < 0;
  const abs = Math.abs(n);
  const ringgit = Math.floor(abs / 100).toLocaleString('en-MY');
  const s = String(abs % 100).padStart(2, '0');
  return `${neg ? '-' : ''}RM ${ringgit}.${s}`;
}

/** Number for an input box: 550 -> "5.50", 500 -> "5" */
export function senKeTeks(sen) {
  if (sen == null) return '';
  const n = Math.round(sen);
  return n % 100 === 0 ? String(n / 100) : (n / 100).toFixed(2);
}

/**
 * Parse what the user typed into sen. Accepts "5", "5.5", "5.50", "5,50", "RM 5".
 * Returns null for empty/invalid/negative input.
 */
export function teksKeSen(teks) {
  if (teks == null) return null;
  const t = String(teks).trim().replace(/^rm\s*/i, '').replace(',', '.');
  if (t === '') return null;
  if (!/^\d+(\.\d{0,2})?$/.test(t) && !/^\.\d{1,2}$/.test(t)) return null;
  const [r, s = ''] = t.split('.');
  return Number(r || 0) * 100 + Number((s + '00').slice(0, 2));
}
