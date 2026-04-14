import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import {
  casinoLobbyCatalogSchema,
  type CasinoLobbyCatalog,
} from '@tosino/shared';

const EMPTY_CATALOG: CasinoLobbyCatalog = {
  updatedAt: '',
  casino: [],
  slot: [],
};

function catalogCandidates() {
  return [
    resolve(process.cwd(), 'casino.json'),
    resolve(process.cwd(), 'apps/api/casino.json'),
    join(__dirname, '../../casino.json'),
    join(__dirname, '../../../casino.json'),
  ];
}

function resolveCatalogPath() {
  return catalogCandidates().find((p) => existsSync(p)) ?? null;
}

export function readCasinoLobbyCatalog(): CasinoLobbyCatalog {
  const filepath = resolveCatalogPath();
  if (!filepath) return EMPTY_CATALOG;

  const raw = readFileSync(filepath, 'utf8').trim();
  if (!raw) return EMPTY_CATALOG;

  try {
    const parsed = JSON.parse(raw) as unknown;
    const result = casinoLobbyCatalogSchema.safeParse(parsed);
    if (result.success) return result.data;
    console.error('[public/casino/catalog] invalid schema', result.error.flatten());
  } catch (error) {
    console.error('[public/casino/catalog] failed to parse JSON', error);
  }

  return EMPTY_CATALOG;
}
