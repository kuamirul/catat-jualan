// Backup file format and validation. Pure (no DB) so it can be unit tested.
import { RE_TARIKH } from './tarikh.js';

export const APP_ID = 'catat-jualan';

export function buatBackup({ kedai, hantaran, bayaran, belanja, tetapan }, schemaVersion, dibuat = new Date()) {
  return {
    app: APP_ID,
    schemaVersion,
    dibuat: dibuat.toISOString(),
    kedai,
    hantaran,
    bayaran,
    belanja,
    // lastBackup is device-specific; do not carry it over
    tetapan: tetapan.filter((t) => t.key !== 'lastBackup'),
  };
}

const isId = (v) => Number.isInteger(v) && v > 0;
const isSen = (v) => Number.isInteger(v) && v >= 0;
const isTarikh = (v) => typeof v === 'string' && RE_TARIKH.test(v);

/**
 * Check a parsed backup object. Returns { ok: true, data } or { ok: false, ralat: "<Malay message>" }.
 */
export function semakBackup(obj, schemaVersionSemasa) {
  const salah = (ralat) => ({ ok: false, ralat });
  if (!obj || typeof obj !== 'object') return salah('Fail ini bukan fail backup.');
  if (obj.app !== APP_ID) return salah('Fail ini bukan backup Catat Jualan.');
  if (!Number.isInteger(obj.schemaVersion) || obj.schemaVersion > schemaVersionSemasa) {
    return salah('Fail backup ini dari versi app yang lebih baru. Kemas kini app dahulu.');
  }
  for (const k of ['kedai', 'hantaran', 'bayaran', 'belanja', 'tetapan']) {
    if (!Array.isArray(obj[k])) return salah('Fail backup tidak lengkap.');
  }

  const idKedai = new Set();
  for (const k of obj.kedai) {
    if (!isId(k.id) || typeof k.nama !== 'string' || !k.nama.trim() || !isSen(k.harga)
      || !Number.isInteger(k.bungkusDefault) || k.bungkusDefault < 0 || typeof k.aktif !== 'boolean') {
      return salah('Maklumat kedai dalam fail rosak.');
    }
    idKedai.add(k.id);
  }
  const pasangan = new Set();
  for (const h of obj.hantaran) {
    if (!isId(h.id) || !isTarikh(h.tarikh) || !idKedai.has(h.kedaiId)
      || !Number.isInteger(h.dihantar) || h.dihantar < 0 || !isSen(h.harga)
      || !(h.tidakTerjual == null || (Number.isInteger(h.tidakTerjual) && h.tidakTerjual >= 0 && h.tidakTerjual <= h.dihantar))) {
      return salah('Maklumat hantaran dalam fail rosak.');
    }
    const p = `${h.tarikh}|${h.kedaiId}`;
    if (pasangan.has(p)) return salah('Ada hantaran berganda dalam fail.');
    pasangan.add(p);
  }
  for (const b of obj.bayaran) {
    if (!isId(b.id) || !isTarikh(b.tarikh) || !idKedai.has(b.kedaiId) || !isSen(b.jumlah)
      || !['harian', 'hutang', undefined].includes(b.jenis)) {
      return salah('Maklumat bayaran dalam fail rosak.');
    }
  }
  for (const b of obj.belanja) {
    if (!isId(b.id) || !isTarikh(b.tarikh) || typeof b.barang !== 'string' || !isSen(b.jumlah)) {
      return salah('Maklumat belanja dalam fail rosak.');
    }
  }
  for (const t of obj.tetapan) {
    if (!t || typeof t.key !== 'string') return salah('Tetapan dalam fail rosak.');
  }
  return { ok: true, data: obj };
}

export function ringkasan(obj) {
  return {
    kedai: obj.kedai.length,
    hantaran: obj.hantaran.length,
    belanja: obj.belanja.length,
    bayaran: obj.bayaran.length,
  };
}
