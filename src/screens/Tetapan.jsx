import { useEffect, useRef, useState } from 'preact/hooks';
import { db, simpanTetapan, statusSimpananKekal, mintaSimpananKekal, SCHEMA_VERSION } from '../db.js';
import { hariIni, tarikhPenuh, bezaHari, tarikhPendek } from '../lib/tarikh.js';
import { rm } from '../lib/wang.js';
import { belumDibayar } from '../lib/kira.js';
import { hantarBackup, pulihBackup } from '../lib/simpan.js';
import { semakBackup, ringkasan } from '../lib/backup.js';
import { Stepper, InputWang, toast, sahkan } from '../components/ui.jsx';

export function Tetapan({ data }) {
  return (
    <div>
      <h1>Tetapan</h1>
      <BahagianKedai data={data} />
      <BahagianHutang data={data} />
      <BahagianGaji tetapan={data.tetapan} />
      <BahagianBackup tetapan={data.tetapan} />
      <BahagianSimpanan />
      {import.meta.env.DEV && <BahagianDev />}
      <p class="kecil versi">Catat Jualan · versi data {SCHEMA_VERSION}</p>
    </div>
  );
}

// ---------------- Kedai ----------------

function BahagianKedai({ data }) {
  const [borang, setBorang] = useState(null); // null | {} (new) | kedai (edit)
  const susun = [...data.kedai].sort((a, b) => (b.aktif - a.aktif) || a.nama.localeCompare(b.nama, 'ms'));

  return (
    <section class="kad">
      <h2>Kedai</h2>
      {susun.length === 0 && !borang && <p class="kecil">Belum ada kedai. Tekan "Tambah kedai".</p>}
      <ul class="senarai">
        {susun.map((k) => (
          borang?.id === k.id
            ? <li><BorangKedai asal={k} tutup={() => setBorang(null)} /></li>
            : (
              <li class={`senarai-item ${k.aktif ? '' : 'tak-aktif'}`}>
                <button class="senarai-utama" onClick={() => setBorang(k)} aria-label={`Ubah ${k.nama}`}>
                  <span>
                    {k.nama}
                    <br />
                    <span class="kecil">{rm(k.harga)} · {k.bungkusDefault} bungkus{k.aktif ? '' : ' · tidak aktif'}</span>
                  </span>
                  <span class="pautan">Ubah</span>
                </button>
              </li>
            )
        ))}
      </ul>
      {borang && !borang.id && <BorangKedai asal={null} tutup={() => setBorang(null)} />}
      {!borang && <button class="butang utama penuh" onClick={() => setBorang({})}>+ Tambah kedai</button>}
    </section>
  );
}

function BorangKedai({ asal, tutup }) {
  const [nama, setNama] = useState(asal?.nama ?? '');
  const [harga, setHarga] = useState(asal?.harga ?? null);
  const [bungkus, setBungkus] = useState(asal?.bungkusDefault ?? 10);
  const boleh = nama.trim() && harga != null && harga > 0;

  const simpan = async () => {
    if (!boleh) return;
    const rekod = { nama: nama.trim(), harga, bungkusDefault: bungkus };
    if (asal) await db.kedai.update(asal.id, rekod);
    else await db.kedai.add({ ...rekod, aktif: true });
    toast(asal ? 'Kedai dikemas kini' : `${rekod.nama} ditambah`);
    tutup();
  };

  const tukarAktif = async () => {
    if (asal.aktif) {
      const ok = await sahkan({
        tajuk: `Berhenti hantar ke ${asal.nama}?`,
        mesej: 'Kedai ini tidak akan keluar di Hari Ini lagi. Rekod lama tetap disimpan. Boleh aktifkan semula bila-bila masa.',
        ya: 'Ya, berhenti',
      });
      if (!ok) return;
    }
    await db.kedai.update(asal.id, { aktif: !asal.aktif });
    toast(asal.aktif ? 'Kedai tidak aktif' : 'Kedai aktif semula');
    tutup();
  };

  return (
    <div class="borang">
      <label class="label" for="nama-kedai">Nama kedai</label>
      <input id="nama-kedai" class="input-teks" type="text" value={nama} autoFocus={!asal}
        onInput={(e) => setNama(e.target.value)} placeholder="Contoh: Kedai Pak Ali" />
      <label class="label" for="harga-kedai">Harga sebungkus</label>
      <InputWang id="harga-kedai" nilai={harga} ubah={setHarga} label="Harga sebungkus" />
      {asal && harga !== asal.harga && (
        <p class="kecil">Harga baru hanya untuk hantaran selepas ini. Rekod lama tidak berubah.</p>
      )}
      <label class="label">Bungkus biasa dihantar</label>
      <Stepper nilai={bungkus} ubah={setBungkus} label="Bungkus biasa dihantar" />
      <div class="baris-butang">
        <button class="butang kedua" onClick={tutup}>Batal</button>
        <button class="butang utama" disabled={!boleh} onClick={simpan}>Simpan</button>
      </div>
      {asal && (
        <button class="butang kedua penuh" onClick={tukarAktif}>
          {asal.aktif ? 'Berhenti hantar ke kedai ini' : 'Aktifkan semula kedai ini'}
        </button>
      )}
    </div>
  );
}

