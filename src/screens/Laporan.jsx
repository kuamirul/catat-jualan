import { useState } from 'preact/hooks';
import { hariIni, tambahHari, mulaMinggu, tarikhPendek } from '../lib/tarikh.js';
import { rm } from '../lib/wang.js';
import { laporanMinggu } from '../lib/kira.js';

export function Laporan({ data }) {
  const [mula, setMula] = useState(mulaMinggu(hariIni()));
  const L = laporanMinggu({ hariDalamMinggu: mula, ...data });
  const mingguIni = mula === mulaMinggu(hariIni());
  const label = mingguIni ? 'Minggu ini' : 'Minggu itu';
  const adaGaji = data.tetapan.gaji > 0;

  return (
    <div>
      <header class="kepala-tarikh">
        <button class="butang-ikon" aria-label="Minggu sebelum" onClick={() => setMula(tambahHari(mula, -7))}>‹</button>
        <div class="tarikh-tengah">
          <div class="tarikh-besar">Isnin {tarikhPendek(L.mula)} – Ahad {tarikhPendek(L.akhir)}</div>
          {mingguIni
            ? <div class="tag">Minggu ini</div>
            : <button class="pautan" onClick={() => setMula(mulaMinggu(hariIni()))}>Kembali ke minggu ini</button>}
        </div>
        <button class="butang-ikon" aria-label="Minggu seterusnya" onClick={() => setMula(tambahHari(mula, 7))}>›</button>
      </header>

      <div class={`ayat-besar ${L.untungRugi >= 0 ? 'untung' : 'rugi'}`}>
        {L.untungRugi >= 0
          ? <>{label} untung <strong>{rm(L.untungRugi)}</strong></>
          : <>{label} rugi <strong>{rm(-L.untungRugi)}</strong></>}
      </div>
      {adaGaji && (
        <p class="ayat-sederhana">
          {L.untungSelepasGaji >= 0
            ? <>Selepas ambil gaji {rm(L.gaji)}, baki untung <strong>{rm(L.untungSelepasGaji)}</strong>.</>
            : <>Selepas ambil gaji {rm(L.gaji)}, kurang <strong>{rm(-L.untungSelepasGaji)}</strong>.</>}
        </p>
      )}
      {L.belumDibayar > 0 && (
        <p class="ayat-sederhana">Kedai masih belum bayar <strong>{rm(L.belumDibayar)}</strong>.</p>
      )}

      <div class="kad">
        <Baris label="Wang masuk" nilai={rm(L.wangMasuk)} />
        <Baris label="Wang keluar (belanja)" nilai={rm(L.wangKeluar)} />
        <Baris label={L.untungRugi >= 0 ? 'Untung' : 'Rugi'} nilai={rm(Math.abs(L.untungRugi))} tebal />
        <Baris label="Gaji saya" nilai={rm(L.gaji)} />
        <Baris label={L.untungSelepasGaji >= 0 ? 'Untung selepas gaji' : 'Rugi selepas gaji'} nilai={rm(Math.abs(L.untungSelepasGaji))} tebal />
        <Baris label="Belum dibayar (semua kedai)" nilai={rm(L.belumDibayar)} />
      </div>

      <div class="kad">
        <Baris label="Jumlah bungkus dihantar" nilai={L.dihantar} />
        <Baris label="Kos sebungkus" nilai={L.dihantar ? rm(L.kosSebungkus) : '–'} />
        <Baris label="Bungkus tidak terjual" nilai={L.tidakTerjual} />
        <Baris label="Kos bungkus tidak terjual" nilai={rm(L.kosPembaziran)} />
      </div>

      <h2 class="subtajuk">Ikut kedai</h2>
      {L.perKedai.length === 0
        ? <p class="kecil kosong">Tiada hantaran minggu ini.</p>
        : (
          <div class="jadual-bungkus">
            <table class="jadual">
              <thead>
                <tr>
                  <th>Kedai</th>
                  <th>Hantar</th>
                  <th>Tak laku</th>
                  <th>%</th>
                  <th>Belum bayar (RM)</th>
                </tr>
              </thead>
              <tbody>
                {L.perKedai.map((r) => (
                  <tr class={r.tinggi ? 'tinggi' : ''}>
                    <td>{r.kedai.nama}</td>
                    <td>{r.dihantar}</td>
                    <td>{r.tidakTerjual}</td>
                    <td>{r.dihantar ? `${Math.round(r.peratus)}%` : '–'}</td>
                    <td class={r.belumDibayar > 0 ? 'hutang' : ''}>{rm(r.belumDibayar).replace('RM ', '')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      {L.perKedai.some((r) => r.tinggi) && (
        <p class="kecil">Kedai berwarna merah: banyak bungkus tidak terjual. Mungkin kurangkan hantaran.</p>
      )}
    </div>
  );
}

function Baris({ label, nilai, tebal }) {
  return (
    <div class={`baris-laporan ${tebal ? 'tebal' : ''}`}>
      <span>{label}</span>
      <strong>{nilai}</strong>
    </div>
  );
}
