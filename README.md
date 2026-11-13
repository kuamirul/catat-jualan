# Catat Jualan

An offline-first PWA, written in Bahasa Melayu, for a one-person nasi lemak consignment business.
In the morning she drops packs at kedai. The kedai pay her at the end of the day, and unsold packs come back.
Everything stays on the phone (IndexedDB). There is no backend, no login, no analytics and no external fonts or CDNs.

## Setup

```bash
npm install
```

```bash
npm run dev        # http://localhost:5173
```

```bash
npm test           # Vitest unit tests
```

```bash
npm run build      # production build into ./dist (with service worker)
```

```bash
npm run preview    # serve ./dist locally to test the PWA/offline behaviour
```

### Sample data (dev only)

- Open `http://localhost:5173/?seed=1`, **or** use Tetapan → "Dev → Isi data contoh".
- This **replaces all data** with 3 kedai and 2 weeks of deliveries. The sample includes a mid-week price change, short payments and a late payment.
- `src/dev/seed.js` is only imported behind `import.meta.env.DEV`, so it is not in the production bundle.

## Deploy (Cloudflare Workers static assets, free tier)

```bash
npm run build
```

```bash
npx wrangler deploy
```

The first deploy asks you to log in to Cloudflare. The app is served at `https://catat-jualan.<your-subdomain>.workers.dev`.

> ⚠️ **Never change `name` in `wrangler.jsonc`, the account, or the URL.** All data lives in the browser's
> storage for that exact origin. If the URL changes, the app on the phone opens empty, and the old data
> can only come back through a backup file.

Updates: run `npm run build && npx wrangler deploy` again. The service worker uses `autoUpdate`, so the phone
picks up the new version the next time the app is opened while online, and data is untouched.

## Project layout

```
src/
  lib/kira.js      all business formulas (pure functions, unit tested)
  lib/tarikh.js    Malaysia date helpers (YYYY-MM-DD, weeks Isnin–Ahad)
  lib/wang.js      sen <-> "RM x.xx" formatting/parsing
  lib/backup.js    backup format + validation (pure, unit tested)
  lib/simpan.js    database writes, backup share/download, restore
  db.js            Dexie schema + live-query hook for Preact
  screens/         HariIni, Belanja, Laporan, Tetapan
  components/ui.jsx  Stepper, money input, confirm dialog, undo toast
  dev/seed.js      sample data (dev only)
test/              Vitest tests
scripts/icons.mjs  renders public/favicon.svg to PNG icons (needs Playwright; PNGs are committed)
```

### Data model

| Table | Fields | Notes |
|---|---|---|
| `kedai` | id, nama, harga, bungkusDefault, aktif | |
| `hantaran` | id, tarikh, kedaiId, dihantar, tidakTerjual, harga | `harga` is a price snapshot; `tidakTerjual` is `null` until the evening count is entered. One per kedai per day. |
| `bayaran` | id, tarikh, kedaiId, jumlah, **jenis** | `jenis: 'harian'` = money received on Hari Ini; `'hutang'` = late payment from Tetapan |
| `belanja` | id, tarikh, barang, jumlah | |
| `tetapan` | key, value | gaji, gajiTempoh, gajiKiraHari, lastBackup, schemaVersion, persistDiminta |

Money is integer sen. Dates are `YYYY-MM-DD` in Asia/Kuala_Lumpur time.

Decisions not covered by the spec:
- **`bayaran.jenis`** was added. The spec has no field for "wang diterima", so the evening amount is saved as a `bayaran` row. The `jenis` field lets the Hari Ini card find and edit that day's payment without touching a late payment recorded on the same day.
- **A delivery with no evening count yet counts as zero sold.** This stops the balance jumping to "owes everything" in the middle of the day.
- **Belum dibayar is shown "as of" the date being viewed.** On Hari Ini it is as of the day shown; on Laporan it is as of Sunday of the week shown. For the current week this equals the all-time figure.
- **Daily salary counts working days by default.** `gajiKiraHari` defaults to `'hantar'`, meaning only days with deliveries count. It can be switched to all 7 days in Tetapan.
- **`AMBANG_TINGGI = 20`.** In Laporan, kedai with 20% or more unsold are highlighted. The value is in `kira.js`.
- **The kedai table drops "RM" in the Belum bayar column.** The column header says "(RM)" instead, so the table fits at 360px.

## Dependencies

