// Lê o Vercel Blob (inscrições) e escreve placar-data.json com a contagem EXATA do sistema.
// Regra oficial (idêntica ao lib/store.js da LP): 1 inscrição = 1 id único;
// cada gravação cria uma nova VERSÃO do mesmo id (sufixo aleatório) e a mais recente vale.
import { list } from '@vercel/blob';
import { writeFileSync } from 'fs';

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const PREFIX = 'inscricoes/';

// id-base a partir do pathname (com ou sem sufixo aleatório). ids são base36 (sem '-').
const baseId = p => p.slice(PREFIX.length).replace(/\.json$/, '').split('-')[0];
// timestamp do PRÓPRIO registro (o uploadedAt do Vercel só tem granularidade de segundo)
const ts = r => new Date((r && (r.atualizadoEm || r.criadoEm)) || 0).getTime();

async function readBlob(url) {
  const r = await fetch(url, { headers: { Authorization: 'Bearer ' + TOKEN } });
  if (!r.ok) return null;
  try { return await r.json(); } catch { return null; }
}

// 1) agrupa todas as versões por id
const groups = new Map();
let cursor, arquivos = 0;
do {
  const page = await list({ prefix: PREFIX, token: TOKEN, cursor, limit: 1000 });
  for (const b of page.blobs) {
    if (!b.pathname.endsWith('.json')) continue;
    arquivos++;
    const id = baseId(b.pathname);
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push(b);
  }
  cursor = page.hasMore ? page.cursor : undefined;
} while (cursor);

// 2) para cada id, lê a versão mais recente
const items = (await Promise.all([...groups.values()].map(async g => {
  if (g.length === 1) return readBlob(g[0].url);
  const contents = (await Promise.all(g.map(b => readBlob(b.url)))).filter(Boolean);
  if (!contents.length) return null;
  return contents.reduce((a, b) => (ts(b) > ts(a) ? b : a));
}))).filter(Boolean);

// 3) conta por tipo
const rev = items.filter(i => i.tipo === 'revisionista').length;
const obr = items.filter(i => i.tipo === 'obreiro').length;

const data = { revisionistas: rev, obreiros: obr, total: rev + obr, metaRev: 100, metaObr: 100, ts: new Date().toISOString() };
writeFileSync('placar-data.json', JSON.stringify(data));
console.log('contagem:', JSON.stringify(data));
console.log(`auditoria: ${arquivos} arquivos no Blob · ${groups.size} inscrições únicas (ids) · ${arquivos - groups.size} versões antigas`);
