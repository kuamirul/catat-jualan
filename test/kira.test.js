import { describe, it, expect } from 'vitest';
import {
  terjual, jualan, selesai, belumDibayar, belumDibayarSemua, wangMasuk, wangKeluar,
  untungRugi, gajiMinggu, untungSelepasGaji, kosSebungkus, kosPembaziran,
  peratusTidakTerjual, laporanMinggu, AMBANG_TINGGI,
} from '../src/lib/kira.js';

const h = (o) => ({ id: 1, tarikh: '2026-11-09', kedaiId: 1, dihantar: 20, tidakTerjual: 0, harga: 300, ...o });

describe('terjual / jualan', () => {
  it('terjual = dihantar - tidakTerjual', () => {
    expect(terjual(h({ dihantar: 20, tidakTerjual: 3 }))).toBe(17);
  });
  it('jualan = terjual * harga (sen)', () => {
    expect(jualan(h({ dihantar: 20, tidakTerjual: 3, harga: 350 }))).toBe(5950);
  });
  it('zero packs gives zero', () => {
    expect(terjual(h({ dihantar: 0, tidakTerjual: 0 }))).toBe(0);
    expect(jualan(h({ dihantar: 0, tidakTerjual: 0 }))).toBe(0);
  });
  it('a delivery with no evening count yet is not counted as sold', () => {
    const x = h({ tidakTerjual: null });
    expect(selesai(x)).toBe(false);
    expect(terjual(x)).toBe(0);
    expect(jualan(x)).toBe(0);
  });
});

describe('belumDibayar', () => {
  const hantaran = [
    h({ id: 1, tarikh: '2026-11-09', kedaiId: 1, dihantar: 20, tidakTerjual: 2, harga: 300 }), // 5400
    h({ id: 2, tarikh: '2026-11-10', kedaiId: 1, dihantar: 20, tidakTerjual: 0, harga: 300 }), // 6000
    h({ id: 3, tarikh: '2026-11-10', kedaiId: 2, dihantar: 10, tidakTerjual: 0, harga: 400 }), // 4000
  ];
  it('is all-time sales minus all-time payments for that kedai', () => {
    const bayaran = [
      { id: 1, tarikh: '2026-11-09', kedaiId: 1, jumlah: 5400 },
      { id: 2, tarikh: '2026-11-10', kedaiId: 1, jumlah: 4000 },
    ];
    expect(belumDibayar(1, hantaran, bayaran)).toBe(2000);
    expect(belumDibayar(2, hantaran, bayaran)).toBe(4000);
  });
  it('late payment on a later date clears the balance', () => {
    const bayaran = [
      { id: 1, tarikh: '2026-11-09', kedaiId: 1, jumlah: 5400 },
      { id: 2, tarikh: '2026-11-10', kedaiId: 1, jumlah: 4000 },
      { id: 3, tarikh: '2026-11-14', kedaiId: 1, jumlah: 2000, jenis: 'hutang' },
    ];
    expect(belumDibayar(1, hantaran, bayaran)).toBe(0);
    // as of the 10th, the late payment had not happened yet
    expect(belumDibayar(1, hantaran, bayaran, '2026-11-10')).toBe(2000);
  });
  it('overpayment shows as negative (kedai paid in advance)', () => {
    const bayaran = [{ id: 1, tarikh: '2026-11-10', kedaiId: 2, jumlah: 5000 }];
    expect(belumDibayar(2, hantaran, bayaran)).toBe(-1000);
  });
  it('total across kedai', () => {
    expect(belumDibayarSemua(hantaran, [])).toBe(15400);
  });
});

