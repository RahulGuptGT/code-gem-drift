// Shared DistroKid statement ("Excruciating Details" export) parser.
// Keep the store -> platform mapping in sync with src/lib/dkRoyalty.ts

export type StatementRow = Record<string, string>;

export type AggregatedRoyalty = {
  sale_month: string;        // YYYY-MM
  period_month: string;      // YYYY-MM-01
  store_raw: string;
  platform: string;
  isrc: string;
  upc: string;
  title: string;
  artist: string;
  amount_usd: number;
  units: number;
  country_count: number;
  reporting_date: string | null;
};

/** Minimal RFC4180 CSV parser (handles quoted fields + embedded commas/newlines). */
export function parseCsv(text: string): StatementRow[] {
  const clean = text.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (inQuotes) {
      if (c === '"') {
        if (clean[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
      } else field += c;
      continue;
    }
    if (c === '"') { inQuotes = true; continue; }
    if (c === ',' || c === '\t') { row.push(field); field = ''; continue; }
    if (c === '\n') { row.push(field); field = ''; rows.push(row); row = []; continue; }
    if (c === '\r') continue;
    field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  const [head, ...body] = rows.filter((r) => r.some((c) => c.trim() !== ''));
  if (!head) return [];
  const keys = head.map((h) => h.trim());
  return body.map((r) => {
    const o: StatementRow = {};
    keys.forEach((k, i) => { o[k] = (r[i] ?? '').trim(); });
    return o;
  });
}

export function normalizeStore(store: string): string {
  const s = (store || '').toLowerCase();
  if (s.includes('facebook') || s.includes('instagram') || s.includes('meta')) return 'Meta (Instagram/Facebook)';
  if (s.includes('youtube')) return 'YouTube';
  if (s.includes('tiktok')) return 'TikTok';
  if (s.includes('spotify')) return 'Spotify';
  if (s.includes('apple') || s.includes('itunes')) return 'Apple Music';
  if (s.includes('amazon')) return 'Amazon';
  if (s.includes('saavn') || s.includes('jio')) return 'JioSaavn';
  if (s.includes('deezer')) return 'Deezer';
  if (s.includes('tidal')) return 'Tidal';
  if (s.includes('pandora')) return 'Pandora';
  return store || 'Other';
}

function pick(row: StatementRow, ...names: string[]): string {
  for (const n of names) {
    const hit = Object.keys(row).find((k) => k.toLowerCase() === n.toLowerCase());
    if (hit && row[hit] !== '') return row[hit];
  }
  // loose contains match
  for (const n of names) {
    const hit = Object.keys(row).find((k) => k.toLowerCase().includes(n.toLowerCase()));
    if (hit && row[hit] !== '') return row[hit];
  }
  return '';
}

/**
 * Aggregate raw per-country statement lines into one row per
 * (Sale Month + Store + ISRC). Amounts are summed at full precision.
 */
export function aggregateStatement(rows: StatementRow[]): AggregatedRoyalty[] {
  const map = new Map<string, AggregatedRoyalty & { _countries: Set<string> }>();
  for (const r of rows) {
    const saleMonthRaw = pick(r, 'Sale Month', 'sale month', 'month');
    const m = saleMonthRaw.match(/^(\d{4})-(\d{2})/);
    if (!m) continue;
    const sale_month = `${m[1]}-${m[2]}`;
    const store_raw = pick(r, 'Store');
    const isrc = pick(r, 'ISRC').toUpperCase();
    const amount = Number(pick(r, 'Earnings (USD)', 'Earnings') || 0);
    if (!isrc && !store_raw) continue;
    const key = `${sale_month}|${store_raw}|${isrc}`;
    let entry = map.get(key);
    if (!entry) {
      const repRaw = pick(r, 'Reporting Date', 'Date Inserted');
      entry = {
        sale_month,
        period_month: `${sale_month}-01`,
        store_raw,
        platform: normalizeStore(store_raw),
        isrc,
        upc: pick(r, 'UPC'),
        title: pick(r, 'Title'),
        artist: pick(r, 'Artist'),
        amount_usd: 0,
        units: 0,
        country_count: 0,
        reporting_date: /^\d{4}-\d{2}-\d{2}/.test(repRaw) ? repRaw.slice(0, 10) : null,
        _countries: new Set<string>(),
      };
      map.set(key, entry);
    }
    entry.amount_usd += Number.isFinite(amount) ? amount : 0;
    entry.units += Number(pick(r, 'Quantity') || 0) || 0;
    const country = pick(r, 'Country of Sale', 'Country');
    if (country) entry._countries.add(country);
  }
  return Array.from(map.values())
    .map(({ _countries, ...rest }) => ({
      ...rest,
      amount_usd: Math.round(rest.amount_usd * 1e6) / 1e6,
      country_count: _countries.size,
    }))
    .sort((a, b) => (a.sale_month < b.sale_month ? 1 : a.sale_month > b.sale_month ? -1 : a.platform.localeCompare(b.platform)));
}

/** Extract the first CSV/TSV member of a ZIP (stored or deflated). */
export async function readStatementText(bytes: Uint8Array, name = ''): Promise<string> {
  const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b;
  if (!isZip) return new TextDecoder().decode(bytes);
  const { unzipSync, strFromU8 } = await import('fflate');
  const files = unzipSync(bytes);
  const entries = Object.entries(files);
  const pickEntry =
    entries.find(([n]) => /\.(csv|tsv|txt)$/i.test(n) && !n.startsWith('__MACOSX')) ||
    entries.find(([n]) => !n.endsWith('/'));
  if (!pickEntry) throw new Error(`No CSV found inside ${name || 'zip'}`);
  return strFromU8(pickEntry[1]);
}
