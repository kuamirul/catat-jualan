// DEV ONLY: sample data (3 kedai, 2 weeks). Imported dynamically behind import.meta.env.DEV,
// so it is not included in the production build. Also usable via /?seed=1 in `npm run dev`.
import { db, SCHEMA_VERSION } from '../db.js';
import { hariIni, tambahHari, mulaMinggu } from '../lib/tarikh.js';

export function janaDataContoh(hari = hariIni()) {
  // Start on the Monday of last week, run up to yesterday (today is left empty to try the flow).
  const mula = tambahHari(mulaMinggu(hari), -7);
  const kedai = [
    { id: 1, nama: 'Kedai Pak Ali', harga: 300, bungkusDefault: 20, aktif: true },
    { id: 2, nama: 'Warung Kak Siti', harga: 300, bungkusDefault: 15, aktif: true },
    { id: 3, nama: 'Kantin Sekolah', harga: 250, bungkusDefault: 30, aktif: true },
  ];
  const hantaran = [];
  const bayaran = [];
  const belanja = [];
  let hid = 1;
  let bid = 1;
  let eid = 1;
  let rawak = 7;
  const r = (n) => { rawak = (rawak * 9301 + 49297) % 233280; return Math.floor((rawak / 233280) * n); };

  for (let t = mula; t < hari; t = tambahHari(t, 1)) {
    const dow = new Date(t + 'T00:00:00Z').getUTCDay();
    if (dow === 0) continue; // rest on Ahad
    for (const k of kedai) {
      if (k.id === 3 && dow === 6) continue; // school closed Sabtu
      // Price change mid-way: Pak Ali goes to RM3.50 from day 9
      const harga = k.id === 1 && t >= tambahHari(mula, 9) ? 350 : k.harga;
      const dihantar = k.bungkusDefault;
      const tidakTerjual = k.id === 3 ? 6 + r(6) : r(4);
      hantaran.push({ id: hid++, tarikh: t, kedaiId: k.id, dihantar, tidakTerjual, harga });
      const penuh = (dihantar - tidakTerjual) * harga;
      // Warung Kak Siti sometimes pays short
      const dibayar = k.id === 2 && r(3) === 0 ? penuh - 1000 : penuh;
      bayaran.push({ id: bid++, tarikh: t, kedaiId: k.id, jumlah: dibayar, jenis: 'harian' });
    }
    belanja.push({ id: eid++, tarikh: t, barang: 'santan', jumlah: 800 + r(400) });
    belanja.push({ id: eid++, tarikh: t, barang: 'telur', jumlah: 1200 });
    if (dow === 1) {
      belanja.push({ id: eid++, tarikh: t, barang: 'beras', jumlah: 6500 });
      belanja.push({ id: eid++, tarikh: t, barang: 'ikan bilis', jumlah: 3500 });
      belanja.push({ id: eid++, tarikh: t, barang: 'gas', jumlah: 2600 });
      belanja.push({ id: eid++, tarikh: t, barang: 'bungkusan', jumlah: 1800 });
    }
    if (dow === 3) belanja.push({ id: eid++, tarikh: t, barang: 'petrol', jumlah: 3000 });
  }
  // A late payment from Kak Siti
  bayaran.push({ id: bid++, tarikh: tambahHari(mula, 7), kedaiId: 2, jumlah: 1000, jenis: 'hutang' });

  const tetapan = [
    { key: 'gaji', value: 3000 },
    { key: 'gajiTempoh', value: 'harian' },
    { key: 'gajiKiraHari', value: 'hantar' },
    { key: 'schemaVersion', value: SCHEMA_VERSION },
  ];
  return { kedai, hantaran, bayaran, belanja, tetapan };
}

export async function isiDataContoh() {
  const d = janaDataContoh();
  await db.transaction('rw', db.kedai, db.hantaran, db.bayaran, db.belanja, db.tetapan, async () => {
    await Promise.all([db.kedai.clear(), db.hantaran.clear(), db.bayaran.clear(), db.belanja.clear(), db.tetapan.clear()]);
    await db.kedai.bulkAdd(d.kedai);
    await db.hantaran.bulkAdd(d.hantaran);
    await db.bayaran.bulkAdd(d.bayaran);
    await db.belanja.bulkAdd(d.belanja);
    await db.tetapan.bulkPut(d.tetapan);
  });
}
