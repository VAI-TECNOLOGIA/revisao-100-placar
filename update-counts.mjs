// Lê o Vercel Blob (inscrições) e escreve placar-data.json com a contagem.
import { list } from '@vercel/blob';
import { writeFileSync } from 'fs';

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const PREFIX = 'inscricoes/';

let rev = 0, obr = 0, cursor;
do {
  const page = await list({ prefix: PREFIX, token: TOKEN, cursor, limit: 1000 });
  const items = await Promise.all(
    page.blobs.filter(b => b.pathname.endsWith('.json')).map(async b => {
      const r = await fetch(b.url, { headers: { Authorization: 'Bearer ' + TOKEN } });
      if (!r.ok) return null;
      try { return await r.json(); } catch { return null; }
    })
  );
  for (const it of items) {
    if (!it) continue;
    if (it.tipo === 'revisionista') rev++;
    else if (it.tipo === 'obreiro') obr++;
  }
  cursor = page.hasMore ? page.cursor : undefined;
} while (cursor);

const data = { revisionistas: rev, obreiros: obr, total: rev + obr, metaRev: 100, metaObr: 100, ts: new Date().toISOString() };
writeFileSync('placar-data.json', JSON.stringify(data));
console.log('contagem:', JSON.stringify(data));
