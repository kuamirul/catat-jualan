import { describe, it, expect } from 'vitest';
import { buatBackup, semakBackup } from '../src/lib/backup.js';
import { janaDataContoh } from '../src/dev/seed.js';

const asas = () => ({
  kedai: [{ id: 1, nama: 'Kedai Ali', harga: 300, bungkusDefault: 20, aktif: true }],
  hantaran: [{ id: 1, tarikh: '2026-11-09', kedaiId: 1, dihantar: 20, tidakTerjual: 2, harga: 300 }],
  bayaran: [{ id: 1, tarikh: '2026-11-09', kedaiId: 1, jumlah: 5400, jenis: 'harian' }],
  belanja: [{ id: 1, tarikh: '2026-11-09', barang: 'beras', jumlah: 3000 }],
  tetapan: [{ key: 'gaji', value: 2000 }, { key: 'lastBackup', value: '2026-11-01T00:00:00Z' }],
});

describe('backup', () => {
  it('round-trips and drops lastBackup', () => {
    const b = JSON.parse(JSON.stringify(buatBackup(asas(), 1)));
    expect(b.tetapan.find((t) => t.key === 'lastBackup')).toBeUndefined();
    expect(semakBackup(b, 1).ok).toBe(true);
  });
  it('rejects other files', () => {
    expect(semakBackup(null, 1).ok).toBe(false);
    expect(semakBackup({ foo: 1 }, 1).ok).toBe(false);
  });
  it('rejects newer schema', () => {
    const b = buatBackup(asas(), 2);
    expect(semakBackup(b, 1).ok).toBe(false);
  });
  it('rejects tidakTerjual > dihantar', () => {
    const d = asas();
    d.hantaran[0].tidakTerjual = 25;
    expect(semakBackup(buatBackup(d, 1), 1).ok).toBe(false);
  });
  it('rejects negative money and unknown kedai', () => {
    const d = asas();
    d.belanja[0].jumlah = -1;
    expect(semakBackup(buatBackup(d, 1), 1).ok).toBe(false);
    const e = asas();
    e.bayaran[0].kedaiId = 99;
    expect(semakBackup(buatBackup(e, 1), 1).ok).toBe(false);
  });
  it('accepts a pending delivery (tidakTerjual null)', () => {
    const d = asas();
    d.hantaran[0].tidakTerjual = null;
    expect(semakBackup(JSON.parse(JSON.stringify(buatBackup(d, 1))), 1).ok).toBe(true);
  });
});

describe('dev seed data', () => {
  it('is valid backup-shaped data with 3 kedai over 2 weeks', () => {
    const d = janaDataContoh('2026-11-13');
    expect(d.kedai).toHaveLength(3);
    expect(semakBackup(JSON.parse(JSON.stringify(buatBackup(d, 1))), 1).ok).toBe(true);
    const tarikh = [...new Set(d.hantaran.map((h) => h.tarikh))].sort();
    expect(tarikh[0]).toBe('2026-11-02');
    expect(tarikh.at(-1)).toBe('2026-11-12');
  });
});
