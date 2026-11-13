import { render } from 'preact';
import { App } from './App.jsx';
import './style.css';

async function mula() {
  if (import.meta.env.DEV && new URLSearchParams(location.search).has('seed')) {
    const { isiDataContoh } = await import('./dev/seed.js');
    await isiDataContoh();
    history.replaceState(null, '', location.pathname);
  }
  render(<App />, document.getElementById('app'));
}
mula();
