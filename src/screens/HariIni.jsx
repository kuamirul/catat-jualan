import { useState } from 'preact/hooks';
import { hariIni, tambahHari, tarikhPenuh, hariMinggu, bezaHari } from '../lib/tarikh.js';
import { rm } from '../lib/wang.js';
import { terjual, jualan, belumDibayar, selesai } from '../lib/kira.js';
import { simpanHantar, simpanPetang, padamHari, pulihHari, hantarBackup } from '../lib/simpan.js';
import { Stepper, InputWang, toast, sahkan } from '../components/ui.jsx';

export function HariIni({ data, pergi }) {
  const [tarikh, setTarikh] = useState(hariIni());
  const { kedai, hantaran, bayaran, tetapan } = data;
  const sekarang = hariIni();

  const hariIniList = hantaran.filter((h) => h.tarikh === tarikh);
  // Active kedai, plus any inactive kedai that already has a delivery on this date.
  const senarai = kedai
    .filter((k) => k.aktif || hariIniList.some((h) => h.kedaiId === k.id))
    .sort((a, b) => a.nama.localeCompare(b.nama, 'ms'));

  const hariAkhirBackup = tetapan.lastBackup ? bezaHari(tetapan.lastBackup.slice(0, 10), sekarang) : Infinity;
  const tunjukBanner = hariMinggu(sekarang) === 0 && hariAkhirBackup > 7;

  const jumlahHari = hariIniList.reduce((s, h) => s + jualan(h), 0);
  const terimaHari = bayaran.filter((b) => b.tarikh === tarikh && b.jenis !== 'hutang').reduce((s, b) => s + b.jumlah, 0);

  return (
    <div>
      <header class="kepala-tarikh">
        <button class="butang-ikon" aria-label="Hari sebelum" onClick={() => setTarikh(tambahHari(tarikh, -1))}>‹</button>
        <div class="tarikh-tengah">
          <div class="tarikh-besar">{tarikhPenuh(tarikh)}</div>
          {tarikh === sekarang
            ? <div class="tag">Hari ini</div>
            : <button class="pautan" onClick={() => setTarikh(sekarang)}>Kembali ke hari ini</button>}
        </div>
        <button class="butang-ikon" aria-label="Hari seterusnya" onClick={() => setTarikh(tambahHari(tarikh, 1))}>›</button>
      </header>

      {tunjukBanner && (
        <div class="banner">
          <p><strong>Hantar backup minggu ini</strong></p>
          <p class="kecil">Simpan salinan data ke WhatsApp supaya tidak hilang.</p>
          <button class="butang utama penuh" onClick={async () => {
            const r = await hantarBackup();
            if (r !== 'batal') toast('Backup sudah dihantar');
          }}>Hantar backup</button>
        </div>
      )}

      {senarai.length === 0 && (
        <div class="kosong">
          <p>Belum ada kedai.</p>
          <button class="butang utama" onClick={() => pergi('tetapan')}>Tambah kedai</button>
        </div>
      )}

      {senarai.map((k) => {
        const h = hariIniList.find((x) => x.kedaiId === k.id);
        // Re-mount the card when its delivery record appears/disappears so it starts in the right mode.
        return <KadKedai
          key={`${k.id}-${tarikh}-${h?.id ?? 'baru'}`}
          kedai={k}
          tarikh={tarikh}
          h={h}
          bayaranHari={bayaran.filter((b) => b.tarikh === tarikh && b.kedaiId === k.id && b.jenis !== 'hutang')}
          baki={belumDibayar(k.id, hantaran, bayaran, tarikh)}
        />;
      })}

      {hariIniList.length > 0 && (
        <div class="ringkas-hari">
          <div><span>Jualan hari ini</span><strong>{rm(jumlahHari)}</strong></div>
          <div><span>Wang diterima</span><strong>{rm(terimaHari)}</strong></div>
        </div>
      )}
    </div>
  );
}

