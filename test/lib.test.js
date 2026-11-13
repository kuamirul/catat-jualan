import { describe, it, expect } from 'vitest';
import { hariIni, tambahHari, mulaMinggu, akhirMinggu, tarikhPenuh, bezaHari } from '../src/lib/tarikh.js';
import { rm, teksKeSen, senKeTeks } from '../src/lib/wang.js';

describe('tarikh', () => {
  it('hariIni uses Malaysia time (UTC+8)', () => {
    // 2026-11-12 17:30 UTC is already 13 Nov 01:30 in KL
    expect(hariIni(new Date('2026-11-12T17:30:00Z'))).toBe('2026-11-13');
  });
  it('week is Isnin–Ahad', () => {
    expect(mulaMinggu('2026-11-13')).toBe('2026-11-09'); // Jumaat
    expect(mulaMinggu('2026-11-15')).toBe('2026-11-09'); // Ahad belongs to the same week
    expect(mulaMinggu('2026-11-16')).toBe('2026-11-16'); // Isnin starts a new week
    expect(akhirMinggu('2026-11-09')).toBe('2026-11-15');
  });
  it('crosses month/year boundaries', () => {
    expect(tambahHari('2026-12-31', 1)).toBe('2027-01-01');
    expect(mulaMinggu('2027-01-01')).toBe('2026-12-28');
    expect(bezaHari('2026-11-01', '2026-11-13')).toBe(12);
  });
  it('formats in Malay', () => {
    expect(tarikhPenuh('2026-11-13')).toBe('Jumaat, 13 November 2026');
  });
});

describe('wang', () => {
  it('formats sen', () => {
    expect(rm(550)).toBe('RM 5.50');
    expect(rm(123456)).toBe('RM 1,234.56');
    expect(rm(-500)).toBe('-RM 5.00');
  });
  it('parses input', () => {
    expect(teksKeSen('5')).toBe(500);
    expect(teksKeSen('5.5')).toBe(550);
    expect(teksKeSen('5,50')).toBe(550);
    expect(teksKeSen('RM 12.05')).toBe(1205);
    expect(teksKeSen('.5')).toBe(50);
    expect(teksKeSen('')).toBe(null);
    expect(teksKeSen('-5')).toBe(null);
    expect(teksKeSen('abc')).toBe(null);
    expect(teksKeSen('1.234')).toBe(null);
  });
  it('round-trips for inputs', () => {
    expect(senKeTeks(500)).toBe('5');
    expect(senKeTeks(550)).toBe('5.50');
  });
});
