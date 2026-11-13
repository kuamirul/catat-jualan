import { useEffect, useState } from 'preact/hooks';
import { useSemua, mintaSimpananKekal, bacaTetapan, simpanTetapan, SCHEMA_VERSION } from './db.js';
import { HariIni } from './screens/HariIni.jsx';
import { Belanja } from './screens/Belanja.jsx';
import { Laporan } from './screens/Laporan.jsx';
import { Tetapan } from './screens/Tetapan.jsx';
import { UiLapisan } from './components/ui.jsx';

const TAB = [
  { id: 'hari', label: 'Hari Ini', ikon: <IkonRumah /> },
  { id: 'belanja', label: 'Belanja', ikon: <IkonBakul /> },
  { id: 'laporan', label: 'Laporan', ikon: <IkonCarta /> },
  { id: 'tetapan', label: 'Tetapan', ikon: <IkonGear /> },
];

export function App() {
  const [tab, setTab] = useState('hari');
  const data = useSemua();

  useEffect(() => {
    // First run: ask the browser to keep our data, and record schema version.
    (async () => {
      const t = await bacaTetapan();
      if (!t.persistDiminta) {
        await mintaSimpananKekal();
        await simpanTetapan('persistDiminta', true);
      }
      await simpanTetapan('schemaVersion', SCHEMA_VERSION);
    })();
  }, []);

  const pergi = (id) => { setTab(id); window.scrollTo(0, 0); };

  return (
    <>
      <main class="isi">
        {!data
          ? <p class="kosong">Memuatkan…</p>
          : <>
            {tab === 'hari' && <HariIni data={data} pergi={pergi} />}
            {tab === 'belanja' && <Belanja data={data} />}
            {tab === 'laporan' && <Laporan data={data} />}
            {tab === 'tetapan' && <Tetapan data={data} />}
          </>}
      </main>
      <nav class="nav-bawah" aria-label="Menu utama">
        {TAB.map((t) => (
          <button class={`nav-b ${tab === t.id ? 'aktif' : ''}`} aria-current={tab === t.id ? 'page' : undefined} onClick={() => pergi(t.id)}>
            {t.ikon}
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
      <UiLapisan />
    </>
  );
}

// Simple inline icons (no icon font, no network).
function Svg({ children }) {
  return <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{children}</svg>;
}
function IkonRumah() { return <Svg><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></Svg>; }
function IkonBakul() { return <Svg><path d="M3 9h18l-2 11H5L3 9z" /><path d="M8 9l4-6 4 6" /></Svg>; }
function IkonCarta() { return <Svg><path d="M4 20V10" /><path d="M10 20V4" /><path d="M16 20v-7" /><path d="M2 20h20" /></Svg>; }
function IkonGear() { return <Svg><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></Svg>; }
