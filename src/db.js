import Dexie, { liveQuery } from 'dexie';
import { useEffect, useState } from 'preact/hooks';

export const SCHEMA_VERSION = 1;

export const db = new Dexie('catat-jualan');

// Note: booleans cannot be indexed in IndexedDB, so kedai.aktif is filtered in JS.
db.version(1).stores({
  kedai: '++id',
  hantaran: '++id, tarikh, kedaiId, &[tarikh+kedaiId]',
  // jenis: 'harian' (paid at day end, entered on Hari Ini) | 'hutang' (late payment, entered in Tetapan)
  bayaran: '++id, tarikh, kedaiId, [tarikh+kedaiId]',
  belanja: '++id, tarikh',
  tetapan: 'key',
});

export const TETAPAN_ASAL = {
  gaji: 0,
  gajiTempoh: 'harian',
  gajiKiraHari: 'hantar',
  lastBackup: null,
  schemaVersion: SCHEMA_VERSION,
};

export async function bacaTetapan() {
  const rows = await db.tetapan.toArray();
  const t = { ...TETAPAN_ASAL };
  for (const r of rows) t[r.key] = r.value;
  return t;
}

export function simpanTetapan(key, value) {
  return db.tetapan.put({ key, value });
}

/** Subscribe a Preact component to a Dexie query. Re-renders whenever the data changes. */
export function useLive(query, deps = [], awal = undefined) {
  const [nilai, setNilai] = useState(awal);
  useEffect(() => {
    const sub = liveQuery(query).subscribe({
      next: setNilai,
      error: (e) => console.error(e),
    });
    return () => sub.unsubscribe();
  }, deps);
  return nilai;
}

/** All data at once. The dataset is small (a few thousand rows per year), so this keeps the screens simple. */
export function useSemua() {
  return useLive(async () => {
    const [kedai, hantaran, bayaran, belanja, tetapan] = await Promise.all([
      db.kedai.toArray(),
      db.hantaran.toArray(),
      db.bayaran.toArray(),
      db.belanja.toArray(),
      bacaTetapan(),
    ]);
    return { kedai, hantaran, bayaran, belanja, tetapan };
  });
}

/** Ask the browser not to evict our data. Called once on first run. */
export async function mintaSimpananKekal() {
  try {
    if (!navigator.storage?.persist) return null;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return null;
  }
}

export async function statusSimpananKekal() {
  try {
    if (!navigator.storage?.persisted) return null;
    return await navigator.storage.persisted();
  } catch {
    return null;
  }
}
