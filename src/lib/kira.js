// All business formulas. Pure functions, no database access.
// Money is integer sen. Dates are "YYYY-MM-DD".
import { mulaMinggu, akhirMinggu, dalamJulat } from './tarikh.js';

/** % tidak terjual at or above this is highlighted in Laporan. */
export const AMBANG_TINGGI = 20;

const jumlahkan = (arr, f) => arr.reduce((s, x) => s + f(x), 0);

/** Evening count entered? (tidakTerjual is null until she enters it) */
export function selesai(h) {
  return h.tidakTerjual != null;
}

export function terjual(h) {
  return selesai(h) ? h.dihantar - h.tidakTerjual : 0;
}

export function jualan(h) {
  return terjual(h) * h.harga;
}

/** Σ jualan − Σ bayaran for one kedai, optionally only up to and including `sehingga`. */
export function belumDibayar(kedaiId, hantaran, bayaran, sehingga = null) {
  const ok = (r) => r.kedaiId === kedaiId && (sehingga == null || r.tarikh <= sehingga);
  return jumlahkan(hantaran.filter(ok), jualan) - jumlahkan(bayaran.filter(ok), (b) => b.jumlah);
}

export function belumDibayarSemua(hantaran, bayaran, sehingga = null) {
  const ok = (r) => sehingga == null || r.tarikh <= sehingga;
  return jumlahkan(hantaran.filter(ok), jualan) - jumlahkan(bayaran.filter(ok), (b) => b.jumlah);
}

function dalamMinggu(rows, hari) {
  const mula = mulaMinggu(hari);
  const akhir = akhirMinggu(hari);
  return rows.filter((r) => dalamJulat(r.tarikh, mula, akhir));
}

export function wangMasuk(bayaran, hari) {
  return jumlahkan(dalamMinggu(bayaran, hari), (b) => b.jumlah);
}

export function wangKeluar(belanja, hari) {
  return jumlahkan(dalamMinggu(belanja, hari), (b) => b.jumlah);
}

export function untungRugi(masuk, keluar) {
  return masuk - keluar;
}

/**
 * Salary for the week.
 * tetapan.gajiTempoh: 'harian' | 'mingguan'
 * tetapan.gajiKiraHari (harian only): '7' = every day, 'hantar' = only days with deliveries
 */
export function gajiMinggu(tetapan, hantaran, hari) {
  const gaji = tetapan?.gaji || 0;
  if (tetapan?.gajiTempoh !== 'harian') return gaji;
  if (tetapan.gajiKiraHari === 'hantar') {
    const hariKerja = new Set(dalamMinggu(hantaran, hari).filter((h) => h.dihantar > 0).map((h) => h.tarikh));
    return gaji * hariKerja.size;
  }
  return gaji * 7;
}

export function untungSelepasGaji(untung, gaji) {
  return untung - gaji;
}

/** Spending per pack sent (sen, may be fractional). 0 if nothing sent. */
export function kosSebungkus(keluar, dihantar) {
  return dihantar > 0 ? keluar / dihantar : 0;
}

export function kosPembaziran(tidakTerjual, kos) {
  return Math.round(tidakTerjual * kos);
}

export function peratusTidakTerjual(tidakTerjual, dihantar) {
  return dihantar > 0 ? (tidakTerjual / dihantar) * 100 : 0;
}

/** Everything the Laporan screen needs for the Isnin–Ahad week containing `hariDalamMinggu`. */
export function laporanMinggu({ hariDalamMinggu, kedai, hantaran, bayaran, belanja, tetapan }) {
  const mula = mulaMinggu(hariDalamMinggu);
  const akhir = akhirMinggu(hariDalamMinggu);
  const hMinggu = dalamMinggu(hantaran, mula);

  const masuk = wangMasuk(bayaran, mula);
  const keluar = wangKeluar(belanja, mula);
  const untung = untungRugi(masuk, keluar);
  const gaji = gajiMinggu(tetapan, hantaran, mula);
  const dihantar = jumlahkan(hMinggu, (h) => h.dihantar);
  const tidakTerjual = jumlahkan(hMinggu, (h) => (selesai(h) ? h.tidakTerjual : 0));
  const kos = kosSebungkus(keluar, dihantar);

  const perKedai = kedai
    .map((k) => {
      const hk = hMinggu.filter((h) => h.kedaiId === k.id);
      const d = jumlahkan(hk, (h) => h.dihantar);
      const t = jumlahkan(hk, (h) => (selesai(h) ? h.tidakTerjual : 0));
      const peratus = peratusTidakTerjual(t, d);
      return {
        kedai: k,
        dihantar: d,
        tidakTerjual: t,
        peratus,
        tinggi: d > 0 && peratus >= AMBANG_TINGGI,
        jualan: jumlahkan(hk, jualan),
        belumDibayar: belumDibayar(k.id, hantaran, bayaran, akhir),
      };
    })
    .filter((r) => r.kedai.aktif || r.dihantar > 0 || r.belumDibayar !== 0)
    .sort((a, b) => b.peratus - a.peratus || b.dihantar - a.dihantar);

  return {
    mula,
    akhir,
    wangMasuk: masuk,
    wangKeluar: keluar,
    untungRugi: untung,
    gaji,
    untungSelepasGaji: untungSelepasGaji(untung, gaji),
    belumDibayar: belumDibayarSemua(hantaran, bayaran, akhir),
    dihantar,
    tidakTerjual,
    kosSebungkus: kos,
    kosPembaziran: kosPembaziran(tidakTerjual, kos),
    jualan: jumlahkan(hMinggu, jualan),
    perKedai,
  };
}