describe('weekly money in / out', () => {
  const bayaran = [
    { id: 1, tarikh: '2026-11-08', kedaiId: 1, jumlah: 999 },   // Ahad, previous week
    { id: 2, tarikh: '2026-11-09', kedaiId: 1, jumlah: 1000 },  // Isnin
    { id: 3, tarikh: '2026-11-15', kedaiId: 2, jumlah: 500 },   // Ahad, same week
    { id: 4, tarikh: '2026-11-16', kedaiId: 2, jumlah: 777 },   // Isnin, next week
  ];
  const belanja = [
    { id: 1, tarikh: '2026-11-08', barang: 'beras', jumlah: 111 },
    { id: 2, tarikh: '2026-11-09', barang: 'beras', jumlah: 300 },
    { id: 3, tarikh: '2026-11-15', barang: 'gas', jumlah: 200 },
    { id: 4, tarikh: '2026-11-16', barang: 'gas', jumlah: 222 },
  ];
  it('respects Isnin–Ahad week boundary', () => {
    expect(wangMasuk(bayaran, '2026-11-09')).toBe(1500);
    expect(wangKeluar(belanja, '2026-11-09')).toBe(500);
  });
  it('accepts any day in the week', () => {
    expect(wangMasuk(bayaran, '2026-11-12')).toBe(1500);
  });
  it('untungRugi = masuk - keluar, can be negative', () => {
    expect(untungRugi(1500, 500)).toBe(1000);
    expect(untungRugi(500, 1500)).toBe(-1000);
  });
});

describe('gajiMinggu', () => {
  const hantaran = [
    h({ tarikh: '2026-11-09', kedaiId: 1 }),
    h({ tarikh: '2026-11-09', kedaiId: 2 }),
    h({ tarikh: '2026-11-11', kedaiId: 1 }),
    h({ tarikh: '2026-11-12', kedaiId: 1, dihantar: 0 }),   // zero packs: not a working day
    h({ tarikh: '2026-11-16', kedaiId: 1 }),                // next week
  ];
  it('mingguan: amount as is', () => {
    expect(gajiMinggu({ gaji: 30000, gajiTempoh: 'mingguan' }, hantaran, '2026-11-09')).toBe(30000);
  });
  it('harian, 7 hari: gaji * 7', () => {
    expect(gajiMinggu({ gaji: 5000, gajiTempoh: 'harian', gajiKiraHari: '7' }, hantaran, '2026-11-09')).toBe(35000);
  });
  it('harian, hari hantar: gaji * days with deliveries', () => {
    expect(gajiMinggu({ gaji: 5000, gajiTempoh: 'harian', gajiKiraHari: 'hantar' }, hantaran, '2026-11-09')).toBe(10000);
  });
  it('defaults to 0 when no gaji set', () => {
    expect(gajiMinggu({}, hantaran, '2026-11-09')).toBe(0);
  });
  it('untungSelepasGaji', () => {
    expect(untungSelepasGaji(10000, 3000)).toBe(7000);
  });
});

describe('kos sebungkus / pembaziran / peratus', () => {
  it('kosSebungkus = keluar / dihantar', () => {
    expect(kosSebungkus(10000, 50)).toBe(200);
  });
  it('kosSebungkus guards divide by zero', () => {
    expect(kosSebungkus(10000, 0)).toBe(0);
  });
  it('kosPembaziran = tidakTerjual * kosSebungkus, rounded to sen', () => {
    expect(kosPembaziran(5, 200)).toBe(1000);
    expect(kosPembaziran(3, 333.333)).toBe(1000);
  });
  it('peratusTidakTerjual, guards zero', () => {
    expect(peratusTidakTerjual(5, 20)).toBe(25);
    expect(peratusTidakTerjual(0, 0)).toBe(0);
  });
});