Runtime:
- **preact**: UI (about 4 KB gzipped). Chosen over vanilla JS because 4 stateful screens are much simpler with components.
- **dexie**: IndexedDB wrapper with transactions and live queries, as asked for in the spec.

Dev only:
- **vite**: build and dev server. JSX is compiled by Vite's built-in transform, so `@preact/preset-vite` and Babel are not needed.
- **vite-plugin-pwa**: manifest and Workbox service worker (precache, autoUpdate).
- **vitest**: unit tests.

Wrangler is not a dependency; it runs on demand through `npx wrangler deploy`.

## Manual test checklist (on real phones)

- [ ] **Install on Samsung Internet:** open the URL → menu ☰ → "Add page to" → "Home screen". The app opens full screen with the green icon.
- [ ] **Install on Chrome:** open the URL → ⋮ → "Add to Home screen" / "Install app".
- [ ] Tetapan → "Simpanan data" says the data is kept permanently (✓). If not, press "Minta simpanan kekal" after installing.
- [ ] Add 2 kedai, then on Hari Ini do the morning "Hantar" and the evening "Simpan". Check terjual, jualan and belum dibayar.
- [ ] **Airplane mode:** turn it on, close the app fully (swipe away), open it again. It loads, and adding a record works.
- [ ] **Restart the phone**, open the app: the data is still there.
- [ ] **Backup on phone A:** Tetapan → "Hantar backup" → WhatsApp → send to yourself. "Backup terakhir" shows today.
- [ ] **Restore on phone B:** install the app, download the .json from WhatsApp, Tetapan → "Pilih fail backup" → choose it → "Ganti data". Hari Ini and Laporan match phone A.
- [ ] Choose a wrong file (any photo or a random .json): it shows "Fail tidak sah" and changes nothing.
- [ ] On a Sunday with no backup for more than 7 days, Hari Ini shows the "Hantar backup minggu ini" banner.
- [ ] Turn on dark mode in the phone settings: the app is readable.
- [ ] Set the phone's font size to large: the buttons still fit and nothing is cut off.

---

## Panduan pengguna (Bahasa Melayu)

### Pasang app (sekali sahaja)
1. Buka pautan app dalam **Samsung Internet** atau **Chrome**.
2. Samsung Internet: tekan **☰** (bawah kanan) → **Tambah halaman ke** → **Skrin utama**.
   Chrome: tekan **⋮** (atas kanan) → **Tambah ke skrin utama**.
3. Ikon hijau **Catat Jualan** akan keluar di skrin telefon. Lepas ini buka app dari ikon itu sahaja.
4. App boleh guna tanpa internet.

### Mula-mula
- Pergi ke **Tetapan** → **Tambah kedai**. Isi nama kedai, harga sebungkus, dan berapa bungkus biasa dihantar. Tekan **Simpan**.
- Isi **Gaji saya** kalau mahu tahu untung selepas ambil gaji.

### Setiap hari
**Pagi (hantar bungkus):**
1. Buka **Hari Ini**.
2. Bilangan bungkus sudah diisi. Kalau lain, tekan **−** atau **+**.
3. Tekan **Hantar**.

**Petang (ambil duit dan bungkus balik):**
1. Pada kad kedai, tekan **+** untuk bilangan bungkus **tidak terjual**.
2. **Wang diterima** diisi sendiri. Kalau kedai bayar kurang, tukar jumlah itu.
3. Tekan **Simpan**.

**Beli barang:**
1. Buka **Belanja**.
2. Tekan nama barang (contoh: **Beras**).
3. Taip harga, kemudian tekan **Simpan**.

**Kedai bayar hutang lewat:** pergi ke **Tetapan** → **Bayar hutang**, pilih kedai, isi jumlah, dan tekan **Simpan bayaran**.

### Setiap minggu (hari Ahad)
1. Buka **Laporan** untuk lihat untung atau rugi minggu ini.
   Kedai berwarna **merah** banyak bungkus tidak terjual. Mungkin kurangkan hantaran ke kedai itu.
2. **Hantar backup:** pergi ke **Tetapan** → **Hantar backup** → pilih **WhatsApp** → hantar kepada diri sendiri atau anak.
   Kalau telefon hilang atau rosak, data boleh dipulihkan daripada fail ini.

### Tukar telefon
Pasang app di telefon baru. Simpan fail backup daripada WhatsApp. Kemudian pergi ke **Tetapan** → **Pilih fail backup** → pilih fail itu → **Ganti data**.
