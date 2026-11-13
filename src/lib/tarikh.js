// Date helpers. All dates are local Malaysia date strings "YYYY-MM-DD".
// Malaysia has no daylight saving, so plain UTC arithmetic on the date part is safe.

export const ZON = 'Asia/Kuala_Lumpur';

const HARI = ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'];
const BULAN = [
  'Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun',
  'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember',
];
const BULAN_PENDEK = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis'];

export const RE_TARIKH = /^\d{4}-\d{2}-\d{2}$/;

/** Today's date in Malaysia as YYYY-MM-DD. */
export function hariIni(sekarang = new Date()) {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ZON, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(sekarang);
}

function keUTC(t) {
  const [y, m, d] = t.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function dariUTC(dt) {
  return dt.toISOString().slice(0, 10);
}

export function tambahHari(t, n) {
  const dt = keUTC(t);
  dt.setUTCDate(dt.getUTCDate() + n);
  return dariUTC(dt);
}

/** 0 = Ahad ... 6 = Sabtu */
export function hariMinggu(t) {
  return keUTC(t).getUTCDay();
}

/** Monday (Isnin) of the week containing t. Weeks run Isnin–Ahad. */
export function mulaMinggu(t) {
  const h = hariMinggu(t);
  const undur = h === 0 ? 6 : h - 1;
  return tambahHari(t, -undur);
}

export function akhirMinggu(t) {
  return tambahHari(mulaMinggu(t), 6);
}

export function dalamJulat(t, mula, akhir) {
  return t >= mula && t <= akhir;
}

export function bezaHari(a, b) {
  return Math.round((keUTC(b) - keUTC(a)) / 86400000);
}

/** "Jumaat, 13 November 2026" */
export function tarikhPenuh(t) {
  const dt = keUTC(t);
  return `${HARI[dt.getUTCDay()]}, ${dt.getUTCDate()} ${BULAN[dt.getUTCMonth()]} ${dt.getUTCFullYear()}`;
}

/** "13 Nov" */
export function tarikhPendek(t) {
  const dt = keUTC(t);
  return `${dt.getUTCDate()} ${BULAN_PENDEK[dt.getUTCMonth()]}`;
}

export function namaHari(t) {
  return HARI[hariMinggu(t)];
}