describe('laporanMinggu', () => {
  const kedai = [
    { id: 1, nama: 'Kedai Ali', harga: 300, bungkusDefault: 20, aktif: true },
    { id: 2, nama: 'Kedai Siti', harga: 300, bungkusDefault: 10, aktif: true },
    { id: 3, nama: 'Kedai Lama', harga: 300, bungkusDefault: 10, aktif: false },
  ];
  // Price change mid-week for kedai 1: 300 -> 350 from Rabu.
  const hantaran = [
    h({ id: 1, tarikh: '2026-11-09', kedaiId: 1, dihantar: 20, tidakTerjual: 4, harga: 300 }), // 4800
    h({ id: 2, tarikh: '2026-11-10', kedaiId: 1, dihantar: 20, tidakTerjual: 0, harga: 300 }), // 6000
    h({ id: 3, tarikh: '2026-11-11', kedaiId: 1, dihantar: 20, tidakTerjual: 2, harga: 350 }), // 6300
    h({ id: 4, tarikh: '2026-11-09', kedaiId: 2, dihantar: 10, tidakTerjual: 5, harga: 300 }), // 1500
    h({ id: 5, tarikh: '2026-11-02', kedaiId: 3, dihantar: 10, tidakTerjual: 0, harga: 300 }), // last week, unpaid 3000
  ];
  const bayaran = [
    { id: 1, tarikh: '2026-11-09', kedaiId: 1, jumlah: 4800 },
    { id: 2, tarikh: '2026-11-10', kedaiId: 1, jumlah: 6000 },
    { id: 3, tarikh: '2026-11-11', kedaiId: 1, jumlah: 5000 },     // short 1300
    { id: 4, tarikh: '2026-11-09', kedaiId: 2, jumlah: 1500 },
    { id: 5, tarikh: '2026-11-20', kedaiId: 1, jumlah: 1300, jenis: 'hutang' }, // next week
  ];
  const belanja = [
    { id: 1, tarikh: '2026-11-09', barang: 'beras', jumlah: 7000 },
    { id: 2, tarikh: '2026-11-10', barang: 'santan', jumlah: 1400 },
  ];
  const tetapan = { gaji: 2000, gajiTempoh: 'harian', gajiKiraHari: 'hantar' };
  const L = laporanMinggu({ hariDalamMinggu: '2026-11-12', kedai, hantaran, bayaran, belanja, tetapan });

  it('week range', () => {
    expect(L.mula).toBe('2026-11-09');
    expect(L.akhir).toBe('2026-11-15');
  });
  it('totals', () => {
    expect(L.wangMasuk).toBe(17300);
    expect(L.wangKeluar).toBe(8400);
    expect(L.untungRugi).toBe(8900);
    expect(L.gaji).toBe(6000); // 3 working days * RM20
    expect(L.untungSelepasGaji).toBe(2900);
    expect(L.dihantar).toBe(70);
    expect(L.tidakTerjual).toBe(11);
    expect(L.kosSebungkus).toBe(120);
    expect(L.kosPembaziran).toBe(1320);
    expect(L.jualan).toBe(18600);
  });
  it('belum dibayar is as of week end (includes old weeks, excludes later payments)', () => {
    // kedai 1: 17100 - 15800 = 1300 ; kedai 3: 3000 from last week
    expect(L.belumDibayar).toBe(4300);
  });
  it('price change mid-week uses the snapshot price per delivery', () => {
    const k1 = L.perKedai.find((r) => r.kedai.id === 1);
    expect(k1.jualan).toBe(17100);
  });
  it('per-kedai rows sorted by % tidak terjual, highest first, with highlight', () => {
    expect(L.perKedai.map((r) => r.kedai.id)).toEqual([2, 1, 3]);
    const [k2, k1, k3] = L.perKedai;
    expect(k2.peratus).toBe(50);
    expect(k2.tinggi).toBe(true);
    expect(k1.peratus).toBe(10);
    expect(k1.tinggi).toBe(10 >= AMBANG_TINGGI);
    expect(k1.belumDibayar).toBe(1300);
    // inactive kedai with no deliveries this week still shows because it owes money
    expect(k3.dihantar).toBe(0);
    expect(k3.belumDibayar).toBe(3000);
  });
  it('rugi when spending exceeds income', () => {
    const R = laporanMinggu({
      hariDalamMinggu: '2026-11-16', kedai, hantaran: [], bayaran: [],
      belanja: [{ id: 9, tarikh: '2026-11-17', barang: 'gas', jumlah: 3000 }], tetapan: {},
    });
    expect(R.untungRugi).toBe(-3000);
    expect(R.kosSebungkus).toBe(0);
    expect(R.kosPembaziran).toBe(0);
  });
});
