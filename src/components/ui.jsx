import { useEffect, useRef, useState } from 'preact/hooks';
import { senKeTeks, teksKeSen } from '../lib/wang.js';

// ---------- tiny global store for dialog + toast ----------
let pendengar = [];
let keadaan = { dialog: null, toast: null };
function set(patch) {
  keadaan = { ...keadaan, ...patch };
  pendengar.forEach((f) => f(keadaan));
}
function useUi() {
  const [s, setS] = useState(keadaan);
  useEffect(() => {
    pendengar.push(setS);
    return () => { pendengar = pendengar.filter((f) => f !== setS); };
  }, []);
  return s;
}

/** await sahkan({ tajuk, mesej, ya: 'Padam', bahaya: true }) -> true/false. makluman: true = single OK button. */
export function sahkan(opts) {
  return new Promise((resolve) => set({ dialog: { ...opts, resolve } }));
}

let pemasaToast;
/** toast('Disimpan', { undo: async () => {...} }) */
export function toast(mesej, { undo } = {}) {
  clearTimeout(pemasaToast);
  set({ toast: { mesej, undo, id: Date.now() } });
  pemasaToast = setTimeout(() => set({ toast: null }), undo ? 6000 : 2500);
}

export function UiLapisan() {
  const { dialog, toast: t } = useUi();
  const tutup = (jawapan) => {
    dialog.resolve(jawapan);
    set({ dialog: null });
  };
  return (
    <>
      {dialog && (
        <div class="lapisan" role="dialog" aria-modal="true" onClick={(e) => e.target === e.currentTarget && tutup(false)}>
          <div class="dialog">
            <h2>{dialog.tajuk}</h2>
            {dialog.mesej && <p>{dialog.mesej}</p>}
            <div class="baris-butang">
              {!dialog.makluman && <button class="butang kedua" onClick={() => tutup(false)}>{dialog.tidak || 'Tidak'}</button>}
              <button class={`butang ${dialog.bahaya ? 'bahaya' : 'utama'}`} onClick={() => tutup(true)}>{dialog.ya || 'Ya'}</button>
            </div>
          </div>
        </div>
      )}
      {t && (
        <div class="toast" role="status" key={t.id}>
          <span>{t.mesej}</span>
          {t.undo && (
            <button class="toast-undo" onClick={async () => { set({ toast: null }); await t.undo(); }}>
              Batal
            </button>
          )}
        </div>
      )}
    </>
  );
}

// ---------- inputs ----------

/** Big − [n] + control for pack counts. */
export function Stepper({ nilai, ubah, min = 0, max = 999, label }) {
  const [teks, setTeks] = useState(String(nilai));
  useEffect(() => setTeks(String(nilai)), [nilai]);
  const tetap = (n) => {
    const v = Math.max(min, Math.min(max, n));
    ubah(v);
    return v;
  };
  return (
    <div class="stepper">
      <button type="button" class="stepper-b" aria-label={`Kurang ${label || ''}`} disabled={nilai <= min} onClick={() => tetap(nilai - 1)}>−</button>
      <input
        type="text"
        inputmode="numeric"
        pattern="[0-9]*"
        aria-label={label}
        value={teks}
        onFocus={(e) => e.target.select()}
        onInput={(e) => {
          const v = e.target.value.replace(/\D/g, '');
          if (v === '') { setTeks(''); return; }
          // Show the clamped value straight away (e.g. cannot type 99 unsold when 20 were sent)
          const betul = String(tetap(Number(v)));
          setTeks(betul);
          if (e.target.value !== betul) e.target.value = betul;
        }}
        onBlur={() => setTeks(String(nilai))}
      />
      <button type="button" class="stepper-b" aria-label={`Tambah ${label || ''}`} disabled={nilai >= max} onClick={() => tetap(nilai + 1)}>+</button>
    </div>
  );
}

/** RM input. value/ubah are in sen (null when empty). */
export function InputWang({ nilai, ubah, label, id, autoFocus }) {
  const [teks, setTeks] = useState(senKeTeks(nilai));
  const terakhir = useRef(nilai);
  useEffect(() => {
    // only overwrite text when value changes from outside
    if (nilai !== terakhir.current) {
      setTeks(senKeTeks(nilai));
      terakhir.current = nilai;
    }
  }, [nilai]);
  const salah = teks.trim() !== '' && teksKeSen(teks) == null;
  return (
    <div class={`input-wang ${salah ? 'salah' : ''}`}>
      <span aria-hidden="true">RM</span>
      <input
        id={id}
        type="text"
        inputmode="decimal"
        autocomplete="off"
        aria-label={label}
        aria-invalid={salah}
        placeholder="0"
        autoFocus={autoFocus}
        value={teks}
        onFocus={(e) => e.target.select()}
        onInput={(e) => {
          setTeks(e.target.value);
          const sen = teksKeSen(e.target.value);
          terakhir.current = sen;
          ubah(sen);
        }}
      />
    </div>
  );
}