function KadKedai({ kedai, tarikh, h, bayaranHari, baki }) {
  // mod: 'pagi' (not sent yet / editing packs), 'petang' (enter evening figures), 'siap' (done)
  const modAsal = !h ? 'pagi' : selesai(h) ? 'siap' : 'petang';
  const [mod, setMod] = useState(modAsal);
  const [dihantar, setDihantar] = useState(h ? h.dihantar : kedai.bungkusDefault);
  const harga = h ? h.harga : kedai.harga;

  const wangAda = bayaranHari.reduce((s, b) => s + b.jumlah, 0);
  const [tidakTerjual, setTidakTerjual] = useState(h?.tidakTerjual ?? 0);
  const [wang, setWang] = useState(h && selesai(h) ? wangAda : null);
  const [wangDiubah, setWangDiubah] = useState(h && selesai(h));
  const dijangka = ((h?.dihantar ?? dihantar) - tidakTerjual) * harga;
  const wangPapar = wangDiubah ? wang : dijangka;

  const hantar = async () => {
    await simpanHantar(kedai, tarikh, dihantar);
    setMod(h && selesai(h) ? 'siap' : 'petang');
    toast(`${dihantar} bungkus dihantar ke ${kedai.nama}`);
  };

  const simpan = async () => {
    if (tidakTerjual > h.dihantar) return;
    if (wangPapar == null) return;
    await simpanPetang(h, tidakTerjual, wangPapar);
    setMod('siap');
    toast('Disimpan');
  };

  const padam = async () => {
    const ok = await sahkan({
      tajuk: `Padam rekod ${kedai.nama}?`,
      mesej: 'Bungkus dihantar dan wang diterima hari ini akan dipadam.',
      ya: 'Padam', bahaya: true,
    });
    if (!ok) return;
    const lama = await padamHari(h);
    setMod('pagi');
    setDihantar(kedai.bungkusDefault);
    toast('Rekod dipadam', { undo: () => pulihHari(lama) });
  };

  return (
    <section class={`kad ${mod === 'siap' ? 'kad-siap' : ''}`}>
      <div class="kad-atas">
        <h2>{kedai.nama}</h2>
        <span class="kecil">{rm(harga)} sebungkus</span>
      </div>

      {mod === 'pagi' && (
        <>
          <label class="label">Bungkus dihantar</label>
          <Stepper nilai={dihantar} ubah={setDihantar} label="Bungkus dihantar" />
          <div class="baris-butang">
            {h && <button class="butang kedua" onClick={() => { setDihantar(h.dihantar); setMod(selesai(h) ? 'siap' : 'petang'); }}>Batal</button>}
            <button class="butang utama besar" onClick={hantar}>{h ? 'Simpan' : 'Hantar'}</button>
          </div>
        </>
      )}

      {mod === 'petang' && h && (
        <>
          <div class="baris-info">
            <span>Dihantar pagi tadi: <strong>{h.dihantar} bungkus</strong></span>
            <button class="pautan" onClick={() => { setDihantar(h.dihantar); setMod('pagi'); }}>Ubah</button>
          </div>
          <label class="label">Tidak terjual (bungkus dibawa balik)</label>
          <Stepper nilai={tidakTerjual} ubah={setTidakTerjual} max={h.dihantar} label="Tidak terjual" />
          <label class="label" for={`wang-${kedai.id}`}>Wang diterima</label>
          <InputWang
            id={`wang-${kedai.id}`}
            nilai={wangPapar}
            ubah={(v) => { setWangDiubah(true); setWang(v); }}
            label="Wang diterima"
          />
          {wangDiubah && wang !== dijangka && (
            <button class="pautan" onClick={() => setWangDiubah(false)}>Guna jumlah jualan ({rm(dijangka)})</button>
          )}
          <div class="baris-angka">
            <div><span>Terjual</span><strong>{h.dihantar - tidakTerjual}</strong></div>
            <div><span>Jualan</span><strong>{rm(dijangka)}</strong></div>
          </div>
          <button class="butang utama besar penuh" disabled={wangPapar == null} onClick={simpan}>Simpan</button>
        </>
      )}

      {mod === 'siap' && h && (
        <>
          <div class="baris-angka">
            <div><span>Dihantar</span><strong>{h.dihantar}</strong></div>
            <div><span>Tidak terjual</span><strong>{h.tidakTerjual}</strong></div>
            <div><span>Terjual</span><strong>{terjual(h)}</strong></div>
          </div>
          <div class="baris-angka">
            <div><span>Jumlah jualan</span><strong>{rm(jualan(h))}</strong></div>
            <div><span>Wang diterima</span><strong>{rm(wangAda)}</strong></div>
          </div>
          <div class="baris-butang">
            <button class="butang kedua" onClick={padam}>Padam</button>
            <button class="butang kedua" onClick={() => {
              setTidakTerjual(h.tidakTerjual); setWang(wangAda); setWangDiubah(true); setMod('petang');
            }}>Ubah</button>
          </div>
        </>
      )}

      {mod === 'petang' && h && (
        <button class="pautan kecil padam-kecil" onClick={padam}>Padam rekod hari ini</button>
      )}

      <div class={`baki ${baki > 0 ? 'baki-hutang' : ''}`}>
        {baki > 0 && <>Belum dibayar: <strong>{rm(baki)}</strong></>}
        {baki === 0 && <>Belum dibayar: <strong>RM 0.00</strong></>}
        {baki < 0 && <>Kedai terlebih bayar: <strong>{rm(-baki)}</strong></>}
      </div>
    </section>
  );
}