// ---------------- Bayar hutang ----------------

function BahagianHutang({ data }) {
  const [kedaiId, setKedaiId] = useState('');
  const [tarikh, setTarikh] = useState(hariIni());
  const [jumlah, setJumlah] = useState(null);

  const berhutang = data.kedai
    .map((k) => ({ k, baki: belumDibayar(k.id, data.hantaran, data.bayaran) }))
    .filter((x) => x.baki > 0 || x.k.aktif)
    .sort((a, b) => b.baki - a.baki);
  const pilih = berhutang.find((x) => x.k.id === Number(kedaiId));
  const hutangLepas = data.bayaran
    .filter((b) => b.jenis === 'hutang')
    .sort((a, b) => (b.tarikh.localeCompare(a.tarikh)) || b.id - a.id)
    .slice(0, 5);
  const namaKedai = (id) => data.kedai.find((k) => k.id === id)?.nama ?? '?';

  const simpan = async () => {
    if (!pilih || !jumlah) return;
    await db.bayaran.add({ tarikh, kedaiId: pilih.k.id, jumlah, jenis: 'hutang' });
    toast(`${pilih.k.nama} bayar ${rm(jumlah)}`);
    setJumlah(null);
    setKedaiId('');
  };

  const padam = async (b) => {
    const ok = await sahkan({ tajuk: `Padam bayaran ${namaKedai(b.kedaiId)} ${rm(b.jumlah)}?`, ya: 'Padam', bahaya: true });
    if (!ok) return;
    await db.bayaran.delete(b.id);
    toast('Dipadam', { undo: () => db.bayaran.put(b) });
  };

  return (
    <section class="kad">
      <h2>Bayar hutang</h2>
      <p class="kecil">Kedai bayar lewat? Catat di sini.</p>
      <label class="label" for="kedai-hutang">Kedai</label>
      <select id="kedai-hutang" class="input-teks" value={kedaiId} onChange={(e) => setKedaiId(e.target.value)}>
        <option value="">Pilih kedai</option>
        {berhutang.map(({ k, baki }) => (
          <option value={k.id}>{k.nama} {baki > 0 ? `(hutang ${rm(baki)})` : ''}</option>
        ))}
      </select>
      {pilih && pilih.baki > 0 && (
        <button class="pautan" onClick={() => setJumlah(pilih.baki)}>Bayar penuh {rm(pilih.baki)}</button>
      )}
      <label class="label" for="jumlah-hutang">Jumlah dibayar</label>
      <InputWang id="jumlah-hutang" nilai={jumlah} ubah={setJumlah} label="Jumlah dibayar" />
      <label class="label" for="tarikh-hutang">Tarikh</label>
      <input id="tarikh-hutang" class="input-teks" type="date" value={tarikh} max={hariIni()}
        onChange={(e) => e.target.value && setTarikh(e.target.value)} />
      <button class="butang utama penuh" disabled={!pilih || !jumlah} onClick={simpan}>Simpan bayaran</button>

      {hutangLepas.length > 0 && (
        <>
          <h3 class="label">Bayaran lewat terkini</h3>
          <ul class="senarai">
            {hutangLepas.map((b) => (
              <li class="senarai-item">
                <div class="senarai-utama statik">
                  <span>{namaKedai(b.kedaiId)}<br /><span class="kecil">{tarikhPendek(b.tarikh)}</span></span>
                  <strong>{rm(b.jumlah)}</strong>
                </div>
                <button class="butang-ikon kecil-ikon" aria-label="Padam bayaran" onClick={() => padam(b)}>✕</button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

// ---------------- Gaji ----------------

function BahagianGaji({ tetapan }) {
  const [gaji, setGaji] = useState(tetapan.gaji || null);
  const tempoh = tetapan.gajiTempoh;
  const kira = tetapan.gajiKiraHari;
  const pemasa = useRef();

  const simpanGaji = (v) => {
    setGaji(v);
    clearTimeout(pemasa.current);
    pemasa.current = setTimeout(() => simpanTetapan('gaji', v ?? 0), 400);
  };

  return (
    <section class="kad">
      <h2>Gaji saya</h2>
      <p class="kecil">Berapa gaji untuk diri sendiri? Laporan akan tolak gaji ini daripada untung.</p>
      <label class="label" for="gaji">Jumlah gaji</label>
      <InputWang id="gaji" nilai={gaji} ubah={simpanGaji} label="Jumlah gaji" />
      <div class="pilihan-dua" role="radiogroup" aria-label="Tempoh gaji">
        <button class={`cip ${tempoh === 'harian' ? 'dipilih' : ''}`} aria-pressed={tempoh === 'harian'}
          onClick={() => simpanTetapan('gajiTempoh', 'harian')}>Sehari</button>
        <button class={`cip ${tempoh === 'mingguan' ? 'dipilih' : ''}`} aria-pressed={tempoh === 'mingguan'}
          onClick={() => simpanTetapan('gajiTempoh', 'mingguan')}>Seminggu</button>
      </div>
      {tempoh === 'harian' && (
        <>
          <label class="label">Kira gaji untuk</label>
          <div class="pilihan-dua" role="radiogroup" aria-label="Kira gaji untuk">
            <button class={`cip ${kira === 'hantar' ? 'dipilih' : ''}`} aria-pressed={kira === 'hantar'}
              onClick={() => simpanTetapan('gajiKiraHari', 'hantar')}>Hari berniaga sahaja</button>
            <button class={`cip ${kira === '7' ? 'dipilih' : ''}`} aria-pressed={kira === '7'}
              onClick={() => simpanTetapan('gajiKiraHari', '7')}>Setiap hari (7 hari)</button>
          </div>
        </>
      )}
    </section>
  );
}

// ---------------- Backup ----------------

function BahagianBackup({ tetapan }) {
  const failRef = useRef();
  const akhir = tetapan.lastBackup;
  const hari = akhir ? bezaHari(akhir.slice(0, 10), hariIni()) : null;
  // lastBackup is stored as ISO UTC; convert to Malaysia date for display
  const akhirTarikh = akhir ? hariIni(new Date(akhir)) : null;

  const hantar = async () => {
    try {
      const r = await hantarBackup();
      if (r === 'dikongsi') toast('Backup sudah dihantar');
      if (r === 'dimuat turun') toast('Fail backup disimpan dalam Muat Turun');
    } catch (e) {
      console.error(e);
      toast('Backup gagal. Cuba lagi.');
    }
  };

  const pulih = async (e) => {
    const fail = e.target.files?.[0];
    e.target.value = '';
    if (!fail) return;
    let obj;
    try {
      obj = JSON.parse(await fail.text());
    } catch {
      await sahkan({ tajuk: 'Fail tidak boleh dibaca', mesej: 'Pastikan fail ini fail backup Catat Jualan (.json).', ya: 'OK', makluman: true });
      return;
    }
    const s = semakBackup(obj, SCHEMA_VERSION);
    if (!s.ok) {
      await sahkan({ tajuk: 'Fail tidak sah', mesej: s.ralat, ya: 'OK', makluman: true });
      return;
    }
    const r = ringkasan(s.data);
    const tarikhFail = s.data.dibuat ? tarikhPenuh(hariIni(new Date(s.data.dibuat))) : 'tidak diketahui';
    const ok = await sahkan({
      tajuk: 'Ganti semua data?',
      mesej: `Backup bertarikh ${tarikhFail}: ${r.kedai} kedai, ${r.hantaran} hantaran, ${r.belanja} belanja. ` +
        'SEMUA data dalam telefon ini akan diganti dengan data backup.',
      ya: 'Ganti data', bahaya: true,
    });
    if (!ok) return;
    try {
      await pulihBackup(s.data);
      toast('Data sudah dipulihkan');
    } catch (err) {
      console.error(err);
      await sahkan({ tajuk: 'Pulih gagal', mesej: 'Data lama tidak diubah. Cuba lagi.', ya: 'OK', makluman: true });
    }
  };

  return (
    <section class="kad">
      <h2>Backup</h2>
      <p>
        Backup terakhir:{' '}
        <strong>{akhirTarikh ? tarikhPenuh(akhirTarikh) : 'Belum pernah'}</strong>
        {hari != null && hari > 7 && <span class="amaran"> ({hari} hari lalu)</span>}
      </p>
      <p class="kecil">Hantar backup ke WhatsApp sendiri atau anak setiap minggu. Kalau telefon rosak atau hilang, data boleh dipulihkan.</p>
      <button class="butang utama penuh" onClick={hantar}>Hantar backup</button>

      <h3 class="label">Pulih data dari backup</h3>
      <p class="kecil">Untuk telefon baru. Pilih fail backup (.json).</p>
      <input ref={failRef} type="file" accept="application/json,.json" hidden onChange={pulih} />
      <button class="butang kedua penuh" onClick={() => failRef.current.click()}>Pilih fail backup</button>
    </section>
  );
}

// ---------------- Storage ----------------

function BahagianSimpanan() {
  const [kekal, setKekal] = useState(undefined);
  useEffect(() => { statusSimpananKekal().then(setKekal); }, []);

  return (
    <section class="kad">
      <h2>Simpanan data</h2>
      {kekal === true && <p>✓ Data disimpan kekal dalam telefon ini.</p>}
      {kekal === false && (
        <>
          <p class="amaran">Telefon mungkin padam data jika ruang penuh.</p>
          <p class="kecil">Pasang app ke skrin utama ("Add to Home screen"), kemudian tekan butang di bawah. Hantar backup selalu.</p>
          <button class="butang kedua penuh" onClick={async () => setKekal(await mintaSimpananKekal())}>Minta simpanan kekal</button>
        </>
      )}
      {kekal === null && <p class="kecil">Pelayar ini tidak beri maklumat simpanan. Hantar backup selalu.</p>}
    </section>
  );
}

// ---------------- Dev only ----------------

function BahagianDev() {
  return (
    <section class="kad dev">
      <h2>Dev</h2>
      <p class="kecil">Only visible in <code>npm run dev</code>. Replaces all data.</p>
      <button class="butang kedua penuh" onClick={async () => {
        if (!(await sahkan({ tajuk: 'Isi data contoh?', mesej: 'Semua data akan diganti.', ya: 'Isi', bahaya: true }))) return;
        const { isiDataContoh } = await import('../dev/seed.js');
        await isiDataContoh();
        toast('Data contoh diisi');
      }}>Isi data contoh (3 kedai, 2 minggu)</button>
    </section>
  );
}
