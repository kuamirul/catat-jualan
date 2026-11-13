// Database write operations used by the screens.
import { db, simpanTetapan, SCHEMA_VERSION, bacaTetapan } from '../db.js';
import { buatBackup } from './backup.js';
import { hariIni } from './tarikh.js';

/** Morning: create or update the delivery for one kedai on one date. */
export async function simpanHantar(kedai, tarikh, dihantar) {
  return db.transaction('rw', db.hantaran, async () => {
    const ada = await db.hantaran.where({ tarikh, kedaiId: kedai.id }).first();
    if (ada) {
      const tidakTerjual = ada.tidakTerjual == null ? null : Math.min(ada.tidakTerjual, dihantar);
      await db.hantaran.update(ada.id, { dihantar, tidakTerjual });
      return ada.id;
    }
    return db.hantaran.add({ tarikh, kedaiId: kedai.id, dihantar, tidakTerjual: null, harga: kedai.harga });
  });
}

/** Evening: unsold count + money received at day end. */
export async function simpanPetang(hantaran, tidakTerjual, wangDiterima) {
  return db.transaction('rw', db.hantaran, db.bayaran, async () => {
    await db.hantaran.update(hantaran.id, { tidakTerjual });
    const harian = await db.bayaran
      .where({ tarikh: hantaran.tarikh, kedaiId: hantaran.kedaiId })
      .filter((b) => b.jenis !== 'hutang')
      .toArray();
    const [pertama, ...lebih] = harian;
    for (const b of lebih) await db.bayaran.delete(b.id);
    if (pertama) await db.bayaran.update(pertama.id, { jumlah: wangDiterima, jenis: 'harian' });
    else await db.bayaran.add({ tarikh: hantaran.tarikh, kedaiId: hantaran.kedaiId, jumlah: wangDiterima, jenis: 'harian' });
  });
}

/** Undo a whole day for one kedai (delivery + that day's payment). Returns what was removed. */
export async function padamHari(hantaran) {
  return db.transaction('rw', db.hantaran, db.bayaran, async () => {
    const bayaran = await db.bayaran
      .where({ tarikh: hantaran.tarikh, kedaiId: hantaran.kedaiId })
      .filter((b) => b.jenis !== 'hutang')
      .toArray();
    await db.hantaran.delete(hantaran.id);
    await db.bayaran.bulkDelete(bayaran.map((b) => b.id));
    return { hantaran, bayaran };
  });
}

export async function pulihHari({ hantaran, bayaran }) {
  return db.transaction('rw', db.hantaran, db.bayaran, async () => {
    await db.hantaran.put(hantaran);
    await db.bayaran.bulkPut(bayaran);
  });
}

// ---- Backup ----

export async function eksportBackup() {
  const [kedai, hantaran, bayaran, belanja, tetapan] = await Promise.all([
    db.kedai.toArray(), db.hantaran.toArray(), db.bayaran.toArray(), db.belanja.toArray(), db.tetapan.toArray(),
  ]);
  return buatBackup({ kedai, hantaran, bayaran, belanja, tetapan }, SCHEMA_VERSION);
}

/**
 * Share the backup (WhatsApp etc.) using the Web Share API, or download it if sharing files is not supported.
 * Returns 'dikongsi' | 'dimuat turun' | 'batal'.
 */
export async function hantarBackup() {
  const data = await eksportBackup();
  const nama = `catat-jualan-backup-${hariIni()}.json`;
  const teks = JSON.stringify(data, null, 1);
  const fail = new File([teks], nama, { type: 'application/json' });

  if (navigator.canShare && navigator.canShare({ files: [fail] })) {
    try {
      await navigator.share({ files: [fail], title: 'Backup Catat Jualan', text: `Backup Catat Jualan ${hariIni()}` });
      await simpanTetapan('lastBackup', new Date().toISOString());
      return 'dikongsi';
    } catch (e) {
      if (e?.name === 'AbortError') return 'batal';
      // fall through to download
    }
  }
  const url = URL.createObjectURL(new Blob([teks], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nama;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  await simpanTetapan('lastBackup', new Date().toISOString());
  return 'dimuat turun';
}

/** Replace ALL data with a validated backup. Keeps this device's lastBackup. */
export async function pulihBackup(data) {
  const { lastBackup } = await bacaTetapan();
  await db.transaction('rw', db.kedai, db.hantaran, db.bayaran, db.belanja, db.tetapan, async () => {
    await Promise.all([db.kedai.clear(), db.hantaran.clear(), db.bayaran.clear(), db.belanja.clear(), db.tetapan.clear()]);
    await db.kedai.bulkAdd(data.kedai);
    await db.hantaran.bulkAdd(data.hantaran);
    await db.bayaran.bulkAdd(data.bayaran);
    await db.belanja.bulkAdd(data.belanja);
    await db.tetapan.bulkPut(data.tetapan.filter((t) => t.key !== 'lastBackup' && t.key !== 'schemaVersion'));
    await db.tetapan.put({ key: 'schemaVersion', value: SCHEMA_VERSION });
    if (lastBackup) await db.tetapan.put({ key: 'lastBackup', value: lastBackup });
  });
}
